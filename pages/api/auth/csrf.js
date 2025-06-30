import { setCSRFCookie } from '../../../utils/csrf';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Generate a new CSRF token and set it as a cookie
    const csrfToken = setCSRFCookie(res);
    
    // Return the token to the client
    return res.status(200).json({ csrfToken });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return res.status(500).json({ error: 'Failed to generate security token' });
  }
} 