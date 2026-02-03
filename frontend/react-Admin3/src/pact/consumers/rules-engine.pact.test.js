/**
 * Pact consumer tests for Rules Engine API.
 *
 * Covers the public rules engine endpoints:
 * - POST /api/rules/engine/execute/        (executeRules)
 * - POST /api/rules/engine/calculate-vat/  (calculateVAT)
 * - GET  /api/rules/acted-rules/           (listActedRules)
 *
 * NOTE: The following endpoints require IsAuthenticated and cannot
 * be verified by the Pact verifier:
 * - GET  /api/rules/engine/pending-acknowledgments/
 * - POST /api/rules/engine/checkout-validation/
 * - POST /api/rules/engine/accept-terms/
 * - GET  /api/rules/engine/checkout-terms-status/
 * These are covered by integration tests.
 */
const { createPactProvider } = require('../setup');
const {
  like,
  eachLike,
  string,
  integer,
  boolean,
  decimal,
  JSON_REQUEST_HEADERS,
  JSON_RESPONSE_HEADERS,
} = require('../helpers');
const axios = require('axios');

describe('Rules Engine Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  describe('POST /api/rules/engine/execute/', () => {
    it('executes rules for a given entry point', async () => {
      provider
        .given('rules for home_page_mount exist')
        .uponReceiving('a request to execute rules for home_page_mount')
        .withRequest({
          method: 'POST',
          path: '/api/rules/engine/execute/',
          headers: { 'Content-Type': 'application/json' },
          body: {
            entry_point: 'home_page_mount',
            context: {},
          },
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            success: boolean(true),
            rules_evaluated: integer(0),
            blocked: boolean(false),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.post(
          `${mockServer.url}/api/rules/engine/execute/`,
          { entry_point: 'home_page_mount', context: {} },
          { headers: { 'Content-Type': 'application/json' } }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success');
        expect(response.data).toHaveProperty('rules_evaluated');
        expect(response.data).toHaveProperty('blocked');
      });
    });
  });

  describe('POST /api/rules/engine/calculate-vat/', () => {
    it('calculates VAT for a given amount and country', async () => {
      provider
        .given('VAT configuration exists')
        .uponReceiving('a request to calculate VAT')
        .withRequest({
          method: 'POST',
          path: '/api/rules/engine/calculate-vat/',
          headers: { 'Content-Type': 'application/json' },
          body: {
            country_code: 'GB',
            net_amount: '100.00',
          },
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            vat_rate: string('0.20'),
            vat_amount: string('20.00'),
            gross_amount: string('120.00'),
            country_code: string('GB'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.post(
          `${mockServer.url}/api/rules/engine/calculate-vat/`,
          { country_code: 'GB', net_amount: '100.00' },
          { headers: { 'Content-Type': 'application/json' } }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('vat_rate');
        expect(response.data).toHaveProperty('vat_amount');
        expect(response.data).toHaveProperty('gross_amount');
      });
    });
  });

  describe('GET /api/rules/acted-rules/', () => {
    it('returns paginated list of acted rules', async () => {
      provider
        .given('acted rules exist')
        .uponReceiving('a request for acted rules')
        .withRequest({
          method: 'GET',
          path: '/api/rules/acted-rules/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            count: integer(1),
            next: null,
            previous: null,
            results: eachLike({
              id: integer(1),
              rule_code: string('rule_home_banner'),
              name: string('Home Page Banner'),
              entry_point: string('home_page_mount'),
              active: boolean(true),
            }),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/rules/acted-rules/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('count');
        expect(response.data).toHaveProperty('results');
        expect(response.data.results.length).toBeGreaterThan(0);
        expect(response.data.results[0]).toHaveProperty('rule_code');
        expect(response.data.results[0]).toHaveProperty('entry_point');
      });
    });
  });
});
