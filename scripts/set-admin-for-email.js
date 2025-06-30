const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// User ID to add as admin (since email field is not available)
const userId = '0oeS0u2lHyOJM6z9atFnhXqJM293';
const adminEmail = 'driger.ray.dranzer@gmail.com'; // Keep for reference

async function setAdminRole() {
  try {
    console.log(`Setting user with ID ${userId} as admin...`);
    
    // Get user document directly by ID
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log(`❌ No user found with ID: ${userId}`);
      return;
    }
    
    // Update user role to admin
    console.log(`Found user with ID: ${userId}`);
    
    await setDoc(userDocRef, {
      role: 'admin',
      email: adminEmail, // Add email field if it doesn't exist
      updatedAt: new Date()
    }, { merge: true });
    
    console.log(`✅ Updated user ${userId} to admin role`);
    console.log(`Admin role set for user with ID ${userId} and email ${adminEmail}`);
    console.log('Please log out and log back in for the changes to take effect.');
  } catch (error) {
    console.error('Error setting admin role:', error);
  }
}

// Run the function
setAdminRole().then(() => {
  console.log('Script completed.');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});