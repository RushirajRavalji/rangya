const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

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

// Email to add as admin
const adminEmail = 'driger.ray.dranzer@gmail.com';

async function addAdminUser() {
  try {
    console.log(`Adding ${adminEmail} as admin...`);
    
    // Check if user document exists in Firestore
    const userSnapshot = await getDoc(doc(db, 'users', adminEmail));
    
    if (userSnapshot.exists()) {
      // Update existing user to admin role
      await setDoc(doc(db, 'users', adminEmail), {
        role: 'admin',
        updatedAt: new Date()
      }, { merge: true });
      console.log(`✅ Updated existing user ${adminEmail} to admin role`);
    } else {
      // Create new user with admin role
      await setDoc(doc(db, 'users', adminEmail), {
        email: adminEmail,
        role: 'admin',
        emailVerified: true,
        createdAt: new Date()
      });
      console.log(`✅ Created new admin user: ${adminEmail}`);
    }
    
    console.log('Admin user added successfully!');
  } catch (error) {
    console.error('Error adding admin user:', error);
  }
}

// Run the function
addAdminUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  }); 