import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';

// Create context
const ProductNotificationContext = createContext();

// Custom hook to use the product notification context
export const useProductNotification = () => useContext(ProductNotificationContext);

// Provider component
export const ProductNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { isAdmin } = useAuth();
  
  // Initialize notification sound
  const [notificationSound, setNotificationSound] = useState(null);
  
  useEffect(() => {
    // Only initialize sound in browser environment
    if (typeof window !== 'undefined') {
      const sound = new Audio('/sounds/notification.mp3');
      setNotificationSound(sound);
      
      // Load sound preferences from localStorage
      const savedSoundPreference = localStorage.getItem('productNotificationSound');
      if (savedSoundPreference !== null) {
        setSoundEnabled(savedSoundPreference === 'true');
      }
    }
  }, []);
  
  // Save sound preference when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('productNotificationSound', soundEnabled);
    }
  }, [soundEnabled]);
  
  // Toggle sound on/off
  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };
  
  // Fetch product notifications
  useEffect(() => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Query for product notifications that are not read
      const q = query(
        collection(db, 'adminNotifications'),
        where('type', '==', 'product'),
        where('read', '==', false)
      );
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const notificationsList = [];
        let count = 0;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          notificationsList.push({
            id: doc.id,
            ...data,
            timestamp: data.createdAt?.toDate() || new Date()
          });
          count++;
        });
        
        // Sort by timestamp (newest first)
        notificationsList.sort((a, b) => b.timestamp - a.timestamp);
        
        setNotifications(notificationsList);
        setUnreadCount(count);
        setLoading(false);
        
        // Play sound for new notifications if enabled
        if (count > 0 && soundEnabled && notificationSound) {
          notificationSound.play().catch(e => console.log('Error playing notification sound:', e));
        }
        
        // Show browser notification if supported
        if (count > 0 && Notification.permission === 'granted') {
          const latestNotification = notificationsList[0];
          new Notification('New Product Notification', {
            body: latestNotification.message || 'You have a new product notification',
            icon: '/logo.png'
          });
        }
      }, (err) => {
        console.error('Error fetching product notifications:', err);
        setError('Failed to load product notifications');
        setLoading(false);
      });
      
      // Clean up listener on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up product notifications listener:', err);
      setError('Failed to set up notifications');
      setLoading(false);
    }
  }, [isAdmin, soundEnabled, notificationSound]);
  
  // Mark a notification as read in Firebase and delete it
  const markAsRead = async (notificationId) => {
    try {
      console.log(`Marking product notification ${notificationId} as read and deleting it`);
      
      // Delete the notification document from Firebase
      const notificationRef = doc(db, 'adminNotifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        lastUpdated: serverTimestamp()
      });
      
      // Update local state by removing the notification
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      console.log(`Successfully marked product notification ${notificationId} as read and deleted it`);
      return true;
    } catch (err) {
      console.error('Error marking product notification as read and deleting it:', err);
      setError('Failed to mark product notification as read and delete it');
      return false;
    }
  };
  
  // Mark all notifications as read and delete them
  const markAllAsRead = async () => {
    try {
      console.log('Marking all product notifications as read and deleting them');
      
      if (notifications.length === 0) {
        console.log('No product notifications to mark as read and delete');
        return true;
      }
      
      const batch = writeBatch(db);
      
      // Update each notification in Firebase to mark as read
      notifications.forEach(notification => {
        const notificationRef = doc(db, 'adminNotifications', notification.id);
        batch.update(notificationRef, { 
          read: true,
          lastUpdated: serverTimestamp()
        });
      });
      
      // Commit the batch
      await batch.commit();
      
      // Clear local notifications
      setNotifications([]);
      setUnreadCount(0);
      
      console.log(`Successfully marked and deleted ${notifications.length} product notifications`);
      return true;
    } catch (err) {
      console.error('Error marking all product notifications as read and deleting them:', err);
      setError('Failed to mark all product notifications as read and delete them');
      return false;
    }
  };
  
  // Retry fetching notifications
  const retryFetch = () => {
    setLoading(true);
    setError(null);
    // The useEffect will handle the actual refetching
  };
  
  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  };
  
  // Context value
  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    retryFetch,
    soundEnabled,
    toggleSound,
    requestNotificationPermission
  };
  
  return (
    <ProductNotificationContext.Provider value={value}>
      {children}
    </ProductNotificationContext.Provider>
  );
};

export default ProductNotificationContext;