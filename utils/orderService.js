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
  writeBatch
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { updateProductStock } from './productService';

// Collection references as functions to avoid initialization issues
const getOrdersRef = () => collection(db, 'orders');
const getAdminNotificationsRef = () => collection(db, 'adminNotifications');

/**
 * Create a new order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} - Created order
 */
export async function createOrder(orderData) {
  try {
    if (!orderData.userId) {
      throw new Error('userId is required to create an order');
    }
    
    const ordersRef = getOrdersRef();
    // Add timestamps
    const dataWithTimestamps = {
      ...orderData,
      status: orderData.status || 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(ordersRef, dataWithTimestamps);
    const orderId = docRef.id;
    
    // Update product stock
    await updateOrderStock(orderData.items);
    
    // Create admin notification
    try {
      const notificationsRef = getAdminNotificationsRef();
      await addDoc(notificationsRef, {
        title: 'New Order Received',
        message: `Order #${orderId.slice(0, 8)} for ₹${orderData.total.toFixed(2)} has been placed by ${orderData.customer?.name || 'a customer'}.`,
        type: 'info',
        link: `/admin/orders/${orderId}`,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (notifError) {
      console.error('Error creating admin notification:', notifError);
      // Continue with order creation even if notification fails
    }
    
    return {
      id: orderId,
      ...dataWithTimestamps
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

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
 * Get an order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} - Order data or null if not found
 */
export async function getOrderById(orderId) {
  try {
    const docRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting order by ID:', error);
    throw error;
  }
}

/**
 * Get orders for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of user orders
 */
export async function getUserOrders(userId) {
  try {
    if (!userId) {
      console.error('getUserOrders called without a userId');
      return [];
    }
    
    const ordersRef = getOrdersRef();
    const q = query(
      ordersRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    console.log(`Fetching orders for user: ${userId}`);
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} orders for user: ${userId}`);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Ensure we have all required fields
      if (data) {
        orders.push({
          id: doc.id,
          ...data,
          // Ensure these fields exist with defaults if missing
          status: data.status || 'pending',
          items: data.items || [],
          total: data.total || 0
        });
      }
    });
    
    return orders;
  } catch (error) {
    console.error('Error getting user orders:', error);
    throw error;
  }
}

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
 * Update an order
 * @param {string} orderId - Order ID
 * @param {Object} orderData - Updated order data
 * @returns {Promise<void>}
 */
export async function updateOrder(orderId, orderData) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    // Add updated timestamp
    const dataWithTimestamp = {
      ...orderData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(orderRef, dataWithTimestamp);
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
}

/**
 * Update an order's status
 * @param {string} orderId - Order ID
 * @param {string} status - New status ('pending', 'processing', 'shipped', 'delivered', 'cancelled')
 * @returns {Promise<void>}
 */
export async function updateOrderStatus(orderId, status) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Cancel an order
 * @param {string} orderId - Order ID
 * @param {string} cancelReason - Reason for cancellation
 * @returns {Promise<void>}
 */
export async function cancelOrder(orderId, cancelReason) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    await updateDoc(orderRef, {
      status: 'cancelled',
      cancelReason,
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
}

/**
 * Update product stock based on order items
 * @param {Array} items - Order items
 * @returns {Promise<void>}
 */
async function updateOrderStock(items) {
  try {
    // Group items by product ID
    const stockUpdates = {};
    
    items.forEach(item => {
      if (!stockUpdates[item.id]) {
        stockUpdates[item.id] = {};
      }
      
      // Decrease stock by quantity (negative value)
      stockUpdates[item.id][item.size] = -(item.quantity);
    });
    
    // Update stock for each product
    const updatePromises = Object.entries(stockUpdates).map(([productId, sizeUpdates]) => {
      return updateProductStock(productId, sizeUpdates);
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error updating product stock:', error);
  }
}

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