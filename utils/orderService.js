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
  increment,
  setDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { updateProductStock } from './productService';
import { createError } from './errorHandler';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail, sendOrderShippedEmail } from './emailService';
import { getUserById } from './userService';

// Collection references as functions to avoid initialization issues
const getOrdersRef = () => {
  if (!db) {
    throw new Error("Firestore database is not initialized");
  }
  return collection(db, 'orders');
};
const getAdminNotificationsRef = () => collection(db, 'adminNotifications');

// Define valid order statuses and their transitions
const ORDER_STATUSES = {
  PENDING: 'pending',
  PAYMENT_PROCESSING: 'payment_processing',
  PAYMENT_FAILED: 'payment_failed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  RETURNED: 'returned'
};

// Define valid status transitions
// Each status can only transition to specific next statuses
const VALID_STATUS_TRANSITIONS = {
  [ORDER_STATUSES.PENDING]: [
    ORDER_STATUSES.PAYMENT_PROCESSING,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.PAYMENT_PROCESSING]: [
    ORDER_STATUSES.PROCESSING,
    ORDER_STATUSES.PAYMENT_FAILED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.PAYMENT_FAILED]: [
    ORDER_STATUSES.PAYMENT_PROCESSING,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.PROCESSING]: [
    ORDER_STATUSES.SHIPPED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.SHIPPED]: [
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.RETURNED
  ],
  [ORDER_STATUSES.DELIVERED]: [
    ORDER_STATUSES.RETURNED,
    ORDER_STATUSES.REFUNDED,
    ORDER_STATUSES.PARTIALLY_REFUNDED
  ],
  [ORDER_STATUSES.CANCELLED]: [
    ORDER_STATUSES.REFUNDED
  ],
  [ORDER_STATUSES.RETURNED]: [
    ORDER_STATUSES.REFUNDED,
    ORDER_STATUSES.PARTIALLY_REFUNDED
  ],
  [ORDER_STATUSES.REFUNDED]: [],
  [ORDER_STATUSES.PARTIALLY_REFUNDED]: [
    ORDER_STATUSES.REFUNDED
  ]
};

// Stock reservation expiration time in milliseconds (30 minutes)
const STOCK_RESERVATION_EXPIRY = 30 * 60 * 1000;

/**
 * Validate if a status transition is allowed
 * @param {string} currentStatus - Current order status
 * @param {string} newStatus - New order status
 * @returns {boolean} - Whether the transition is valid
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return true;
  
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return validTransitions && validTransitions.includes(newStatus);
};

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
 * @returns {Promise<Object|null>} - Order object or null if not found
 */
export const getOrderById = async (orderId) => {
  try {
    // First try to get the order from the main orders collection
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    let orderData = null;
    let userId = null;
    
    if (orderDoc.exists()) {
      orderData = {
        id: orderDoc.id,
        ...orderDoc.data()
      };
      userId = orderData.userId;
    } else {
      // If not found in main collection, search in all users' order subcollections
      console.log(`Order ${orderId} not found in main collection, searching in user subcollections...`);
      
      // Get all users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      // Check each user's orders subcollection
      for (const userDoc of usersSnapshot.docs) {
        userId = userDoc.id;
        const userOrderRef = doc(db, 'users', userId, 'orders', orderId);
        const userOrderDoc = await getDoc(userOrderRef);
        
        if (userOrderDoc.exists()) {
          console.log(`Found order ${orderId} in user ${userId}'s subcollection`);
          
          // Also add to main orders collection for future reference
          const foundOrderData = userOrderDoc.data();
          await setDoc(doc(db, 'orders', orderId), foundOrderData, { merge: true });
          
          orderData = {
            id: userOrderDoc.id,
            ...foundOrderData,
            userId // Ensure userId is set
          };
          break;
        }
      }
    }
    
    if (!orderData) {
      console.log(`Order ${orderId} not found in any collection`);
      return null;
    }
    
    // Get customer data from user record if possible
    if (userId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          orderData.customer = {
            name: userData.displayName || userData.name || (orderData.customer?.name || 'Unknown'),
            email: userData.email || (orderData.customer?.email || 'Unknown')
          };
        }
      } catch (userErr) {
        console.error('Error fetching user data for order:', userErr);
        // Continue with existing customer data if available
        orderData.customer = orderData.customer || { name: 'Unknown', email: 'Unknown' };
      }
    } else {
      // Ensure customer object exists
      orderData.customer = orderData.customer || { name: 'Unknown', email: 'Unknown' };
    }
    
    return orderData;
  } catch (error) {
    console.error('Error getting order:', error);
    throw createError('DATABASE', 'Failed to get order', error);
  }
};

/**
 * Get orders for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of orders to fetch
 * @param {Object} options.startAfter - Cursor for pagination
 * @param {string} options.status - Filter by status
 * @returns {Promise<Object>} - Orders and pagination info
 */
export const getUserOrders = async (userId, options = {}) => {
  try {
    if (!userId) {
      console.error('getUserOrders called without userId');
      return [];
    }

    const { limit: queryLimit = 10, startAfter: cursor = null, status = null } = options;
    
    // First try to get orders from the new structure (subcollection)
    const userOrdersRef = collection(db, 'orders', userId, 'userOrders');
    
    let ordersQuery = query(
      userOrdersRef,
      orderBy('createdAt', 'desc'),
      limit(queryLimit)
    );
    
    // Add status filter if provided
    if (status) {
      ordersQuery = query(
        userOrdersRef,
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
        limit(queryLimit)
      );
    }
    
    // Add cursor for pagination if provided
    if (cursor) {
      ordersQuery = query(
        userOrdersRef,
        ...(status ? [where('status', '==', status)] : []),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(queryLimit)
      );
    }
    
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders = [];
    
    // If no orders found in the subcollection, try the old structure
    if (ordersSnapshot.empty) {
      // Fall back to the old structure
      let oldOrdersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(queryLimit)
      );
      
      // Add status filter if provided
      if (status) {
        oldOrdersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', userId),
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(queryLimit)
        );
      }
      
      // Add cursor for pagination if provided
      if (cursor) {
        oldOrdersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', userId),
          ...(status ? [where('status', '==', status)] : []),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(queryLimit)
        );
      }
      
      const oldOrdersSnapshot = await getDocs(oldOrdersQuery);
      
      oldOrdersSnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Get the last document for pagination
      const lastVisible = oldOrdersSnapshot.docs[oldOrdersSnapshot.docs.length - 1];
      
      // For backward compatibility with the orders.js page
      // which expects an array directly, not an object with orders property
      if (options.returnDirectArray) {
        return orders;
      }
      
      return {
        orders,
        pagination: {
          hasMore: orders.length === queryLimit,
          nextCursor: lastVisible
        }
      };
    }
    
    // Process orders from the subcollection
    ordersSnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Get the last document for pagination
    const lastVisible = ordersSnapshot.docs[ordersSnapshot.docs.length - 1];
    
    // For backward compatibility with the orders.js page
    // which expects an array directly, not an object with orders property
    if (options.returnDirectArray) {
      return orders;
    }
    
    return {
      orders,
      pagination: {
        hasMore: orders.length === queryLimit,
        nextCursor: lastVisible
      }
    };
  } catch (error) {
    console.error('Error getting user orders:', error);
    throw createError('DATABASE', 'Failed to get user orders', error);
  }
};

/**
 * Get all orders with pagination and filtering
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of orders to fetch
 * @param {Object} options.startAfter - Cursor for pagination
 * @param {string} options.status - Filter by status
 * @param {string} options.userId - Filter by user ID
 * @param {string} options.sortBy - Field to sort by
 * @param {string} options.sortOrder - Sort order ('asc' or 'desc')
 * @returns {Promise<Object>} - Orders and pagination info
 */
export const getAllOrders = async (options = {}) => {
  try {
    const { 
      limit: queryLimit = 20, 
      startAfter: cursor = null, 
      status = null,
      userId = null,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;
    
    console.log('Fetching all orders with options:', JSON.stringify(options));
    
    let allOrders = [];
    
    // Get all users to access their order subcollections
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    console.log(`Found ${usersSnapshot.size} users to check for orders`);
    
    // Create a map of user data for quick lookup
    const userDataMap = {};
    usersSnapshot.forEach((userDoc) => {
      const userId = userDoc.id;
      const userData = userDoc.data();
      if (userData) {
        userDataMap[userId] = {
          displayName: userData.displayName || userData.name || 'Unknown',
          email: userData.email || 'No email'
        };
      }
    });
    
    if (usersSnapshot.empty) {
      console.warn('No users found in the database');
      return { orders: [], pagination: { hasMore: false, nextCursor: null } };
    }
    
    // Also check the main orders collection for legacy orders
    const ordersRef = collection(db, 'orders');
    let ordersQuery = query(ordersRef, orderBy(sortBy, sortOrder));
    
    if (status) {
      ordersQuery = query(ordersRef, where('status', '==', status), orderBy(sortBy, sortOrder));
    }
    
    const ordersSnapshot = await getDocs(ordersQuery);
    console.log(`Found ${ordersSnapshot.size} orders in main collection`);
    
    // Add orders from main collection
    ordersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data) {
        console.warn(`Empty data for order ${doc.id} in main collection`);
        return;
      }
      
      // Add proper customer data
      const orderUserId = data.userId;
      let customerData = data.customer || {};
      
      if (orderUserId && userDataMap[orderUserId]) {
        customerData = {
          name: userDataMap[orderUserId].displayName,
          email: userDataMap[orderUserId].email
        };
      }
      
      allOrders.push({
        id: doc.id,
        ...data,
        customer: customerData
      });
    });
    
    // Collect orders from all user subcollections
    const orderPromises = [];
    
    console.log('=== COLLECTING ORDERS FROM USER SUBCOLLECTIONS ===');
    
    // For each user, query their orders subcollection
    usersSnapshot.forEach((userDoc) => {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      if (!userData) {
        console.warn(`No user data found for user ${userId}`);
      }
      
      // The correct path is users/{userId}/orders
      const userOrdersRef = collection(db, 'users', userId, 'orders');
      
      // Build query constraints
      let constraints = [];
      
      if (status) {
        constraints.push(where('status', '==', status));
      }
      
      // Always add sorting
      constraints.push(orderBy(sortBy, sortOrder));
      
      // Create and execute the query
      const userOrdersQuery = query(userOrdersRef, ...constraints);
      orderPromises.push(getDocs(userOrdersQuery).then(snapshot => {
        console.log(`Found ${snapshot.size} orders for user ${userId}`);
        return { userId, userData, snapshot };
      }).catch(error => {
        console.error(`Error fetching orders for user ${userId}:`, error);
        // Return empty snapshot to avoid breaking the Promise.all
        return { userId, userData, snapshot: { empty: true, forEach: () => {} } };
      }));
    });
    
    // Execute all queries in parallel
    console.log(`Executing ${orderPromises.length} parallel queries for user orders...`);
    const results = await Promise.all(orderPromises);
    console.log(`Completed ${results.length} parallel queries for user orders`);
    
    // Collect all orders with user information
    let orderCount = 0;
    let usersWithOrders = 0;
    
    results.forEach(({ userId, userData, snapshot }) => {
      if (snapshot.empty) {
        console.log(`No orders found for user ${userId}`);
        return;
      }
      
      let userOrderCount = 0;
      snapshot.forEach((doc) => {
        try {
          const data = doc.data();
          if (!data) {
            console.warn(`Empty data for order ${doc.id} of user ${userId}`);
            return;
          }
          
          // Add user ID if not already present
          if (!data.userId) {
            data.userId = userId;
          }
          
          // Get customer name from user data (or use existing)
          let customerData = data.customer || {};
          
          // Use userData from the current user document
          if (userData) {
            customerData = {
              name: userData.displayName || userData.name || customerData.name || 'Unknown',
              email: userData.email || customerData.email || 'No email'
            };
          } else if (userDataMap[userId]) {
            // Fallback to our user data map
            customerData = {
              name: userDataMap[userId].displayName,
              email: userDataMap[userId].email
            };
          }
          
          // Ensure order has a status
          if (!data.status) {
            data.status = 'pending';
          }
          
          // Ensure order has a total amount
          if (!data.total && !data.totalAmount) {
            data.total = 0;
          }
          
          allOrders.push({
            id: doc.id,
            ...data,
            customer: customerData
          });
          
          orderCount++;
          userOrderCount++;
        } catch (error) {
          console.error(`Error processing order ${doc.id} for user ${userId}:`, error);
        }
      });
      
      if (userOrderCount > 0) {
        usersWithOrders++;
      }
    });
    
    console.log(`Processed ${orderCount} orders from ${usersWithOrders} users with orders (out of ${results.length} total users)`);
    if (orderCount === 0) {
      console.warn('No orders were found in any user subcollections');
    }
    
    console.log(`Total orders collected: ${allOrders.length}`);
    
    // Sort all orders by the specified field
    allOrders.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortBy === 'createdAt') {
        // Handle Firestore timestamps or date strings
        const aTime = aValue?.toDate ? aValue.toDate().getTime() : 
                     aValue instanceof Date ? aValue.getTime() : 
                     typeof aValue === 'string' ? new Date(aValue).getTime() : 0;
                     
        const bTime = bValue?.toDate ? bValue.toDate().getTime() : 
                     bValue instanceof Date ? bValue.getTime() : 
                     typeof bValue === 'string' ? new Date(bValue).getTime() : 0;
                     
        return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
      }
      
      // For other fields
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
    
    // Apply pagination if cursor is provided
    const startIndex = cursor ? allOrders.findIndex(order => order.id === cursor.id) + 1 : 0;
    // If limit is explicitly set to null, return all orders without pagination
    const paginatedOrders = options.limit === null ? allOrders : allOrders.slice(startIndex, startIndex + queryLimit);
    
    console.log(`Returning ${paginatedOrders.length} orders after pagination`);
    if (paginatedOrders.length > 0) {
      console.log('Sample first order:', JSON.stringify(paginatedOrders[0]));
    }
    
    return {
      orders: paginatedOrders,
      pagination: {
        hasMore: startIndex + queryLimit < allOrders.length,
        nextCursor: paginatedOrders.length > 0 ? paginatedOrders[paginatedOrders.length - 1] : null
      }
    };
  } catch (error) {
    console.error('Error getting all orders:', error);
    throw createError('DATABASE', 'Failed to get orders', error);
  }
};

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise<Object>} - Updated order
 */
export const updateOrderStatus = async (orderId, status, additionalData = {}) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    // Get current order
    const orderDoc = await getDoc(orderRef);
    if (!orderDoc.exists()) {
      throw createError('NOT_FOUND', `Order ${orderId} not found`);
    }
    
    const order = orderDoc.data();
    const currentStatus = order.status;
    
    // Validate status transition
    if (!isValidStatusTransition(currentStatus, status)) {
      throw createError('VALIDATION', `Invalid status transition from ${currentStatus} to ${status}`);
    }
    
    // Update order
    const updateData = {
      status,
      updatedAt: serverTimestamp(),
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: currentStatus,
          timestamp: new Date().toISOString()
        }
      ],
      ...additionalData
    };
    
    await updateDoc(orderRef, updateData);
    
    // Handle stock updates based on status changes
    await handleStockForStatusChange(order, status);
    
    // Get updated order
    const updatedOrderDoc = await getDoc(orderRef);
    const updatedOrder = {
      id: updatedOrderDoc.id,
      ...updatedOrderDoc.data()
    };
    
    // Send status update email
    try {
      const user = await getUserById(order.userId);
      if (user) {
        if (status === ORDER_STATUSES.SHIPPED && additionalData.shipment) {
          await sendOrderShippedEmail(updatedOrder, user, additionalData.shipment);
        } else {
          await sendOrderStatusUpdateEmail(updatedOrder, user);
        }
      }
    } catch (emailError) {
      console.error('Failed to send order status update email:', emailError);
      // Don't fail the status update if email sending fails
    }
    
    return updatedOrder;
  } catch (error) {
    console.error('Error updating order status:', error);
    if (error.code) {
      throw error; // Rethrow if it's already a structured error
    }
    throw createError('DATABASE', 'Failed to update order status', error);
  }
};

/**
 * Handle stock updates based on order status changes
 * @param {Object} order - Order object
 * @param {string} newStatus - New order status
 * @returns {Promise<void>}
 */
const handleStockForStatusChange = async (order, newStatus) => {
  try {
    const currentStatus = order.status;
    
    // If order is cancelled, restore stock
    if (newStatus === ORDER_STATUSES.CANCELLED && 
        [ORDER_STATUSES.PENDING, ORDER_STATUSES.PAYMENT_PROCESSING, ORDER_STATUSES.PROCESSING].includes(currentStatus)) {
      await restoreStock(order.items);
    }
    
    // If order is returned, restore stock
    if (newStatus === ORDER_STATUSES.RETURNED && 
        [ORDER_STATUSES.SHIPPED, ORDER_STATUSES.DELIVERED].includes(currentStatus)) {
      await restoreStock(order.items);
    }
    
    // If order transitions from pending to processing, confirm stock reservation
    if (newStatus === ORDER_STATUSES.PROCESSING && 
        [ORDER_STATUSES.PENDING, ORDER_STATUSES.PAYMENT_PROCESSING].includes(currentStatus)) {
      await confirmStockReservation(order.items, order.id);
    }
  } catch (error) {
    console.error('Error handling stock for status change:', error);
    throw error;
  }
};

/**
 * Reserve stock for order items
 * @param {Array} items - Order items
 * @param {string} orderId - Order ID
 * @returns {Promise<void>}
 */
const reserveStock = async (items, orderId) => {
  try {
    // For each item, create a stock reservation
    for (const item of items) {
      const reservationRef = collection(db, 'stock_reservations');
      await addDoc(reservationRef, {
        productId: item.productId,
        quantity: item.quantity,
        orderId,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + STOCK_RESERVATION_EXPIRY)
      });
    }
  } catch (error) {
    console.error('Error reserving stock:', error);
    throw error;
  }
};

/**
 * Confirm stock reservation (when order is confirmed)
 * @param {Array} items - Order items
 * @param {string} orderId - Order ID
 * @returns {Promise<void>}
 */
const confirmStockReservation = async (items, orderId) => {
  try {
    // Remove reservations and update actual stock
    for (const item of items) {
      const productRef = doc(db, 'products', item.productId);
      
      await runTransaction(db, async (transaction) => {
        // Get product
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) {
          throw createError('NOT_FOUND', `Product ${item.productId} not found`);
        }
        
        const product = productDoc.data();
        
        // Update stock
        const newStock = Math.max(0, product.stock - item.quantity);
        transaction.update(productRef, { stock: newStock });
        
        // Create low stock notification if needed
        if (newStock <= (product.lowStockThreshold || 5)) {
          const notificationsRef = collection(db, 'admin_notifications');
          transaction.set(doc(notificationsRef), {
            type: 'low_stock',
            productId: item.productId,
            productName: product.name,
            currentStock: newStock,
            createdAt: serverTimestamp(),
            read: false
          });
        }
      });
      
      // Delete reservations for this order
      const reservationsQuery = query(
        collection(db, 'stock_reservations'),
        where('orderId', '==', orderId),
        where('productId', '==', item.productId)
      );
      
      const reservationsSnapshot = await getDocs(reservationsQuery);
      reservationsSnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
    }
  } catch (error) {
    console.error('Error confirming stock reservation:', error);
    throw error;
  }
};

/**
 * Restore stock for cancelled or returned orders
 * @param {Array} items - Order items
 * @returns {Promise<void>}
 */
const restoreStock = async (items) => {
  try {
    for (const item of items) {
      const productRef = doc(db, 'products', item.productId);
      
      await runTransaction(db, async (transaction) => {
        // Get product
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) {
          throw createError('NOT_FOUND', `Product ${item.productId} not found`);
        }
        
        const product = productDoc.data();
        
        // Restore stock
        const newStock = product.stock + item.quantity;
        transaction.update(productRef, { stock: newStock });
      });
    }
  } catch (error) {
    console.error('Error restoring stock:', error);
    throw error;
  }
};

/**
 * Clean up expired stock reservations
 * @returns {Promise<number>} - Number of expired reservations cleaned up
 */
export const cleanupExpiredReservations = async () => {
  try {
    const now = new Date();
    
    // Get expired reservations
    const reservationsQuery = query(
      collection(db, 'stock_reservations'),
      where('expiresAt', '<', now)
    );
    
    const reservationsSnapshot = await getDocs(reservationsQuery);
    const expiredReservations = [];
    
    reservationsSnapshot.forEach((doc) => {
      expiredReservations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Delete expired reservations
    for (const reservation of expiredReservations) {
      await deleteDoc(doc(db, 'stock_reservations', reservation.id));
    }
    
    return expiredReservations.length;
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
    throw createError('DATABASE', 'Failed to clean up expired reservations', error);
  }
};

/**
 * Validate order items (check stock, prices, etc.)
 * @param {Array} items - Order items
 * @returns {Promise<Object>} - Validation result
 */
export const validateOrderItems = async (items) => {
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { valid: false, error: 'No items provided' };
    }
    
    const invalidItems = [];
    
    // Check each item
    for (const item of items) {
      if (!item.productId) {
        invalidItems.push({
          ...item,
          error: 'Missing productId'
        });
        continue;
      }
      
      if (!item.quantity || item.quantity <= 0) {
        invalidItems.push({
          ...item,
          error: 'Invalid quantity'
        });
        continue;
      }
      
      // Get product
      const productRef = doc(db, 'products', item.productId);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        invalidItems.push({
          ...item,
          error: 'Product not found'
        });
        continue;
      }
      
      const product = productDoc.data();
      
      // Check if product is available
      if (!product.available) {
        invalidItems.push({
          ...item,
          error: 'Product is not available'
        });
        continue;
      }
      
      // Check stock
      if (product.stock < item.quantity) {
        invalidItems.push({
          ...item,
          error: 'Insufficient stock',
          availableStock: product.stock
        });
        continue;
      }
      
      // Verify price (if provided)
      if (item.price && Math.abs(item.price - product.price) > 0.01) {
        invalidItems.push({
          ...item,
          error: 'Price mismatch',
          correctPrice: product.price
        });
        continue;
      }
    }
    
    if (invalidItems.length > 0) {
      return {
        valid: false,
        error: 'Some items are invalid',
        items: invalidItems
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating order items:', error);
    return {
      valid: false,
      error: 'Error validating items',
      details: error.message
    };
  }
};

/**
 * Calculate order totals
 * @param {Array} items - Order items
 * @returns {Object} - Order totals
 */
const calculateOrderTotals = (items) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = subtotal > 1000 ? 0 : 100; // Free shipping over ₹1000
  const taxRate = 0.18; // 18% GST
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + shippingCost + tax;
  
  return {
    subtotal,
    shippingCost,
    tax,
    total
  };
};

/**
 * Validates shipping address for completeness
 * @param {Object} address - The shipping address to validate
 * @returns {boolean} - Whether the address is valid
 */
const isValidShippingAddress = (address) => {
  if (!address) return false;
  
  const requiredFields = [
    'fullName', 
    'flatNo',
    'street', 
    'city',
    'state',
    'postalCode',
    'country',
    'phone'
  ];
  
  return requiredFields.every(field => 
    address[field] && typeof address[field] === 'string' && address[field].trim() !== ''
  );
};

/**
 * Creates a normalized shipping address object from various input formats
 * @param {Object} addressData - Address data from various sources
 * @returns {Object} - Normalized address object
 */
const normalizeShippingAddress = (addressData) => {
  if (!addressData) return null;
  
  return {
    fullName: addressData.fullName || addressData.name || '',
    flatNo: addressData.flatNo || addressData.buildingNo || '',
    buildingName: addressData.buildingName || '',
    street: addressData.street || addressData.line1 || addressData.address || '',
    landmark: addressData.landmark || '',
    city: addressData.city || '',
    state: addressData.state || '',
    postalCode: addressData.postalCode || addressData.zipCode || '',
    country: addressData.country || 'India',
    phone: addressData.phone || ''
  };
};

export default {
  ORDER_STATUSES,
  getOrderById,
  getUserOrders,
  getAllOrders,
  createOrder,
  updateOrderStatus,
  validateOrderItems,
  cleanupExpiredReservations
};