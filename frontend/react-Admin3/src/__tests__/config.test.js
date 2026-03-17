import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// Unmock config so we can test the real module
vi.unmock('../config');

/**
 * Tests for Config Module
 * T010: Test config values, environment variables
 */

describe('config', () => {
  const savedEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env values
    Object.keys(import.meta.env).forEach((key) => {
      if (!(key in savedEnv)) {
        delete import.meta.env[key];
      }
    });
    Object.assign(import.meta.env, savedEnv);
  });

  describe('config structure', () => {
    test('exports default config object', async () => {
      const { default: config } = await import('../config');

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    test('has required API URL properties', async () => {
      const { default: config } = await import('../config');

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

    test('has environment detection properties', async () => {
      const { default: config } = await import('../config');

      expect('isDevelopment' in config).toBe(true);
      expect('isUAT' in config).toBe(true);
    });

    test('has page size property', async () => {
      const { default: config } = await import('../config');

      expect('pageSize' in config).toBe(true);
    });

    test('has enableDebugLogs property', async () => {
      const { default: config } = await import('../config');

      expect('enableDebugLogs' in config).toBe(true);
      expect(config.enableDebugLogs).toBe(true);
    });
  });

  describe('environment-based configuration', () => {
    test('isDevelopment is true in development environment', async () => {
      import.meta.env.MODE = 'development';
      vi.resetModules();

      const { default: config } = await import('../config');

      expect(config.isDevelopment).toBe(true);
    });

    test('isDevelopment is false in production environment', async () => {
      import.meta.env.MODE = 'production';
      vi.resetModules();

      const { default: config } = await import('../config');

      expect(config.isDevelopment).toBe(false);
    });

    test('isUAT is true when VITE_ENV is uat', async () => {
      import.meta.env.VITE_ENV = 'uat';
      vi.resetModules();

      const { default: config } = await import('../config');

      expect(config.isUAT).toBe(true);
    });

    test('isUAT is false when VITE_ENV is not uat', async () => {
      import.meta.env.VITE_ENV = 'production';
      delete import.meta.env.VITE_ENVIRONMENT;
      vi.resetModules();

      const { default: config } = await import('../config');

      expect(config.isUAT).toBe(false);
    });

    test('isUAT is true when VITE_ENVIRONMENT is uat (Railway format)', async () => {
      delete import.meta.env.VITE_ENV;
      import.meta.env.VITE_ENVIRONMENT = 'uat';
      vi.resetModules();

      const { default: config } = await import('../config');

      expect(config.isUAT).toBe(true);
    });
  });

  describe('API URL configuration', () => {
    test('constructs URLs from environment variables', async () => {
      import.meta.env.VITE_API_BASE_URL = 'http://api.example.com';
      import.meta.env.VITE_API_AUTH_URL = '/auth';
      import.meta.env.VITE_API_USER_URL = '/users';
      import.meta.env.VITE_API_EXAM_SESSION_URL = '/exam-sessions';
      import.meta.env.VITE_API_PRODUCT_URL = '/products';
      import.meta.env.VITE_API_SUBJECT_URL = '/subjects';
      import.meta.env.VITE_API_EXAM_SESSION_SUBJECT_URL = '/exam-session-subjects';
      import.meta.env.VITE_API_CART_URL = '/cart';
      import.meta.env.VITE_API_COUNTRIES_URL = '/countries';
      import.meta.env.VITE_API_MARKING_URL = '/marking';
      import.meta.env.VITE_API_TUTORIAL_URL = '/tutorials';
      vi.resetModules();

      const { default: config } = await import('../config');

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

    test('handles missing environment variables gracefully', async () => {
      delete import.meta.env.VITE_API_BASE_URL;
      delete import.meta.env.VITE_API_AUTH_URL;
      vi.resetModules();

      const { default: config } = await import('../config');

      // Config should still load even with undefined values
      expect(config).toBeDefined();
    });
  });

  describe('page size configuration', () => {
    test('pageSize is set from environment variable', async () => {
      import.meta.env.VITE_API_PAGE_SIZE = '50';
      vi.resetModules();

      const { default: config } = await import('../config');

      expect(config.pageSize).toBe('50');
    });
  });
});
