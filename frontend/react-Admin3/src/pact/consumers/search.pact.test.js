/**
 * Pact consumer tests for Search API.
 *
 * Covers:
 * - GET /api/search/fuzzy/             (fuzzySearch)
 * - GET /api/search/advanced-fuzzy/    (advancedSearch)
 * - GET /api/search/default-data/      (getDefaultSearchData)
 */
const { createPactProvider } = require('../setup');
const {
  like,
  eachLike,
  string,
  integer,
  boolean,
  decimal,
  JSON_RESPONSE_HEADERS,
} = require('../helpers');
const axios = require('axios');

describe('Search Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  describe('GET /api/search/fuzzy/', () => {
    it('returns fuzzy search results with filters and products', async () => {
      provider
        .given('searchable products exist')
        .uponReceiving('a fuzzy search request for CM2')
        .withRequest({
          method: 'GET',
          path: '/api/search/fuzzy/',
          query: { q: 'CM2', limit: '50' },
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            suggested_filters: like({
              subjects: [],
              categories: [],
              products: [],
            }),
            products: eachLike({
              id: integer(1),
              product_code: string('SM01'),
              product_name: string('CM2 Printed Study Material'),
              subject_code: string('CM2'),
            }),
            search_info: like({
              query: string('CM2'),
              matches_found: integer(5),
            }),
            total_count: integer(5),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/search/fuzzy/`,
          { params: { q: 'CM2', limit: 50 } }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('suggested_filters');
        expect(response.data).toHaveProperty('products');
        expect(response.data).toHaveProperty('total_count');
        expect(response.data.products.length).toBeGreaterThan(0);
      });
    });

    it('returns empty results for no-match query', async () => {
      provider
        .given('searchable products exist')
        .uponReceiving('a fuzzy search request with no matches')
        .withRequest({
          method: 'GET',
          path: '/api/search/fuzzy/',
          query: { q: 'xyznonexistent', limit: '50' },
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            suggested_filters: like({
              subjects: [],
              categories: [],
              products: [],
            }),
            products: [],
            search_info: like({
              query: string('xyznonexistent'),
              matches_found: integer(0),
            }),
            total_count: integer(0),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/search/fuzzy/`,
          { params: { q: 'xyznonexistent', limit: 50 } }
        );

        expect(response.status).toBe(200);
        expect(response.data.products).toEqual([]);
        expect(response.data.total_count).toBe(0);
      });
    });
  });

  describe('GET /api/search/advanced-fuzzy/', () => {
    it('returns filtered search results with pagination', async () => {
      provider
        .given('searchable products exist')
        .uponReceiving('an advanced search request with subject filter')
        .withRequest({
          method: 'GET',
          path: '/api/search/advanced-fuzzy/',
          query: { q: 'CM2', limit: '50' },
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            products: eachLike({
              id: integer(1),
              product_code: string('SM01'),
              product_name: string('CM2 Printed Study Material'),
              subject_code: string('CM2'),
            }),
            total_count: integer(3),
            search_info: like({
              query: string('CM2'),
              matches_found: integer(3),
            }),
            suggested_filters: like({
              subjects: [],
              categories: [],
              products: [],
            }),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/search/advanced-fuzzy/`,
          {
            params: {
              q: 'CM2',
              limit: 50,
            },
          }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('products');
        expect(response.data).toHaveProperty('total_count');
      });
    });
  });

  describe('GET /api/search/default-data/', () => {
    it('returns default search data with popular products', async () => {
      provider
        .given('products exist for default search')
        .uponReceiving('a request for default search data')
        .withRequest({
          method: 'GET',
          path: '/api/search/default-data/',
          query: { limit: '5' },
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            suggested_filters: like({
              subjects: eachLike(like({
                id: integer(1),
                code: string('CM2'),
                description: string('CM2 - Models'),
              })),
              product_groups: eachLike(like({
                id: integer(1),
                name: string('Study Materials'),
                description: string(''),
              })),
            }),
            popular_products: eachLike({
              id: integer(1),
              product_code: string('SM01'),
              product_name: string('CM2 Printed Study Material'),
              subject_code: string('CM2'),
            }),
            total_count: integer(50),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/search/default-data/`,
          { params: { limit: 5 } }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('suggested_filters');
        expect(response.data).toHaveProperty('popular_products');
        expect(response.data).toHaveProperty('total_count');
      });
    });
  });
});
