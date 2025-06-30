import { createError } from '../../pages/api/payments/webhook';

describe('createError', () => {
  it('should create an error with code and message', () => {
    const error = createError('TEST_ERROR', 'Test error message');
    
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual({});
  });

  it('should create an error with details', () => {
    const details = { field: 'testField', value: 'testValue' };
    const error = createError('VALIDATION', 'Validation error', details);
    
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Validation error');
    expect(error.code).toBe('VALIDATION');
    expect(error.details).toEqual(details);
  });

  it('should handle empty details', () => {
    const error = createError('NOT_FOUND', 'Resource not found');
    
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Resource not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.details).toEqual({});
  });

  it('should handle null details', () => {
    const error = createError('DATABASE', 'Database error', null);
    
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Database error');
    expect(error.code).toBe('DATABASE');
    expect(error.details).toEqual({});
  });
});