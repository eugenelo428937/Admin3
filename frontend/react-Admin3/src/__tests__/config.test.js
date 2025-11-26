/**
 * Tests for Config Module
 * T010: Test config values, environment variables
 */

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('config structure', () => {
    test('exports default config object', () => {
      const config = require('../config').default;

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    test('has required API URL properties', () => {
      const config = require('../config').default;

      expect('apiBaseUrl' in config).toBe(true);
      expect('authUrl' in config).toBe(true);
      expect('userUrl' in config).toBe(true);
      expect('examSessionUrl' in config).toBe(true);
      expect('productsUrl' in config).toBe(true);
      expect('subjectUrl' in config).toBe(true);
      expect('examSessionSubjectUrl' in config).toBe(true);
      expect('cartUrl' in config).toBe(true);
      expect('countryUrl' in config).toBe(true);
      expect('markingUrl' in config).toBe(true);
      expect('tutorialUrl' in config).toBe(true);
    });

    test('has environment detection properties', () => {
      const config = require('../config').default;

      expect('isDevelopment' in config).toBe(true);
      expect('isUAT' in config).toBe(true);
    });

    test('has page size property', () => {
      const config = require('../config').default;

      expect('pageSize' in config).toBe(true);
    });

    test('has enableDebugLogs property', () => {
      const config = require('../config').default;

      expect('enableDebugLogs' in config).toBe(true);
      expect(config.enableDebugLogs).toBe(true);
    });
  });

  describe('environment-based configuration', () => {
    test('isDevelopment is true in development environment', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();

      const config = require('../config').default;

      expect(config.isDevelopment).toBe(true);
    });

    test('isDevelopment is false in production environment', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();

      const config = require('../config').default;

      expect(config.isDevelopment).toBe(false);
    });

    test('isUAT is true when REACT_APP_ENV is uat', () => {
      process.env.REACT_APP_ENV = 'uat';
      jest.resetModules();

      const config = require('../config').default;

      expect(config.isUAT).toBe(true);
    });

    test('isUAT is false when REACT_APP_ENV is not uat', () => {
      process.env.REACT_APP_ENV = 'production';
      jest.resetModules();

      const config = require('../config').default;

      expect(config.isUAT).toBe(false);
    });
  });

  describe('API URL configuration', () => {
    test('constructs URLs from environment variables', () => {
      process.env.REACT_APP_API_BASE_URL = 'http://api.example.com';
      process.env.REACT_APP_API_AUTH_URL = '/auth';
      process.env.REACT_APP_API_USER_URL = '/users';
      process.env.REACT_APP_API_EXAM_SESSION_URL = '/exam-sessions';
      process.env.REACT_APP_API_PRODUCT_URL = '/products';
      process.env.REACT_APP_API_SUBJECT_URL = '/subjects';
      process.env.REACT_APP_API_EXAM_SESSION_SUBJECT_URL = '/exam-session-subjects';
      process.env.REACT_APP_API_CART_URL = '/cart';
      process.env.REACT_APP_API_COUNTRIES_URL = '/countries';
      process.env.REACT_APP_API_MARKING_URL = '/marking';
      process.env.REACT_APP_API_TUTORIAL_URL = '/tutorials';
      jest.resetModules();

      const config = require('../config').default;

      expect(config.apiBaseUrl).toBe('http://api.example.com');
      expect(config.authUrl).toBe('http://api.example.com/auth');
      expect(config.userUrl).toBe('http://api.example.com/users');
      expect(config.productsUrl).toBe('http://api.example.com/products');
      expect(config.subjectUrl).toBe('http://api.example.com/subjects');
      expect(config.cartUrl).toBe('http://api.example.com/cart');
      expect(config.countryUrl).toBe('http://api.example.com/countries');
      expect(config.markingUrl).toBe('http://api.example.com/marking');
      expect(config.tutorialUrl).toBe('http://api.example.com/tutorials');
    });

    test('handles missing environment variables gracefully', () => {
      delete process.env.REACT_APP_API_BASE_URL;
      delete process.env.REACT_APP_API_AUTH_URL;
      jest.resetModules();

      const config = require('../config').default;

      // Config should still load even with undefined values
      expect(config).toBeDefined();
    });
  });

  describe('page size configuration', () => {
    test('pageSize is set from environment variable', () => {
      process.env.REACT_APP_API_PAGE_SIZE = '50';
      jest.resetModules();

      const config = require('../config').default;

      expect(config.pageSize).toBe('50');
    });
  });
});
