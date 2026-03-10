import { vi } from 'vitest';
/**
 * Tests for errorTrackingService
 *
 * @module services/__tests__/errorTrackingService.test
 *
 * Tests error tracking initialization including:
 * - initializeErrorTracking: Initializes Sentry in production only
 */

describe('errorTrackingService', () => {
  const originalMode = import.meta.env.MODE;
  const originalDev = import.meta.env.DEV;
  const originalProd = import.meta.env.PROD;
  let mockSentryInit;

  beforeEach(() => {
    vi.resetModules();

    // Create mock for Sentry
    mockSentryInit = vi.fn();

    // Use doMock with virtual:true since @sentry/react may not be installed
    vi.doMock('@sentry/react', () => ({
      init: mockSentryInit,
    }), { virtual: true });
  });

  afterEach(() => {
    import.meta.env.MODE = originalMode;
    import.meta.env.DEV = originalDev;
    import.meta.env.PROD = originalProd;
    vi.clearAllMocks();
  });

  describe('initializeErrorTracking', () => {
    test('should initialize Sentry in production environment', () => {
      import.meta.env.MODE = 'production';
      import.meta.env.DEV = false;
      import.meta.env.PROD = true;
      const { initializeErrorTracking } = require('../errorTrackingService');

      initializeErrorTracking();

      expect(mockSentryInit).toHaveBeenCalledWith({
        dsn: 'your-sentry-dsn',
        environment: 'production',
      });
    });

    test('should not initialize Sentry in development environment', () => {
      import.meta.env.MODE = 'development';
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;
      const { initializeErrorTracking } = require('../errorTrackingService');

      initializeErrorTracking();

      expect(mockSentryInit).not.toHaveBeenCalled();
    });

    test('should not initialize Sentry in test environment', () => {
      import.meta.env.MODE = 'test';
      import.meta.env.DEV = false;
      import.meta.env.PROD = false;
      const { initializeErrorTracking } = require('../errorTrackingService');

      initializeErrorTracking();

      expect(mockSentryInit).not.toHaveBeenCalled();
    });
  });
});
