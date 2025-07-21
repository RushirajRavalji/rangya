import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  limit,
  startAfter,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import admin from './firebase-admin';

// Check if code is running on server or client
const isServer = typeof window === 'undefined';

// Collection references as functions to avoid initialization issues
const getUsersRef = () => collection(db, 'users');

/**
 * Get all users with optional filtering and pagination directly from Firebase Auth
 * @param {Object} options - Query options
 * @param {string} options.role - Filter by role
 * @param {number} options.limit - Limit results
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort order ('asc' or 'desc')
 * @returns {Promise<Array>} - Array of users
 */
export async function getAllUsers(options = {}) {
  // This function should only be called server-side
  if (!isServer) {
    console.warn('getAllUsers should only be called server-side');
    return [];
  }

  try {
    // Get users from Firebase Auth
    const { users: authUsers } = await admin.auth().listUsers();
    
    // Get user data from Firestore to merge with auth data
    const usersRef = getUsersRef();
    const querySnapshot = await getDocs(query(usersRef));
    
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

/**
 * Get a user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - User data or null if not found
 */
export async function getUserById(userId) {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}

/**
 * Update a user
 * @param {string} userId - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<void>}
 */
export async function updateUser(userId, userData) {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Add updated timestamp
    const dataWithTimestamp = {
      ...userData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(userRef, dataWithTimestamp);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Update a user's role
 * @param {string} userId - User ID
 * @param {string} role - New role ('admin', 'customer', etc.)
 * @returns {Promise<void>}
 */
export async function updateUserRole(userId, role) {
  try {
    // Update role in Firestore
    const userRef = doc(db, 'users', userId);
    
    // Check if user document exists
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // Update existing document
      await updateDoc(userRef, {
        role,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new document with role
      await setDoc(userRef, {
        id: userId,
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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

/**
 * Delete a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function deleteUser(userId) {
  // This function should only be called server-side
  if (!isServer) {
    console.warn('deleteUser should only be called server-side');
    throw new Error('This operation can only be performed server-side');
  }

  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    
    // Delete user from Firebase Auth if we're on the server
    if (isServer) {
      await admin.auth().deleteUser(userId);
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}