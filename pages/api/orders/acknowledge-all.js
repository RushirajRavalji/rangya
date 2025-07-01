import { collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

/**
 * API endpoint to mark all unread orders as read
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

    // Query unread orders
    const ordersRef = collection(db, 'orders');
    const unreadOrdersQuery = query(
      ordersRef,
      where('isRead', '==', false)
    );
    
    const unreadOrdersSnapshot = await getDocs(unreadOrdersQuery);
    
    if (unreadOrdersSnapshot.empty) {
      return res.status(200).json({ 
        success: true, 
        message: 'No unread orders found',
        count: 0
      });
    }
    
    // Use a batch to update all documents
    const batch = writeBatch(db);
    
    unreadOrdersSnapshot.forEach(doc => {
      batch.update(doc.ref, { 
        isRead: true,
        lastUpdated: serverTimestamp()
      });
    });
    
    // Commit the batch
    await batch.commit();
    
    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: `${unreadOrdersSnapshot.size} orders marked as read`,
      count: unreadOrdersSnapshot.size
    });
  } catch (error) {
    console.error('Error marking all orders as read:', error);
    
    // Return generic error
    return res.status(500).json({ 
      error: 'Failed to mark orders as read',
      message: error.message
    });
  }
} 