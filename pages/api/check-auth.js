import { auth } from '../../utils/firebase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Check if Firebase auth is properly initialized
    const authStatus = {
      initialized: !!auth && !!auth.app,
      config: {}
    };
    
    if (authStatus.initialized) {
      // Get Firebase configuration safely
      const config = auth.app.options || {};
      
      // Check if API key is valid (don't expose the actual key)
      authStatus.config = {
        apiKey: config.apiKey ? "✓ Set" : "✗ Missing",
        authDomain: config.authDomain ? "✓ Set" : "✗ Missing",
        projectId: config.projectId ? "✓ Set" : "✗ Missing"
      };
      
      // Check if API key matches the expected format
      const apiKeyValid = typeof config.apiKey === 'string' && 
                        config.apiKey.startsWith('AIza') && 
                        config.apiKey.length > 20;
      
      authStatus.apiKeyValid = apiKeyValid;
      
      // Check if auth domain is valid
      const authDomainValid = typeof config.authDomain === 'string' && 
                            config.authDomain.includes('firebaseapp.com');
      
      authStatus.authDomainValid = authDomainValid;
    }
    
    // Return the auth status
    return res.status(200).json({
      status: authStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Error checking auth configuration:', error);
    
    return res.status(500).json({
      error: 'Failed to check auth configuration',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
} 