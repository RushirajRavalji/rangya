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
import { db } from './firebase';
import { createError } from './errorHandler';
import { ORDER_STATUSES, isValidStatusTransition } from './orderService';

/**
 * Create a new order in the customer's orders subcollection
 * @param {Object} orderData - Order data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Created order with ID
 */
export const createCustomerOrder = async (orderData, userId) => {
  try {
    // Validate order data
    if (!orderData || !orderData.items || !orderData.items.length) {
      throw new Error('Invalid order data');
    }

    // Validate user ID
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Create a reference to the customer's orders subcollection
    const customerOrdersRef = collection(db, 'users', userId, 'orders');
    
    // Add order data with timestamps
    const orderWithTimestamps = {
      ...orderData,
      userId,
      status: ORDER_STATUSES.PENDING,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      statusHistory: [
        {
          status: ORDER_STATUSES.PENDING,
          timestamp: Timestamp.now(),
          note: 'Order created'
        }
      ]
    };

    // Add the order to the customer's orders subcollection
    const docRef = await addDoc(customerOrdersRef, orderWithTimestamps);
    
    // Also add to the main orders collection for admin access
    const mainOrdersRef = collection(db, 'orders');
    await setDoc(doc(mainOrdersRef, docRef.id), orderWithTimestamps);

    return {
      id: docRef.id,
      ...orderWithTimestamps
    };
  } catch (error) {
    console.error('Error creating customer order:', error);
    throw createError('DATABASE', 'Failed to create customer order', error);
  }
};

/**
 * Get orders for a specific customer
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of orders to fetch
 * @param {Object} options.startAfter - Cursor for pagination
 * @param {string} options.status - Filter by status
 * @returns {Promise<Object>} - Orders and pagination info
 */
export const getCustomerOrders = async (userId, options = {}) => {
  try {
    const { limit: queryLimit = 10, startAfter: cursor = null, status = null } = options;
    
    // Create a reference to the customer's orders subcollection
    const customerOrdersRef = collection(db, 'users', userId, 'orders');
    
    let ordersQuery = query(
      customerOrdersRef,
      orderBy('createdAt', 'desc'),
      limit(queryLimit)
    );
    
    // Add status filter if provided
    if (status) {
      ordersQuery = query(
        customerOrdersRef,
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
        limit(queryLimit)
      );
    }
    
    // Add cursor for pagination if provided
    if (cursor) {
      ordersQuery = query(
        customerOrdersRef,
        ...(status ? [where('status', '==', status)] : []),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(queryLimit)
      );
    }
    
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders = [];
    
    ordersSnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Get the last document for pagination
    const lastVisible = ordersSnapshot.docs[ordersSnapshot.docs.length - 1];
    
    return {
      orders,
      pagination: {
        hasMore: orders.length === queryLimit,
        nextCursor: lastVisible
      }
    };
  } catch (error) {
    console.error('Error getting customer orders:', error);
    throw createError('DATABASE', 'Failed to get customer orders', error);
  }
};

/**
 * Get a specific order for a customer
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} - Order object or null if not found
 */
export const getCustomerOrderById = async (userId, orderId) => {
  try {
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      return null;
    }
    
    return {
      id: orderDoc.id,
      ...orderDoc.data()
    };
  } catch (error) {
    console.error('Error getting customer order:', error);
    throw createError('DATABASE', 'Failed to get customer order', error);
  }
};

/**
 * Update a customer order status
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @param {string} newStatus - New order status
 * @param {string} note - Optional note about the status change
 * @returns {Promise<Object>} - Updated order
 */
export const updateCustomerOrderStatus = async (userId, orderId, newStatus, note = '') => {
  try {
    // Get the order first to check current status
    const order = await getCustomerOrderById(userId, orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Validate the status transition
    if (!isValidStatusTransition(order.status, newStatus)) {
      throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
    }
    
    // Update the order in the customer's subcollection
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    
    const statusUpdate = {
      status: newStatus,
      updatedAt: serverTimestamp(),
      statusHistory: [...(order.statusHistory || []), {
        status: newStatus,
        timestamp: Timestamp.now(),
        note: note || `Status changed to ${newStatus}`
      }]
    };
    
    await updateDoc(orderRef, statusUpdate);
    
    // Also update in the main orders collection
    const mainOrderRef = doc(db, 'orders', orderId);
    await updateDoc(mainOrderRef, statusUpdate);
    
    return {
      ...order,
      ...statusUpdate
    };
  } catch (error) {
    console.error('Error updating customer order status:', error);
    throw createError('DATABASE', 'Failed to update customer order status', error);
  }
};