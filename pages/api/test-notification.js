import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const notificationsRef = collection(db, 'adminNotifications');
    
    const testNotification = {
      type: 'test',
      title: 'Test Notification',
      message: `Test notification created at ${new Date().toLocaleString()}`,
      createdAt: serverTimestamp(),
      read: false
    };
    
    const docRef = await addDoc(notificationsRef, testNotification);
    
    return res.status(200).json({
      success: true,
      id: docRef.id,
      message: 'Test notification created successfully!'
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    return res.status(500).json({
      success: false,
      message: `Error creating notification: ${error.message}`
    });
  }
} 