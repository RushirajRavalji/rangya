import { getSession } from 'next-auth/react';
import { db } from '../../../utils/firebase';
import { doc, collection, addDoc, updateDoc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { withErrorHandling, combineMiddleware } from '../../../utils/errorHandler';
import { withCSRFProtection } from '../../../utils/csrf';
import { checkoutRateLimit } from '../../../utils/rateLimit';
import { sendOrderConfirmationEmail } from '../../../utils/emailService';
import { createError } from '../../../utils/errorHandler';
import { createCustomerOrder } from '../../../utils/customerOrderService';

/**
 * Validate order data
 * @param {Object} orderData - Order data to validate
 * @returns {Object} - Validation result with isValid flag and errors object
 */
const validateOrderData = (orderData) => {
  const errors = {};
  
  // Required fields
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.items = 'Order must contain at least one item';
  }
  
  if (!orderData.customer || !orderData.customer.fullName || !orderData.customer.email || !orderData.customer.phone) {
    errors.customer = 'Customer information is required (name, email, phone)';
  }
  
  if (!orderData.shipping || !orderData.shipping.address) {
    errors.shipping = 'Shipping address is required';
  }
  
  if (!orderData.payment || !orderData.payment.method) {
    errors.payment = 'Payment method is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Check stock availability for order items
 * @param {Array} items - Order items to check
 * @returns {Promise<Object>} - Stock check result with isAvailable flag and unavailableItems array
 */
const checkStockAvailability = async (items) => {
  const unavailableItems = [];
  
  // Check each item's stock
  for (const item of items) {
    const productRef = doc(db, 'products', item.id);
    const productDoc = await getDoc(productRef);
    
    if (!productDoc.exists()) {
      unavailableItems.push({
        id: item.id,
        reason: 'Product not found'
      });
      continue;
    }
    
    const product = productDoc.data();
    
    // Check if product is available
    if (!product.available && product.available !== undefined) {
      unavailableItems.push({
        id: item.id,
        name: product.name || item.name,
        reason: 'Product is not available for purchase'
      });
      continue;
    }
    
    // Check if size exists and has enough stock
    if (product.stock && item.size) {
      const sizeStock = product.stock[item.size];
      
      if (sizeStock === undefined) {
        unavailableItems.push({
          id: item.id,
          name: product.name || item.name,
          size: item.size,
          reason: 'Size not available'
        });
        continue;
      }
      
      if (sizeStock < item.quantity) {
        unavailableItems.push({
          id: item.id,
          name: product.name || item.name,
          size: item.size,
          requestedQuantity: item.quantity,
          availableQuantity: sizeStock,
          reason: 'Insufficient stock'
        });
      }
    }
  }
  
  return {
    isAvailable: unavailableItems.length === 0,
    unavailableItems
  };
};

/**
 * Create a new order in the customer's subcollection
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get user session
    const session = await getSession({ req });
    
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = session.user.id || session.user.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in session' });
    }
    
    // Get order data from request body
    const orderData = req.body;
    
    // Validate order data
    const validation = validateOrderData(orderData);
    
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }
    
    // Check stock availability
    const stockCheck = await checkStockAvailability(orderData.items);
    
    if (!stockCheck.isAvailable) {
      return res.status(400).json({
        error: 'Some items are not available',
        unavailableItems: stockCheck.unavailableItems
      });
    }
    
    // Create the order in the customer's subcollection
    const order = await createCustomerOrder(orderData, userId);
    
    // Send order confirmation email
    try {
      await sendOrderConfirmationEmail(orderData.customer.email, {
        orderId: order.id,
        customerName: orderData.customer.fullName,
        orderItems: orderData.items,
        orderTotal: orderData.totals.total,
        shippingAddress: orderData.shipping.address
      });
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Continue with the order process even if email fails
    }
    
    // Return the created order
    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: order.id,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({
      error: 'Failed to create order',
      message: error.message
    });
  }
}

// Apply middleware
export default combineMiddleware([
  withErrorHandling,
  withCSRFProtection,
  checkoutRateLimit
])(handler);