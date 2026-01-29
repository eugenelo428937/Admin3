/**
 * Pact consumer tests for Cart API.
 *
 * Covers the cart operations:
 * - GET  /api/cart/           (fetchCart - empty cart for guest)
 * - POST /api/cart/clear/     (clearCart)
 *
 * NOTE: Cart add/update/remove/checkout require specific product IDs and
 * authenticated sessions that cannot be replayed by the Pact verifier.
 * Those operations are covered by integration tests instead.
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

describe('Cart Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  describe('GET /api/cart/', () => {
    it('returns empty cart for new session', async () => {
      provider
        .given('an authenticated user with empty cart')
        .uponReceiving('a request to fetch an empty cart')
        .withRequest({
          method: 'GET',
          path: '/api/cart/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            id: integer(1),
            items: [],
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(`${mockServer.url}/api/cart/`);

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('items');
      });
    });
  });

  describe('POST /api/cart/clear/', () => {
    it('clears all items from the cart', async () => {
      provider
        .given('an authenticated user with empty cart')
        .uponReceiving('a request to clear the cart')
        .withRequest({
          method: 'POST',
          path: '/api/cart/clear/',
          headers: { 'Content-Type': 'application/json' },
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            id: integer(1),
            items: [],
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.post(
          `${mockServer.url}/api/cart/clear/`,
          {},
          { headers: { 'Content-Type': 'application/json' } }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('items');
      });
    });
  });
});
