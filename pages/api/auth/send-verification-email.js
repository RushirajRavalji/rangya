// API endpoint to send verification emails
import { auth } from '../../../utils/firebase';
import { sendEmailVerification } from 'firebase/auth';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if user is authenticated
  const user = auth.currentUser;
  if (!user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    // Send verification email
    await sendEmailVerification(user);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Verification email sent successfully' 
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    
    let errorMessage = 'Failed to send verification email';
    
    if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many requests. Please try again later.';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'User not found.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    }
    
    return res.status(400).json({ 
      success: false, 
      error: errorMessage,
      code: error.code
    });
  }
} 