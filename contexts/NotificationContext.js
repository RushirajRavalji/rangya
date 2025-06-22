import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where, limit, serverTimestamp, addDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiXCircle, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationContext = createContext({
  notifications: [],
  addNotification: () => {},
  removeNotification: () => {},
  clearNotifications: () => {}
});

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  
  const { currentUser } = useAuth() || { currentUser: null };
  const userRole = currentUser?.userRole;

  // Clear notifications when user changes
  useEffect(() => {
    setNotifications([]);
  }, [currentUser?.uid]);

  // Generate a unique ID for each notification
  const generateId = useCallback(() => {
    return Math.random().toString(36).substring(2, 9);
  }, []);
  
  // Show a notification
  const showNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = generateId();
    
    setNotifications(prev => [
      ...prev,
      {
        id,
        message,
        type, // 'info', 'success', 'warning', 'error'
        duration
      }
    ]);
    
    return id;
  }, [generateId]);
  
  // Hide a notification
  const hideNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  // Auto-hide notifications after their duration
  useEffect(() => {
    const timers = notifications.map(notification => {
      // Don't auto-hide if duration is 0 or less
      if (notification.duration <= 0) return null;
      
      return setTimeout(() => {
        hideNotification(notification.id);
      }, notification.duration);
    });
    
    return () => {
      timers.forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [notifications, hideNotification]);
  
  // Create admin notification
  const createAdminNotification = async (title, message, type = 'info', link = null) => {
    try {
      const notificationsRef = collection(db, 'adminNotifications');
      await addDoc(notificationsRef, {
        title,
        message,
        type,
        link,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating admin notification:', error);
    }
  };
  
  // Mark admin notification as read
  const markAdminNotificationRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'adminNotifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Mark all admin notifications as read
  const markAllAdminNotificationsRead = async () => {
    try {
      const batch = writeBatch(db);
      adminNotifications.forEach(notification => {
        if (!notification.read) {
          const notificationRef = doc(db, 'adminNotifications', notification.id);
          batch.update(notificationRef, { read: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Listen for admin notifications
  useEffect(() => {
    if (currentUser && userRole === 'admin') {
      const notificationsRef = collection(db, 'adminNotifications');
      const q = query(
        notificationsRef,
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notificationsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setAdminNotifications(notificationsList);
        setAdminUnreadCount(notificationsList.filter(notification => !notification.read).length);
      });
      
      return () => unsubscribe();
    }
  }, [currentUser, userRole]);

  // Get the appropriate icon based on notification type
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="h-5 w-5" />;
      case 'error':
        return <FiXCircle className="h-5 w-5" />;
      case 'warning':
        return <FiAlertCircle className="h-5 w-5" />;
      default:
        return <FiInfo className="h-5 w-5" />;
    }
  };

  // Get the appropriate color scheme based on notification type
  const getColorScheme = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 text-green-800 border-green-500';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-500';
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-500';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-500';
    }
  };

  // Add a new notification
  const addNotification = (notification) => {
    const id = Date.now().toString();
    const newNotification = {
      id,
      ...notification,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-dismiss notifications after timeout if specified
    if (notification.timeout) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.timeout);
    }
    
    return id;
  };

  // Remove a notification by ID
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = {
    notifications,
    adminNotifications,
    unreadCount,
    adminUnreadCount,
    showNotification,
    hideNotification,
    createAdminNotification,
    markAdminNotificationRead,
    markAllAdminNotificationsRead,
    addNotification,
    removeNotification,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Notification component - Modified to be smaller and show only one notification */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-xs">
          {/* Only show the most recent notification */}
          <div
            key={notifications[0].id}
            className={`p-3 rounded-lg shadow-lg flex items-start ${
              notifications[0].type === 'success' ? 'bg-green-50 text-green-800 border-l-4 border-green-500' :
              notifications[0].type === 'error' ? 'bg-red-50 text-red-800 border-l-4 border-red-500' :
              notifications[0].type === 'warning' ? 'bg-yellow-50 text-yellow-800 border-l-4 border-yellow-500' :
              'bg-blue-50 text-blue-800 border-l-4 border-blue-500'
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{notifications[0].message}</p>
            </div>
            <button
              onClick={() => hideNotification(notifications[0].id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
              aria-label="Close notification"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
} 