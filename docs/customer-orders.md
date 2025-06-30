# Customer Orders Subcollection Structure

## Overview

This document describes the new customer orders subcollection structure implemented in the Rangya e-commerce application. The new structure stores order data in a subcollection under each user document, providing better organization, improved query performance, and enhanced security.

## Data Structure

### Previous Structure

Previously, all orders were stored in a single top-level `orders` collection, with each order containing a `userId` field to associate it with a customer.

```
/orders/{orderId}
```

### New Structure

With the new implementation, orders are stored in two places:

1. In the main `orders` collection (for backward compatibility and admin access)
2. In a subcollection under each user's document

```
/users/{userId}/orders/{orderId}
```

This dual-storage approach ensures that:
- Existing code continues to work without modification
- Admins can still query all orders efficiently
- Customers can access their own orders more efficiently
- Security rules can be more granular

## API Endpoints

New API endpoints have been created to work with the customer orders subcollection:

- `POST /api/customer-orders/create` - Create a new order in the customer's subcollection
- `GET /api/customer-orders` - Get all orders for the authenticated customer
- `GET /api/customer-orders/{id}` - Get a specific order for the authenticated customer
- `PATCH /api/customer-orders/{id}` - Update a specific order (e.g., cancel an order)

## Security Rules

The Firestore security rules have been updated to allow customers to access only their own orders subcollection:

```javascript
match /users/{userId} {
  // Allow users to manage their own orders subcollection
  match /orders/{orderId} {
    allow read: if isOwner(userId) || isAdmin();
    allow create: if isOwner(userId) && 
                   request.resource.data.items.size() > 0;
    allow update: if isAdmin() || 
                   (isOwner(userId) && 
                    resource.data.status != "cancelled" && 
                    request.resource.data.status == "cancelled");
    allow delete: if isAdmin();
  }
}
```

## Migration

A migration script has been created to move existing orders to the new subcollection structure:

```
node scripts/migrateOrdersToSubcollections.js
```

This script:
1. Fetches all orders from the main `orders` collection
2. Creates corresponding documents in each customer's `orders` subcollection
3. Maintains the original order IDs for consistency

## Benefits

1. **Improved Query Performance**: Customers can retrieve their orders more efficiently without filtering through all orders
2. **Enhanced Security**: Security rules can be more granular and follow the natural document hierarchy
3. **Better Organization**: Orders are logically grouped with their respective users
4. **Reduced Data Transfer**: Queries return only the relevant orders for a specific customer
5. **Simplified Client Code**: Client code can directly query the subcollection without filtering

## Implementation Details

The implementation includes:

1. New utility functions in `customerOrderService.js`
2. Updated Firestore security rules
3. New API endpoints for customer orders
4. A migration script for existing orders

## Usage Example

```javascript
// Get all orders for the current user
const { data } = await axios.get('/api/customer-orders');
const { orders, pagination } = data;

// Get a specific order
const { data } = await axios.get(`/api/customer-orders/${orderId}`);
const { order } = data;

// Cancel an order
const { data } = await axios.patch(`/api/customer-orders/${orderId}`, {
  status: 'cancelled',
  note: 'Customer requested cancellation'
});
```