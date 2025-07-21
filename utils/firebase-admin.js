// This module should only be imported server-side
const admin = typeof window === 'undefined' ? require('firebase-admin') : null;
const path = typeof window === 'undefined' ? require('path') : null;
const fs = typeof window === 'undefined' ? require('fs') : null;

// Create a dummy admin object for client-side
const dummyAdmin = {
  auth: () => ({
    listUsers: async () => ({ users: [] }),
    verifyIdToken: async () => ({}),
    createUser: async () => ({}),
    updateUser: async () => ({}),
    setCustomUserClaims: async () => ({}),
  }),
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => ({}) }),
        set: async () => ({}),
        update: async () => ({}),
      }),
      where: () => ({
        get: async () => ({ empty: true, docs: [] }),
      }),
    }),
  }),
  storage: () => ({
    bucket: () => ({
      file: () => ({
        getSignedUrl: async () => [''],
      }),
    }),
  }),
};

let isInitialized = false;

export const initAdmin = () => {
  // Only initialize on server-side
  if (typeof window !== 'undefined') {
    console.warn('[firebase-admin] Cannot initialize Firebase Admin on the client side');
    return dummyAdmin;
  }

  if (isInitialized || admin.apps.length > 0) {
    return admin;
  }

  try {
    // Load environment variables if needed
    const { ensureFirebaseEnv } = require('./loadEnv');
    ensureFirebaseEnv();

    let credentialConfig = null;
    
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        // Clean and format the private key properly
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        // Handle different private key formats
        if (privateKey) {
          // Replace escaped newlines with actual newlines
          privateKey = privateKey.replace(/\\n/g, '\n');
          
          // Ensure the key starts and ends with proper PEM markers
          if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            console.error('[firebase-admin] Private key missing BEGIN marker');
            throw new Error('Invalid private key format: missing BEGIN marker');
          }
          
          if (!privateKey.includes('-----END PRIVATE KEY-----')) {
            console.error('[firebase-admin] Private key missing END marker');
            throw new Error('Invalid private key format: missing END marker');
          }
        }
        
        credentialConfig = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        };
        
        console.log('[firebase-admin] Using environment variables for credentials');
      } catch (keyError) {
        console.error('[firebase-admin] Error processing private key from environment:', keyError);
        credentialConfig = null;
      }
    } else {
      // Fallback to serviceAccountKey.json if present
      try {
        const keyPath = path.join(process.cwd(), 'serviceAccountKey.json');
        if (fs.existsSync(keyPath)) {
          credentialConfig = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
          console.log('[firebase-admin] Loaded credentials from serviceAccountKey.json');
        }
      } catch (err) {
        console.error('[firebase-admin] Failed to load serviceAccountKey.json', err);
      }
    }

    if (!credentialConfig) {
      console.error('[firebase-admin] Missing Firebase Admin credentials. Please set env vars or provide serviceAccountKey.json');
      throw new Error('Firebase Admin credentials not found');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(credentialConfig),
      });
      isInitialized = true;
      console.log('[firebase-admin] Firebase Admin initialized successfully');
    }

    return admin;
  } catch (error) {
    console.error('[firebase-admin] Failed to initialize:', error);
    return dummyAdmin;
  }
};

// Initialize immediately if not already done and we're on the server side
if (typeof window === 'undefined' && !admin.apps.length) {
  try {
    initAdmin();
  } catch (error) {
    console.error('[firebase-admin] Failed to initialize:', error);
  }
}

// Export the admin SDK or a dummy object for client-side
export default typeof window === 'undefined' ? admin : dummyAdmin;