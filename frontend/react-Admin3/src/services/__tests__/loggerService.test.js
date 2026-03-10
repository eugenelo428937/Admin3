import { vi } from 'vitest';
/**
 * Tests for loggerService
 *
 * @module services/__tests__/loggerService.test
 *
 * Tests logging functionality including:
 * - debug: Log debug messages (non-production only)
 * - info: Log info messages (non-production only)
 * - error: Log error messages (always)
 */

describe('loggerService', () => {
  const originalMode = import.meta.env.MODE;
  const originalDev = import.meta.env.DEV;
  const originalProd = import.meta.env.PROD;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.resetModules();
    import.meta.env.MODE = originalMode;
    import.meta.env.DEV = originalDev;
    import.meta.env.PROD = originalProd;
  });

  describe('in development environment', () => {
    let loggerService;

    beforeEach(() => {
      vi.resetModules();
      import.meta.env.MODE = 'development';
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;
      loggerService = require('../loggerService').default;
    });

    describe('debug', () => {
      test('should log debug message with data', () => {
        loggerService.debug('Test debug message', { key: 'value' });

        expect(console.log).toHaveBeenCalledWith('DEBUG Test debug message', { key: 'value' });
      });

      test('should log debug message without data', () => {
        loggerService.debug('Test debug message');

        expect(console.log).toHaveBeenCalledWith('DEBUG Test debug message', '');
      });
    });

    describe('info', () => {
      test('should log info message with data', () => {
        loggerService.info('Test info message', { key: 'value' });

        expect(console.info).toHaveBeenCalledWith('INFO Test info message', { key: 'value' });
      });

      test('should log info message without data', () => {
        loggerService.info('Test info message');

        expect(console.info).toHaveBeenCalledWith('INFO Test info message', '');
      });
    });

    describe('error', () => {
      test('should log error message with data', () => {
        loggerService.error('Test error message', { error: 'details' });

        expect(console.error).toHaveBeenCalledWith('ERROR Test error message', { error: 'details' });
      });

      test('should log error message without data', () => {
        loggerService.error('Test error message');

        expect(console.error).toHaveBeenCalledWith('ERROR Test error message', '');
      });
    });
  });

  describe('in production environment', () => {
    let loggerService;

    beforeEach(() => {
      vi.resetModules();
      import.meta.env.MODE = 'production';
      import.meta.env.DEV = false;
      import.meta.env.PROD = true;
      loggerService = require('../loggerService').default;
    });

    describe('debug', () => {
      test('should not log debug message in production', () => {
        loggerService.debug('Test debug message', { key: 'value' });

        expect(console.log).not.toHaveBeenCalled();
      });
    });

    describe('info', () => {
      test('should not log info message in production', () => {
        loggerService.info('Test info message', { key: 'value' });

        expect(console.info).not.toHaveBeenCalled();
      });
    });

    describe('error', () => {
      test('should log error message in production', () => {
        loggerService.error('Test error message', { error: 'details' });

        expect(console.error).toHaveBeenCalledWith('ERROR Test error message', { error: 'details' });
      });
    });
  });

  describe('in test environment', () => {
    let loggerService;

    beforeEach(() => {
      vi.resetModules();
      import.meta.env.MODE = 'test';
      import.meta.env.DEV = false;
      import.meta.env.PROD = false;
      loggerService = require('../loggerService').default;
    });

    test('should log debug in test environment', () => {
      loggerService.debug('Test message');

      expect(console.log).toHaveBeenCalled();
    });

    test('should log info in test environment', () => {
      loggerService.info('Test message');

      expect(console.info).toHaveBeenCalled();
    });

    test('should always log errors', () => {
      loggerService.error('Test error');

      expect(console.error).toHaveBeenCalled();
    });
  });
});
