import { buffer } from 'micro';
import { db } from '../../../utils/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createError } from '../../../utils/errorHandler';
import { updateOrderStatus as serviceUpdateOrderStatus } from '../../../utils/orderService';

/**
 * Create a standardized error object
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} [details] - Additional error details
 * @returns {Error} - Error object with code, message and details
 */
export const createError = (code, message, details = {}) => {
  const error = new Error(message);
  error.code = code;
  error.details = details || {};
  return error;
};

// Disable body parsing, we need the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Verify Razorpay webhook signature
 * @param {string} body - Raw request body
 * @param {string} signature - Razorpay signature from headers
 * @returns {Object} - Object containing verification result and error if any
 */
export const verifyWebhookSignature = (body, signature) => {
  if (!process.env.PAYMENT_WEBHOOK_SECRET) {
    console.error('PAYMENT_WEBHOOK_SECRET is not defined');
    return { valid: false, error: 'Webhook secret is not configured' };
  }

  if (!signature) {
    return { valid: false, error: 'Signature is missing from request headers' };
  }

  try {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === signature;
    
    return { 
      valid: isValid, 
      error: isValid ? null : 'Signature verification failed'
    };
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return { valid: false, error: `Signature verification error: ${error.message}` };
  }
};

/**
 * Update order status based on payment event
 * @param {string} orderId - Order ID
 * @param {string} status - New payment status
 * @param {Object} paymentDetails - Payment details from Razorpay
 * @returns {Promise<Object>} - Result of the update operation
 */
export const updateOrderStatus = async (orderId, status, paymentDetails) => {
  try {
    if (!orderId) {
      throw createError('VALIDATION', 'Order ID is required', { field: 'orderId' });
    }

    if (!status) {
      throw createError('VALIDATION', 'Payment status is required', { field: 'status' });
    }

    // Get order document
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw createError('NOT_FOUND', `Order ${orderId} not found`, { resource: 'order' });
    }

    const orderData = orderDoc.data();
    
    // Map payment status to order status
    let orderStatus = orderData.status;
    let paymentStatus = status;

    // Define status mapping
    const statusMapping = {
      'authorized': { orderStatus: 'processing', paymentStatus: 'authorized' },
      'captured': { orderStatus: 'confirmed', paymentStatus: 'paid' },
      'paid': { orderStatus: 'confirmed', paymentStatus: 'paid' },
      'failed': { orderStatus: 'payment_failed', paymentStatus: 'failed' },
      'payment_failed': { orderStatus: 'payment_failed', paymentStatus: 'failed' },
      'refund_initiated': { orderStatus: 'refund_initiated', paymentStatus: 'refund_initiated' },
      'refunded': { orderStatus: 'refunded', paymentStatus: 'refunded' }
    };

    // Apply status mapping if available
    if (statusMapping[status]) {
      orderStatus = statusMapping[status].orderStatus;
      paymentStatus = statusMapping[status].paymentStatus;
    }

    // Use the orderService's updateOrderStatus function which no longer validates transitions
    const additionalData = {
      'payment.status': paymentStatus,
      'payment.details': {
        ...(orderData.payment?.details || {}),
        ...paymentDetails,
        updatedAt: serverTimestamp()
      }
    };

    // Update the order using the service function
    await serviceUpdateOrderStatus(orderId, orderStatus, additionalData);

    console.log(`Order ${orderId} status updated to ${orderStatus}, payment status: ${paymentStatus}`);
    
    return {
      success: true,
      orderId,
      orderStatus,
      paymentStatus
    };
  } catch (error) {
    console.error(`Error updating order ${orderId} status:`, error);
    
    // Add error code if not present
    if (!error.code) {
      error.code = 'DATABASE';
    }
    throw error;
  }
};

/**
 * Handle Razorpay webhook events
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const webhookHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await buffer(req);
    const body = rawBody.toString();
    
    // Get Razorpay signature from headers
    const signature = req.headers['x-razorpay-signature'];

    // Verify signature
    const signatureVerification = verifyWebhookSignature(body, signature);
    
    if (!signatureVerification.valid) {
      console.error(`Invalid webhook signature: ${signatureVerification.error}`);
      return res.status(400).json({ 
        error: 'Invalid signature', 
        details: signatureVerification.error,
        timestamp: new Date().toISOString() 
      });
    }

    // Parse webhook payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError);
      return res.status(400).json({ 
        error: 'Invalid webhook payload format',
        details: { message: parseError.message },
        timestamp: new Date().toISOString()
      });
    }
    
    const { event, payload: eventPayload } = payload;

    console.log(`Received Razorpay webhook: ${event}`, {
      event,
      eventId: payload.event_id,
      timestamp: new Date().toISOString()
    });

    // Handle different webhook events
    switch (event) {
      case 'payment.authorized':
        // Payment has been authorized but not yet captured
        await updateOrderStatus(
          eventPayload.payment.entity.notes.order_id,
          'authorized',
          {
            razorpayPaymentId: eventPayload.payment.entity.id,
            razorpayOrderId: eventPayload.payment.entity.order_id,
            method: eventPayload.payment.entity.method,
            amount: eventPayload.payment.entity.amount / 100, // Convert from paise to rupees
            status: 'authorized',
            authorizationTimestamp: new Date().toISOString()
          }
        );
        break;

      case 'payment.captured': {
        const { payment } = eventPayload;
        const orderId = payment.notes?.order_id;

        if (!orderId) {
          console.error('Order ID not found in payment notes', { paymentId: payment.id });
          return res.status(400).json({ 
            error: 'Order ID not found in payment notes',
            details: { paymentId: payment.id },
            timestamp: new Date().toISOString()
          });
        }

        const result = await updateOrderStatus(orderId, 'captured', {
          paymentId: payment.id,
          amount: payment.amount / 100,
          method: payment.method,
          status: payment.status,
          capturedAt: new Date().toISOString()
        });

        console.log('Payment captured update result:', result);
        break;
      }

      case 'payment.failed': {
        const { payment } = eventPayload;
        const orderId = payment.notes?.order_id;

        if (!orderId) {
          console.error('Order ID not found in payment notes', { paymentId: payment.id });
          return res.status(400).json({ 
            error: 'Order ID not found in payment notes',
            details: { paymentId: payment.id },
            timestamp: new Date().toISOString()
          });
        }

        const result = await updateOrderStatus(orderId, 'failed', {
          paymentId: payment.id,
          amount: payment.amount / 100,
          method: payment.method,
          status: payment.status,
          error: payment.error_code,
          errorDescription: payment.error_description,
          failedAt: new Date().toISOString()
        });

        console.log('Payment failed update result:', result);
        break;
      }

      case 'refund.created': {
        const { refund, payment } = eventPayload;
        const orderId = payment.notes?.order_id;

        if (!orderId) {
          console.error('Order ID not found in payment notes', { paymentId: payment.id, refundId: refund.id });
          return res.status(400).json({ 
            error: 'Order ID not found in payment notes',
            details: { paymentId: payment.id, refundId: refund.id },
            timestamp: new Date().toISOString()
          });
        }

        const result = await updateOrderStatus(orderId, 'refund_initiated', {
          paymentId: payment.id,
          refundId: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
          refundInitiatedAt: new Date().toISOString()
        });

        console.log('Refund created update result:', result);
        break;
      }
        break;

      case 'refund.processed': {
        const { refund, payment } = eventPayload;
        const orderId = payment.notes?.order_id;

        if (!orderId) {
          console.error('Order ID not found in payment notes', { paymentId: payment.id, refundId: refund.id });
          return res.status(400).json({ 
            error: 'Order ID not found in payment notes',
            details: { paymentId: payment.id, refundId: refund.id },
            timestamp: new Date().toISOString()
          });
        }

        const result = await updateOrderStatus(orderId, 'refunded', {
          paymentId: payment.id,
          refundId: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
          refundProcessedAt: new Date().toISOString()
        });

        console.log('Refund processed update result:', result);
        break;
      }

      default: {
        console.log(`Unhandled webhook event: ${event}`, {
          event,
          eventId: payload.event_id,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Acknowledge receipt of webhook
    return res.status(200).json({ 
      received: true,
      event: event,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Log detailed error information
    console.error('Webhook processing error:', error);
    
    // Determine error type and provide appropriate response
    let statusCode = 500;
    let errorMessage = 'Webhook processing failed';
    let errorDetails = {};
    
    if (error.name === 'SyntaxError') {
      statusCode = 400;
      errorMessage = 'Invalid webhook payload format';
      errorDetails = { type: 'SYNTAX_ERROR', message: error.message };
    } else if (error.code === 'VALIDATION') {
      statusCode = 400;
      errorMessage = error.message || 'Validation error';
      errorDetails = { type: 'VALIDATION_ERROR', field: error.field };
    } else if (error.code === 'NOT_FOUND') {
      statusCode = 404;
      errorMessage = error.message || 'Resource not found';
      errorDetails = { type: 'NOT_FOUND_ERROR', resource: error.resource };
    } else if (error.code === 'DATABASE') {
      statusCode = 500;
      errorMessage = 'Database operation failed';
      errorDetails = { type: 'DATABASE_ERROR' };
    }
    
    return res.status(statusCode).json({ 
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
};

export default webhookHandler;