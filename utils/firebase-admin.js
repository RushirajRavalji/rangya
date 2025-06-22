import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Firebase Admin SDK initialization
let adminApp;

/**
 * Initialize Firebase Admin SDK if not already initialized
 * @returns {Object} Firebase Admin app instance
 */
export function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  
  // Check if we have the required environment variables
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  if (!privateKey || !clientEmail || !projectId) {
    console.error('Missing Firebase Admin SDK credentials in environment variables');
    throw new Error('Firebase Admin SDK credentials are not properly configured');
  }
  
  try {
    // Initialize Firebase Admin SDK
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        // The private key comes as a string with escaped newlines, so we need to replace them
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    
    console.log('Firebase Admin SDK initialized successfully');
    return adminApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}

/**
 * Get Firestore Admin instance
 * @returns {Object} Firestore Admin instance
 */
export function getAdminFirestore() {
  if (!adminApp && getApps().length === 0) {
    initAdmin();
  }
  return getFirestore();
}

/**
 * Get Auth Admin instance
 * @returns {Object} Auth Admin instance
 */
export function getAdminAuth() {
  if (!adminApp && getApps().length === 0) {
    initAdmin();
  }
  return getAuth();
}

/**
 * Get Storage Admin instance
 * @returns {Object} Storage Admin instance
 */
export function getAdminStorage() {
  if (!adminApp && getApps().length === 0) {
    initAdmin();
  }
  return getStorage();
}

export default {
  initAdmin,
  getAdminFirestore,
  getAdminAuth,
  getAdminStorage
}; 