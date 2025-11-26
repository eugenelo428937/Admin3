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
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
    process.env.NODE_ENV = originalEnv;
  });

  describe('in development environment', () => {
    let loggerService;

    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = 'development';
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
      jest.resetModules();
      process.env.NODE_ENV = 'production';
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
      jest.resetModules();
      process.env.NODE_ENV = 'test';
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
