import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  serverTimestamp, 
  runTransaction, 
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Places an order for the current user, creates order document in Firestore,
 * clears the user's cart, and decrements product inventory.
 *
 * @param {Object} orderData - Order data containing all required information
 * @param {string} orderData.userId - The current user's ID
 * @param {Object} orderData.shippingAddress - The shipping address object
 * @param {Array} orderData.items - Array of cart items with product details
 * @param {string} orderData.paymentMethod - Payment method (e.g., "Cash on Delivery")
 * @param {number} orderData.subtotal - Order subtotal
 * @param {number} orderData.shippingFee - Shipping fee
 * @param {number} orderData.tax - Tax amount
 * @param {number} orderData.totalAmount - Total order amount
 * @returns {Promise<Object>} - Object containing orderId and success status
 */
export const placeOrder = async (orderData) => {
  // Validate required data
  if (!orderData.userId) {
    throw new Error('User ID is required');
  }
  
  if (!orderData.items || !orderData.items.length) {
    throw new Error('Order must contain at least one item');
  }

  // Use a batch write to ensure atomicity of the operation
  const batch = writeBatch(db);
  
  try {
    // 1. Create a reference to the user's orders subcollection
    const userOrdersRef = collection(db, 'users', orderData.userId, 'orders');
    
    // 2. Generate a new document reference with auto-ID
    const newOrderRef = doc(userOrdersRef);
    const orderId = newOrderRef.id;
    
    // 3. Prepare the order document
    const orderDocument = {
      orderId: orderId,
      userId: orderData.userId,
      createdAt: serverTimestamp(),
      paymentMethod: orderData.paymentMethod,
      status: 'Pending',
      shippingAddress: orderData.shippingAddress,
      items: orderData.items.map(item => ({
        productId: item.id,
        name: item.name,
        size: item.size,
        qty: item.quantity,
        unitPrice: item.price,
        imageURL: item.image
      })),
      subtotal: orderData.subtotal,
      shippingFee: orderData.shippingFee || 0,
      tax: orderData.tax || 0,
      totalAmount: orderData.totalAmount
    };
    
    // 4. Add the order to the batch
    batch.set(newOrderRef, orderDocument);
    
    // 5. Clear the user's cart
    const userCartRef = doc(db, 'userCarts', orderData.userId);
    batch.set(userCartRef, {
      items: [],
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // 6. Update product inventory for each item
    for (const item of orderData.items) {
      const productRef = doc(db, 'products', item.id);
      
      // We need to use a transaction for inventory updates to ensure accuracy
      await runTransaction(db, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists()) {
          throw new Error(`Product ${item.id} not found`);
        }
        
        const productData = productDoc.data();
        
        // Check if product has stock tracking by size
        if (productData.stock && typeof productData.stock === 'object' && item.size) {
          // Ensure the size exists in stock
          if (productData.stock[item.size] === undefined) {
            throw new Error(`Size ${item.size} not available for product ${item.name}`);
          }
          
          // Check if enough stock is available
          if (productData.stock[item.size] < item.quantity) {
            throw new Error(`Insufficient stock for ${item.name} in size ${item.size}`);
          }
          
          // Update stock for this size
          const newSizeStock = Math.max(0, productData.stock[item.size] - item.quantity);
          const newStock = { ...productData.stock, [item.size]: newSizeStock };
          
          transaction.update(productRef, { stock: newStock });
        } else if (typeof productData.stock === 'number') {
          // Legacy stock tracking (not by size)
          if (productData.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.name}`);
          }
          
          const newStock = Math.max(0, productData.stock - item.quantity);
          transaction.update(productRef, { stock: newStock });
        }
      });
    }
    
    // 7. Commit the batch write
    await batch.commit();
    
    return {
      success: true,
      orderId: orderId
    };
  } catch (error) {
    console.error('Error placing order:', error);
    throw error;
  }
};

/**
 * Creates an admin notification for order status changes
 * @param {string} orderId - The order ID
 * @param {string} status - The new status
 * @param {string} orderNumber - Optional order number for display
 * @param {number} total - Optional order total
 */
export const createOrderStatusNotification = async (orderId, status, orderNumber, total) => {
  try {
    const notificationsRef = collection(db, 'adminNotifications');
    
    // Format the message based on status
    let title, message, type;
    
    switch(status) {
      case 'pending':
        title = 'New Order Received';
        message = `Order #${orderNumber || orderId.substring(0, 8)} is pending payment`;
        type = 'info';
        break;
      case 'processing':
        title = 'Order Processing';
        message = `Order #${orderNumber || orderId.substring(0, 8)} is being processed`;
        type = 'info';
        break;
      case 'completed':
        title = 'Order Completed';
        message = `Order #${orderNumber || orderId.substring(0, 8)} has been completed`;
        type = 'success';
        break;
      case 'cancelled':
        title = 'Order Cancelled';
        message = `Order #${orderNumber || orderId.substring(0, 8)} has been cancelled`;
        type = 'warning';
        break;
      case 'refunded':
        title = 'Order Refunded';
        message = `Order #${orderNumber || orderId.substring(0, 8)} has been refunded`;
        type = 'warning';
        break;
      default:
        title = 'Order Updated';
        message = `Order #${orderNumber || orderId.substring(0, 8)} status changed to ${status}`;
        type = 'info';
    }
    
    // Add the notification
    await addDoc(notificationsRef, {
      title,
      message,
      type,
      orderId,
      orderNumber,
      total,
      status,
      read: false,
      createdAt: serverTimestamp()
    });
    
  } catch (error) {
    console.error('Error creating order notification:', error);
  }
};