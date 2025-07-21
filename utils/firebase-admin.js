// This module should only be imported in server-side code (API routes, getServerSideProps)
// Importing it in client-side code will cause build errors

// Check if we're on the server side
const isServer = typeof window === 'undefined';

// Only import and initialize firebase-admin on the server
let admin = null;
let isInitialized = false;

if (isServer) {
  // We're on the server, safe to import
  admin = require("firebase-admin");
  const { ensureFirebaseEnv } = require('./loadEnv');
  const path = require('path');
  const fs = require('fs');
  
  // Ensure environment variables are loaded server-side
  ensureFirebaseEnv();
}

export const initAdmin = () => {
  // Only run on server
  if (!isServer) {
    console.error('Firebase Admin SDK can only be used on the server side');
    return null;
  }
  
  if (isInitialized || admin.apps.length > 0) {
    return admin;
  }

  let credentialConfig = null;
  
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    credentialConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
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
};

// Initialize immediately if on server
if (isServer && admin && !admin.apps.length) {
  try {
    initAdmin();
  } catch (error) {
    console.error('[firebase-admin] Failed to initialize:', error);
  }
}

// Export a dummy object for client-side that won't break builds
// but will show a clear error if someone tries to use it
const clientSideStub = new Proxy({}, {
  get: function(target, prop) {
    throw new Error(`Firebase Admin SDK (${prop}) cannot be used on the client side. Use it only in API routes or getServerSideProps.`);
  }
});

// Export the appropriate object based on environment
export default isServer ? admin : clientSideStub;