import { deleteUser } from '../../../../utils/userService';
import admin from '../../../../utils/firebase-admin';

/**
 * API endpoint to delete a user
 * This is a server-side only operation that requires admin privileges
 */
export default async function handler(req, res) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from query params
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify the user is authenticated and has admin privileges
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Check if user is admin
      const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      
      if (!userData || userData.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      
      // Delete the user
      await deleteUser(userId);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
} 