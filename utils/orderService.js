import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  orderBy,
  limit,
  serverTimestamp,
  startAfter,
  Timestamp,
  writeBatch,
  runTransaction,
  deleteDoc,
  increment
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { updateProductStock } from './productService';

// Collection references as functions to avoid initialization issues
const getOrdersRef = () => {
  if (!db) {
    throw new Error("Firestore database is not initialized");
  }
  return collection(db, 'orders');
};
const getAdminNotificationsRef = () => collection(db, 'adminNotifications');

/**
 * Create a new order with improved stock management for concurrent orders
 * @param {Object} orderData - Order data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Created order
 */
export const createOrder = async (orderData, userId) => {
  // Validate order data
  if (!orderData || !orderData.items || !orderData.items.length) {
    throw new Error('Invalid order data');
  }

  // Validate user ID
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Maximum number of retries for transaction
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let lastError = null;

  while (retryCount < MAX_RETRIES) {
    try {
      // Use a transaction to ensure stock consistency
      return await runTransaction(db, async (transaction) => {
        // Check stock availability for all items
        const stockUpdates = {};
        const productRefs = {};
        const unavailableItems = [];
        const lowStockItems = [];

        // First, check all products stock
        for (const item of orderData.items) {
          const productRef = doc(db, 'products', item.id);
          productRefs[item.id] = productRef;
          
          const productSnapshot = await transaction.get(productRef);
          
          if (!productSnapshot.exists()) {
            unavailableItems.push({
              id: item.id,
              name: item.name,
              reason: 'Product not found'
            });
            continue;
          }
          
          const productData = productSnapshot.data();
          
          // Check if product has stock tracking
          if (!productData.stock) {
            continue; // Skip stock check for products without stock tracking
          }
          
          // Check if requested size exists and has enough stock
          const sizeStock = productData.stock[item.size];
          
          if (sizeStock === undefined) {
            unavailableItems.push({
              id: item.id,
              name: item.name,
              size: item.size,
              reason: 'Size not available'
            });
            continue;
          }
          
          if (sizeStock < item.quantity) {
            unavailableItems.push({
              id: item.id,
              name: item.name,
              size: item.size,
              requested: item.quantity,
              available: sizeStock,
              reason: 'Insufficient stock'
            });
            continue;
          }

          // Check for low stock (less than 3 items remaining after purchase)
          if (sizeStock - item.quantity < 3) {
            lowStockItems.push({
              id: item.id,
              name: item.name,
              size: item.size,
              remaining: sizeStock - item.quantity
            });
          }
          
          // Track stock updates
          if (!stockUpdates[item.id]) {
            stockUpdates[item.id] = { ...productData.stock };
          }
          
          stockUpdates[item.id][item.size] = sizeStock - item.quantity;
        }
        
        // If any items are unavailable, abort the transaction
        if (unavailableItems.length > 0) {
          throw new Error('Some items are not available', { cause: { unavailableItems } });
        }
        
        // Generate order number with timestamp and random part to ensure uniqueness
        const timestamp = Date.now();
        const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const orderNumber = `ORD-${timestamp}-${randomPart}`;
        
        // Create the order document
        const orderRef = doc(collection(db, 'orders'));
        
        const newOrder = {
          ...orderData,
          id: orderRef.id,
          orderNumber,
          userId,
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          processedAt: serverTimestamp() // Track when the order was processed
        };
        
        transaction.set(orderRef, newOrder);
        
        // Update stock for all products
        for (const [productId, stockData] of Object.entries(stockUpdates)) {
          transaction.update(productRefs[productId], { 
            stock: stockData,
            updatedAt: serverTimestamp() // Track when stock was last updated
          });
          
          // Also update the totalSold counter
          const item = orderData.items.find(i => i.id === productId);
          if (item) {
            transaction.update(productRefs[productId], { 
              totalSold: increment(item.quantity)
            });
          }
        }

        // Create notification for low stock items
        if (lowStockItems.length > 0) {
          const notificationRef = doc(collection(db, 'adminNotifications'));
          transaction.set(notificationRef, {
            id: notificationRef.id,
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${lowStockItems.length} item(s) are running low on stock after order ${orderNumber}`,
            items: lowStockItems,
            createdAt: serverTimestamp(),
            read: false
          });
        }
        
        // Return the created order
        return {
          ...newOrder,
          id: orderRef.id,
          lowStockItems: lowStockItems.length > 0 ? lowStockItems : undefined
        };
      });
    } catch (error) {
      lastError = error;
      
      // Check if error is due to a concurrent modification
      if (error.code === 'failed-precondition' || error.code === 'aborted') {
        retryCount++;
        console.log(`Retrying transaction due to concurrent modification (attempt ${retryCount}/${MAX_RETRIES})`);
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
        continue;
      }
      
      // For other errors, check if it has unavailable items
      if (error.cause?.unavailableItems) {
        throw {
          message: 'Some items are not available',
          unavailableItems: error.cause.unavailableItems,
          code: 'STOCK_ERROR'
        };
      }
      
      // Rethrow other errors
      throw error;
    }
  }
  
  // If we've exhausted retries
  console.error(`Failed to create order after ${MAX_RETRIES} attempts:`, lastError);
  throw new Error('Failed to create order due to concurrent modifications. Please try again.');
};

/**
 * Get orders with filtering, sorting, and pagination
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {string} options.sortBy - Field to sort by (default: 'createdAt')
 * @param {boolean} options.sortDesc - Sort in descending order (default: true)
 * @param {number} options.limit - Maximum number of orders to return
 * @param {Object} options.startAfter - Document to start after (for pagination)
 * @returns {Promise<Array>} - Array of orders
 */
export async function getOrders(options = {}) {
  try {
    const ordersRef = getOrdersRef();
    let q = query(ordersRef);
    
    // Apply status filter if provided
    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }
    
    // Apply sorting
    const sortField = options.sortBy || 'createdAt';
    const sortDirection = options.sortDesc !== false ? 'desc' : 'asc';
    q = query(q, orderBy(sortField, sortDirection));
    
    // Apply pagination
    if (options.startAfter) {
      q = query(q, startAfter(options.startAfter));
    }
    
    // Apply limit
    if (options.limit && options.limit > 0) {
      q = query(q, limit(options.limit));
    }
    
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return orders;
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
}

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - Order data
 */
export const getOrderById = async (orderId) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnapshot = await getDoc(orderRef);
    
    if (!orderSnapshot.exists()) {
      throw new Error('Order not found');
    }
    
    return {
      id: orderSnapshot.id,
      ...orderSnapshot.data()
    };
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
};

/**
 * Get orders for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - List of orders
 */
export const getUserOrders = async (userId, options = {}) => {
  try {
    const { status, limit: queryLimit = 10, startAfter } = options;
    
    let ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    if (status) {
      ordersQuery = query(ordersQuery, where('status', '==', status));
    }
    
    if (queryLimit) {
      ordersQuery = query(ordersQuery, limit(queryLimit));
    }
    
    const ordersSnapshot = await getDocs(ordersQuery);
    
    return ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user orders:', error);
    throw error;
  }
};

/**
 * Get all orders with optional filtering and pagination
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {string} options.userId - Filter by user ID
 * @param {number} options.limit - Limit results
 * @param {Object} options.lastDoc - Last document for pagination
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort order ('asc' or 'desc')
 * @returns {Promise<Array>} - Array of orders
 */
export async function getAllOrders(options = {}) {
  try {
    const ordersRef = getOrdersRef();
    let q = query(ordersRef);
    
    // Apply status filter
    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }
    
    // Apply user filter
    if (options.userId) {
      q = query(q, where('userId', '==', options.userId));
    }
    
    // Apply sorting
    const sortField = options.sortBy || 'createdAt';
    const sortDirection = options.sortOrder === 'asc' ? 'asc' : 'desc';
    q = query(q, orderBy(sortField, sortDirection));
    
    // Apply pagination
    if (options.lastDoc) {
      q = query(q, startAfter(options.lastDoc));
    }
    
    // Apply limit
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return orders;
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @param {Object} updateData - Additional data to update
 * @returns {Promise<Object>} - Updated order
 */
export const updateOrderStatus = async (orderId, status, updateData = {}) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp(),
      ...updateData
    });
    
    return getOrderById(orderId);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

/**
 * Cancel order and restore stock
 * @param {string} orderId - Order ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} - Cancelled order
 */
export const cancelOrder = async (orderId, reason) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Get the order
      const orderRef = doc(db, 'orders', orderId);
      const orderSnapshot = await transaction.get(orderRef);
      
      if (!orderSnapshot.exists()) {
        throw new Error('Order not found');
      }
      
      const orderData = orderSnapshot.data();
      
      // Check if order can be cancelled
      if (['delivered', 'cancelled', 'refunded'].includes(orderData.status)) {
        throw new Error(`Cannot cancel order with status: ${orderData.status}`);
      }
      
      // Update order status
      transaction.update(orderRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancellationReason: reason || 'Cancelled by user',
        updatedAt: serverTimestamp()
      });
      
      // Restore stock for all items
      for (const item of orderData.items) {
        const productRef = doc(db, 'products', item.id);
        const productSnapshot = await transaction.get(productRef);
        
        if (productSnapshot.exists()) {
          const productData = productSnapshot.data();
          
          // Only update stock if product has stock tracking
          if (productData.stock && productData.stock[item.size] !== undefined) {
            const updatedStock = { ...productData.stock };
            updatedStock[item.size] = (updatedStock[item.size] || 0) + item.quantity;
            
            transaction.update(productRef, { 
              stock: updatedStock,
              totalSold: increment(-item.quantity)
            });
          }
        }
      }
      
      return {
        ...orderData,
        id: orderRef.id,
        status: 'cancelled'
      };
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
};

/**
 * Process refund for an order
 * @param {string} orderId - Order ID
 * @param {string} reason - Refund reason
 * @param {Array} items - Items to refund (optional, if partial refund)
 * @returns {Promise<Object>} - Refunded order
 */
export const refundOrder = async (orderId, reason, items = []) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Get the order
      const orderRef = doc(db, 'orders', orderId);
      const orderSnapshot = await transaction.get(orderRef);
      
      if (!orderSnapshot.exists()) {
        throw new Error('Order not found');
      }
      
      const orderData = orderSnapshot.data();
      
      // Check if order can be refunded
      if (['cancelled', 'refunded'].includes(orderData.status)) {
        throw new Error(`Cannot refund order with status: ${orderData.status}`);
      }
      
      const isPartialRefund = items && items.length > 0;
      
      // Update order status
      const updateData = {
        status: isPartialRefund ? 'partially_refunded' : 'refunded',
        refundedAt: serverTimestamp(),
        refundReason: reason || 'Refunded by admin',
        updatedAt: serverTimestamp()
      };
      
      if (isPartialRefund) {
        updateData.refundedItems = items;
      }
      
      transaction.update(orderRef, updateData);
      
      // Restore stock for all items or selected items
      const itemsToRefund = isPartialRefund ? items : orderData.items;
      
      for (const item of itemsToRefund) {
        const productRef = doc(db, 'products', item.id);
        const productSnapshot = await transaction.get(productRef);
        
        if (productSnapshot.exists()) {
          const productData = productSnapshot.data();
          
          // Only update stock if product has stock tracking
          if (productData.stock && productData.stock[item.size] !== undefined) {
            const updatedStock = { ...productData.stock };
            updatedStock[item.size] = (updatedStock[item.size] || 0) + item.quantity;
            
            transaction.update(productRef, { 
              stock: updatedStock,
              totalSold: increment(-item.quantity)
            });
          }
        }
      }
      
      return {
        ...orderData,
        id: orderRef.id,
        status: isPartialRefund ? 'partially_refunded' : 'refunded'
      };
    });
  } catch (error) {
    console.error('Error refunding order:', error);
    throw error;
  }
};

/**
 * Mark an order as paid and set up auto-deletion after 30 days from delivery
 * @param {string} orderId - Order ID
 * @returns {Promise<void>}
 */
export async function markOrderAsPaid(orderId) {
  try {
    // Use the Cloud Function to mark the order as paid
    const markAsPaidFunction = httpsCallable(functions, 'markOrderAsPaid');
    const result = await markAsPaidFunction({ orderId });
    
    // Return the result
    return result.data;
  } catch (error) {
    console.error('Error marking order as paid:', error);
    throw error;
  }
}

/**
 * Check if an order is eligible for auto-deletion (delivered, paid, and 30 days passed)
 * @param {Object} order - Order object
 * @returns {boolean} - True if eligible for deletion
 */
export function isEligibleForDeletion(order) {
  if (!order.isPaid || order.status !== 'delivered' || !order.scheduledForDeletion) {
    return false;
  }
  
  const deletionDate = order.scheduledForDeletion.toDate ? 
    order.scheduledForDeletion.toDate() : 
    new Date(order.scheduledForDeletion);
    
  return new Date() >= deletionDate;
}

export default {
  createOrder,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  cancelOrder,
  refundOrder,
  updateProductStock,
  bulkUpdateStock: updateProductStock
}; 