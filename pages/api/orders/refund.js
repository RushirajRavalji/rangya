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
      await limiter.check(res, 10, 'REFUND_ORDER');
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
      return res.status(401).json(createError('AUTHENTICATION', 'You must be logged in to process a refund'));
    }
    
    // Only admins can process refunds
    if (session.user.role !== 'admin') {
      return res.status(403).json(createError('AUTHORIZATION', 'Only administrators can process refunds'));
    }
    
    const adminId = session.user.uid;
    
    // Get refund data from request body
    const { orderId, reason, amount, items = [] } = req.body;
    
    if (!orderId) {
      return res.status(400).json(createError('VALIDATION', 'Order ID is required'));
    }
    
    if (!reason) {
      return res.status(400).json(createError('VALIDATION', 'Refund reason is required'));
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json(createError('VALIDATION', 'Valid refund amount is required'));
    }
    
    try {
      // Get the order
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        return res.status(404).json(createError('NOT_FOUND', 'Order not found'));
      }
      
      const orderData = orderDoc.data();
      
      // Check if the order can be refunded
      if (['cancelled', 'refunded'].includes(orderData.status)) {
        return res.status(400).json(createError('VALIDATION', `Cannot refund order with status: ${orderData.status}`));
      }
      
      // Validate refund amount
      if (amount > orderData.total) {
        return res.status(400).json(createError('VALIDATION', 'Refund amount cannot exceed order total'));
      }
      
      // Use a transaction to update order status and restore stock for refunded items
      await runTransaction(db, async (transaction) => {
        // Prepare refund data
        const refundData = {
          amount,
          reason,
          date: serverTimestamp(),
          processedBy: adminId,
          items: items.length > 0 ? items : 'full' // 'full' means all items are refunded
        };
        
        // Update order status
        transaction.update(orderRef, {
          status: 'refunded',
          refund: refundData,
          updatedAt: serverTimestamp()
        });
        
        // If specific items are being refunded, restore their stock
        if (items.length > 0) {
          for (const refundItem of items) {
            // Find the item in the order
            const orderItem = orderData.items.find(item => 
              item.id === refundItem.id && item.size === refundItem.size
            );
            
            if (!orderItem) continue;
            
            // Calculate quantity to restore (cannot exceed original quantity)
            const quantityToRestore = Math.min(
              refundItem.quantity || 0,
              orderItem.quantity || 0
            );
            
            if (quantityToRestore <= 0) continue;
            
            // Restore stock
            const productRef = doc(db, 'products', orderItem.id);
            const productDoc = await transaction.get(productRef);
            
            if (productDoc.exists()) {
              const productData = productDoc.data();
              
              // Check which stock field to update
              if (productData.stock && productData.stock[orderItem.size] !== undefined) {
                transaction.update(productRef, {
                  [`stock.${orderItem.size}`]: productData.stock[orderItem.size] + quantityToRestore
                });
              } else if (productData.sizes && productData.sizes[orderItem.size] !== undefined) {
                transaction.update(productRef, {
                  [`sizes.${orderItem.size}`]: productData.sizes[orderItem.size] + quantityToRestore
                });
              }
            }
          }
        } else {
          // Full refund, restore all items
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
        }
        
        // Update customer's order list
        const userRef = doc(db, 'users', orderData.customer.id);
        const userDoc = await transaction.get(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const orders = userData.orders || [];
          
          // Find and update the order in the user's orders list
          const updatedOrders = orders.map(order => {
            if (order.id === orderId) {
              return {
                ...order,
                status: 'refunded'
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
        message: 'Refund processed successfully'
      });
      
    } catch (error) {
      console.error('Error processing refund:', error);
      return handleApiError(res, error);
    }
  } catch (error) {
    console.error('Outer error in refund processing:', error);
    return handleApiError(res, error);
  }
} 