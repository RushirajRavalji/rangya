import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, limit, orderBy, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import AdminLayout from '../../../components/layout/AdminLayout';
import { FiAlertCircle, FiCheck, FiRefreshCw } from 'react-icons/fi';
import Head from 'next/head';

export default function TestPage() {
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [dbCollections, setDbCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);

  // Create a test notification
  const createTestNotification = async () => {
    try {
      setLoading(true);
      const notificationsRef = collection(db, 'adminNotifications');
      
      const testNotification = {
        type: 'test',
        title: 'Test Notification',
        message: `Test notification created at ${new Date().toLocaleString()}`,
        createdAt: serverTimestamp(),
        read: false
      };
      
      const docRef = await addDoc(notificationsRef, testNotification);
      setTestResult({
        success: true,
        id: docRef.id,
        message: 'Test notification created successfully!',
        data: testNotification
      });
      
      // Refresh the notifications list
      fetchNotifications();
    } catch (error) {
      console.error('Error creating test notification:', error);
      setTestResult({
        success: false,
        message: `Error creating notification: ${error.message}`,
        error
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a test order notification
  const createTestOrderNotification = async () => {
    try {
      setLoading(true);
      const notificationsRef = collection(db, 'adminNotifications');
      const orderNumber = `TEST-${Date.now().toString().slice(-8)}`;
      
      const testOrderNotification = {
        type: 'order',
        action: 'new',
        title: 'New Test Order',
        orderId: `test-${Date.now()}`,
        orderNumber,
        total: 1299.00,
        message: `New order #${orderNumber} received`,
        createdAt: serverTimestamp(),
        read: false
      };
      
      const docRef = await addDoc(notificationsRef, testOrderNotification);
      setTestResult({
        success: true,
        id: docRef.id,
        message: 'Test order notification created successfully!',
        data: testOrderNotification
      });
      
      // Refresh the notifications list
      fetchNotifications();
    } catch (error) {
      console.error('Error creating test order notification:', error);
      setTestResult({
        success: false,
        message: `Error creating order notification: ${error.message}`,
        error
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Create a test low stock notification
  const createTestLowStockNotification = async () => {
    try {
      setLoading(true);
      const notificationsRef = collection(db, 'adminNotifications');
      
      const testLowStockNotification = {
        type: 'low_stock',
        title: 'Low Stock Alert',
        productId: `test-product-${Date.now()}`,
        productName: 'Test Product',
        currentStock: 2,
        message: `Test Product is running low on stock (2 remaining)`,
        createdAt: serverTimestamp(),
        read: false
      };
      
      const docRef = await addDoc(notificationsRef, testLowStockNotification);
      setTestResult({
        success: true,
        id: docRef.id,
        message: 'Test low stock notification created successfully!',
        data: testLowStockNotification
      });
      
      // Refresh the notifications list
      fetchNotifications();
    } catch (error) {
      console.error('Error creating test low stock notification:', error);
      setTestResult({
        success: false,
        message: `Error creating low stock notification: ${error.message}`,
        error
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const notificationsRef = collection(db, 'adminNotifications');
      
      // Check if collection exists
      const testQuery = query(notificationsRef, limit(1));
      const testSnapshot = await getDocs(testQuery);
      console.log('Collection exists:', testSnapshot.size > 0 || testSnapshot.empty);
      
      // Get recent notifications
      const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      console.log('Found notifications:', querySnapshot.size);
      
      const notificationData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setNotifications(notificationData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // List Firestore collections
  const fetchFirestoreCollections = async () => {
    try {
      setLoadingCollections(true);
      // This is a workaround since Firestore doesn't have a direct API to list collections
      // We'll check specific collections we're interested in
      const collections = ['adminNotifications', 'orders'];
      const results = [];
      
      for (const collName of collections) {
        try {
          const collRef = collection(db, collName);
          const q = query(collRef, limit(1));
          const snapshot = await getDocs(q);
          results.push({
            name: collName,
            exists: true,
            empty: snapshot.empty,
            size: snapshot.size
          });
        } catch (error) {
          results.push({
            name: collName,
            exists: false,
            error: error.message
          });
        }
      }
      
      setDbCollections(results);
    } catch (error) {
      console.error('Error checking collections:', error);
    } finally {
      setLoadingCollections(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchNotifications();
    fetchFirestoreCollections();
  }, []);

  return (
    <AdminLayout title="Notification Testing">
      <Head>
        <title>Notification Testing | Admin</title>
      </Head>
      
      <div className="space-y-8">
        {/* Test Controls */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Notification System</h2>
          
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-gray-600">Create test notifications to verify the notification system is working correctly.</p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <button
                onClick={createTestNotification}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Test Notification'}
              </button>
              
              <button
                onClick={createTestOrderNotification}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Order Notification'}
              </button>
              
              <button
                onClick={createTestLowStockNotification}
                disabled={loading}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Low Stock Notification'}
              </button>
            </div>
            
            {/* Test Result */}
            {testResult && (
              <div className={`mt-4 p-4 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {testResult.success ? (
                      <FiCheck className="h-5 w-5 text-green-400" />
                    ) : (
                      <FiAlertCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResult.message}
                    </h3>
                    {testResult.success && testResult.id && (
                      <p className="mt-2 text-sm text-green-700">
                        Notification ID: {testResult.id}
                      </p>
                    )}
                    {!testResult.success && testResult.error && (
                      <p className="mt-2 text-sm text-red-700">
                        {testResult.error.toString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Firestore Collections */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Firestore Collections</h2>
            <button
              onClick={fetchFirestoreCollections}
              disabled={loadingCollections}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <FiRefreshCw className={`h-5 w-5 ${loadingCollections ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {loadingCollections ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Collection
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dbCollections.map((coll, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {coll.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {coll.exists ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Exists
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Not Found
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {coll.exists ? (
                          coll.empty ? 'Collection is empty' : `Contains at least ${coll.size} document(s)`
                        ) : (
                          coll.error || 'Collection does not exist'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Recent Notifications */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Notifications</h2>
            <button
              onClick={fetchNotifications}
              disabled={loadingNotifications}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <FiRefreshCw className={`h-5 w-5 ${loadingNotifications ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {loadingNotifications ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : notifications.length > 0 ? (
            <div className="overflow-hidden border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Read
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <tr key={notification.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {notification.type}
                        {notification.action && ` (${notification.action})`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {notification.message || notification.title || JSON.stringify(notification)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.createdAt.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.read ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Read
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Unread
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No notifications found</p>
              <p className="mt-2 text-sm text-gray-400">Create a test notification to verify the system</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}