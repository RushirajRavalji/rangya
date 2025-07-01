import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { FiClock, FiFilter, FiArrowDown, FiArrowUp, FiCheck, FiLoader, FiAlertCircle, FiRefreshCw, FiVolume2, FiVolumeX } from 'react-icons/fi';
import Link from 'next/link';
import Head from 'next/head';
import { useAdminNotification } from '../../contexts/AdminNotificationContext';

export default function AdminNotifications() {
  const { 
    notifications: allNotifications, 
    markAsRead, 
    markAllAsRead,
    loading,
    error,
    retryFetch,
    soundEnabled,
    toggleSound
  } = useAdminNotification();
  
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, read, unread
  const [sortDirection, setSortDirection] = useState('desc'); // asc, desc
  const [processingIds, setProcessingIds] = useState([]);
  const [localError, setLocalError] = useState(null);

  // Log notifications for debugging
  useEffect(() => {
    console.log('Notifications from context:', allNotifications);
  }, [allNotifications]);

  // Apply filters and sorting
  useEffect(() => {
    if (!allNotifications) {
      setNotifications([]);
      return;
    }
    
    try {
      let filtered = [...allNotifications];
      
      // Apply read/unread filter
      if (filter === 'read') {
        filtered = filtered.filter(notification => notification.read);
      } else if (filter === 'unread') {
        filtered = filtered.filter(notification => !notification.read);
      }
      
      // Apply sorting
      filtered.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
      });
      
      setNotifications(filtered);
      console.log('Filtered notifications:', filtered);
    } catch (err) {
      console.error('Error filtering notifications:', err);
      setLocalError('Error processing notifications data');
    }
  }, [allNotifications, filter, sortDirection]);
  
  // Toggle sorting direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
  };
  
  // Handle marking a notification as read
  const handleMarkAsRead = async (notificationId) => {
    setProcessingIds(prev => [...prev, notificationId]);
    try {
      console.log(`Marking notification ${notificationId} as read`);
      const result = await markAsRead(notificationId);
      if (!result) {
        setLocalError('Failed to mark notification as read. Please try again.');
      } else {
        console.log(`Successfully marked notification ${notificationId} as read`);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setLocalError('Failed to mark notification as read. Please try again.');
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== notificationId));
    }
  };

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      console.log('Marking all notifications as read');
      const result = await markAllAsRead();
      if (!result) {
        setLocalError('Failed to mark all notifications as read. Please try again.');
      } else {
        console.log('Successfully marked all notifications as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setLocalError('Failed to mark all notifications as read. Please try again.');
    }
  };

  // Handle retry button click
  const handleRetry = () => {
    console.log('Refreshing notifications...');
    setLocalError(null);
    retryFetch();
  };
  
  // Format date
  const formatDate = (date) => {
    try {
      return new Date(date).toLocaleDateString();
    } catch (err) {
      return 'Invalid date';
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Handle sound toggle
  const handleToggleSound = () => {
    toggleSound();
  };

  // Determine if there's an error to display
  const displayError = error || localError;

  return (
    <AdminLayout title="Notifications">
      <Head>
        <title>Admin Notifications | Rangya</title>
      </Head>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Header with filters */}
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center flex-wrap gap-3">
          <h1 className="text-lg leading-6 font-medium text-gray-900">
            All Notifications
          </h1>
          
          <div className="flex items-center space-x-4">
            {/* Filter dropdown */}
            <div className="relative">
              <select
                className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                disabled={loading}
              >
                <option value="all">All</option>
                <option value="read">Read</option>
                <option value="unread">Unread</option>
              </select>
              <FiFilter className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Sort direction */}
            <button
              onClick={toggleSortDirection}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <span className="mr-1">Date</span> 
              {sortDirection === 'desc' ? <FiArrowDown /> : <FiArrowUp />}
            </button>
            
            {/* Mark all as read */}
            <button
              onClick={handleMarkAllAsRead}
              disabled={loading || notifications.length === 0}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <FiCheck className="mr-1" /> Mark all as read
            </button>
            
            {/* Sound toggle */}
            <button
              onClick={handleToggleSound}
              disabled={loading}
              className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 ${
                soundEnabled 
                  ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100' 
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
              title={soundEnabled ? "Disable notification sound" : "Enable notification sound"}
            >
              {soundEnabled ? <FiVolume2 /> : <FiVolumeX />}
            </button>
            
            {/* Refresh button */}
            <button
              onClick={handleRetry}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              title="Refresh notifications"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        
        {/* Notifications list */}
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-indigo-600 mb-4"></div>
              <p>Loading notifications...</p>
            </div>
          ) : displayError ? (
            <div className="py-12 text-center text-red-500">
              <FiAlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="mb-4">Error: {displayError}</p>
              <button 
                onClick={handleRetry}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <FiRefreshCw className="inline mr-2" /> Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>No notifications found</p>
              <div className="mt-2 text-sm text-gray-500">
                Try creating a test order from the <Link href="/admin/test/notifications" className="text-blue-600 hover:text-blue-800">test page</Link>
              </div>
              <button 
                onClick={handleRetry}
                className="mt-4 px-4 py-2 text-indigo-600 hover:text-indigo-800"
              >
                <FiRefreshCw className="inline mr-2" /> Refresh
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
              {notifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                      <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={processingIds.includes(notification.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-300 hover:bg-green-500 hover:border-green-500 hover:text-white transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          title="Mark as read"
                        >
                          {processingIds.includes(notification.id) ? (
                            <FiLoader className="animate-spin h-4 w-4" />
                          ) : (
                            <FiCheck className="h-4 w-4" />
                          )}
                      </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{notification.orderNumber || notification.orderId?.substring(0, 8)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.customerName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(notification.total)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(notification.timestamp)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${notification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            notification.status === 'shipped' ? 'bg-blue-100 text-blue-800' : 
                            notification.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {notification.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
} 