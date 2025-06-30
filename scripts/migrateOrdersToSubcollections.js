/**
 * Migration script to move existing orders to customer subcollections
 * 
 * This script fetches all orders from the main 'orders' collection and creates
 * corresponding documents in each customer's 'orders' subcollection.
 * 
 * Usage: 
 * 1. Run this script from the project root: node scripts/migrateOrdersToSubcollections.js
 * 2. The script will log progress and results to the console
 */

// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  query, 
  getDocs, 
  doc, 
  setDoc, 
  writeBatch, 
  limit 
} = require('firebase/firestore');

// Load environment variables
require('dotenv').config();

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Migrate orders to customer subcollections
 */
async function migrateOrders() {
  console.log('Starting order migration...');
  
  try {
    // Get all orders from the main collection
    const ordersRef = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    
    if (ordersSnapshot.empty) {
      console.log('No orders found to migrate.');
      return;
    }
    
    console.log(`Found ${ordersSnapshot.size} orders to migrate.`);
    
    // Track statistics
    let migratedCount = 0;
    let errorCount = 0;
    let userOrderCounts = {};
    
    // Process orders in batches to avoid Firestore write limits
    const BATCH_SIZE = 500; // Firestore allows max 500 writes per batch
    let batch = writeBatch(db);
    let batchCount = 0;
    
    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data();
      const orderId = orderDoc.id;
      
      // Skip orders without a userId
      if (!orderData.userId) {
        console.warn(`Order ${orderId} has no userId, skipping...`);
        errorCount++;
        continue;
      }
      
      try {
        // Create a reference to the customer's order document
        const customerOrderRef = doc(db, 'users', orderData.userId, 'orders', orderId);
        
        // Add the order to the batch
        batch.set(customerOrderRef, orderData);
        
        // Track statistics
        userOrderCounts[orderData.userId] = (userOrderCounts[orderData.userId] || 0) + 1;
        migratedCount++;
        batchCount++;
        
        // Commit the batch when it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`Committed batch of ${batchCount} orders.`);
          batch = writeBatch(db);
          batchCount = 0;
        }
      } catch (error) {
        console.error(`Error migrating order ${orderId}:`, error);
        errorCount++;
      }
    }
    
    // Commit any remaining orders in the batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} orders.`);
    }
    
    // Print statistics
    console.log('\nMigration completed!');
    console.log(`Total orders processed: ${ordersSnapshot.size}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    // Print user order counts
    console.log('\nOrders per user:');
    Object.entries(userOrderCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by count (descending)
      .forEach(([userId, count]) => {
        console.log(`User ${userId}: ${count} orders`);
      });
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateOrders()
  .then(() => {
    console.log('Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });