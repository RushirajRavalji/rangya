// API route for checking Firebase configuration status
// This is helpful for debugging authentication issues

import { auth, app, db } from '../../utils/firebase';
import { GoogleAuthProvider } from 'firebase/auth';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Check Firebase initialization
    const firebaseStatus = {
      auth: {
        isInitialized: !!auth && !!auth.app,
        currentUser: auth?.currentUser ? {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          emailVerified: auth.currentUser.emailVerified,
        } : null,
        authConfig: auth ? {
          apiKey: auth.app.options.apiKey ? "✓ Set" : "✗ Missing",
          authDomain: auth.app.options.authDomain ? "✓ Set" : "✗ Missing",
          persistence: "browserLocalPersistence"
        } : null,
        error: null
      },
      googleProvider: { success: false },
      firestore: {
        connected: false,
        error: null,
        products: {
          count: 0,
          sampleIds: [],
          firstProduct: null
        }
      }
    };
    
    // Check Google provider
    try {
      const provider = new GoogleAuthProvider();
      firebaseStatus.googleProvider = {
        success: true,
        provider: "Google provider initialized successfully"
      };
    } catch (error) {
      console.error('Error initializing Google provider:', error);
      firebaseStatus.googleProvider = {
        success: false,
        error: error.message
      };
    }
    
    // Check Firestore connection
    if (db) {
      try {
        // Try to fetch products as a test
        const productsQuery = query(collection(db, 'products'), limit(5));
        const productsSnapshot = await getDocs(productsQuery);
        
        const productIds = [];
        let firstProduct = null;
        
        productsSnapshot.forEach(doc => {
          const data = doc.data();
          productIds.push(doc.id);
          
          if (!firstProduct) {
            firstProduct = {
              id: doc.id,
              name: data.name || 'No name',
              category: data.category || 'No category',
              hasImages: !!(data.images && data.images.length)
            };
          }
        });
        
        firebaseStatus.firestore = {
          connected: true,
          error: null,
          products: {
            count: productsSnapshot.size,
            sampleIds: productIds,
            firstProduct
          }
        };
      } catch (error) {
        console.error('Error checking Firestore:', error);
        firebaseStatus.firestore = {
          connected: false,
          error: error.message,
          products: {
            count: 0,
            sampleIds: [],
            firstProduct: null
          }
        };
      }
    }
    
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      firebase: firebaseStatus,
      firebaseVersion: "10.14.1", // Update this if the version changes
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      }
    });
  } catch (error) {
    console.error('Error in check-firebase API:', error);
    
    return res.status(500).json({
      error: 'Failed to check Firebase configuration',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
} 