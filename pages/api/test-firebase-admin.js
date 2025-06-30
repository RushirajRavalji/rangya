// Test API endpoint to check Firebase Admin SDK
import admin from '../../utils/firebase-admin';

export default async function handler(req, res) {
  try {
    // Check if Firebase Admin SDK is initialized
    const isInitialized = admin.apps.length > 0;
    
    // Try to access Firestore
    let firestoreTest = null;
    if (isInitialized) {
      try {
        // Try to get a document from Firestore
        const db = admin.firestore();
        const testDoc = await db.collection('products').limit(1).get();
        firestoreTest = {
          success: true,
          documentExists: !testDoc.empty,
          documentCount: testDoc.size
        };
      } catch (firestoreError) {
        firestoreTest = {
          success: false,
          error: firestoreError.message
        };
      }
    }
    
    // Return the status
    res.status(200).json({
      adminSdkInitialized: isInitialized,
      firestoreTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test-firebase-admin:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}