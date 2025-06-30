# Rangya Payment System Documentation

## Overview

The Rangya payment system integrates with Razorpay to provide a secure and reliable payment processing solution. This document outlines the architecture, components, and flow of the payment system.

## Architecture

The payment system consists of the following components:

1. **Frontend Components**:
   - `CheckoutForm.js`: Handles payment form display and submission
   - `razorpayLoader.js`: Manages loading the Razorpay SDK

2. **API Endpoints**:
   - `/api/payments/initialize`: Initializes a payment with Razorpay
   - `/api/payments/verify`: Verifies a completed payment
   - `/api/payments/webhook`: Processes Razorpay webhook events

3. **Utility Functions**:
   - `paymentService.js`: Contains functions for payment operations
   - Error handling utilities

## Payment Flow

### 1. Payment Initialization

When a user proceeds to checkout:

1. The `CheckoutForm` component prepares order data and sends it to `/api/payments/initialize`
2. The API endpoint creates a Razorpay order and returns order details
3. The frontend loads the Razorpay SDK using `razorpayLoader.js`
4. The Razorpay payment form is displayed to the user

### 2. Payment Processing

1. User enters payment details in the Razorpay form
2. Razorpay processes the payment and returns a result
3. The frontend sends the payment result to `/api/payments/verify`
4. The API endpoint verifies the payment signature and updates the order status

### 3. Webhook Processing

Razorpay sends webhook events to `/api/payments/webhook` for various payment events:

1. `payment.authorized`: Payment has been authorized but not captured
2. `payment.captured`: Payment has been captured (completed)
3. `payment.failed`: Payment has failed
4. `refund.created`: Refund has been initiated
5. `refund.processed`: Refund has been processed

The webhook handler:
1. Verifies the webhook signature
2. Processes the event based on its type
3. Updates the order status in Firestore

## Error Handling

The payment system implements comprehensive error handling:

1. **Frontend Errors**:
   - SDK loading failures
   - Payment initialization errors
   - Payment verification errors

2. **API Errors**:
   - Invalid request validation
   - Payment verification failures
   - Database operation errors

3. **Webhook Errors**:
   - Invalid signatures
   - Missing order IDs
   - Database update failures

All errors are logged with appropriate context and returned with meaningful status codes and messages.

## Testing

The payment system includes comprehensive tests:

1. **Unit Tests**:
   - `webhookSignature.test.js`: Tests signature verification
   - `updateOrderStatus.test.js`: Tests order status updates
   - `createError.test.js`: Tests error creation utility

2. **Integration Tests**:
   - `webhook.test.js`: Tests webhook processing

## Security Considerations

1. **Signature Verification**:
   - All Razorpay responses are verified using cryptographic signatures
   - Webhook payloads are verified to ensure they come from Razorpay

2. **Environment Variables**:
   - Razorpay API keys are stored as environment variables
   - Webhook secrets are stored as environment variables

3. **Error Handling**:
   - Errors are logged without exposing sensitive information
   - Appropriate HTTP status codes are returned

## Deployment Considerations

1. **Environment Variables**:
   - `RAZORPAY_KEY_ID`: Razorpay API Key ID
   - `RAZORPAY_KEY_SECRET`: Razorpay API Key Secret
   - `PAYMENT_WEBHOOK_SECRET`: Secret for webhook signature verification

2. **Webhook Configuration**:
   - Configure the webhook URL in the Razorpay dashboard to point to `/api/payments/webhook`
   - Enable the required events in the Razorpay dashboard

## Troubleshooting

### Common Issues

1. **Payment Verification Failures**:
   - Check that the correct Razorpay API keys are configured
   - Ensure the payment signature is being correctly passed from the frontend

2. **Webhook Processing Failures**:
   - Verify that the webhook secret is correctly configured
   - Check that the webhook URL is correctly configured in the Razorpay dashboard
   - Ensure the required events are enabled in the Razorpay dashboard

3. **Order Status Not Updating**:
   - Check Firestore permissions
   - Verify that the order ID is correctly included in the payment notes

### Debugging

1. **Logging**:
   - All payment operations are logged with appropriate context
   - Webhook events are logged with event type and timestamp
   - Errors are logged with detailed information

2. **Testing Webhooks**:
   - Use the Razorpay dashboard to send test webhook events
   - Check the logs for webhook processing information

## Future Improvements

1. **Payment Analytics**:
   - Implement tracking of payment success/failure rates
   - Add reporting on payment methods used

2. **Additional Payment Methods**:
   - Add support for UPI payments
   - Implement saved payment methods

3. **Enhanced Error Recovery**:
   - Implement retry mechanisms for failed database operations
   - Add webhook event queuing for processing failures