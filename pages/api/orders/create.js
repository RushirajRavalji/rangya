import { getSession } from 'next-auth/react';
import { db } from '../../../utils/firebase';
import { doc, collection, addDoc, updateDoc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { withErrorHandling, combineMiddleware } from '../../../utils/errorHandler';
import { withCSRFProtection } from '../../../utils/csrf';
import { checkoutRateLimit } from '../../../utils/rateLimit';
import { sendOrderConfirmationEmail } from '../../../utils/emailService';
import { createError } from '../../../utils/errorHandler';

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
 * Update product stock after order creation
 * @param {Array} items - Order items
 * @returns {Promise<void>}
 */
const updateProductStock = async (items) => {
  for (const item of items) {
    const productRef = doc(db, 'products', item.id);
    
    await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productRef);
      
      if (!productDoc.exists()) {
        throw createError('NOT_FOUND', `Product ${item.id} not found`);
      }
      
      const product = productDoc.data();
      console.log(`Updating stock for product ${item.id}, size: ${item.size}, quantity: ${item.quantity}`);
      
      // Check if product has stock tracking by size
      if (product.stock && typeof product.stock === 'object' && item.size) {
        // Check if this size exists in the stock object
        if (product.stock[item.size] === undefined) {
          console.error(`Size ${item.size} not found in product ${item.id} stock`);
          throw createError('VALIDATION', `Size ${item.size} not available for product ${product.name || item.name}`);
        }
        
        // Check if enough stock for this size
        if (product.stock[item.size] < item.quantity) {
          console.error(`Insufficient stock for product ${item.id}, size ${item.size}: requested ${item.quantity}, available ${product.stock[item.size]}`);
          throw createError('VALIDATION', `Insufficient stock for product ${product.name || item.name} in size ${item.size}`);
        }
        
        // Update stock for this size
        const newSizeStock = product.stock[item.size] - item.quantity;
        const newStock = { ...product.stock, [item.size]: newSizeStock };
        
        console.log(`Updating stock for product ${item.id}, size ${item.size} from ${product.stock[item.size]} to ${newSizeStock}`);
        transaction.update(productRef, { stock: newStock });
        
        // If stock is low, add a notification for admin
        if (newSizeStock <= 3) {
          const notificationsRef = collection(db, 'admin_notifications');
          transaction.set(doc(notificationsRef), {
            type: 'low_stock',
            productId: item.id,
            productName: product.name || item.name,
            size: item.size,
            currentStock: newSizeStock,
            createdAt: serverTimestamp(),
            read: false
          });
        }
      } else if (typeof product.stock === 'number') {
        // Legacy stock tracking (not by size)
        if (product.stock < item.quantity) {
          throw createError('VALIDATION', `Insufficient stock for product ${product.name || item.name}`);
        }
        
        const newStock = product.stock - item.quantity;
        transaction.update(productRef, { stock: newStock });
        
        // If stock is low, add a notification for admin
        if (newStock <= product.lowStockThreshold || newStock <= 5) {
          const notificationsRef = collection(db, 'admin_notifications');
          transaction.set(doc(notificationsRef), {
            type: 'low_stock',
            productId: item.id,
            productName: product.name || item.name,
            currentStock: newStock,
            createdAt: serverTimestamp(),
            read: false
          });
        }
      }
    });
  }
};

/**
 * Calculate order totals
 * @param {Array} items - Order items
 * @returns {Object} - Order totals
 */
const calculateOrderTotals = (items) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = subtotal > 1000 ? 0 : 100; // Free shipping over ₹1000
  const taxRate = 0.18; // 18% GST
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + shippingCost + tax;
  
  return {
    subtotal,
    shippingCost,
    tax,
    total
  };
};

/**
 * Create order handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} - API response
 */
const createOrderHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log('Firebase Environment Variables in API:', {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'Key exists' : 'Key missing'
  });
  
  try {
    // Get user session
    const session = await getSession({ req });
    
    if (!session) {
      console.error('Authentication required - No session found');
      throw createError('AUTHENTICATION', 'Authentication required');
    }
    
    const { user } = session;
    const orderData = req.body;
    
    console.log('Processing order with payment method:', orderData.payment?.method);
    
    // Validate order data
    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      console.error('Order validation failed:', validation.errors);
      throw createError('VALIDATION', 'Invalid order data', { validationErrors: validation.errors });
    }
    
    // Check stock availability
    const stockCheck = await checkStockAvailability(orderData.items);
    if (!stockCheck.isAvailable) {
      throw createError('VALIDATION', 'Some items are not available', { unavailableItems: stockCheck.unavailableItems });
    }
    
    // Calculate order totals
    const totals = calculateOrderTotals(orderData.items);
    
    // Generate order number (format: RNG-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.getFullYear() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `RNG-${dateStr}-${randomPart}`;
    
    // Create order document
    const ordersRef = collection(db, 'orders');
    const orderDoc = {
      userId: user.id,
      userEmail: user.email,
      orderNumber,
      customer: orderData.customer,
      items: orderData.items,
      shipping: orderData.shipping,
      billing: orderData.billing,
      payment: {
        method: orderData.payment.method,
        status: orderData.payment.method === 'cod' ? 'pending' : 'processing'
      },
      status: orderData.payment.method === 'cod' ? 'pending' : 'processing',
      ...totals,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Handle different payment methods
    if (orderData.payment.method === 'cod') {
      // For Cash on Delivery, we don't need payment processing
      orderDoc.payment.details = {
        type: 'cash_on_delivery',
        amount: totals.total
      };
    } else if (orderData.payment.method === 'card') {
      // For card payments, we'll use Razorpay
      orderDoc.payment.details = {
        type: 'card',
        amount: totals.total,
        status: 'pending',
        gateway: 'razorpay'
      };
      // Set order status to payment_pending
      orderDoc.status = 'payment_pending';
      orderDoc.payment.status = 'pending';
    } else if (orderData.payment.method === 'upi') {
      // For UPI payments, we'll use Razorpay
      orderDoc.payment.details = {
        type: 'upi',
        amount: totals.total,
        status: 'pending',
        gateway: 'razorpay'
      };
      // Set order status to payment_pending
      orderDoc.status = 'payment_pending';
      orderDoc.payment.status = 'pending';
    } else {
      // For any other payment method
      throw createError('PAYMENT', 'Selected payment method is not supported.', { paymentMethodUnsupported: true });
    }
    
    // Note: This code is unreachable for non-COD methods as they throw errors above
    // It's kept for future implementation of payment gateways
    
    // Save order to database
    const newOrderRef = await addDoc(ordersRef, orderDoc);
    const orderId = newOrderRef.id;
    
    // Update order with ID
    await updateDoc(newOrderRef, { id: orderId });
    
    // Also save to user's orders subcollection
    const userOrdersRef = collection(db, 'users', user.id, 'orders');
    await addDoc(userOrdersRef, { ...orderDoc, id: orderId });
    
    // Update product stock
    await updateProductStock(orderData.items);
    
    // Send order confirmation email
    try {
      await sendOrderConfirmationEmail(
        { id: orderId, ...orderDoc, createdAt: new Date().toISOString() },
        user
      );
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Don't fail the order creation if email sending fails
    }
    
    // Return success response
    return res.status(200).json({
      success: true,
      orderId,
      orderNumber,
      status: orderDoc.status,
      message: 'Order created successfully'
    });
  } catch (error) {
    // Error is handled by withErrorHandling middleware
    throw error;
  }
}

// Apply middleware
export default combineMiddleware(
  withErrorHandling,
  withCSRFProtection,
  checkoutRateLimit
)(createOrderHandler);