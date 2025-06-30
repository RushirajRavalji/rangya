import { getSession } from 'next-auth/react';
import { withErrorHandling } from '../../../utils/errorHandler';
import { getCustomerOrders } from '../../../utils/customerOrderService';

/**
 * Get orders for the authenticated customer
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function handler(req, res) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get user session
    const session = await getSession({ req });
    
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = session.user.id || session.user.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in session' });
    }
    
    // Get query parameters
    const { limit, cursor, status } = req.query;
    
    // Parse query parameters
    const options = {
      limit: limit ? parseInt(limit, 10) : 10,
      startAfter: cursor || null,
      status: status || null
    };
    
    // Get customer orders
    const result = await getCustomerOrders(userId, options);
    
    // Return the orders
    return res.status(200).json({
      success: true,
      orders: result.orders,
      pagination: {
        hasMore: result.pagination.hasMore,
        nextCursor: result.pagination.nextCursor ? result.pagination.nextCursor.id : null
      }
    });
  } catch (error) {
    console.error('Error getting customer orders:', error);
    return res.status(500).json({
      error: 'Failed to get customer orders',
      message: error.message
    });
  }
}

// Apply middleware
export default withErrorHandling(handler);