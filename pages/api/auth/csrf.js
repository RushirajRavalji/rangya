import { generateToken } from '../../../utils/csrf';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Generate a new CSRF token
  const csrfToken = generateToken(res);
  
  // Return the token to the client
  return res.status(200).json({ csrfToken });
} 