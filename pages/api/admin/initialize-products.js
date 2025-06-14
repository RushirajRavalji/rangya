import { checkAndAddSampleProducts } from '../../../utils/firebase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log("API: admin/initialize-products endpoint called");
    
    // For development purposes, we'll allow this endpoint without authentication
    // In production, this should be properly secured
    
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