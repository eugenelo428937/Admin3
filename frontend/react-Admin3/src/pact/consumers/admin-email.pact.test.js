/**
 * Pact consumer tests for Email Admin API.
 *
 * Covers the read endpoints used by the email admin panel:
 * - GET /api/email/settings/
 * - GET /api/email/templates/
 * - GET /api/email/templates/{id}/
 * - GET /api/email/queue/
 * - GET /api/email/queue/{id}/
 * - GET /api/email/attachments/
 * - GET /api/email/content-rules/
 * - GET /api/email/placeholders/
 *
 * Write operations (POST, PUT, PATCH, DELETE) require IsSuperUser and are
 * covered by backend integration tests (email_system.tests).
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

describe('Email Admin Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  // ── Email Settings ────────────────────────────────────────────────

  describe('GET /api/email/settings/', () => {
    it('returns list of email settings', async () => {
      provider
        .given('email settings exist')
        .uponReceiving('a request for email settings list')
        .withRequest({
          method: 'GET',
          path: '/api/email/settings/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: eachLike({
            id: integer(1),
            key: string('smtp_host'),
            setting_type: string('smtp'),
            display_name: string('SMTP Host'),
            value: like('mail.example.com'),
            is_active: boolean(true),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/email/settings/`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        expect(response.data[0]).toHaveProperty('key');
        expect(response.data[0]).toHaveProperty('setting_type');
      });
    });
  });

  // ── Email Templates ───────────────────────────────────────────────

  describe('GET /api/email/templates/', () => {
    it('returns paginated list of email templates', async () => {
      provider
        .given('email templates exist')
        .uponReceiving('a request for email templates list')
        .withRequest({
          method: 'GET',
          path: '/api/email/templates/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: {
            results: eachLike({
              id: integer(1),
              name: string('order_confirmation'),
              template_type: string('transactional'),
              display_name: string('Order Confirmation'),
              subject_template: string('Your Order #{{order_id}}'),
              default_priority: string('normal'),
              is_active: boolean(true),
            }),
            count: integer(1),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/email/templates/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('results');
        expect(response.data).toHaveProperty('count');
        expect(response.data.results.length).toBeGreaterThan(0);
        expect(response.data.results[0]).toHaveProperty('name');
        expect(response.data.results[0]).toHaveProperty('template_type');
      });
    });
  });

  describe('GET /api/email/templates/{id}/', () => {
    it('returns a single email template detail', async () => {
      const templateId = 1;

      provider
        .given('email template exists')
        .uponReceiving('a request for a single email template')
        .withRequest({
          method: 'GET',
          path: `/api/email/templates/${templateId}/`,
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            id: integer(1),
            name: string('order_confirmation'),
            template_type: string('order_confirmation'),
            display_name: string('Order Confirmation'),
            subject_template: string('Your Order #{{order_id}}'),
            use_master_template: boolean(true),
            default_priority: string('normal'),
            mjml_content: string(''),
            is_active: boolean(true),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/email/templates/${templateId}/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('name');
        expect(response.data).toHaveProperty('template_type');
        expect(response.data).toHaveProperty('mjml_content');
      });
    });
  });

  // ── Email Queue ───────────────────────────────────────────────────

  describe('GET /api/email/queue/', () => {
    it('returns paginated list of queue items', async () => {
      provider
        .given('email queue items exist')
        .uponReceiving('a request for email queue list')
        .withRequest({
          method: 'GET',
          path: '/api/email/queue/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: {
            results: eachLike({
              id: integer(1),
              queue_id: string('a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
              subject: string('Test Email Subject'),
              status: string('pending'),
              priority: string('normal'),
              to_emails: eachLike(string('test@example.com')),
            }),
            count: integer(1),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/email/queue/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('results');
        expect(response.data).toHaveProperty('count');
        expect(response.data.results.length).toBeGreaterThan(0);
        expect(response.data.results[0]).toHaveProperty('queue_id');
        expect(response.data.results[0]).toHaveProperty('status');
      });
    });
  });

  describe('GET /api/email/queue/{id}/', () => {
    it('returns a single queue item detail', async () => {
      const queueItemId = 1;

      provider
        .given('email queue item exists')
        .uponReceiving('a request for a single queue item')
        .withRequest({
          method: 'GET',
          path: `/api/email/queue/${queueItemId}/`,
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: like({
            id: integer(1),
            queue_id: string('a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
            subject: string('Test Email Subject'),
            status: string('pending'),
            priority: string('normal'),
            to_emails: eachLike(string('test@example.com')),
            from_email: string('noreply@acted.co.uk'),
            attempts: integer(0),
            max_attempts: integer(3),
          }),
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/email/queue/${queueItemId}/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('queue_id');
        expect(response.data).toHaveProperty('to_emails');
        expect(response.data).toHaveProperty('status');
      });
    });
  });

  // ── Email Attachments ─────────────────────────────────────────────

  describe('GET /api/email/attachments/', () => {
    it('returns paginated list of email attachments', async () => {
      provider
        .given('email attachments exist')
        .uponReceiving('a request for email attachments list')
        .withRequest({
          method: 'GET',
          path: '/api/email/attachments/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: {
            results: eachLike({
              id: integer(1),
              name: string('terms_and_conditions'),
              display_name: string('Terms and Conditions'),
              attachment_type: string('static'),
              file_size: integer(1024),
              is_active: boolean(true),
            }),
            count: integer(1),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/email/attachments/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('results');
        expect(response.data).toHaveProperty('count');
        expect(response.data.results.length).toBeGreaterThan(0);
        expect(response.data.results[0]).toHaveProperty('name');
        expect(response.data.results[0]).toHaveProperty('attachment_type');
      });
    });
  });

  // ── Email Content Rules ───────────────────────────────────────────

  describe('GET /api/email/content-rules/', () => {
    it('returns paginated list of content rules', async () => {
      provider
        .given('email content rules exist')
        .uponReceiving('a request for email content rules list')
        .withRequest({
          method: 'GET',
          path: '/api/email/content-rules/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: {
            results: eachLike({
              id: integer(1),
              name: string('product_upsell_rule'),
              rule_type: string('product_based'),
              priority: integer(100),
              is_active: boolean(true),
            }),
            count: integer(1),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/email/content-rules/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('results');
        expect(response.data).toHaveProperty('count');
        expect(response.data.results.length).toBeGreaterThan(0);
        expect(response.data.results[0]).toHaveProperty('name');
        expect(response.data.results[0]).toHaveProperty('rule_type');
      });
    });
  });

  // ── Email Placeholders ────────────────────────────────────────────

  describe('GET /api/email/placeholders/', () => {
    it('returns paginated list of email placeholders', async () => {
      provider
        .given('email placeholders exist')
        .uponReceiving('a request for email placeholders list')
        .withRequest({
          method: 'GET',
          path: '/api/email/placeholders/',
        })
        .willRespondWith({
          status: 200,
          headers: JSON_RESPONSE_HEADERS,
          body: {
            results: eachLike({
              id: integer(1),
              name: string('order_details_block'),
              display_name: string('Order Details Block'),
              insert_position: string('replace'),
              is_required: boolean(true),
              is_active: boolean(true),
            }),
            count: integer(1),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await axios.get(
          `${mockServer.url}/api/email/placeholders/`
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('results');
        expect(response.data).toHaveProperty('count');
        expect(response.data.results.length).toBeGreaterThan(0);
        expect(response.data.results[0]).toHaveProperty('name');
        expect(response.data.results[0]).toHaveProperty('insert_position');
      });
    });
  });
});
