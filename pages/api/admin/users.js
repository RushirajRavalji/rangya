import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import admin from '../../../utils/firebase-admin';

// Helper function to get all users from Firebase Auth and Firestore
async function getAllUsers(options = {}) {
  try {
    // Get users from Firebase Auth
    const { users: authUsers } = await admin.auth().listUsers();
    
    // Get user data from Firestore to merge with auth data
    const db = admin.firestore();
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.get();
    
    // Create a map of user data from Firestore
    const firestoreUserData = {};
    querySnapshot.forEach((doc) => {
      firestoreUserData[doc.id] = doc.data();
    });
    
    // Merge auth and Firestore data
    let users = authUsers.map(authUser => {
      const userData = firestoreUserData[authUser.uid] || {};
      return {
        id: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName || userData.displayName || '',
        photoURL: authUser.photoURL || userData.photoURL || '',
        emailVerified: authUser.emailVerified,
        disabled: authUser.disabled,
        lastLogin: authUser.metadata?.lastSignInTime,
        createdAt: authUser.metadata?.creationTime,
        role: userData.role || 'customer',
        ...userData
      };
    });
    
    // Apply role filter if specified
    if (options.role) {
      users = users.filter(user => user.role === options.role);
    }
    
    // Apply sorting
    const sortField = options.sortBy || 'createdAt';
    const sortDirection = options.sortOrder === 'asc' ? 1 : -1;
    
    users.sort((a, b) => {
      const valueA = a[sortField] || '';
      const valueB = b[sortField] || '';
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection * valueA.localeCompare(valueB);
      }
      
      return sortDirection * (valueA > valueB ? 1 : -1);
    });
    
    // Apply limit if specified
    if (options.limit) {
      users = users.slice(0, options.limit);
    }
    
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

// Helper function to update a user's role
async function updateUserRole(userId, role) {
  try {
    // Update role in Firestore
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    
    // Check if user document exists
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // Update existing document
      await userRef.update({
        role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Create new document with role
      await userRef.set({
        id: userId,
        role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // If making a specific user admin, set them directly
    if (userId === 'AwnpQjIdTEU6bgC1BPOMwY6DfEF2' && role === 'admin') {
      console.log('Setting specified user as admin');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

// Helper function to delete a user
async function deleteUser(userId) {
  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    await userRef.delete();
    
    // Also delete from Firebase Auth if possible
    try {
      await admin.auth().deleteUser(userId);
    } catch (authError) {
      console.error('Error deleting user from Auth:', authError);
      // Continue even if Auth deletion fails
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Handle different HTTP methods
    if (req.method === 'GET') {
      const options = req.query;
      const users = await getAllUsers(options);
      return res.status(200).json(users);
    } 
    else if (req.method === 'PUT') {
      const { userId, role } = req.body;
      if (!userId || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      await updateUserRole(userId, role);
      return res.status(200).json({ success: true });
    }
    else if (req.method === 'DELETE') {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }
      
      await deleteUser(userId);
      return res.status(200).json({ success: true });
    }
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in users API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 