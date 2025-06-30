import admin from "firebase-admin";
import { ensureFirebaseEnv } from './loadEnv';
import path from 'path';
import fs from 'fs';

if (typeof window === 'undefined') {
  // Ensure environment variables are loaded server-side
  ensureFirebaseEnv();
}

let isInitialized = false;

export const initAdmin = () => {
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

// Initialize immediately if not already done
if (!admin.apps.length) {
  try {
    initAdmin();
  } catch (error) {
    console.error('[firebase-admin] Failed to initialize:', error);
  }
}

export default admin;