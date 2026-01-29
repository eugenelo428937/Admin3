/**
 * Pact consumer tests for Catalog API.
 *
 * Covers the public catalog read endpoints:
 * - GET /api/catalog/subjects/           (listSubjects)
 * - GET /api/catalog/exam-sessions/      (listExamSessions)
 * - GET /api/catalog/products/           (listCatalogProducts)
 *
 * NOTE: Write operations (POST, PUT, DELETE) require IsSuperUser and
 * cannot be verified by the Pact verifier. Those are covered by
 * integration tests.
 */
const { createPactProvider } = require('../setup');
const {
  like,
  eachLike,
  string,
  integer,
  boolean,
  regex,
  JSON_RESPONSE_HEADERS,
} = require('../helpers');
const axios = require('axios');

describe('Catalog Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  describe('GET /api/catalog/subjects/', () => {
    it('returns list of active subjects', async () => {
      provider
        .given('catalog subjects exist')
        .uponReceiving('a request for catalog subjects')
        .withRequest({
          method: 'GET',
          path: '/api/catalog/subjects/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            code: string('CM2'),
            description: string('CM2 - Models'),
            name: string('CM2 - Models'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/catalog/subjects/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('code');
        expect(response.data[0]).toHaveProperty('name');
      });
    });
  });

  describe('GET /api/catalog/exam-sessions/', () => {
    it('returns paginated list of exam sessions', async () => {
      provider
        .given('catalog exam sessions exist')
        .uponReceiving('a request for catalog exam sessions')
        .withRequest({
          method: 'GET',
          path: '/api/catalog/exam-sessions/',
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
              session_code: string('2025-04'),
              start_date: string('2025-01-01T00:00:00Z'),
              end_date: string('2025-04-30T00:00:00Z'),
            }),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/catalog/exam-sessions/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('count');
        expect(response.data).toHaveProperty('results');
        expect(response.data.results.length).toBeGreaterThan(0);
        expect(response.data.results[0]).toHaveProperty('session_code');
      });
    });
  });

  describe('GET /api/catalog/products/', () => {
    it('returns paginated list of catalog products', async () => {
      provider
        .given('catalog products exist')
        .uponReceiving('a request for catalog products')
        .withRequest({
          method: 'GET',
          path: '/api/catalog/products/',
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
              fullname: string('CM2 Printed Study Material'),
              shortname: string('CM2'),
              product_name: string('CM2'),
              code: string('SM01'),
              is_active: boolean(true),
            }),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/catalog/products/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('count');
        expect(response.data).toHaveProperty('results');
        expect(response.data.results.length).toBeGreaterThan(0);
        expect(response.data.results[0]).toHaveProperty('fullname');
        expect(response.data.results[0]).toHaveProperty('code');
      });
    });
  });
});
