/**
 * Pact consumer tests for Authentication API.
 *
 * Covers the auth flow endpoints that can be verified by the Pact provider:
 * - POST /api/auth/login/          (success + failure)
 * - POST /api/auth/register/
 * - POST /api/auth/logout/
 *
 * NOTE: The following endpoints are NOT included because the Pact verifier
 * replays exact request bodies and cannot generate valid tokens/secrets:
 * - POST /api/auth/refresh/              (requires real JWT refresh token)
 * - POST /api/auth/activate/             (requires real activation token)
 * - POST /api/auth/password_reset_request/ (requires reCAPTCHA bypass)
 * These are covered by integration tests instead.
 */
const { createPactProvider } = require('../setup');
const {
  like,
  string,
  integer,
  boolean,
  JSON_REQUEST_HEADERS,
  JSON_RESPONSE_HEADERS,
} = require('../helpers');
const axios = require('axios');

describe('Auth Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  describe('POST /api/auth/login/', () => {
    it('returns token and user on successful login', async () => {
      provider
        .given('a registered user exists')
        .uponReceiving('a valid login request')
        .withRequest({
          method: 'POST',
          path: '/api/auth/login/',
          headers: { 'Content-Type': 'application/json' },
          body: {
            username: 'test@example.com',
            password: 'ValidPass123!',
          },
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            token: string('fake-access-token'),
            refresh: string('fake-refresh-token'),
            user: like({
              id: integer(1),
              username: string('test@example.com'),
              email: string('test@example.com'),
              first_name: string('Test'),
              last_name: string('User'),
            }),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.post(
          `${mockServer.url}/api/auth/login/`,
          { username: 'test@example.com', password: 'ValidPass123!' },
          { headers: { 'Content-Type': 'application/json' } }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('token');
        expect(response.data).toHaveProperty('refresh');
        expect(response.data.user).toHaveProperty('id');
        expect(response.data.user).toHaveProperty('email');
      });
    });

    it('returns 401 for invalid credentials', async () => {
      provider
        .given('a registered user exists')
        .uponReceiving('a login request with wrong password')
        .withRequest({
          method: 'POST',
          path: '/api/auth/login/',
          headers: { 'Content-Type': 'application/json' },
          body: {
            username: 'test@example.com',
            password: 'WrongPassword',
          },
        })
        .willRespondWith({
          status: 401,
          headers: JSON_RESPONSE_HEADERS,
          body: {
            error: string('Invalid credentials'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        try {
          await axios.post(
            `${mockServer.url}/api/auth/login/`,
            { username: 'test@example.com', password: 'WrongPassword' },
            { headers: { 'Content-Type': 'application/json' } }
          );
          fail('Expected 401 error');
        } catch (error) {
          expect(error.response.status).toBe(401);
          expect(error.response.data).toHaveProperty('error');
        }
      });
    });
  });

  describe('POST /api/auth/register/', () => {
    it('creates a new user account', async () => {
      provider
        .given('no user with email newuser@example.com exists')
        .uponReceiving('a valid registration request')
        .withRequest({
          method: 'POST',
          path: '/api/auth/register/',
          headers: { 'Content-Type': 'application/json' },
          body: {
            username: 'newuser@example.com',
            email: 'newuser@example.com',
            password: 'SecurePass123!',
            first_name: 'New',
            last_name: 'User',
          },
        })
        .willRespondWith({
          status: 201,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            status: string('success'),
            message: string('Account created successfully'),
            token: string('fake-access-token'),
            refresh: string('fake-refresh-token'),
            user: like({
              id: integer(2),
              username: string('newuser@example.com'),
              email: string('newuser@example.com'),
              first_name: string('New'),
              last_name: string('User'),
            }),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.post(
          `${mockServer.url}/api/auth/register/`,
          {
            username: 'newuser@example.com',
            email: 'newuser@example.com',
            password: 'SecurePass123!',
            first_name: 'New',
            last_name: 'User',
          },
          { headers: { 'Content-Type': 'application/json' } }
        );

        expect(response.status).toBe(201);
        expect(response.data.user).toHaveProperty('id');
        expect(response.data).toHaveProperty('token');
      });
    });
  });

  describe('POST /api/auth/logout/', () => {
    it('logs out the user', async () => {
      provider
        .given('an authenticated user')
        .uponReceiving('a logout request')
        .withRequest({
          method: 'POST',
          path: '/api/auth/logout/',
          headers: { 'Content-Type': 'application/json' },
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: {
            status: string('success'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.post(
          `${mockServer.url}/api/auth/logout/`,
          {},
          { headers: { 'Content-Type': 'application/json' } }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
      });
    });
  });
});
