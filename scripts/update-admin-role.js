const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_spb43jww6Pl9OFpIOMzg2LFrH-VbasQ",
  authDomain: "nikhils-jeans-website.firebaseapp.com",
  projectId: "nikhils-jeans-website",
  storageBucket: "nikhils-jeans-website.firebasestorage.app",
  messagingSenderId: "89588207516",
  appId: "1:89588207516:web:0cfbe407bb6d7cc8764259",
  measurementId: "G-ZHMF1GS857"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Email to add as admin
const adminEmail = 'driger.ray.dranzer@gmail.com';

async function updateAdminRole() {
  try {
    console.log(`Setting ${adminEmail} as admin...`);
    
    // Find user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', adminEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`❌ No user found with email: ${adminEmail}`);
      console.log('Please make sure the user has registered and logged in at least once.');
      return;
    }
    
    // Update each matching user (should be only one)
    let updateCount = 0;
    for (const userDoc of querySnapshot.docs) {
      const userId = userDoc.id;
      console.log(`Found user with ID: ${userId}`);
      
      // Update user role to admin
      await updateDoc(doc(db, 'users', userId), {
        role: 'admin',
        updatedAt: new Date()
      });
      
      updateCount++;
      console.log(`✅ Updated user ${userId} to admin role`);
    }
    
    console.log(`Admin role set for ${updateCount} user(s) with email ${adminEmail}`);
    console.log('Please log out and log back in for the changes to take effect.');
  } catch (error) {
    console.error('Error setting admin role:', error);
  }
}

// Run the function
updateAdminRole().then(() => {
  console.log('Script completed.');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});