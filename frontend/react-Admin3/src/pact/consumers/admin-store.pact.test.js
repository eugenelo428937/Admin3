/**
 * Pact consumer tests for Store Admin API.
 *
 * Covers the new admin write endpoints added by 20260216-admin-panel-api:
 * - GET /api/store/products/            (existing, backward compat)
 * - GET /api/store/prices/              (existing, backward compat)
 * - GET /api/store/bundles/             (existing, backward compat)
 * - GET /api/store/bundle-products/     (new endpoint)
 *
 * Write operations (POST, PUT, DELETE) require IsSuperUser and are
 * covered by backend integration tests (store.tests.test_admin_views).
 */
const { createPactProvider } = require('../setup.js');
const {
  like,
  eachLike,
  string,
  integer,
  decimal,
  boolean,
  JSON_RESPONSE_HEADERS,
} = require('../helpers.js');
const axios = require('axios');

describe('Store Admin Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  // ── Store Products (backward compat) ──────────────────────────────

  describe('GET /api/store/products/{id}/', () => {
    it('returns a single store product detail', async () => {
      const productId = 1;

      provider
        .given('store product exists')
        .uponReceiving('a request for a single store product')
        .withRequest({
          method: 'GET',
          path: `/api/store/products/${productId}/`,
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            id: integer(1),
            product_code: string('CM2/PC/2025-04'),
            exam_session_subject: integer(1),
            product_product_variation: integer(1),
            is_active: boolean(true),
            created_at: string('2026-02-16T10:00:00Z'),
            updated_at: string('2026-02-16T10:00:00Z'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/store/products/${productId}/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('product_code');
        expect(response.data).toHaveProperty('exam_session_subject');
        expect(response.data).toHaveProperty('product_product_variation');
      });
    });
  });

  // ── Store Prices ──────────────────────────────────────────────────

  describe('GET /api/store/prices/', () => {
    it('returns list of prices', async () => {
      provider
        .given('store prices exist')
        .uponReceiving('a request for store prices')
        .withRequest({
          method: 'GET',
          path: '/api/store/prices/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            product: integer(1),
            price_type: string('standard'),
            amount: string('59.99'),
            currency: string('GBP'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/store/prices/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('product');
        expect(response.data[0]).toHaveProperty('price_type');
        expect(response.data[0]).toHaveProperty('amount');
      });
    });
  });

  // ── Store Bundles (backward compat) ───────────────────────────────

  describe('GET /api/store/bundles/', () => {
    it('returns list of store bundles', async () => {
      provider
        .given('store bundles exist')
        .uponReceiving('a request for store bundles list')
        .withRequest({
          method: 'GET',
          path: '/api/store/bundles/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            bundle_template: integer(1),
            exam_session_subject: integer(1),
            is_active: boolean(true),
            display_order: integer(0),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/store/bundles/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('id');
        expect(response.data[0]).toHaveProperty('bundle_template');
      });
    });
  });

  // ── Store Bundle Products (new endpoint) ──────────────────────────

  describe('GET /api/store/bundle-products/', () => {
    it('returns list of store bundle-product associations', async () => {
      provider
        .given('store bundle products exist')
        .uponReceiving('a request for store bundle products')
        .withRequest({
          method: 'GET',
          path: '/api/store/bundle-products/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            bundle: integer(1),
            product: integer(1),
            default_price_type: string('standard'),
            quantity: integer(1),
            sort_order: integer(0),
            is_active: boolean(true),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/store/bundle-products/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('bundle');
        expect(response.data[0]).toHaveProperty('product');
        expect(response.data[0]).toHaveProperty('default_price_type');
      });
    });
  });
});
