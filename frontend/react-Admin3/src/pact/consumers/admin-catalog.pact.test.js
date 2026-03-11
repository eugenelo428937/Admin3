/**
 * Pact consumer tests for Catalog Admin API.
 *
 * Covers the new admin CRUD endpoints added by 20260216-admin-panel-api:
 * - GET /api/catalog/exam-session-subjects/
 * - GET /api/catalog/product-variations/
 * - GET /api/catalog/product-product-variations/
 * - GET /api/catalog/product-bundles/
 * - GET /api/catalog/bundle-products/
 * - GET /api/catalog/recommendations/
 *
 * NOTE: Write operations (POST, PUT, DELETE) require IsSuperUser and
 * are covered by backend integration tests (catalog.tests.test_admin_views).
 * Consumer pact tests verify the response shape the frontend expects.
 */
const { createPactProvider } = require('../setup.js');
const {
  like,
  eachLike,
  string,
  integer,
  boolean,
  datetime,
  JSON_RESPONSE_HEADERS,
} = require('../helpers.js');
const axios = require('axios');

describe('Catalog Admin Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  // ── Exam Session Subjects ─────────────────────────────────────────

  describe('GET /api/catalog/exam-session-subjects/', () => {
    it('returns list of exam session subjects', async () => {
      provider
        .given('catalog exam session subjects exist')
        .uponReceiving('a request for catalog exam session subjects')
        .withRequest({
          method: 'GET',
          path: '/api/catalog/exam-session-subjects/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            exam_session: integer(1),
            subject: integer(1),
            is_active: boolean(true),
            created_at: string('2026-02-16T10:00:00Z'),
            updated_at: string('2026-02-16T10:00:00Z'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/catalog/exam-session-subjects/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('id');
        expect(response.data[0]).toHaveProperty('exam_session');
        expect(response.data[0]).toHaveProperty('subject');
      });
    });
  });

  // ── Product Variations ────────────────────────────────────────────

  describe('GET /api/catalog/product-variations/', () => {
    it('returns list of product variations', async () => {
      provider
        .given('catalog product variations exist')
        .uponReceiving('a request for catalog product variations')
        .withRequest({
          method: 'GET',
          path: '/api/catalog/product-variations/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            variation_type: string('Printed'),
            name: string('Standard Print'),
            description: string('Full printed study material'),
            description_short: string('Printed material'),
            code: string('PC'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/catalog/product-variations/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('variation_type');
        expect(response.data[0]).toHaveProperty('name');
        expect(response.data[0]).toHaveProperty('description_short');
        expect(response.data[0]).toHaveProperty('code');
      });
    });
  });

  // ── Product-Product Variations ────────────────────────────────────

  describe('GET /api/catalog/product-product-variations/', () => {
    it('returns list of product-to-variation mappings', async () => {
      provider
        .given('catalog product product variations exist')
        .uponReceiving('a request for catalog product product variations')
        .withRequest({
          method: 'GET',
          path: '/api/catalog/product-product-variations/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            product: integer(1),
            product_variation: integer(1),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/catalog/product-product-variations/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('product');
        expect(response.data[0]).toHaveProperty('product_variation');
      });
    });
  });

  // ── Product Bundles ───────────────────────────────────────────────

  describe('GET /api/catalog/product-bundles/', () => {
    it('returns list of product bundles', async () => {
      provider
        .given('catalog product bundles exist')
        .uponReceiving('a request for catalog product bundles')
        .withRequest({
          method: 'GET',
          path: '/api/catalog/product-bundles/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            bundle_name: string('CM2 Complete Bundle'),
            subject: integer(1),
            bundle_description: string('All CM2 study materials'),
            is_featured: boolean(true),
            is_active: boolean(true),
            display_order: integer(0),
            created_at: string('2026-02-16T10:00:00Z'),
            updated_at: string('2026-02-16T10:00:00Z'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/catalog/product-bundles/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('bundle_name');
        expect(response.data[0]).toHaveProperty('subject');
        expect(response.data[0]).toHaveProperty('is_featured');
      });
    });
  });

  // ── Bundle Products ───────────────────────────────────────────────

  describe('GET /api/catalog/bundle-products/', () => {
    it('returns list of bundle products', async () => {
      provider
        .given('catalog bundle products exist')
        .uponReceiving('a request for catalog bundle products')
        .withRequest({
          method: 'GET',
          path: '/api/catalog/bundle-products/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            bundle: integer(1),
            product_product_variation: integer(1),
            default_price_type: string('standard'),
            quantity: integer(1),
            sort_order: integer(0),
            is_active: boolean(true),
            created_at: string('2026-02-16T10:00:00Z'),
            updated_at: string('2026-02-16T10:00:00Z'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/catalog/bundle-products/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('bundle');
        expect(response.data[0]).toHaveProperty('product_product_variation');
      });
    });
  });

  // ── Recommendations ───────────────────────────────────────────────

  describe('GET /api/catalog/recommendations/', () => {
    it('returns list of product variation recommendations', async () => {
      provider
        .given('catalog recommendations exist')
        .uponReceiving('a request for catalog recommendations')
        .withRequest({
          method: 'GET',
          path: '/api/catalog/recommendations/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            product_product_variation: integer(1),
            recommended_product_product_variation: integer(2),
            created_at: string('2026-02-16T10:00:00Z'),
            updated_at: string('2026-02-16T10:00:00Z'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/catalog/recommendations/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('product_product_variation');
        expect(response.data[0]).toHaveProperty('recommended_product_product_variation');
      });
    });
  });
});
