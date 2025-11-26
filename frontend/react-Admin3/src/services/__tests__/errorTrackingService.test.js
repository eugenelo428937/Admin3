/**
 * Tests for errorTrackingService
 *
 * @module services/__tests__/errorTrackingService.test
 *
 * Tests error tracking initialization including:
 * - initializeErrorTracking: Initializes Sentry in production only
 */

describe('errorTrackingService', () => {
  const originalEnv = process.env.NODE_ENV;
  let mockSentryInit;

  beforeEach(() => {
    jest.resetModules();

    // Create mock for Sentry
    mockSentryInit = jest.fn();

    // Use doMock with virtual:true since @sentry/react may not be installed
    jest.doMock('@sentry/react', () => ({
      init: mockSentryInit,
    }), { virtual: true });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  describe('initializeErrorTracking', () => {
    test('should initialize Sentry in production environment', () => {
      process.env.NODE_ENV = 'production';
      const { initializeErrorTracking } = require('../errorTrackingService');

      initializeErrorTracking();

      expect(mockSentryInit).toHaveBeenCalledWith({
        dsn: 'your-sentry-dsn',
        environment: 'production',
      });
    });

    test('should not initialize Sentry in development environment', () => {
      process.env.NODE_ENV = 'development';
      const { initializeErrorTracking } = require('../errorTrackingService');

      initializeErrorTracking();

      expect(mockSentryInit).not.toHaveBeenCalled();
    });

    test('should not initialize Sentry in test environment', () => {
      process.env.NODE_ENV = 'test';
      const { initializeErrorTracking } = require('../errorTrackingService');

      initializeErrorTracking();

      expect(mockSentryInit).not.toHaveBeenCalled();
    });
  });
});
