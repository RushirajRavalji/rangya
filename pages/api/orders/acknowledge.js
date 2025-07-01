import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import { createError } from '../../../utils/errorHandler';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

/**
 * API endpoint to mark an order as acknowledged (read) in the notification system
 * @param {object} req - Next.js API request
 * @param {object} res - Next.js API response
 */
export default async function handler(req, res) {
  // Only allow PATCH requests
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    if (!session.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Get order ID from request body
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Update the order document in Firebase
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      isRead: true,
      lastUpdated: serverTimestamp()
    });

    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: `Order ${orderId} marked as acknowledged` 
    });
  } catch (error) {
    console.error('Error acknowledging order:', error);
    
    // Handle specific error types
    if (error.code === 'not-found') {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Return generic error
    return res.status(500).json({ 
      error: 'Failed to acknowledge order',
      message: error.message
    });
  }
} 