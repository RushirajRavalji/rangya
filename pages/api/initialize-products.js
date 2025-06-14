import { checkAndAddSampleProducts } from '../../utils/firebase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log("API: initialize-products endpoint called");
    
    // Check if request has authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Extract token from header
    const token = authHeader.split(' ')[1];
    
    // Check if token is valid (simple check for demo purposes)
    // In production, use a more secure method
    if (token !== process.env.ADMIN_API_TOKEN && token !== 'admin-initialize-products') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Check if products collection is empty and add sample products if needed
    const result = await checkAndAddSampleProducts();
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json({ 
        error: 'Failed to initialize products',
        message: result.error
      });
    }
  } catch (error) {
    console.error('API: Error initializing products:', error);
    
    return res.status(500).json({ 
      error: 'Failed to initialize products',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
} 