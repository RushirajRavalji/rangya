import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc,
  writeBatch,
  getDocs,
  serverTimestamp,
  or,
  collectionGroup
} from 'firebase/firestore';
import { db } from '../utils/firebase';

const AdminNotificationContext = createContext();

export function useAdminNotification() {
  return useContext(AdminNotificationContext);
}

export function AdminNotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const audioRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize audio element for notification sound
  useEffect(() => {
    try {
      audioRef.current = new Audio('/notification-sound.mp3');
      audioRef.current.volume = 0.5;
      
      // Test if the audio can be played
      audioRef.current.addEventListener('error', (e) => {
        console.warn('Notification sound could not be loaded:', e);
        setSoundEnabled(false);
      });
      
      // Preload the audio
      audioRef.current.load();
    } catch (err) {
      console.warn('Browser does not support audio playback:', err);
      setSoundEnabled(false);
    }
  }, []);

  // Play notification sound when new notifications arrive
  useEffect(() => {
    // Only play sound if:
    // 1. Sound is enabled
    // 2. Not the first load (lastNotificationCount is set)
    // 3. The count has increased
    // 4. Audio is available
    if (soundEnabled && lastNotificationCount > 0 && unreadCount > lastNotificationCount && audioRef.current) {
      playNotificationSound();
    }
    
    // Update the last count
    setLastNotificationCount(unreadCount);
  }, [unreadCount, lastNotificationCount, soundEnabled]);

  // Fetch unread orders from Firebase
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        console.log('Fetching notifications from Firebase...');
        console.log('Firestore db instance:', db);
        
        // Check if Firestore is initialized
        if (!db || !collection) {
          console.error('Firestore is not properly initialized');
          setError('Firestore is not properly initialized');
          setLoading(false);
          return;
        }
        
        // Query orders where isRead is false or doesn't exist
        try {
          const ordersRef = collection(db, 'orders');
          console.log('Orders collection reference:', ordersRef);
          
          // First, try to get orders where isRead is explicitly false
          const unreadOrdersQuery = query(
            ordersRef,
            where('isRead', '==', false)
          );
          
          console.log('Unread orders query:', unreadOrdersQuery);
          console.log('Query parameters:', {
            collection: 'orders',
            field: 'isRead',
            operator: '==',
            value: false
          });
          
          console.log('Setting up real-time listener for unread orders...');
          
          // Set up real-time listener
          const unsubscribe = onSnapshot(unreadOrdersQuery, async (snapshot) => {
            try {
              console.log(`Found ${snapshot.docs.length} unread orders`);
              console.log('Snapshot empty?', snapshot.empty);
              console.log('Snapshot metadata:', {
                hasPendingWrites: snapshot.metadata.hasPendingWrites,
                fromCache: snapshot.metadata.fromCache
              });
              
              // Map the order documents to notification objects
              const notificationsList = snapshot.docs.map(doc => {
                const orderData = doc.data();
                console.log(`Processing order ${doc.id}:`, orderData);
                
                return {
                  id: doc.id,
                  type: 'order',
                  title: 'New Order Received',
                  orderId: doc.id,
                  orderNumber: orderData.orderNumber || doc.id.substring(0, 8),
                  customerName: orderData.customer?.name || orderData.shippingAddress?.fullName || 'Guest Customer',
                  total: orderData.totalAmount || orderData.total || 0,
                  status: orderData.status || 'pending',
                  timestamp: orderData.createdAt?.toDate() || new Date(),
                  read: false
                };
              });
              
              console.log('Processed notifications:', notificationsList);
              
              // Sort notifications by timestamp client-side
              notificationsList.sort((a, b) => b.timestamp - a.timestamp);
              
              // Now also check for orders that don't have an isRead field at all
              // These are older orders that need to be included
              try {
                console.log('Checking for orders without isRead field...');
                const missingIsReadQuery = query(
                  ordersRef,
                  where('status', '==', 'pending')
                );
                
                const missingIsReadSnapshot = await getDocs(missingIsReadQuery);
                console.log(`Found ${missingIsReadSnapshot.docs.length} pending orders to check for missing isRead field`);
                
                // Filter to only include docs that don't have isRead field
                const additionalOrders = missingIsReadSnapshot.docs
                  .filter(doc => {
                    const data = doc.data();
                    return data.isRead === undefined;
                  })
                  .map(doc => {
                    const orderData = doc.data();
                    console.log(`Adding order without isRead field: ${doc.id}`, orderData);
                    
                    return {
                      id: doc.id,
                      type: 'order',
                      title: 'New Order Received',
                      orderId: doc.id,
                      orderNumber: orderData.orderNumber || doc.id.substring(0, 8),
                      customerName: orderData.customer?.name || orderData.shippingAddress?.fullName || 'Guest Customer',
                      total: orderData.totalAmount || orderData.total || 0,
                      status: orderData.status || 'pending',
                      timestamp: orderData.createdAt?.toDate() || new Date(),
                      read: false
                    };
                  });
                
                console.log(`Found ${additionalOrders.length} additional orders without isRead field`);
                
                // Combine both lists and sort again
                const combinedList = [...notificationsList, ...additionalOrders];
                combinedList.sort((a, b) => b.timestamp - a.timestamp);
                
                console.log(`Total notifications after combining: ${combinedList.length}`);
                setNotifications(combinedList);
                setUnreadCount(combinedList.length);
              } catch (innerError) {
                console.error('Error fetching orders without isRead field:', innerError);
                // Still use the main notification list even if this fails
                setNotifications(notificationsList);
                setUnreadCount(notificationsList.length);
              }
              
              setLoading(false);
            } catch (innerError) {
              console.error('Error processing notification data:', innerError);
              setError('Error processing notification data');
              setLoading(false);
            }
          }, (err) => {
            console.error('Error fetching notifications:', err);
            setError(err.message);
            setLoading(false);
          });
          
          return () => unsubscribe();
        } catch (firestoreError) {
          console.error('Error setting up Firestore query:', firestoreError);
          setError(`Firestore query error: ${firestoreError.message}`);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error setting up notifications listener:', err);
        setError('Failed to connect to notification system. Please try again.');
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, [retryCount]);

  // Function to retry fetching notifications
  const retryFetch = () => {
    console.log('Retrying notification fetch...');
    setError(null);
    setLoading(true);
    setRetryCount(prev => prev + 1);
  };

  // Mark a notification as read in Firebase and delete it
  const markAsRead = async (notificationId) => {
    try {
      console.log(`Marking notification ${notificationId} as read and deleting it`);
      
      // Delete the order document from Firebase
      const orderRef = doc(db, 'orders', notificationId);
      await updateDoc(orderRef, {
        isRead: true,
        lastUpdated: serverTimestamp()
      });
      
      // Update local state by removing the notification
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      console.log(`Successfully marked notification ${notificationId} as read and deleted it`);
      return true;
    } catch (err) {
      console.error('Error marking notification as read and deleting it:', err);
      setError('Failed to mark notification as read and delete it');
      return false;
    }
  };

  // Mark all notifications as read and delete them
  const markAllAsRead = async () => {
    try {
      console.log('Marking all notifications as read and deleting them');
      
      if (notifications.length === 0) {
        console.log('No notifications to mark as read and delete');
        return true;
      }
      
      const batch = writeBatch(db);
      
      // Update each order in Firebase to mark as read
      notifications.forEach(notification => {
        const orderRef = doc(db, 'orders', notification.id);
        batch.update(orderRef, { 
          isRead: true,
          lastUpdated: serverTimestamp()
        });
      });
      
      // Commit the batch
      await batch.commit();
      
      // Clear local notifications
      setNotifications([]);
      setUnreadCount(0);
      
      console.log(`Successfully marked and deleted ${notifications.length} notifications`);
      return true;
    } catch (err) {
      console.error('Error marking all notifications as read and deleting them:', err);
      setError('Failed to mark all notifications as read and delete them');
      return false;
    }
  };

  // Manually play the notification sound
  const playNotificationSound = () => {
    if (!soundEnabled || !audioRef.current) return;
    
    try {
      audioRef.current.currentTime = 0; // Reset to start
      
      // Create and play a notification using the Web Notifications API if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Order Received', {
          body: 'You have a new order notification',
          icon: '/images/logo/logo.png'
        });
      }
      
      // Also play the sound
      const playPromise = audioRef.current.play();
      
      // Handle play promise to catch any errors
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Error playing notification sound:', err);
          setSoundEnabled(false);
        });
      }
    } catch (err) {
      console.warn('Error playing notification sound:', err);
      setSoundEnabled(false);
    }
  };

  // Toggle notification sound
  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    retryFetch,
    playNotificationSound,
    soundEnabled,
    toggleSound
  };

  return (
    <AdminNotificationContext.Provider value={value}>
      {children}
    </AdminNotificationContext.Provider>
  );
}