import React, { useState } from 'react';
import { FiPlus, FiLoader } from 'react-icons/fi';
import { db } from '../../utils/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Component to create test orders for notification testing
 */
const TestOrderCreator = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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

  const handleCreateTestOrder = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      console.log('Creating test order for notification...');
      console.log('Firestore instance:', db);
      
      // Generate random data
      const orderNumber = generateOrderNumber();
      const customerName = generateCustomerName();
      const totalAmount = generateTotalAmount();
      
      console.log('Generated order data:', { orderNumber, customerName, totalAmount });
      
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
      
      console.log('Test order object created:', testOrder);
      console.log('Attempting to add to Firestore collection "orders"...');
      
      // Add directly to main orders collection
      const ordersRef = collection(db, 'orders');
      console.log('Orders collection reference:', ordersRef);
      
      const orderRef = await addDoc(ordersRef, testOrder);
      console.log('Order successfully added with ID:', orderRef.id);
      
      setResult({
        success: true,
        orderId: orderRef.id,
        orderNumber,
        customerName,
        total: totalAmount
      });
      
      // Trigger a browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Test Order Created', {
          body: `Order #${orderNumber} created for notification testing`,
          icon: '/images/logo/logo.png'
        });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
      
    } catch (err) {
      console.error('Error creating test order:', err);
      setError(err.message || 'Failed to create test order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Test Order Creator</h2>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Create test orders to verify the notification system functionality.
          Each test order will appear as a new notification.
        </p>
        
        <button
          onClick={handleCreateTestOrder}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <FiLoader className="animate-spin mr-2" />
              Creating...
            </>
          ) : (
            <>
              <FiPlus className="mr-2" />
              Create Test Order
            </>
          )}
        </button>
        
        {result && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-sm font-medium text-green-800">Order created successfully!</h3>
            <ul className="mt-2 text-sm text-green-700">
              <li><strong>Order ID:</strong> {result.orderId}</li>
              <li><strong>Order #:</strong> {result.orderNumber}</li>
              <li><strong>Customer:</strong> {result.customerName}</li>
              <li><strong>Total:</strong> ₹{result.total.toFixed(2)}</li>
            </ul>
            <p className="mt-2 text-sm text-green-700">
              This order should now appear in your notifications.
              <br />
              Try refreshing the notifications page if it doesn't appear immediately.
            </p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <p className="mt-1 text-xs text-red-600">
              Make sure Firebase is properly configured and you have permission to write to the orders collection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestOrderCreator; 