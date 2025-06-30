import { verifyWebhookSignature } from '../../pages/api/payments/webhook';

// Mock crypto module
jest.mock('crypto', () => {
  return {
    createHmac: jest.fn().mockReturnValue({
      update: jest.fn(),
      digest: jest.fn().mockReturnValue('valid-signature')
    }),
    timingSafeEqual: jest.fn()
  };
});

describe('verifyWebhookSignature', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.PAYMENT_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return valid=true when signature is valid', () => {
    const crypto = require('crypto');
    crypto.timingSafeEqual.mockReturnValue(true);

    const body = JSON.stringify({ event: 'payment.captured' });
    const signature = 'valid-signature';

    const result = verifyWebhookSignature(body, signature);

    expect(result).toEqual({ valid: true, error: null });
    expect(crypto.createHmac).toHaveBeenCalledWith('sha256', 'test-webhook-secret');
    expect(crypto.timingSafeEqual).toHaveBeenCalled();
  });

  it('should return valid=false when signature is invalid', () => {
    const crypto = require('crypto');
    crypto.timingSafeEqual.mockReturnValue(false);

    const body = JSON.stringify({ event: 'payment.captured' });
    const signature = 'invalid-signature';

    const result = verifyWebhookSignature(body, signature);

    expect(result).toEqual({ valid: false, error: 'Invalid signature' });
  });

  it('should return valid=false when webhook secret is not configured', () => {
    delete process.env.PAYMENT_WEBHOOK_SECRET;

    const body = JSON.stringify({ event: 'payment.captured' });
    const signature = 'valid-signature';

    const result = verifyWebhookSignature(body, signature);

    expect(result).toEqual({ valid: false, error: 'Webhook secret not configured' });
  });

  it('should return valid=false when signature is not provided', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    const signature = null;

    const result = verifyWebhookSignature(body, signature);

    expect(result).toEqual({ valid: false, error: 'Signature not provided' });
  });

  it('should handle objects as body input', () => {
    const crypto = require('crypto');
    crypto.timingSafeEqual.mockReturnValue(true);

    const body = { event: 'payment.captured' };
    const signature = 'valid-signature';

    const result = verifyWebhookSignature(body, signature);

    expect(result).toEqual({ valid: true, error: null });
    // Verify that body was stringified
    expect(crypto.createHmac().update).toHaveBeenCalledWith(JSON.stringify(body));
  });

  it('should handle errors during verification', () => {
    const crypto = require('crypto');
    const error = new Error('Verification error');
    crypto.timingSafeEqual.mockImplementation(() => {
      throw error;
    });

    const body = JSON.stringify({ event: 'payment.captured' });
    const signature = 'valid-signature';

    const result = verifyWebhookSignature(body, signature);

    expect(result).toEqual({ 
      valid: false, 
      error: 'Signature verification failed: Verification error' 
    });
  });
});