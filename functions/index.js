const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function that runs daily to check for orders that need to be deleted
 * This function will delete orders that:
 * 1. Have status 'delivered'
 * 2. Are marked as paid
 * 3. Have a scheduledForDeletion date that has passed
 */
exports.cleanupOldOrders = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      
      // Query for orders that are scheduled for deletion and the date has passed
      const ordersQuery = await db.collection('orders')
        .where('status', '==', 'delivered')
        .where('isPaid', '==', true)
        .where('scheduledForDeletion', '<=', now)
        .get();
      
      if (ordersQuery.empty) {
        console.log('No orders to delete');
        return null;
      }
      
      // Delete each eligible order
      const batch = db.batch();
      let deleteCount = 0;
      
      ordersQuery.forEach(doc => {
        console.log(`Deleting order ${doc.id}`);
        batch.delete(doc.ref);
        deleteCount++;
      });
      
      // Commit the batch
      await batch.commit();
      console.log(`Successfully deleted ${deleteCount} orders`);
      
      return null;
    } catch (error) {
      console.error('Error cleaning up old orders:', error);
      return null;
    }
  });

/**
 * Cloud Function that marks an order as delivered
 * This can be triggered by an admin or an automated system
 * It will update the order status and set the delivery date
 */
exports.markOrderAsDelivered = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }
    
    const { orderId } = data;
    if (!orderId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Order ID is required'
      );
    }
    
    // Get the order
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Order not found'
      );
    }
    
    const orderData = orderDoc.data();
    
    // Check if the order is already delivered
    if (orderData.status === 'delivered') {
      throw new functions.https.HttpsError(
        'already-exists',
        'Order is already marked as delivered'
      );
    }
    
    // Update the order
    await orderRef.update({
      status: 'delivered',
      deliveryDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, message: 'Order marked as delivered' };
  } catch (error) {
    console.error('Error marking order as delivered:', error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while marking the order as delivered'
    );
  }
});

/**
 * Cloud Function that marks an order as paid and schedules it for deletion
 * This can be triggered by the user or an automated payment system
 */
exports.markOrderAsPaid = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }
    
    const { orderId } = data;
    if (!orderId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Order ID is required'
      );
    }
    
    // Get the order
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Order not found'
      );
    }
    
    const orderData = orderDoc.data();
    
    // Check if the order is delivered
    if (orderData.status !== 'delivered') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Only delivered orders can be marked as paid'
      );
    }
    
    // Check if the order is already paid
    if (orderData.isPaid) {
      throw new functions.https.HttpsError(
        'already-exists',
        'Order is already marked as paid'
      );
    }
    
    // Calculate deletion date (30 days from now)
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const deletionDate = new Date(Date.now() + thirtyDaysInMs);
    
    // Update the order
    await orderRef.update({
      isPaid: true,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledForDeletion: admin.firestore.Timestamp.fromDate(deletionDate),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { 
      success: true, 
      message: 'Order marked as paid',
      scheduledForDeletion: deletionDate
    };
  } catch (error) {
    console.error('Error marking order as paid:', error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while marking the order as paid'
    );
  }
}); 