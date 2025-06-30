/**
 * Test script for customer orders subcollection functionality
 * 
 * This script tests the basic functionality of the customer orders subcollection:
 * 1. Creating a test order in a user's subcollection
 * 2. Retrieving the order from the subcollection
 * 3. Updating the order status
 * 
 * Usage: 
 * 1. Run this script from the project root: node scripts/testCustomerOrders.js <userId>
 * 2. The script will log results to the console
 */

// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp 
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

// Get userId from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.error('Please provide a user ID as a command line argument');
  console.error('Usage: node scripts/testCustomerOrders.js <userId>');
  process.exit(1);
}

/**
 * Test customer orders functionality
 */
async function testCustomerOrders() {
  console.log(`Testing customer orders for user: ${userId}`);
  
  try {
    // 1. Create a test order
    console.log('\n1. Creating test order...');
    
    const testOrder = {
      userId: userId,
      status: 'pending',
      items: [
        {
          id: 'test-product-1',
          name: 'Test Product 1',
          price: 19.99,
          quantity: 2,
          size: 'M',
          image: 'https://example.com/test-product-1.jpg'
        },
        {
          id: 'test-product-2',
          name: 'Test Product 2',
          price: 29.99,
          quantity: 1,
          size: 'L',
          image: 'https://example.com/test-product-2.jpg'
        }
      ],
      customer: {
        fullName: 'Test Customer',
        email: 'test@example.com',
        phone: '123-456-7890'
      },
      shipping: {
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country'
        },
        method: 'standard',
        cost: 5.99
      },
      payment: {
        method: 'credit_card',
        status: 'pending'
      },
      totals: {
        subtotal: 69.97,
        shipping: 5.99,
        tax: 7.00,
        total: 82.96
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      statusHistory: [
        {
          status: 'pending',
          timestamp: Timestamp.now(),
          note: 'Order created'
        }
      ]
    };
    
    // Create the order in the customer's subcollection
    const customerOrdersRef = collection(db, 'users', userId, 'orders');
    const docRef = await addDoc(customerOrdersRef, testOrder);
    
    console.log(`Order created with ID: ${docRef.id}`);
    
    // 2. Retrieve the order
    console.log('\n2. Retrieving the order...');
    
    const orderRef = doc(db, 'users', userId, 'orders', docRef.id);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      throw new Error('Order not found');
    }
    
    console.log('Order retrieved successfully:');
    console.log({
      id: orderDoc.id,
      ...orderDoc.data(),
      // Convert timestamps to strings for console output
      createdAt: orderDoc.data().createdAt ? orderDoc.data().createdAt.toDate().toISOString() : null,
      updatedAt: orderDoc.data().updatedAt ? orderDoc.data().updatedAt.toDate().toISOString() : null
    });
    
    // 3. Update the order status
    console.log('\n3. Updating order status...');
    
    const statusUpdate = {
      status: 'processing',
      updatedAt: serverTimestamp(),
      statusHistory: [...(orderDoc.data().statusHistory || []), {
        status: 'processing',
        timestamp: Timestamp.now(),
        note: 'Order status updated by test script'
      }]
    };
    
    await updateDoc(orderRef, statusUpdate);
    
    console.log('Order status updated successfully');
    
    // 4. Retrieve the updated order
    console.log('\n4. Retrieving the updated order...');
    
    const updatedOrderDoc = await getDoc(orderRef);
    
    console.log('Updated order:');
    console.log({
      id: updatedOrderDoc.id,
      ...updatedOrderDoc.data(),
      // Convert timestamps to strings for console output
      createdAt: updatedOrderDoc.data().createdAt ? updatedOrderDoc.data().createdAt.toDate().toISOString() : null,
      updatedAt: updatedOrderDoc.data().updatedAt ? updatedOrderDoc.data().updatedAt.toDate().toISOString() : null
    });
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testCustomerOrders()
  .then(() => {
    console.log('Test script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  });