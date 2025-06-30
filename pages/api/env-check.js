// Simple API endpoint to check environment variables

export default function handler(req, res) {
  // Check if environment variables are set
  const envStatus = {
    firebase: {
      public: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Not set',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Set' : 'Not set',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
      },
      admin: {
        projectId: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set',
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Not set',
      }
    }
  };
  
  // Log the status
  console.log('Environment Variables Check:', envStatus);
  
  // Return the status
  res.status(200).json(envStatus);
}