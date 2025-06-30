const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase Admin SDK already initialized');
      return admin;
    }

    // Try to load service account key
    let serviceAccount;
    try {
      const keyPath = path.join(process.cwd(), 'serviceAccountKey.json');
      if (fs.existsSync(keyPath)) {
        serviceAccount = require(keyPath);
        console.log('Loaded credentials from serviceAccountKey.json');
      }
    } catch (err) {
      console.error('Failed to load serviceAccountKey.json', err);
    }

    if (!serviceAccount) {
      console.error('Missing Firebase Admin credentials. Please provide serviceAccountKey.json');
      return null;
    }

    // Initialize the app
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase Admin SDK initialized successfully');
    return admin;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    return null;
  }
}

// Set admin role for a user by email
async function setAdminRole() {
  const adminApp = initializeFirebaseAdmin();
  if (!adminApp) {
    console.error('Failed to initialize Firebase Admin SDK');
    return;
  }

  const db = adminApp.firestore();
  const email = 'driger.ray.dranzer@gmail.com';

  try {
    console.log(`Setting admin role for user with email: ${email}`);

    // Find user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      console.log(`No user found with email: ${email}`);
      console.log('Creating a new user with admin role...');
      
      // Create a new user document with admin role
      await db.collection('users').doc().set({
        email: email,
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Created new user with email ${email} and admin role`);
    } else {
      // Update existing user
      let updateCount = 0;
      for (const doc of snapshot.docs) {
        await doc.ref.update({
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        updateCount++;
        console.log(`Updated user ${doc.id} to admin role`);
      }
      
      console.log(`Admin role set for ${updateCount} user(s) with email ${email}`);
    }
    
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