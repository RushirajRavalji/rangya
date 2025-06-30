import { updateOrderStatus } from '../../pages/api/payments/webhook';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebase';

// Mock Firebase Firestore functions
jest.mock('../../utils/firebase', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => {
  return {
    doc: jest.fn().mockReturnValue({}),
    getDoc: jest.fn(),
    updateDoc: jest.fn().mockResolvedValue({}),
    serverTimestamp: jest.fn().mockReturnValue('server-timestamp')
  };
});

describe('updateOrderStatus', () => {
  const mockOrderData = {
    userId: 'test-user-id',
    status: 'pending',
    payment: {
      status: 'pending',
      details: {
        originalField: 'value'
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock for getDoc to return existing order
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ...mockOrderData })
    });
  });

  it('should update order status to confirmed when payment is captured', async () => {
    const orderId = 'test-order-id';
    const status = 'captured';
    const paymentDetails = {
      paymentId: 'pay_123',
      amount: 100,
      method: 'card',
      status: 'captured',
      capturedAt: '2023-01-01T00:00:00.000Z'
    };

    const result = await updateOrderStatus(orderId, status, paymentDetails);

    // Verify doc was called with correct arguments
    expect(doc).toHaveBeenCalledWith(db, 'orders', orderId);
    expect(doc).toHaveBeenCalledWith(db, 'users', mockOrderData.userId, 'orders', orderId);

    // Verify updateDoc was called with correct arguments
    const expectedUpdateData = {
      status: 'confirmed',
      'payment.status': 'paid',
      'payment.details': {
        originalField: 'value',
        paymentId: 'pay_123',
        amount: 100,
        method: 'card',
        status: 'captured',
        capturedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: 'server-timestamp'
      },
      updatedAt: 'server-timestamp'
    };

    expect(updateDoc).toHaveBeenCalledTimes(2); // Once for main order, once for user order
    expect(updateDoc.mock.calls[0][1]).toEqual(expectedUpdateData);
    expect(updateDoc.mock.calls[1][1]).toEqual(expectedUpdateData);

    // Verify result
    expect(result).toEqual({
      success: true,
      orderId,
      orderStatus: 'confirmed',
      paymentStatus: 'paid'
    });
  });

  it('should update order status to payment_failed when payment fails', async () => {
    const orderId = 'test-order-id';
    const status = 'failed';
    const paymentDetails = {
      paymentId: 'pay_123',
      amount: 100,
      method: 'card',
      status: 'failed',
      error: 'PAYMENT_ERROR',
      errorDescription: 'Payment failed',
      failedAt: '2023-01-01T00:00:00.000Z'
    };

    const result = await updateOrderStatus(orderId, status, paymentDetails);

    // Verify updateDoc was called with correct status
    expect(updateDoc.mock.calls[0][1].status).toBe('payment_failed');
    expect(updateDoc.mock.calls[0][1]['payment.status']).toBe('failed');

    // Verify result
    expect(result).toEqual({
      success: true,
      orderId,
      orderStatus: 'payment_failed',
      paymentStatus: 'failed'
    });
  });

  it('should update order status to refunded when refund is processed', async () => {
    const orderId = 'test-order-id';
    const status = 'refunded';
    const paymentDetails = {
      paymentId: 'pay_123',
      refundId: 'ref_123',
      amount: 100,
      status: 'processed',
      refundProcessedAt: '2023-01-01T00:00:00.000Z'
    };

    const result = await updateOrderStatus(orderId, status, paymentDetails);

    // Verify updateDoc was called with correct status
    expect(updateDoc.mock.calls[0][1].status).toBe('refunded');
    expect(updateDoc.mock.calls[0][1]['payment.status']).toBe('refunded');

    // Verify result
    expect(result).toEqual({
      success: true,
      orderId,
      orderStatus: 'refunded',
      paymentStatus: 'refunded'
    });
  });

  it('should throw error when order is not found', async () => {
    // Setup mock for getDoc to return non-existing order
    getDoc.mockResolvedValue({
      exists: () => false
    });

    const orderId = 'non-existent-order';
    const status = 'captured';
    const paymentDetails = { paymentId: 'pay_123' };

    await expect(updateOrderStatus(orderId, status, paymentDetails))
      .rejects
      .toThrow('Order non-existent-order not found');
  });

  it('should throw validation error when orderId is not provided', async () => {
    const orderId = null;
    const status = 'captured';
    const paymentDetails = { paymentId: 'pay_123' };

    await expect(updateOrderStatus(orderId, status, paymentDetails))
      .rejects
      .toThrow('Order ID is required');
  });

  it('should throw validation error when status is not provided', async () => {
    const orderId = 'test-order-id';
    const status = null;
    const paymentDetails = { paymentId: 'pay_123' };

    await expect(updateOrderStatus(orderId, status, paymentDetails))
      .rejects
      .toThrow('Payment status is required');
  });

  it('should handle case when user order document does not exist', async () => {
    // First getDoc call returns existing order
    // Second getDoc call returns non-existing user order
    getDoc.mockImplementation((docRef) => {
      if (getDoc.mock.calls.length === 1) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({ ...mockOrderData })
        });
      } else {
        return Promise.resolve({
          exists: () => false
        });
      }
    });

    const orderId = 'test-order-id';
    const status = 'captured';
    const paymentDetails = { paymentId: 'pay_123' };

    const result = await updateOrderStatus(orderId, status, paymentDetails);

    // Should only update main order document
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it('should handle case when payment details are missing in order data', async () => {
    // Setup mock for getDoc to return order without payment details
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        userId: 'test-user-id',
        status: 'pending'
        // No payment field
      })
    });

    const orderId = 'test-order-id';
    const status = 'captured';
    const paymentDetails = { paymentId: 'pay_123' };

    const result = await updateOrderStatus(orderId, status, paymentDetails);

    // Should still update successfully with new payment details
    expect(updateDoc).toHaveBeenCalledTimes(2);
    expect(updateDoc.mock.calls[0][1]['payment.details']).toEqual({
      paymentId: 'pay_123',
      updatedAt: 'server-timestamp'
    });
    expect(result.success).toBe(true);
  });
});