/**
 * Pact consumer tests for Product/Store API.
 *
 * Covers:
 * - GET /api/store/products/         (getAvailableProducts)
 * - GET /api/catalog/navigation-data/ (getNavigationData)
 * - GET /api/products/product-group-filters/ (getProductGroupFilters)
 * - GET /api/products/filter-configuration/  (getFilterConfiguration)
 * - GET /api/store/bundles/          (getBundles)
 */
const { createPactProvider } = require('../setup');
const {
  like,
  eachLike,
  string,
  integer,
  decimal,
  boolean,
  JSON_RESPONSE_HEADERS,
} = require('../helpers');
const axios = require('axios');

describe('Product Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  describe('GET /api/store/products/', () => {
    it('returns paginated store products', async () => {
      provider
        .given('store products exist')
        .uponReceiving('a request for available store products')
        .withRequest({
          method: 'GET',
          path: '/api/store/products/',
          query: { page: '1', page_size: '50' },
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            results: eachLike({
              id: integer(1),
              is_active: boolean(true),
              is_bundle: boolean(false),
              name: string('CM2 Printed Study Material'),
              subject_code: string('CM2'),
              session_code: string('2025-04'),
            }),
            count: integer(1),
            products_count: integer(1),
            bundles_count: integer(0),
            page: integer(1),
            has_next: boolean(false),
            has_previous: boolean(false),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/store/products/`,
          { params: { page: 1, page_size: 50 } }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('results');
        expect(response.data).toHaveProperty('count');
        expect(response.data).toHaveProperty('products_count');
        expect(response.data).toHaveProperty('bundles_count');
        expect(response.data.results.length).toBeGreaterThan(0);

        const item = response.data.results[0];
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('is_bundle');
      });
    });
  });

  describe('GET /api/catalog/navigation-data/', () => {
    it('returns navigation data with subjects and product groups', async () => {
      provider
        .given('catalog data exists')
        .uponReceiving('a request for navigation data')
        .withRequest({
          method: 'GET',
          path: '/api/catalog/navigation-data/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            subjects: eachLike({
              id: integer(1),
              code: string('CM2'),
              description: string('CM2 - Models'),
              name: string('CM2 - Models'),
              active: boolean(true),
            }),
            navbar_product_groups: like({
              results: eachLike({
                id: integer(1),
                name: string('Core Study Materials'),
                products: eachLike({
                  id: integer(1),
                  shortname: string('CM2'),
                  fullname: string('CM2 Printed Study Material'),
                  code: string('SM01'),
                }),
              }),
            }),
            distance_learning_dropdown: like({
              results: eachLike({
                id: integer(1),
                name: string('Core Study Materials'),
                products: eachLike({
                  id: integer(1),
                  shortname: string('CM2'),
                  fullname: string('CM2 Printed Study Material'),
                  code: string('SM01'),
                }),
              }),
            }),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/catalog/navigation-data/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('subjects');
        expect(response.data.subjects.length).toBeGreaterThan(0);
        expect(response.data.subjects[0]).toHaveProperty('code');
        expect(response.data).toHaveProperty('navbar_product_groups');
      });
    });
  });

  describe('GET /api/products/product-group-filters/', () => {
    it('returns product group filter configuration', async () => {
      provider
        .given('product groups exist')
        .uponReceiving('a request for product group filters')
        .withRequest({
          method: 'GET',
          path: '/api/products/product-group-filters/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            results: eachLike({
              id: integer(1),
              name: string('Study Materials'),
              filter_type: string('type'),
              groups: eachLike(like({
                id: integer(1),
                name: string('Core Study Materials'),
              })),
            }),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/products/product-group-filters/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('results');
        expect(response.data.results.length).toBeGreaterThan(0);
      });
    });
  });

  describe('GET /api/products/filter-configuration/', () => {
    it('returns dynamic filter configuration', async () => {
      provider
        .given('filter configuration exists')
        .uponReceiving('a request for filter configuration')
        .withRequest({
          method: 'GET',
          path: '/api/products/filter-configuration/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            subjects: like({
              type: string('multi_select'),
              label: string('Subjects'),
              options: eachLike({
                id: integer(1),
                value: string('CM2'),
                label: string('CM2 - Models'),
              }),
            }),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/products/filter-configuration/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('subjects');
      });
    });
  });

  describe('GET /api/store/bundles/', () => {
    it('returns exam session bundles', async () => {
      provider
        .given('exam session bundles exist')
        .uponReceiving('a request for bundles')
        .withRequest({
          method: 'GET',
          path: '/api/store/bundles/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            count: integer(1),
            results: eachLike({
              id: integer(1),
              name: string('CM2 April 2025 Bundle'),
              is_active: boolean(true),
              product_count: integer(1),
            }),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/store/bundles/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('results');
        expect(response.data.results.length).toBeGreaterThan(0);
        expect(response.data.results[0]).toHaveProperty('name');
        expect(response.data.results[0]).toHaveProperty('product_count');
      });
    });
  });
});
