import { getSession } from 'next-auth/react';
import { db } from '../../../utils/firebase';
import { doc, getDoc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { validateCSRFToken } from '../../../utils/csrf';
import { rateLimit } from '../../../utils/rateLimit';
import { handleApiError, createError } from '../../../utils/errorHandler';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json(createError('VALIDATION', 'Method not allowed. Only POST requests are accepted.'));
  }
  
  try {
    // Apply rate limiting
    const limiter = rateLimit({
      interval: 60 * 1000, // 1 minute
      uniqueTokenPerInterval: 500,
      limit: 10, // 10 requests per minute
    });
    
    try {
      await limiter.check(res, 10, 'CANCEL_ORDER');
    } catch (error) {
      return res.status(429).json(createError('RATE_LIMIT', 'Rate limit exceeded. Please try again later.'));
    }
    
    // Verify CSRF token
    if (!validateCSRFToken(req)) {
      return res.status(403).json(createError('AUTHORIZATION', 'Invalid CSRF token'));
    }
    
    // Get user session
    const session = await getSession({ req });
    
    if (!session || !session.user) {
      return res.status(401).json(createError('AUTHENTICATION', 'You must be logged in to cancel an order'));
    }
    
    const userId = session.user.uid;
    
    // Get order data from request body
    const { orderId, reason } = req.body;
    
    if (!orderId) {
      return res.status(400).json(createError('VALIDATION', 'Order ID is required'));
    }
    
    try {
      // Get the order
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        return res.status(404).json(createError('NOT_FOUND', 'Order not found'));
      }
      
      const orderData = orderDoc.data();
      
      // Check if the order belongs to the user
      if (orderData.customer.id !== userId && session.user.role !== 'admin') {
        return res.status(403).json(createError('AUTHORIZATION', 'You do not have permission to cancel this order'));
      }
      
      // Check if the order can be cancelled
      if (['delivered', 'cancelled', 'refunded'].includes(orderData.status)) {
        return res.status(400).json(createError('VALIDATION', `Cannot cancel order with status: ${orderData.status}`));
      }
      
      // Use a transaction to update order status and restore stock
      await runTransaction(db, async (transaction) => {
        // Update order status
        transaction.update(orderRef, {
          status: 'cancelled',
          cancellation: {
            reason: reason || 'Customer requested cancellation',
            date: serverTimestamp(),
            by: userId
          },
          updatedAt: serverTimestamp()
        });
        
        // Restore stock for each item
        for (const item of orderData.items) {
          const productRef = doc(db, 'products', item.id);
          const productDoc = await transaction.get(productRef);
          
          if (productDoc.exists()) {
            const productData = productDoc.data();
            
            // Check which stock field to update
            if (productData.stock && productData.stock[item.size] !== undefined) {
              transaction.update(productRef, {
                [`stock.${item.size}`]: productData.stock[item.size] + item.quantity
              });
            } else if (productData.sizes && productData.sizes[item.size] !== undefined) {
              transaction.update(productRef, {
                [`sizes.${item.size}`]: productData.sizes[item.size] + item.quantity
              });
            }
          }
        }
        
        // Update user's order list
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const orders = userData.orders || [];
          
          // Find and update the order in the user's orders list
          const updatedOrders = orders.map(order => {
            if (order.id === orderId) {
              return {
                ...order,
                status: 'cancelled'
              };
            }
            return order;
          });
          
          transaction.update(userRef, { orders: updatedOrders });
        }
      });
      
      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Order cancelled successfully'
      });
      
    } catch (error) {
      console.error('Error cancelling order:', error);
      return handleApiError(res, error);
    }
  } catch (error) {
    console.error('Outer error in order cancellation:', error);
    return handleApiError(res, error);
  }
} 