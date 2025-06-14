// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAuth, Auth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase - check if already initialized
let app: FirebaseApp;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
  // Initialize with a fallback in case there was an error
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

// Initialize Analytics only on client side
let analytics: Analytics | null = null;
try {
  analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
} catch (error) {
  console.error("Error initializing Firebase Analytics:", error);
}

// Initialize Firestore
let db: Firestore | null = null;
try {
  db = getFirestore(app);
} catch (error) {
  console.error("Error initializing Firestore:", error);
}

// Initialize Storage
let storage: FirebaseStorage | null = null;
try {
  storage = getStorage(app);
} catch (error) {
  console.error("Error initializing Firebase Storage:", error);
}

// Initialize Auth
let auth: Auth | null = null;
try {
  auth = getAuth(app);
} catch (error) {
  console.error("Error initializing Firebase Auth:", error);
}

export { app, analytics, db, storage, auth }; 