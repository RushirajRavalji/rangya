import { db } from '../../../utils/firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import rateLimit from '../../../utils/rateLimit';

// Create a rate limiter that allows 10 requests per minute
const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users per interval
  limit: 10, // 10 requests per interval
});

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Apply rate limiting
  try {
    await limiter.check(res, 10, 'save-address');
  } catch (error) {
    return res.status(429).json({ message: 'Rate limit exceeded. Please try again later.' });
  }

  try {
    // Check if user is authenticated
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ message: 'You must be logged in to save an address' });
    }
    
    const userId = session.user.uid;
    const requestUserId = req.body.userId;

    // Ensure the userId in the request matches the authenticated user
    if (requestUserId && requestUserId !== userId) {
      return res.status(403).json({ message: 'User ID mismatch' });
    }

    // Get shipping info from request body
    const { shippingInfo } = req.body;

    if (!shippingInfo || !shippingInfo.fullName || !shippingInfo.address) {
      return res.status(400).json({ message: 'Missing required shipping information' });
    }

    // Check if user document exists
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      // Update existing user document
      await updateDoc(userRef, {
        shippingInfo,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Create new user document
      await setDoc(userRef, {
        shippingInfo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Shipping address saved successfully'
    });

  } catch (error) {
    console.error('Error saving shipping address:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while saving your shipping address'
    });
  }
} 