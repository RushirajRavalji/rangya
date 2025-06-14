import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD_spb43jww6Pl9OFpIOMzg2LFrH-VbasQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "nikhils-jeans-website.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nikhils-jeans-website",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "nikhils-jeans-website.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "89588207516",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:89588207516:web:6a724c3a7aa92907764259",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-4BVSWZ754P"
};

// Log configuration status
console.log("Firebase configuration status:");
console.log(`API Key: ${firebaseConfig.apiKey ? '✓ Set' : '✗ Missing'}`);
console.log(`Auth Domain: ${firebaseConfig.authDomain ? '✓ Set' : '✗ Missing'}`);
console.log(`Project ID: ${firebaseConfig.projectId ? '✓ Set' : '✗ Missing'}`);

// Initialize Firebase
let app;
let auth;
let db;
let storage;
let functions;

try {
  console.log("Initializing Firebase...");
  app = initializeApp(firebaseConfig);
  
  // Initialize services
  try {
    auth = getAuth(app);
    console.log("Firebase Auth initialized successfully");
  } catch (authError) {
    console.error("Error initializing Firebase Auth:", authError);
    auth = null;
  }
  
  try {
    db = getFirestore(app);
    console.log("Firebase Firestore initialized successfully");
  } catch (dbError) {
    console.error("Error initializing Firebase Firestore:", dbError);
    db = null;
  }
  
  try {
    storage = getStorage(app);
    console.log("Firebase Storage initialized successfully");
  } catch (storageError) {
    console.error("Error initializing Firebase Storage:", storageError);
    storage = null;
  }
  
  try {
    functions = getFunctions(app);
    console.log("Firebase Functions initialized successfully");
  } catch (functionsError) {
    console.error("Error initializing Firebase Functions:", functionsError);
    functions = null;
  }
  
  console.log("Firebase services initialization completed");
} catch (error) {
  console.error("Critical error initializing Firebase:", error);
  throw new Error(`Firebase initialization failed: ${error.message}`);
}

// Export initialized Firebase services
export { app, auth, db, storage, functions }; 