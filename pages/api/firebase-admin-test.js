// Simple test for Firebase Admin SDK
import admin from '../../utils/firebase-admin';

export default async function handler(req, res) {
  try {
    // Check if Firebase Admin SDK is initialized
    const isInitialized = admin.apps.length > 0;
    
    // Return basic information
    res.status(200).json({
      adminSdkInitialized: isInitialized,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in firebase-admin-test:', error);
    res.status(500).json({
      error: error.message
    });
  }
}