// API endpoint to verify payments
import { getSession } from 'next-auth/react';
import { validateCSRFToken } from '../../../utils/csrf';
import { handleApiError, createError } from '../../../utils/errorHandler';
import { verifyRazorpayPayment } from '../../../utils/paymentService';
import { db } from '../../../utils/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import rateLimit from '../../../utils/rateLimit';

// Create a rate limiter for payment verification - 10 per minute
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
    await paymentRateLimiter.check(res, 10, 'PAYMENT_VERIFY');
    
    // Validate CSRF token
    const csrfError = await validateCSRFToken(req);
    if (csrfError) {
      return res.status(403).json(createError('SECURITY', csrfError));
    }
    
    // Get user session
    const session = await getSession({ req });
    if (!session || !session.user) {
      return res.status(401).json(createError('AUTH', 'You must be logged in to verify a payment.'));
    }
    
    // Get request body
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    // Validate required fields
    if (!orderId) {
      return res.status(400).json(createError('VALIDATION', 'Order ID is required.'));
    }
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json(createError('VALIDATION', 'Payment verification data is incomplete.'));
    }
    
    // Verify payment
    const verificationResult = await verifyRazorpayPayment({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    });
    
    if (verificationResult.success) {
      try {
        // Update order payment status in main orders collection
        const mainOrderRef = doc(db, 'orders', orderId);
        await updateDoc(mainOrderRef, {
          'payment.status': 'paid',
          'payment.details': {
            paymentId: razorpay_payment_id,
            paymentTimestamp: serverTimestamp(),
            verificationTimestamp: serverTimestamp()
          },
          status: 'confirmed',
          updatedAt: serverTimestamp()
        });
        
        // Also update in user's orders subcollection if user is logged in
        if (session.user.id) {
          const userId = session.user.id;
          const userOrderRef = doc(db, 'users', userId, 'orders', orderId);
          
          await updateDoc(userOrderRef, {
            'payment.status': 'paid',
            'payment.details': {
              paymentId: razorpay_payment_id,
              paymentTimestamp: serverTimestamp(),
              verificationTimestamp: serverTimestamp()
            },
            status: 'confirmed',
            updatedAt: serverTimestamp()
          });
        }
        
        // Return success response
        return res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          data: {
            orderId,
            paymentId: razorpay_payment_id
          }
        });
      } catch (error) {
        console.error('Error updating order after payment verification:', error);
        return res.status(500).json(createError('DATABASE', 'Failed to update order after payment verification.'));
      }
    } else {
      return res.status(400).json(createError('PAYMENT', 'Payment verification failed'));
    }
  } catch (error) {
    return handleApiError(error, res);
  }
}