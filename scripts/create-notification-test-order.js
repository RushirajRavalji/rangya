// Script to add a test order to Firebase for notification testing
const { db } = require('../utils/firebase');
const { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc 
} = require('firebase/firestore');

// Generate random order number
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${timestamp}-${randomPart}`;
};

// Generate random customer name
const generateCustomerName = () => {
  const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Raj', 'Priya', 'Amit', 'Neha'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Patel', 'Sharma', 'Kumar', 'Singh'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}`;
};

// Generate random total amount
const generateTotalAmount = () => {
  return Math.floor(Math.random() * 10000) + 500; // Between 500 and 10500
};

async function createNotificationTestOrder() {
  try {
    console.log('Creating test order for notification...');
    
    // Generate random data
    const orderNumber = generateOrderNumber();
    const customerName = generateCustomerName();
    const totalAmount = generateTotalAmount();
    
    // Create test order data
    const testOrder = {
      orderNumber,
      customer: {
        name: customerName,
        email: `${customerName.toLowerCase().replace(' ', '.')}@example.com`
      },
      shippingAddress: {
        fullName: customerName,
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        postalCode: '123456',
        country: 'India',
        phone: '9876543210'
      },
      totalAmount,
      status: 'pending',
      paymentStatus: 'pending',
      isRead: false, // Important: this makes it appear in notifications
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      items: [
        {
          id: `product-${Math.floor(Math.random() * 1000)}`,
          name: 'Test Product',
          price: totalAmount / 2,
          quantity: 2,
          size: 'M'
        }
      ]
    };
    
    // Add directly to main orders collection
    const ordersRef = collection(db, 'orders');
    const orderRef = await addDoc(ordersRef, testOrder);
    
    console.log(`Test order created with ID: ${orderRef.id}`);
    console.log('Order details:');
    console.log(`- Order Number: ${orderNumber}`);
    console.log(`- Customer: ${customerName}`);
    console.log(`- Total Amount: ₹${totalAmount.toFixed(2)}`);
    console.log(`- Status: pending`);
    console.log(`- isRead: false (will appear in notifications)`);
    
    return orderRef.id;
  } catch (error) {
    console.error('Error creating test order:', error);
    throw error;
  }
}

// Execute the function
createNotificationTestOrder()
  .then((orderId) => {
    console.log(`\nTest order created successfully with ID: ${orderId}`);
    console.log('The order should now appear in the admin notifications panel.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to create test order:', error);
    process.exit(1);
  }); 