import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  applyActionCode,
  connectAuthEmulator,
  browserLocalPersistence,
  setPersistence,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  connectFirestoreEmulator,
  limit
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Log Firebase environment variables status
console.log('Firebase environment variables status:');
console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ Present' : '✗ Missing');
console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✓ Present' : '✗ Missing');
console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✓ Present' : '✗ Missing');

// Check if we're running in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Firebase configuration - use environment variables first, fallback to hardcoded values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD_spb43jww6Pl9OFpIOMzg2LFrH-VbasQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "nikhils-jeans-website.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nikhils-jeans-website",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "nikhils-jeans-website.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "89588207516",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:89588207516:web:0cfbe407bb6d7cc8764259",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-ZHMF1GS857"
};

// Print out the current domain to help with debugging auth issues
if (typeof window !== 'undefined') {
  console.log('Current domain:', window.location.hostname);
  console.log('Auth domain being used:', firebaseConfig.authDomain);
  
  // Check if current domain matches auth domain or is localhost
  const isAuthorizedDomain = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === firebaseConfig.authDomain ||
    // Also allow Firebase default preview domains
    /\.web\.app$/.test(window.location.hostname) || 
    /\.firebaseapp\.com$/.test(window.location.hostname);
    
  if (!isAuthorizedDomain) {
    console.warn(`Warning: Current domain (${window.location.hostname}) may not be authorized for Firebase Authentication. This could cause Google sign-in to fail. Add this domain to your Firebase Console > Authentication > Sign-in Method > Authorized domains.`);
  }
}

// Check if we should use emulators
const useEmulators = process.env.USE_FIREBASE_EMULATOR === 'true';

// Validate required Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missingFields.length > 0) {
    console.error(`Missing Firebase configuration: ${missingFields.join(', ')}`);
    if (typeof window !== 'undefined') {
      console.error('Please check your .env.local file and ensure all Firebase configuration variables are set correctly.');
    }
    return false;
  }
  
  // Check for placeholder values - but allow them in development mode
  if (!isDevelopment) {
    const placeholderValues = Object.entries(firebaseConfig)
      .filter(([key, value]) => 
        value && (
          value.includes('your-') || 
          value.includes('replace-with-') ||
          value === 'your-api-key' ||
          value.includes('demo-')
        )
      )
      .map(([key]) => key);
    
    if (placeholderValues.length > 0) {
      console.error(`Firebase configuration contains placeholder values for: ${placeholderValues.join(', ')}`);
      return false;
    }
  }
  
  return true;
};

// Initialize Firebase only if configuration is valid
const isConfigValid = validateFirebaseConfig();

// Initialize Firebase
let app;
let auth;
let db;
let storage;
let functions;
let googleProvider;

try {
  if (isConfigValid || isDevelopment) {
    // Check if Firebase is already initialized
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    // Initialize Firebase services
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);
    
    // Set auth persistence
    if (typeof window !== 'undefined') {
      setPersistence(auth, browserLocalPersistence)
        .catch(error => {
          console.error('Error setting auth persistence:', error);
        });
    }
    
    // Connect to emulators in development if enabled
    if (isDevelopment && process.env.USE_FIREBASE_EMULATOR === 'true') {
      console.log('Using Firebase emulators');
      
      // Auth emulator
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      
      // Firestore emulator
      connectFirestoreEmulator(db, 'localhost', 8080);
      
      // Storage emulator
      connectStorageEmulator(storage, 'localhost', 9199);
      
      // Functions emulator
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
    
    googleProvider = new GoogleAuthProvider();
    
    console.log('Firebase initialized successfully');
  } else {
    console.error('Firebase initialization skipped due to invalid configuration');
    
    // Create mock objects for development
    if (isDevelopment) {
      console.warn('Creating mock Firebase objects for development');
      app = {};
      auth = { 
        currentUser: null,
        onAuthStateChanged: (callback) => {
          callback(null);
          return () => {}; // Return a no-op unsubscribe function
        }
      };
      db = {};
      storage = {};
      functions = {};
      googleProvider = {};
    }
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  
  // Create empty objects to prevent app from crashing
  if (!app) app = {};
  if (!auth) {
    auth = { 
      currentUser: null,
      onAuthStateChanged: (callback) => {
        callback(null);
        return () => {}; // Return a no-op unsubscribe function
      }
    };
  }
  if (!db) db = {};
  if (!storage) storage = {};
  if (!functions) functions = {};
  if (!googleProvider) googleProvider = {};
}

/**
 * Checks if Firebase Auth is properly initialized
 * @returns {Object} Status of Firebase Auth initialization
 */
export function checkFirebaseAuth() {
  return {
    isInitialized: !!auth && !!auth.app,
    error: !auth ? "Firebase Auth not initialized" : null
  };
}

/**
 * Test Firestore connection by fetching a sample document
 * @returns {Promise<Object>} Connection test results
 */
export const testFirestoreConnection = async () => {
  try {
    if (!db || !db.collection) {
      return {
        connected: false,
        error: "Firestore not properly initialized"
      };
    }
    
    const productsRef = collection(db, 'products');
    const q = query(productsRef, limit(1));
    const querySnapshot = await getDocs(q);
    
    const result = {
      connected: true,
      count: querySnapshot.size,
      sampleIds: querySnapshot.docs.map(doc => doc.id),
      firstProduct: querySnapshot.size > 0 ? querySnapshot.docs[0].data() : null
    };
    
    return result;
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    return {
      connected: false,
      error: error.message
    };
  }
};

// Export initialized Firebase services
export { 
  app, 
  auth, 
  db, 
  storage, 
  functions,
  googleProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  applyActionCode,
  onAuthStateChanged,
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp
};