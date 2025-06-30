import { serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { createError } from './errorHandler';

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'noreply@rangya.com',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@rangya.com',
  siteName: 'Rangya',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://rangya.com'
};

/**
 * Mock email sending function that just logs to console and stores in DB
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Send result
 */
export const sendEmail = async (options) => {
  try {
    const { to, subject, html, text, saveToDb = true, type = 'general', metadata = {} } = options;
    
    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      throw new Error('Missing required email fields: to, subject, and either html or text');
    }
    
    // Log email instead of sending
    console.log('MOCK EMAIL SENT:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Type:', type);
    
    // Generate a mock message ID
    const mockMessageId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Save to database if requested
    if (saveToDb) {
      try {
        const emailsRef = collection(db, 'emails');
        await addDoc(emailsRef, {
          to,
          subject,
          type,
          metadata,
          status: 'mock_sent',
          messageId: mockMessageId,
          createdAt: serverTimestamp()
        });
      } catch (dbError) {
        console.error('Error saving email to database:', dbError);
      }
    }
    
    return { success: true, messageId: mockMessageId };
  } catch (error) {
    console.error('Error sending mock email:', error);
    throw createError('EXTERNAL_SERVICE', 'Failed to send email', error);
  }
};

/**
 * Send order confirmation email (mock version)
 * @param {Object} order - Order data
 * @param {Object} user - User data
 * @returns {Promise<Object>} - Send result
 */
export const sendOrderConfirmationEmail = async (order, user) => {
  console.log('Mock order confirmation email for order:', order.orderNumber);
  console.log('To user:', user.email);
  
  return { success: true, messageId: `mock-order-confirmation-${Date.now()}` };
};

/**
 * Send order status update email (mock version)
 * @param {Object} order - Order data
 * @param {Object} user - User data
 * @param {string} newStatus - New order status
 * @param {string} message - Optional message
 * @returns {Promise<Object>} - Send result
 */
export const sendOrderStatusUpdate = async (order, user, newStatus, message = '') => {
  console.log(`Mock order status update email for order: ${order.orderNumber}, new status: ${newStatus}`);
  console.log('To user:', user.email);
  
  return { success: true, messageId: `mock-status-update-${Date.now()}` };
};

/**
 * Send welcome email (mock version)
 * @param {Object} user - User data
 * @returns {Promise<Object>} - Send result
 */
export const sendWelcomeEmail = async (user) => {
  console.log('Mock welcome email');
  console.log('To user:', user.email);
  
  return { success: true, messageId: `mock-welcome-${Date.now()}` };
};

/**
 * Send password reset email (mock version)
 * @param {Object} user - User data
 * @param {string} resetLink - Password reset link
 * @returns {Promise<Object>} - Send result
 */
export const sendPasswordResetEmail = async (user, resetLink) => {
  console.log('Mock password reset email');
  console.log('To user:', user.email);
  console.log('Reset link:', resetLink);
  
  return { success: true, messageId: `mock-password-reset-${Date.now()}` };
};

/**
 * Send marketing newsletter (mock version)
 * @param {string} to - Recipient email
 * @param {Object} campaign - Campaign data
 * @returns {Promise<Object>} - Send result
 */
export const sendMarketingEmail = async (to, campaign) => {
  console.log('Mock marketing email');
  console.log('To:', to);
  console.log('Subject:', campaign.subject);
  
  return { success: true, messageId: `mock-marketing-${Date.now()}` };
};

export default {
  sendEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdate,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendMarketingEmail
}; 