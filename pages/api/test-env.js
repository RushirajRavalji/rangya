import { ensureFirebaseEnv } from '../../utils/loadEnv.js';

export default function handler(req, res) {
  // Ensure environment variables are loaded
  ensureFirebaseEnv();
  
  const envVars = {
    firebase: {
      public: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Not set',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Set' : 'Not set',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
      },
      admin: {
        projectId: process.env.FIREBASE_PROJECT_ID || 'not set',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'not set',
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'key exists' : 'not set',
      }
    }
  };
  
  console.log('Environment Variables Check:', envVars);
  res.status(200).json(envVars);
}
