// Script to add a test order to Firebase
const { db } = require('../utils/firebase');
const { collection, addDoc, serverTimestamp, doc, setDoc } = require('firebase/firestore');

// Sample order data
const testOrder = {
  items: [
    {
      id: 'test-product-1',
      name: 'Classic Denim Shirt',
      price: 2499,
      quantity: 2,
      size: 'M',
      image: 'https://via.placeholder.com/800x800?text=Denim+Shirt'
    },
    {
      id: 'test-product-2',
      name: 'Slim Fit Denim T-Shirt',
      price: 1499,
      quantity: 1,
      size: 'L',
      image: 'https://via.placeholder.com/800x800?text=Denim+TShirt'
    }
  ],
  status: 'pending',
  total: 6497, // 2499*2 + 1499
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  shippingAddress: {
    name: 'Test Customer',
    address: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    postalCode: '123456',
    country: 'India',
    phone: '9876543210'
  },
  paymentMethod: 'razorpay',
  paymentStatus: 'paid',
  customer: {
    name: 'Test Customer',
    email: 'test@example.com'
  }
};

async function addTestOrder() {
  try {
    // Create a test user if it doesn't exist
    const testUserId = 'test-user-123';
    const userRef = doc(db, 'users', testUserId);
    
    // Add user data
    await setDoc(userRef, {
      displayName: 'Test Customer',
      email: 'test@example.com',
      createdAt: serverTimestamp()
    }, { merge: true });
    
    // Add order to the user's orders subcollection
    const ordersRef = collection(db, 'users', testUserId, 'orders');
    const orderRef = await addDoc(ordersRef, testOrder);
    
    console.log(`Test order added with ID: ${orderRef.id}`);
    console.log('Order added to user:', testUserId);
    
    return orderRef.id;
  } catch (error) {
    console.error('Error adding test order:', error);
    throw error;
  }
}

// Execute the function
addTestOrder()
  .then(() => {
    console.log('Test order added successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to add test order:', error);
    process.exit(1);
  });