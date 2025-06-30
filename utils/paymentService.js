// Payment Service for Razorpay integration
import { createError } from './errorHandler';

/**
 * Initialize Razorpay payment
 * @param {Object} orderData - Order data containing payment details
 * @param {string} orderData.orderId - The order ID
 * @param {number} orderData.amount - The amount to be paid in smallest currency unit (paise for INR)
 * @param {string} orderData.currency - The currency code (e.g., INR)
 * @param {string} orderData.customerName - Customer's name
 * @param {string} orderData.customerEmail - Customer's email
 * @param {string} orderData.customerPhone - Customer's phone number
 * @returns {Promise<Object>} - Object containing payment details for the frontend
 */
export const initializeRazorpayPayment = async (orderData) => {
  try {
    // Validate required data
    if (!orderData.orderId) {
      throw createError('VALIDATION', 'Order ID is required');
    }
    
    if (!orderData.amount) {
      throw createError('VALIDATION', 'Amount is required');
    }
    
    // Check if Razorpay keys are configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw createError('CONFIGURATION', 'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    }
    
    // In a real implementation, you would create a Razorpay order here
    // For now, we'll just return the necessary data for the frontend
    return {
      success: true,
      data: {
        key: process.env.RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Rangya Denim',
        description: `Order #${orderData.orderId}`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.customerName,
          email: orderData.customerEmail,
          contact: orderData.customerPhone
        },
        notes: {
          address: 'Rangya Denim Corporate Office'
        },
        theme: {
          color: '#4F46E5' // Indigo color from Tailwind
        }
      }
    };
  } catch (error) {
    console.error('Error initializing Razorpay payment:', error);
    throw error;
  }
};

/**
 * Verify Razorpay payment
 * @param {Object} paymentData - Payment data from Razorpay
 * @param {string} paymentData.razorpay_payment_id - Razorpay payment ID
 * @param {string} paymentData.razorpay_order_id - Razorpay order ID
 * @param {string} paymentData.razorpay_signature - Razorpay signature
 * @returns {Promise<Object>} - Object containing verification result
 */
export const verifyRazorpayPayment = async (paymentData) => {
  try {
    // Validate required data
    if (!paymentData.razorpay_payment_id || !paymentData.razorpay_order_id || !paymentData.razorpay_signature) {
      throw createError('VALIDATION', 'Invalid payment data');
    }
    
    // Check if Razorpay keys are configured
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw createError('CONFIGURATION', 'Razorpay is not configured. Please set RAZORPAY_KEY_SECRET environment variable.');
    }
    
    // Verify the payment signature
    const crypto = require('crypto');
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${paymentData.razorpay_order_id}|${paymentData.razorpay_payment_id}`)
      .digest('hex');
    
    const isSignatureValid = generatedSignature === paymentData.razorpay_signature;
    
    if (!isSignatureValid) {
      throw createError('VALIDATION', 'Invalid payment signature');
    }
    
    return {
      success: true,
      data: {
        paymentId: paymentData.razorpay_payment_id,
        orderId: paymentData.razorpay_order_id,
        verified: true
      }
    };
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    throw error;
  }
};

/**
 * Initialize UPI payment
 * @param {Object} orderData - Order data containing payment details
 * @param {string} orderData.orderId - The order ID
 * @param {number} orderData.amount - The amount to be paid in smallest currency unit (paise for INR)
 * @param {string} orderData.vpa - UPI Virtual Payment Address (optional)
 * @returns {Promise<Object>} - Object containing payment details for the frontend
 */
export const initializeUpiPayment = async (orderData) => {
  try {
    // Validate required data
    if (!orderData.orderId) {
      throw createError('VALIDATION', 'Order ID is required');
    }
    
    if (!orderData.amount) {
      throw createError('VALIDATION', 'Amount is required');
    }
    
    // Check if Razorpay keys are configured (UPI is handled through Razorpay)
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw createError('CONFIGURATION', 'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    }
    
    // In a real implementation, you would create a UPI payment request here
    // For now, we'll just return the necessary data for the frontend
    return {
      success: true,
      data: {
        key: process.env.RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Rangya Denim',
        description: `Order #${orderData.orderId}`,
        order_id: orderData.orderId,
        method: 'upi',
        vpa: orderData.vpa || '',
        theme: {
          color: '#4F46E5' // Indigo color from Tailwind
        }
      }
    };
  } catch (error) {
    console.error('Error initializing UPI payment:', error);
    throw error;
  }
};