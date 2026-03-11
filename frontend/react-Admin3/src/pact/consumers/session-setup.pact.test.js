/**
 * Pact consumer tests for Session Setup API.
 *
 * Covers the new endpoint added by 20260218-new-session-setup:
 * - POST /api/catalog/session-setup/copy-products/
 *
 * Verifies the data contract between frontend sessionSetupService
 * and backend SessionSetupViewSet.
 */
const { createPactProvider } = require('../setup.js');
const {
  like,
  eachLike,
  string,
  integer,
  JSON_RESPONSE_HEADERS,
  JSON_REQUEST_HEADERS,
} = require('../helpers.js');
const axios = require('axios');

describe('Session Setup Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  // ── Copy Products Endpoint ─────────────────────────────────────────

  describe('POST /api/catalog/session-setup/copy-products/', () => {
    it('returns copy summary on success', async () => {
      provider
        .given('session setup data exists for copy')
        .uponReceiving('a request to copy products from previous session')
        .withRequest({
          method: 'POST',
          path: '/api/catalog/session-setup/copy-products/',
          headers: JSON_REQUEST_HEADERS,
          body: {
            new_exam_session_id: integer(42),
            previous_exam_session_id: integer(41),
          },
        })
        .willRespondWith({
          status: 201,
          headers: JSON_RESPONSE_HEADERS,
          body: {
            products_created: integer(95),
            prices_created: integer(285),
            bundles_created: integer(28),
            bundle_products_created: integer(142),
            skipped_subjects: eachLike(string('SP9')),
            message: string(
              'Successfully created 95 products, 285 prices, and 28 bundles for session 2026-09.'
            ),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.post(
          `${mockServer.url}/api/catalog/session-setup/copy-products/`,
          {
            new_exam_session_id: 42,
            previous_exam_session_id: 41,
          },
          { headers: JSON_REQUEST_HEADERS }
        );

        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('products_created');
        expect(response.data).toHaveProperty('prices_created');
        expect(response.data).toHaveProperty('bundles_created');
        expect(response.data).toHaveProperty('bundle_products_created');
        expect(response.data).toHaveProperty('skipped_subjects');
        expect(response.data).toHaveProperty('message');
        expect(typeof response.data.products_created).toBe('number');
        expect(Array.isArray(response.data.skipped_subjects)).toBe(true);
      });
    });

    it('returns validation error for missing ESS', async () => {
      provider
        .given('session exists but has no exam session subjects')
        .uponReceiving('a request to copy products with missing ESS')
        .withRequest({
          method: 'POST',
          path: '/api/catalog/session-setup/copy-products/',
          headers: JSON_REQUEST_HEADERS,
          body: {
            new_exam_session_id: integer(99),
            previous_exam_session_id: integer(41),
          },
        })
        .willRespondWith({
          status: 400,
          headers: JSON_RESPONSE_HEADERS,
          body: {
            new_exam_session_id: eachLike(
              string('No exam session subjects found for session 99. Complete Step 2 first.')
            ),
          },
        });

      await provider.executeTest(async (mockServer) => {
        try {
          await axios.post(
            `${mockServer.url}/api/catalog/session-setup/copy-products/`,
            {
              new_exam_session_id: 99,
              previous_exam_session_id: 41,
            },
            { headers: JSON_REQUEST_HEADERS }
          );
        } catch (error) {
          expect(error.response.status).toBe(400);
        }
      });
    });
  });
});
