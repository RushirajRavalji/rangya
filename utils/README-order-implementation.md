# Order Implementation Guide

## Overview

This implementation provides a solution for creating orders in Firestore with the following structure:

- A top-level `orders` collection
- User-specific documents using the user's UID as the document ID
- A `userOrders` subcollection under each user document
- Each order document in the subcollection contains complete order details

## Implementation Details

### Files Created/Modified

1. `utils/orderUtils.js` - Contains the main `placeOrder()` function
2. `firestore.rules.new` - Updated security rules to support the new structure
3. `examples/PlaceOrderExample.js` - Example implementation of using the placeOrder function

### Order Structure

Each order document contains:

- `orderId` (string) - Unique order identifier
- `userId` (string) - ID of the user who placed the order
- `createdAt` (Firestore timestamp) - When the order was created
- `paymentMethod` (string) - Payment method used (e.g., "Cash on Delivery")
- `status` (string) - Order status (default: "Pending")
- `shippingAddress` (object) - Customer's shipping information
- `items` (array) - Products ordered with details
- `subtotal`, `shippingFee`, `tax`, and `totalAmount` (numbers) - Order totals

## How to Use

### Basic Usage

```javascript
import { placeOrder } from '../utils/orderUtils';

// Prepare order data
const orderData = {
  userId: currentUser.uid,
  shippingAddress: {
    fullName: 'John Doe',
    address1: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India'
  },
  items: cartItems.map(item => ({
    id: item.id,
    name: item.name,
    size: item.size,
    quantity: item.quantity,
    price: item.price,
    image: item.image
  })),
  paymentMethod: 'Cash on Delivery',
  subtotal: 1200,
  shippingFee: 0,
  tax: 216,
  totalAmount: 1416
};

// Place the order
try {
  const result = await placeOrder(orderData);
  
  if (result.success) {
    // Clear the cart
    clearCart();
    
    // Redirect to confirmation page
    router.push(`/order-confirmation?id=${result.orderId}`);
  }
} catch (error) {
  console.error('Error placing order:', error);
}
```

### Key Features

1. **Atomic Operations**: Uses Firestore batch writes and transactions to ensure all operations succeed or fail together.

2. **Cart Clearing**: Automatically clears the user's cart after successful order placement.

3. **Inventory Management**: Decrements product inventory counts for each ordered item.

4. **Validation**: Validates stock availability before completing the order.

## Security Rules

The updated security rules in `firestore.rules.new` ensure:

- Only authenticated users can create orders
- Users can only read and modify their own orders
- Admins have full access to all orders

To apply the new security rules:

1. Review the changes in `firestore.rules.new`
2. Copy the content to your existing `firestore.rules` file
3. Deploy the updated rules using Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

## Error Handling

The `placeOrder` function throws descriptive errors for various failure scenarios:

- Missing user ID or empty cart
- Product not found
- Size not available for a product
- Insufficient stock

Make sure to implement proper error handling in your UI to display these messages to users.