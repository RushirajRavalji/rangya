import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../../utils/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import rateLimit from '../../../utils/rateLimit';
import { csrfProtection } from '../../../utils/csrf';

// Create a rate limiter that allows 5 attempts per minute
const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  limit: 5,
  uniqueTokenPerInterval: 500 // Max 500 users per interval
});

// Create a stricter rate limiter for failed attempts - 3 failed attempts per 10 minutes
const failedAttemptsLimiter = rateLimit({
  interval: 10 * 60 * 1000, // 10 minutes
  limit: 3,
  uniqueTokenPerInterval: 500
});

// Main handler function
async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting
  try {
    await limiter.check(res, 5, 'LOGIN');
  } catch (error) {
    return res.status(429).json({ 
      error: 'Too many login attempts. Please try again later.' 
    });
  }

  const { email, password } = req.body;

  // Validate inputs
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields',
      message: 'Email and password are required'
    });
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Track login attempt
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userIdentifier = `${normalizedEmail}:${ipAddress}`;

  try {
    // Attempt to sign in
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const user = userCredential.user;

    // Get ID token
    const token = await user.getIdToken();

    // Update last login time in Firestore
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await setDoc(userRef, {
          lastLogin: serverTimestamp(),
          lastIp: ipAddress
        }, { merge: true });
      } else {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          email: normalizedEmail,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          lastIp: ipAddress,
          role: 'customer'
        });
      }
    } catch (firestoreError) {
      console.error('Error updating Firestore:', firestoreError);
      // Continue with login even if Firestore update fails
    }

    return res.status(200).json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      },
      token
    });
  } catch (error) {
    console.error('Login API error:', error);
    
    // Track failed attempts for brute force protection
    try {
      // Apply stricter rate limiting for failed attempts
      await failedAttemptsLimiter.check(res, 3, `FAILED_LOGIN_${userIdentifier}`);
    } catch (rateLimitError) {
      return res.status(429).json({ 
        error: 'Account temporarily locked due to too many failed login attempts. Please try again later or reset your password.' 
      });
    }

    // Return appropriate error response based on Firebase error code
    let status = 400;
    let message = 'Authentication failed';
    
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        message = 'Invalid email or password';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email format';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled';
        break;
      case 'auth/too-many-requests':
        status = 429;
        message = 'Too many failed login attempts. Please try again later';
        break;
      case 'auth/network-request-failed':
        status = 503;
        message = 'Network error. Please check your connection';
        break;
      default:
        status = 500;
        message = 'Authentication service error';
    }
    
    return res.status(status).json({
      success: false,
      error: error.code || 'unknown_error',
      message
    });
  }
}

// Wrap handler with CSRF protection
export default csrfProtection(handler); 