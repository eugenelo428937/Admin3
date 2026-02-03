/**
 * Pact consumer tests for Tutorials API.
 *
 * Covers the public tutorial endpoints:
 * - GET /api/tutorials/list/               (listTutorialEvents)
 * - GET /api/tutorials/products/all/       (getAllTutorialProducts)
 *
 * All tutorial endpoints use AllowAny permissions.
 */
const { createPactProvider } = require('../setup');
const {
  like,
  eachLike,
  string,
  integer,
  boolean,
  JSON_RESPONSE_HEADERS,
} = require('../helpers');
const axios = require('axios');

describe('Tutorials Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  describe('GET /api/tutorials/list/', () => {
    it('returns list of tutorial events', async () => {
      provider
        .given('tutorial events exist')
        .uponReceiving('a request for tutorial events list')
        .withRequest({
          method: 'GET',
          path: '/api/tutorials/list/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            code: string('TUT-CM2-LON-2025'),
            venue: string('London'),
            is_soldout: boolean(false),
            start_date: string('2025-04-01'),
            end_date: string('2025-04-05'),
            store_product_code: string('CM2/PCSM01P/2025-04'),
            subject_code: string('CM2'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/tutorials/list/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('code');
        expect(response.data[0]).toHaveProperty('venue');
        expect(response.data[0]).toHaveProperty('subject_code');
      });
    });
  });

  describe('GET /api/tutorials/products/all/', () => {
    it('returns all tutorial products', async () => {
      provider
        .given('tutorial products exist')
        .uponReceiving('a request for all tutorial products')
        .withRequest({
          method: 'GET',
          path: '/api/tutorials/products/all/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            subject_code: string('CM2'),
            subject_name: string('CM2 - Models'),
            location: string('CM2 Tutorial London'),
            product_id: integer(1),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/tutorials/products/all/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('subject_code');
        expect(response.data[0]).toHaveProperty('product_id');
      });
    });
  });
});
