// API endpoint to send verification emails
import { auth } from '../../../utils/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { csrfProtection } from '../../../utils/csrf';
import { handleApiError, createError } from '../../../utils/errorHandler';
import rateLimit from '../../../utils/rateLimit';

// Create a rate limiter for verification emails - 3 per hour per user
const verificationRateLimiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  limit: 3,
  uniqueTokenPerInterval: 500
});

async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json(createError('VALIDATION', 'Method not allowed. Only POST requests are accepted.'));
  }

  try {
    // Apply rate limiting
    await verificationRateLimiter.check(res, 3, 'VERIFICATION_EMAIL');
  } catch (error) {
    return res.status(429).json(createError(
      'RATE_LIMIT', 
      'Too many verification email requests. Please try again later.',
      { retryAfter: res.getHeader('Retry-After') }
    ));
  }

  // Check if user is authenticated
  const user = auth.currentUser;
  if (!user) {
    return res.status(401).json(createError('AUTHENTICATION', 'User not authenticated'));
  }

  // Check if email is already verified
  if (user.emailVerified) {
    return res.status(400).json(createError('VALIDATION', 'Email is already verified'));
  }

  try {
    // Configure verification email options
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://rangya.com'}/verify-email?email=${encodeURIComponent(user.email)}`,
      handleCodeInApp: false
    };
    
    // Send verification email with custom redirect URL
    await sendEmailVerification(user, actionCodeSettings);
    
    // Log the action for security purposes
    console.log(`Verification email sent to: ${user.email}`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Verification email sent successfully',
      email: user.email
    });
  } catch (error) {
    // Handle specific Firebase auth errors
    if (error.code === 'auth/too-many-requests') {
      return res.status(429).json(createError(
        'RATE_LIMIT',
        'Too many requests. Please try again later.',
        { code: error.code }
      ));
    }
    
    // Use the error handler utility for consistent error responses
    return handleApiError(
      res, 
      error, 
      'VALIDATION', 
      'Failed to send verification email'
    );
  }
}

// Apply CSRF protection to the handler
export default csrfProtection(handler); 