// This script seeds initial product data to Firebase
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } = require('firebase/firestore');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Sample product data - empty array as we want only admin-added products
const sampleProducts = [];

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to seed products
async function seedProducts() {
  try {
    console.log('Starting product seeding...');
    
    // Check if products already exist
    const productsRef = collection(db, 'products');
    const existingProducts = await getDocs(productsRef);
    
    if (!existingProducts.empty) {
      console.log(`Found ${existingProducts.size} existing products. Skipping seeding.`);
      console.log('If you want to reseed, please delete existing products first.');
      return;
    }
    
    // Add products to Firestore
    const addedProducts = [];
    
    for (const product of sampleProducts) {
      // Check if product with this slug already exists
      const q = query(productsRef, where('slug', '==', product.slug));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log(`Product with slug '${product.slug}' already exists. Skipping.`);
        continue;
      }
      
      // Add timestamps
      const productWithTimestamps = {
        ...product,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add to Firestore
      const docRef = await addDoc(productsRef, productWithTimestamps);
      addedProducts.push({ id: docRef.id, slug: product.slug });
      
      console.log(`Added product: ${product.name_en} (${docRef.id})`);
    }
    
    console.log(`Successfully added ${addedProducts.length} products to Firestore.`);
    if (addedProducts.length > 0) {
      console.log('Product IDs:');
      addedProducts.forEach(p => console.log(`- ${p.slug}: ${p.id}`));
    } else {
      console.log('No sample products were added. Products should be added through the admin panel.');
    }
    
  } catch (error) {
    console.error('Error seeding products:', error);
  }
}

// Run the seeding function
seedProducts().then(() => {
  console.log('Seeding process completed.');
  process.exit(0);
}).catch(error => {
  console.error('Seeding process failed:', error);
  process.exit(1);
}); 