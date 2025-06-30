import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import Link from 'next/link';

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const notificationsRef = collection(db, 'admin_notifications');
        const q = query(
          notificationsRef,
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        
        const querySnapshot = await getDocs(q);
        const notificationData = [];
        
        querySnapshot.forEach((doc) => {
          notificationData.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          });
        });
        
        setNotifications(notificationData);
        setUnreadCount(notificationData.filter(n => !n.read).length);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError('Failed to load notifications');
        setLoading(false);
      }
    };
    
    fetchNotifications();
    
    // Set up interval to check for new notifications
    const intervalId = setInterval(fetchNotifications, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'admin_notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      ));
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };
  
  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Update each notification in Firestore
      const updatePromises = unreadNotifications.map(notification => {
        const notificationRef = doc(db, 'admin_notifications', notification.id);
        return updateDoc(notificationRef, { read: true });
      });
      
      await Promise.all(updatePromises);
      
      // Update local state
      setNotifications(notifications.map(notification => ({ ...notification, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };
  
  // Toggle notifications panel
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };
  
  // Format notification message based on type
  const formatNotificationMessage = (notification) => {
    switch (notification.type) {
      case 'review':
        switch (notification.action) {
          case 'new':
            return `New review submitted for product ${notification.productId}`;
          case 'update':
            return `Review updated for product ${notification.productId}`;
          case 'report':
            return `Review reported for product ${notification.productId}`;
          default:
            return `Review action: ${notification.action}`;
        }
      
      case 'low_stock':
        return `Low stock alert: ${notification.productName} (${notification.currentStock} remaining)`;
      
      case 'order':
        return `New order #${notification.orderId} (${notification.total})`;
      
      case 'payment':
        return `Payment ${notification.status} for order #${notification.orderId}`;
      
      case 'user':
        return `New user registered: ${notification.userEmail}`;
      
      default:
        return `Notification: ${notification.message || JSON.stringify(notification)}`;
    }
  };
  
  // Get notification link based on type
  const getNotificationLink = (notification) => {
    switch (notification.type) {
      case 'review':
        return `/admin/products/edit/${notification.productId}?tab=reviews`;
      
      case 'low_stock':
        return `/admin/products/edit/${notification.productId}`;
      
      case 'order':
        return `/admin/orders/${notification.orderId}`;
      
      case 'user':
        return `/admin/users`;
      
      default:
        return '#';
    }
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (notification) => {
    switch (notification.type) {
      case 'review':
        return '📝';
      
      case 'low_stock':
        return '⚠️';
      
      case 'order':
        return '🛒';
      
      case 'payment':
        return '💰';
      
      case 'user':
        return '👤';
      
      default:
        return '🔔';
    }
  };
  
  // Format date
  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // Less than a week
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    
    // Format as date
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button 
        onClick={toggleNotifications}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        aria-label="Notifications"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* Notifications Panel */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50">
          <div className="py-2 px-3 bg-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-4 text-center text-gray-500">Loading notifications...</div>
            ) : error ? (
              <div className="py-4 text-center text-red-500">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="py-4 text-center text-gray-500">No notifications</div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <Link 
                    href={getNotificationLink(notification)}
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <a className={`block px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition duration-150 ease-in-out ${!notification.read ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-start">
                        <div className="text-lg mr-2">
                          {getNotificationIcon(notification)}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${!notification.read ? 'font-semibold' : 'text-gray-700'}`}>
                            {formatNotificationMessage(notification)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                    </a>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          <div className="py-2 px-3 bg-gray-100 text-center">
            <Link href="/admin/notifications">
              <a className="text-xs text-blue-600 hover:text-blue-800">
                View all notifications
              </a>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications; 