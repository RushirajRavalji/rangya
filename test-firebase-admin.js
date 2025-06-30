// Test script for Firebase Admin SDK
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Manual implementation of loading env variables
function loadEnvVariables() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      console.log('No .env.local file found');
      return;
    }

    console.log('.env.local file found, loading variables...');
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      // Ignore comments and empty lines
      if (!line || line.trim().startsWith('#')) continue;

      const idx = line.indexOf('=');
      if (idx === -1) continue;

      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();

      // Remove surrounding quotes if they exist
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')) ) {
        value = value.slice(1, -1);
      }

      // Unescape \n so that multiline private keys work
      value = value.replace(/\\n/g, '\n');

      if (!process.env[key]) {
        process.env[key] = value;
        console.log(`Set ${key} from .env.local`);
      }
    }
  } catch (err) {
    console.error('Failed to load .env.local', err);
  }
}

// Load environment variables
loadEnvVariables();

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  try {
    if (admin.apps.length > 0) {
      console.log('Firebase Admin SDK already initialized');
      return admin;
    }

    let credentialConfig = null;

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('Using environment variables for Firebase Admin SDK credentials');
      credentialConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    } else {
      // Fallback to serviceAccountKey.json if present
      try {
        const keyPath = path.join(process.cwd(), 'serviceAccountKey.json');
        if (fs.existsSync(keyPath)) {
          console.log('Loading credentials from serviceAccountKey.json');
          credentialConfig = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        }
      } catch (err) {
        console.error('Failed to load serviceAccountKey.json', err);
      }
    }

    if (!credentialConfig) {
      console.error('Missing Firebase Admin credentials. Please set env vars or provide serviceAccountKey.json');
      return null;
    }

    console.log('Initializing Firebase Admin SDK with project ID:', credentialConfig.projectId);
    admin.initializeApp({
      credential: admin.credential.cert(credentialConfig),
    });

    console.log('Firebase Admin SDK initialized successfully');
    return admin;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    return null;
  }
}

// Test Firebase Admin SDK
async function testFirebaseAdmin() {
  try {
    const adminApp = initializeFirebaseAdmin();
    if (!adminApp) {
      console.error('Failed to initialize Firebase Admin SDK');
      return;
    }

    console.log('Testing Firestore connection...');
    const db = adminApp.firestore();
    const testCollection = db.collection('products');
    const snapshot = await testCollection.limit(1).get();

    console.log('Firestore connection successful');
    console.log('Documents found:', snapshot.size);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      console.log('Sample document ID:', doc.id);
      console.log('Sample document data:', doc.data());
    }
  } catch (error) {
    console.error('Error testing Firebase Admin SDK:', error);
  }
}

// Run the test
testFirebaseAdmin();