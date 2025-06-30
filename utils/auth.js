/**
 * Authentication utilities for secure user management
 */

import { auth, db } from './firebase';
import { 
  signOut, 
  sendEmailVerification, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import jwt from 'jsonwebtoken';

// JWT verification constants
let JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '1h';

// If JWT secret is not set in environment, use a fallback for development
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error("JWT_SECRET environment variable is not set. This is required for production.");
  } else {
    // In development, use a fallback secret but warn
    console.error("JWT_SECRET environment variable is not set. Using a fallback secret for development.");
    console.error("For production, set a permanent JWT_SECRET in your environment variables.");
    JWT_SECRET = 'development_fallback_secret_do_not_use_in_production_12345';
  }
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export const verifyJWT = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      maxAge: JWT_EXPIRY
    });
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return null;
  }
};

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
export const generateJWT = (user) => {
  const payload = {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role || 'customer'
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRY
  });
};

/**
 * Check if user's email is verified
 * @param {Object} user - Firebase user object
 * @returns {boolean} Whether email is verified
 */
export const isEmailVerified = (user) => {
  return user && user.emailVerified === true;
};

/**
 * Middleware to require email verification for sensitive operations
 * @param {function} handler - API route handler
 * @returns {function} Middleware function
 */
export const requireEmailVerification = (handler) => {
  return async (req, res) => {
    const user = auth.currentUser;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be logged in to perform this action'
      });
    }
    
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Email verification required',
        message: 'Please verify your email address before performing this action',
        verificationRequired: true
      });
    }
    
    return handler(req, res);
  };
};

/**
 * Send verification email to current user
 * @returns {Promise<boolean>} Whether email was sent successfully
 */
export const sendVerificationEmail = async () => {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('No authenticated user');
  }
  
  try {
    await sendEmailVerification(user);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

/**
 * Check if user has admin role
 * @param {string} uid - User ID
 * @returns {Promise<boolean>} Whether user is admin
 */
export const isAdmin = async (uid) => {
  if (!uid) return false;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    return userData.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Middleware to require admin role
 * @param {function} handler - API route handler
 * @returns {function} Middleware function
 */
export const requireAdmin = (handler) => {
  return async (req, res) => {
    const user = auth.currentUser;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be logged in to perform this action'
      });
    }
    
    const isUserAdmin = await isAdmin(user.uid);
    
    if (!isUserAdmin) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Admin privileges required for this action'
      });
    }
    
    return handler(req, res);
  };
};

/**
 * Update user password with security checks
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Whether password was updated successfully
 */
export const updateUserPassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('No authenticated user');
  }
  
  try {
    // Re-authenticate user before password change
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

/**
 * Secure logout function
 * @returns {Promise<void>}
 */
export const secureLogout = async () => {
  try {
    await signOut(auth);
    
    // Clear any auth-related cookies/storage
    if (typeof window !== 'undefined') {
      document.cookie = 'firebase-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'jwt-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
    }
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
};

export default {
  verifyJWT,
  generateJWT,
  isEmailVerified,
  requireEmailVerification,
  sendVerificationEmail,
  isAdmin,
  requireAdmin,
  updateUserPassword,
  secureLogout
}; 