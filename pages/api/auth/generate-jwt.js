import { generateJWT } from '../../../utils/auth';
import { auth } from '../../../utils/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '../../../utils/firebase-admin';
import { rateLimit } from '../../../utils/rateLimit';

// Initialize Firebase Admin if not already initialized
initAdmin();

// Create a rate limiter that allows 10 attempts per minute
const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  limit: 10,
  uniqueTokenPerInterval: 500
});

/**
 * Generate JWT token API endpoint
 * This endpoint verifies the Firebase ID token and generates a JWT token for the user
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Apply rate limiting
    await limiter.check(res, 10, 'GENERATE_JWT');
  } catch (error) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.' 
    });
  }
  
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    
    // Extract the token
    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    // Verify the Firebase ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    if (!decodedToken) {
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }
    
    // Get additional user data if needed
    const userRecord = await getAuth().getUser(decodedToken.uid);
    
    // Generate a JWT token
    const jwtToken = generateJWT({
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      role: decodedToken.role || userRecord.customClaims?.role || 'customer'
    });
    
    // Return the token
    return res.status(200).json({ token: jwtToken });
  } catch (error) {
    console.error('Error generating JWT token:', error);
    
    // Return appropriate error based on the error type
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired. Please sign in again.' });
    } else if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ error: 'Token has been revoked. Please sign in again.' });
    } else if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid token. Please sign in again.' });
    } else {
      return res.status(500).json({ error: 'Failed to generate JWT token' });
    }
  }
} 