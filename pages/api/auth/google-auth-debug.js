import { auth } from '../../../utils/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

/**
 * A debugging endpoint for Google authentication
 * This is only for development and should be removed in production
 */
export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get the auth info
    const authInfo = {
      initialized: !!auth,
      providersEnabled: [],
      currentUser: auth?.currentUser ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        emailVerified: auth.currentUser.emailVerified,
        displayName: auth.currentUser.displayName,
        isAnonymous: auth.currentUser.isAnonymous,
        providerData: auth.currentUser.providerData.map(p => ({
          providerId: p.providerId,
          email: p.email,
          displayName: p.displayName
        }))
      } : null,
      appConfig: {
        apiKey: auth?.app?.options?.apiKey ? 'Present' : 'Missing',
        authDomain: auth?.app?.options?.authDomain,
        projectId: auth?.app?.options?.projectId
      }
    };
    
    // Return the auth information
    return res.status(200).json({
      success: true,
      auth: authInfo,
      env: {
        isProduction: process.env.NODE_ENV === 'production',
        nodeEnv: process.env.NODE_ENV,
        hostname: req.headers.host
      }
    });
  } catch (error) {
    console.error('Auth debug API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
} 