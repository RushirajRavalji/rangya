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
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Collection references as functions to avoid initialization issues
const getUsersRef = () => collection(db, 'users');

/**
 * Get all users with optional filtering and pagination
 * @param {Object} options - Query options
 * @param {string} options.role - Filter by role
 * @param {number} options.limit - Limit results
 * @param {Object} options.lastDoc - Last document for pagination
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort order ('asc' or 'desc')
 * @returns {Promise<Array>} - Array of users
 */
export async function getAllUsers(options = {}) {
  try {
    const usersRef = getUsersRef();
    let q = query(usersRef);
    
    // Apply role filter
    if (options.role) {
      q = query(q, where('role', '==', options.role));
    }
    
    // Apply sorting
    const sortField = options.sortBy || 'createdAt';
    const sortDirection = options.sortOrder === 'asc' ? 'asc' : 'desc';
    q = query(q, orderBy(sortField, sortDirection));
    
    // Apply pagination
    if (options.lastDoc) {
      q = query(q, startAfter(options.lastDoc));
    }
    
    // Apply limit
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Get the last document for pagination
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    
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
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      role,
      updatedAt: serverTimestamp()
    });
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
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
} 