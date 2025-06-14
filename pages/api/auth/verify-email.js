// API endpoint to verify email addresses
import { auth } from '../../../utils/firebase';
import { applyActionCode } from 'firebase/auth';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { oobCode } = req.body;

  if (!oobCode) {
    return res.status(400).json({ error: 'Missing verification code' });
  }

  try {
    // Apply the email verification code
    await applyActionCode(auth, oobCode);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Email verified successfully' 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    
    let errorMessage = 'Failed to verify email';
    
    if (error.code === 'auth/invalid-action-code') {
      errorMessage = 'Invalid or expired verification link. Please request a new verification email.';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'User account has been disabled.';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'User not found.';
    }
    
    return res.status(400).json({ 
      success: false, 
      error: errorMessage,
      code: error.code
    });
  }
} 