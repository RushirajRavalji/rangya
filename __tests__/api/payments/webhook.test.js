import { createMocks } from 'node-mocks-http';
import webhookHandler from '../../../pages/api/payments/webhook';
import * as firebase from '../../../utils/firebase';

// Mock Firebase Firestore functions
jest.mock('../../../utils/firebase', () => {
  const originalModule = jest.requireActual('../../../utils/firebase');
  return {
    ...originalModule,
    db: {
      collection: jest.fn(),
    },
  };
});

// Mock Firestore document functions
jest.mock('firebase/firestore', () => {
  const orderData = {
    userId: 'test-user-id',
    status: 'pending',
    payment: {
      status: 'pending',
      details: {}
    }
  };

  const userOrderData = { ...orderData };

  return {
    doc: jest.fn().mockReturnValue({}),
    getDoc: jest.fn().mockImplementation(() => ({
      exists: jest.fn().mockReturnValue(true),
      data: jest.fn().mockReturnValue(orderData)
    })),
    updateDoc: jest.fn().mockResolvedValue({}),
    serverTimestamp: jest.fn().mockReturnValue('server-timestamp')
  };
});

// Mock crypto for signature verification
jest.mock('crypto', () => {
  return {
    createHmac: jest.fn().mockReturnValue({
      update: jest.fn(),
      digest: jest.fn().mockReturnValue('valid-signature')
    }),
    timingSafeEqual: jest.fn().mockReturnValue(true)
  };
});

// Set environment variables for testing
process.env.PAYMENT_WEBHOOK_SECRET = 'test-webhook-secret';

describe('Webhook API Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    });
  });

  it('should return 400 if signature is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {},
      body: JSON.stringify({
        event: 'payment.captured',
        payload: {}
      })
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toBe('Invalid signature');
  });

  it('should handle payment.captured event successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'valid-signature'
      },
      body: JSON.stringify({
        event: 'payment.captured',
        event_id: 'evt_123',
        payload: {
          payment: {
            id: 'pay_123',
            notes: {
              order_id: 'order_123'
            },
            amount: 10000, // 100 INR in paise
            method: 'card',
            status: 'captured'
          }
        }
      })
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).received).toBe(true);
  });

  it('should handle payment.failed event successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'valid-signature'
      },
      body: JSON.stringify({
        event: 'payment.failed',
        event_id: 'evt_456',
        payload: {
          payment: {
            id: 'pay_456',
            notes: {
              order_id: 'order_456'
            },
            amount: 10000,
            method: 'card',
            status: 'failed',
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Payment authentication failed'
          }
        }
      })
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).received).toBe(true);
  });

  it('should handle refund.created event successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'valid-signature'
      },
      body: JSON.stringify({
        event: 'refund.created',
        event_id: 'evt_789',
        payload: {
          payment: {
            id: 'pay_789',
            notes: {
              order_id: 'order_789'
            }
          },
          refund: {
            id: 'rfnd_123',
            amount: 10000,
            status: 'processed'
          }
        }
      })
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).received).toBe(true);
  });

  it('should handle refund.processed event successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'valid-signature'
      },
      body: JSON.stringify({
        event: 'refund.processed',
        event_id: 'evt_101',
        payload: {
          payment: {
            id: 'pay_101',
            notes: {
              order_id: 'order_101'
            }
          },
          refund: {
            id: 'rfnd_456',
            amount: 10000,
            status: 'processed'
          }
        }
      })
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).received).toBe(true);
  });

  it('should handle unrecognized events gracefully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'valid-signature'
      },
      body: JSON.stringify({
        event: 'unknown.event',
        event_id: 'evt_999',
        payload: {}
      })
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).received).toBe(true);
  });

  it('should return 400 if order_id is missing in payment notes', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'valid-signature'
      },
      body: JSON.stringify({
        event: 'payment.captured',
        event_id: 'evt_123',
        payload: {
          payment: {
            id: 'pay_123',
            notes: {}, // Missing order_id
            amount: 10000,
            method: 'card',
            status: 'captured'
          }
        }
      })
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toBe('Order ID not found in payment notes');
  });

  it('should handle JSON parsing errors', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'valid-signature'
      },
      body: 'invalid-json{' // Invalid JSON
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toBe('Invalid webhook payload format');
  });
});