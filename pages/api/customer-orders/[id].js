import { getSession } from 'next-auth/react';
import { withErrorHandling } from '../../../utils/errorHandler';
import { getCustomerOrderById, updateCustomerOrderStatus } from '../../../utils/customerOrderService';

/**
 * Get or update a specific customer order
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function handler(req, res) {
  // Get order ID from query parameters
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Order ID is required' });
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
    
    // Handle GET request - Get order details
    if (req.method === 'GET') {
      const order = await getCustomerOrderById(userId, id);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      return res.status(200).json({
        success: true,
        order
      });
    }
    
    // Handle PATCH request - Update order status
    if (req.method === 'PATCH') {
      const { status, note } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      // Check if user is admin (for admin-only status changes)
      const isAdmin = session.user.role === 'admin';
      
      // Regular users can only cancel their orders
      if (!isAdmin && status !== 'cancelled') {
        return res.status(403).json({ error: 'Unauthorized to change order status' });
      }
      
      const updatedOrder = await updateCustomerOrderStatus(userId, id, status, note);
      
      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        order: updatedOrder
      });
    }
    
    // Handle unsupported methods
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(`Error handling order ${id}:`, error);
    return res.status(500).json({
      error: 'Failed to process order request',
      message: error.message
    });
  }
}

// Apply middleware
export default withErrorHandling(handler);