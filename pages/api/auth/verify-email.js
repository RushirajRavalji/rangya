// API endpoint to verify email addresses
import { auth, db } from '../../../utils/firebase';
import { applyActionCode, getAuth } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { handleApiError, createError } from '../../../utils/errorHandler';
import rateLimit from '../../../utils/rateLimit';

// Create a rate limiter for verification attempts - 10 per hour
const verificationRateLimiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  limit: 10,
  uniqueTokenPerInterval: 500
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json(createError('VALIDATION', 'Method not allowed. Only POST requests are accepted.'));
  }

  try {
    // Apply rate limiting
    await verificationRateLimiter.check(res, 10, 'EMAIL_VERIFICATION');
  } catch (error) {
    return res.status(429).json(createError(
      'RATE_LIMIT', 
      'Too many verification attempts. Please try again later.',
      { retryAfter: res.getHeader('Retry-After') }
    ));
  }

  const { oobCode } = req.body;

  if (!oobCode) {
    return res.status(400).json(createError('VALIDATION', 'Missing verification code'));
  }

  try {
    // Apply the email verification code
    await applyActionCode(auth, oobCode);
    
    // Get the current user after verification
    const user = auth.currentUser;
    
    // If we have a user, update their profile in Firestore
    if (user) {
      try {
        // Update user document to mark email as verified
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          emailVerified: true,
          emailVerifiedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Log the successful verification for security auditing
        console.log(`Email verified for user: ${user.email}`);
      } catch (dbError) {
        // Log the error but don't fail the verification
        console.error('Error updating user document after verification:', dbError);
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Email verified successfully',
      emailVerified: true
    });
  } catch (error) {
    // Handle specific error cases
    let errorType = 'VALIDATION';
    let errorMessage = 'Failed to verify email';
    let statusCode = 400;
    
    switch (error.code) {
      case 'auth/invalid-action-code':
        errorMessage = 'Invalid or expired verification link. Please request a new verification email.';
        break;
      case 'auth/user-disabled':
        errorType = 'AUTHORIZATION';
        errorMessage = 'User account has been disabled.';
        statusCode = 403;
        break;
      case 'auth/user-not-found':
        errorType = 'AUTHENTICATION';
        errorMessage = 'User not found.';
        statusCode = 404;
        break;
      default:
        errorType = 'SERVER_ERROR';
        errorMessage = 'An error occurred during email verification.';
        statusCode = 500;
    }
    
    return res.status(statusCode).json(createError(
      errorType,
      errorMessage,
      { code: error.code }
    ));
  }
} 