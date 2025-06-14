import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Show notification toast
  const showNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const newNotification = {
      id,
      message,
      type,
      duration
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Auto dismiss after duration
    if (duration) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }
    
    return id;
  };
  
  // Dismiss notification
  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
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
    dismissNotification,
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
      
      {/* Notification Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`px-4 py-3 rounded-md shadow-lg flex items-center justify-between ${
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'error' ? 'bg-red-500 text-white' :
              notification.type === 'warning' ? 'bg-yellow-500 text-white' :
              'bg-indigo-deep text-white'
            } transition-opacity duration-300`}
          >
            <span>{notification.message}</span>
            <button 
              onClick={() => dismissNotification(notification.id)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      {/* Notification Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
        <AnimatePresence>
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`rounded-md shadow-lg border-l-4 ${getColorScheme(notification.type)}`}
            >
              <div className="p-4 flex items-start">
                <div className={`mr-3 flex-shrink-0 ${notification.type === 'success' ? 'text-green-500' : notification.type === 'error' ? 'text-red-500' : notification.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-medium">
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
} 