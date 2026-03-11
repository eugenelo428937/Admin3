/**
 * Pact consumer tests for Users Admin API.
 *
 * Covers the new admin endpoints added by 20260216-admin-panel-api:
 * - GET /api/users/profiles/                     (list profiles)
 * - GET /api/users/profiles/{id}/                (retrieve profile)
 * - GET /api/users/profiles/{id}/addresses/      (nested sub-resource)
 * - GET /api/users/profiles/{id}/contacts/       (nested sub-resource)
 * - GET /api/users/profiles/{id}/emails/         (nested sub-resource)
 * - GET /api/users/staff/                        (list staff)
 * - GET /api/users/staff/{id}/                   (retrieve staff)
 *
 * NOTE: ALL user admin operations require IsSuperUser (even GET).
 * These pact tests define the contract shape the frontend expects.
 * Auth-guarded provider verification requires superuser state setup.
 */
const { createPactProvider } = require('../setup.js');
const {
  like,
  eachLike,
  string,
  integer,
  boolean,
  JSON_RESPONSE_HEADERS,
} = require('../helpers.js');
const axios = require('axios');

describe('Users Admin Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  // ── User Profiles ─────────────────────────────────────────────────

  describe('GET /api/users/profiles/', () => {
    it('returns list of user profiles with nested user info', async () => {
      provider
        .given('user profiles exist and requester is superuser')
        .uponReceiving('a request for user profiles')
        .withRequest({
          method: 'GET',
          path: '/api/users/profiles/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            user: like({
              id: integer(1),
              username: string('jdoe'),
              first_name: string('John'),
              last_name: string('Doe'),
              email: string('jdoe@example.com'),
            }),
            title: string('Mr'),
            send_invoices_to: string('HOME'),
            send_study_material_to: string('HOME'),
            remarks: string(''),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/users/profiles/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('user');
        expect(response.data[0].user).toHaveProperty('username');
        expect(response.data[0]).toHaveProperty('title');
        expect(response.data[0]).toHaveProperty('send_invoices_to');
      });
    });
  });

  describe('GET /api/users/profiles/{id}/', () => {
    it('returns a single profile with nested user info', async () => {
      const profileId = 1;

      provider
        .given('user profile exists and requester is superuser')
        .uponReceiving('a request for a single user profile')
        .withRequest({
          method: 'GET',
          path: `/api/users/profiles/${profileId}/`,
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            id: integer(1),
            user: like({
              id: integer(1),
              username: string('jdoe'),
              first_name: string('John'),
              last_name: string('Doe'),
              email: string('jdoe@example.com'),
            }),
            title: string('Mr'),
            send_invoices_to: string('HOME'),
            send_study_material_to: string('HOME'),
            remarks: string(''),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/users/profiles/${profileId}/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('user');
        expect(response.data.user).toHaveProperty('email');
      });
    });
  });

  // ── Profile Sub-Resources ─────────────────────────────────────────

  describe('GET /api/users/profiles/{id}/addresses/', () => {
    it('returns list of addresses for a profile', async () => {
      const profileId = 1;

      provider
        .given('user profile with addresses exists and requester is superuser')
        .uponReceiving('a request for profile addresses')
        .withRequest({
          method: 'GET',
          path: `/api/users/profiles/${profileId}/addresses/`,
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            address_type: string('HOME'),
            address_data: like({
              line1: string('123 Main St'),
              city: string('London'),
              postcode: string('SW1A 1AA'),
            }),
            country: string('United Kingdom'),
            company: string(''),
            department: string(''),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/users/profiles/${profileId}/addresses/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('address_type');
        expect(response.data[0]).toHaveProperty('country');
      });
    });
  });

  describe('GET /api/users/profiles/{id}/contacts/', () => {
    it('returns list of contacts for a profile', async () => {
      const profileId = 1;

      provider
        .given('user profile with contacts exists and requester is superuser')
        .uponReceiving('a request for profile contacts')
        .withRequest({
          method: 'GET',
          path: `/api/users/profiles/${profileId}/contacts/`,
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            contact_type: string('MOBILE'),
            number: string('+44 7700 900000'),
            country_code: string('GB'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/users/profiles/${profileId}/contacts/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('contact_type');
        expect(response.data[0]).toHaveProperty('number');
      });
    });
  });

  describe('GET /api/users/profiles/{id}/emails/', () => {
    it('returns list of emails for a profile', async () => {
      const profileId = 1;

      provider
        .given('user profile with emails exists and requester is superuser')
        .uponReceiving('a request for profile emails')
        .withRequest({
          method: 'GET',
          path: `/api/users/profiles/${profileId}/emails/`,
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            email_type: string('PERSONAL'),
            email: string('jdoe@example.com'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/users/profiles/${profileId}/emails/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('email_type');
        expect(response.data[0]).toHaveProperty('email');
      });
    });
  });

  // ── Staff ─────────────────────────────────────────────────────────

  describe('GET /api/users/staff/', () => {
    it('returns list of staff members with nested user info', async () => {
      provider
        .given('staff members exist and requester is superuser')
        .uponReceiving('a request for staff members')
        .withRequest({
          method: 'GET',
          path: '/api/users/staff/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            user: integer(5),
            user_detail: like({
              id: integer(5),
              username: string('tutor1'),
              first_name: string('Jane'),
              last_name: string('Smith'),
              email: string('jsmith@example.com'),
            }),
            created_at: string('2026-02-16T10:00:00Z'),
            updated_at: string('2026-02-16T10:00:00Z'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/users/staff/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('user');
        expect(response.data[0]).toHaveProperty('user_detail');
        expect(response.data[0].user_detail).toHaveProperty('username');
        expect(response.data[0]).toHaveProperty('created_at');
      });
    });
  });

  describe('GET /api/users/staff/{id}/', () => {
    it('returns a single staff member', async () => {
      const staffId = 1;

      provider
        .given('staff member exists and requester is superuser')
        .uponReceiving('a request for a single staff member')
        .withRequest({
          method: 'GET',
          path: `/api/users/staff/${staffId}/`,
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            id: integer(1),
            user: integer(5),
            user_detail: like({
              id: integer(5),
              username: string('tutor1'),
              first_name: string('Jane'),
              last_name: string('Smith'),
              email: string('jsmith@example.com'),
            }),
            created_at: string('2026-02-16T10:00:00Z'),
            updated_at: string('2026-02-16T10:00:00Z'),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/users/staff/${staffId}/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('user_detail');
        expect(response.data.user_detail).toHaveProperty('email');
      });
    });
  });
});
