// API endpoint to initialize payments
import { getSession } from 'next-auth/react';
import { validateCSRFToken } from '../../../utils/csrf';
import { handleApiError, createError } from '../../../utils/errorHandler';
import { initializeRazorpayPayment, initializeUpiPayment } from '../../../utils/paymentService';
import rateLimit from '../../../utils/rateLimit';

// Create a rate limiter for payment initialization - 10 per minute
const paymentRateLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  limit: 10,
  uniqueTokenPerInterval: 500
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json(createError('VALIDATION', 'Method not allowed. Only POST requests are accepted.'));
  }
  
  try {
    // Apply rate limiting
    await paymentRateLimiter.check(res, 10, 'PAYMENT_INIT');
    
    // Validate CSRF token
    const csrfError = await validateCSRFToken(req);
    if (csrfError) {
      return res.status(403).json(createError('SECURITY', csrfError));
    }
    
    // Get user session
    const session = await getSession({ req });
    if (!session || !session.user) {
      return res.status(401).json(createError('AUTH', 'You must be logged in to initialize a payment.'));
    }
    
    // Get request body
    const { orderId, amount, paymentMethod, currency, customerName, customerEmail, customerPhone, vpa } = req.body;
    
    // Validate required fields
    if (!orderId) {
      return res.status(400).json(createError('VALIDATION', 'Order ID is required.'));
    }
    
    if (!amount) {
      return res.status(400).json(createError('VALIDATION', 'Amount is required.'));
    }
    
    if (!paymentMethod) {
      return res.status(400).json(createError('VALIDATION', 'Payment method is required.'));
    }
    
    // Initialize payment based on method
    let paymentData;
    
    if (paymentMethod === 'card') {
      // Initialize Razorpay payment for card
      paymentData = await initializeRazorpayPayment({
        orderId,
        amount,
        currency: currency || 'INR',
        customerName,
        customerEmail,
        customerPhone
      });
    } else if (paymentMethod === 'upi') {
      // Initialize UPI payment
      paymentData = await initializeUpiPayment({
        orderId,
        amount,
        vpa
      });
    } else {
      return res.status(400).json(createError('VALIDATION', 'Invalid payment method. Supported methods: card, upi'));
    }
    
    // Return payment initialization data
    return res.status(200).json(paymentData);
  } catch (error) {
    return handleApiError(error, res);
  }
}