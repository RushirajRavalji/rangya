import React, { useState } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Head from 'next/head';
import TestOrderCreator from '../../../components/admin/TestOrderCreator';
import Link from 'next/link';
import { FiBell, FiArrowRight, FiDatabase, FiRefreshCw } from 'react-icons/fi';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../utils/firebase';

export default function TestNotifications() {
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Function to check for unread orders in Firestore
  const checkUnreadOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Checking for unread orders in Firestore...');
      
      // Query orders where isRead is false
      const ordersRef = collection(db, 'orders');
      const unreadOrdersQuery = query(
        ordersRef,
        where('isRead', '==', false)
      );
      
      const unreadOrdersSnapshot = await getDocs(unreadOrdersQuery);
      
      // Get all orders
      const allOrdersSnapshot = await getDocs(ordersRef);
      
      // Prepare debug info
      const info = {
        totalOrders: allOrdersSnapshot.size,
        unreadOrders: unreadOrdersSnapshot.size,
        unreadOrdersList: unreadOrdersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            orderNumber: data.orderNumber || doc.id.substring(0, 8),
            customer: data.customer?.name || 'Unknown',
            total: data.totalAmount || data.total || 0,
            timestamp: data.createdAt ? data.createdAt.toDate().toISOString() : 'Unknown',
            isRead: data.isRead
          };
        })
      };
      
      setDebugInfo(info);
      console.log('Debug info:', info);
    } catch (err) {
      console.error('Error checking unread orders:', err);
      setError(err.message || 'Failed to check unread orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Test Notifications">
      <Head>
        <title>Test Notifications | Rangya Admin</title>
      </Head>
      
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Notification System Testing</h1>
          <p className="text-gray-600 mb-4">
            This page allows you to test the notification system by creating test orders and viewing them in the notification center.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
            <Link 
              href="/admin/notifications" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiBell className="mr-2" /> View Notifications
            </Link>
            
            <Link 
              href="/admin/orders" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FiArrowRight className="mr-2" /> View All Orders
            </Link>
            
            <button
              onClick={checkUnreadOrders}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="mr-2 animate-spin" /> Checking...
                </>
              ) : (
                <>
                  <FiDatabase className="mr-2" /> Check Unread Orders
                </>
              )}
            </button>
          </div>
        </div>
        
        <TestOrderCreator />
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {debugInfo && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Database Debug Info</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-xl font-semibold">{debugInfo.totalOrders}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-500">Unread Orders</p>
                  <p className="text-xl font-semibold">{debugInfo.unreadOrders}</p>
                </div>
              </div>
              
              {debugInfo.unreadOrders > 0 ? (
                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2">Unread Orders List</h3>
                  <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {debugInfo.unreadOrdersList.map(order => (
                          <tr key={order.id}>
                            <td className="px-4 py-2 text-xs text-gray-500">{order.id}</td>
                            <td className="px-4 py-2 text-xs">{order.orderNumber}</td>
                            <td className="px-4 py-2 text-xs">{order.customer}</td>
                            <td className="px-4 py-2 text-xs">₹{order.total.toFixed(2)}</td>
                            <td className="px-4 py-2 text-xs">{new Date(order.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-4">No unread orders found in the database.</p>
              )}
            </div>
          </div>
        )}
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">How to Test</h2>
          
          <ol className="list-decimal pl-5 space-y-3 text-gray-600">
            <li>
              <strong>Create a test order</strong> using the button above. This will create a new order with random data.
            </li>
            <li>
              <strong>Check the notification bell</strong> in the top right corner of the admin panel. You should see a new notification.
            </li>
            <li>
              <strong>View notifications</strong> by clicking on the bell or the "View Notifications" button above.
            </li>
            <li>
              <strong>Mark as read</strong> by clicking the tick mark button next to a notification.
            </li>
            <li>
              <strong>Verify in Orders page</strong> that the order still exists even after marking the notification as read.
            </li>
          </ol>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-sm font-medium text-yellow-800">Troubleshooting</h3>
            <ul className="mt-2 text-sm text-yellow-700 list-disc pl-5 space-y-1">
              <li>If notifications don't appear, check the console for errors.</li>
              <li>Use the "Check Unread Orders" button to verify if orders with isRead=false exist in the database.</li>
              <li>Try refreshing the notifications page after creating a test order.</li>
              <li>Ensure your Firebase configuration is correct and you have write permissions.</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 