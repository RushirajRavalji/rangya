const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function listUsers() {
  try {
    console.log('Listing all users in the database...');
    
    // Get all users from the 'users' collection
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    if (querySnapshot.empty) {
      console.log('❌ No users found in the database.');
      return;
    }
    
    console.log(`Found ${querySnapshot.size} users:`);
    console.log('-----------------------------------');
    
    // Display each user's information
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      console.log(`User ID: ${doc.id}`);
      console.log(`Email: ${userData.email || 'N/A'}`);
      console.log(`Display Name: ${userData.displayName || 'N/A'}`);
      console.log(`Role: ${userData.role || 'user'}`);
      console.log('-----------------------------------');
    });
    
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

// Run the function
listUsers().then(() => {
  console.log('Script completed.');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});