/**
 * Tests for rulesEngineUtils
 *
 * @module utils/__tests__/rulesEngineUtils.test
 *
 * Tests rules engine utilities including:
 * - Message type checking and classification
 * - Message variant and priority
 * - Content parsing and formatting
 * - Context building for different entry points
 * - Response processing pipeline
 */

import {
  MessageTypes,
  isAcknowledgmentMessage,
  classifyMessages,
  getMessageVariant,
  requiresUserAction,
  getMessagePriority,
  sortMessagesByPriority,
  parseMessageContent,
  formatMessageText,
  extractAcknowledgmentConfig,
  buildRulesContext,
  validateContext,
  processRulesResponse,
  processForUI,
  executeAndProcessRules,
  rulesEngineHelpers,
} from '../rulesEngineUtils';

describe('rulesEngineUtils', () => {
  describe('MessageTypes', () => {
    test('should have all expected message types', () => {
      expect(MessageTypes.ACKNOWLEDGE).toBe('acknowledge');
      expect(MessageTypes.USER_ACKNOWLEDGE).toBe('user_acknowledge');
      expect(MessageTypes.DISPLAY).toBe('display');
      expect(MessageTypes.MODAL).toBe('modal');
      expect(MessageTypes.INLINE).toBe('inline');
      expect(MessageTypes.ACKNOWLEDGMENT).toBe('acknowledgment');
    });
  });

  describe('isAcknowledgmentMessage', () => {
    test('should return false for null/undefined', () => {
      expect(isAcknowledgmentMessage(null)).toBe(false);
      expect(isAcknowledgmentMessage(undefined)).toBe(false);
    });

    test('should return true for type=acknowledge', () => {
      expect(isAcknowledgmentMessage({ type: 'acknowledge' })).toBe(true);
    });

    test('should return true for action_type=user_acknowledge', () => {
      expect(isAcknowledgmentMessage({ action_type: 'user_acknowledge' })).toBe(true);
    });

    test('should return true for content.type=acknowledgment', () => {
      expect(isAcknowledgmentMessage({ content: { type: 'acknowledgment' } })).toBe(true);
    });

    test('should return false for display messages', () => {
      expect(isAcknowledgmentMessage({ type: 'display' })).toBe(false);
      expect(isAcknowledgmentMessage({ type: 'info' })).toBe(false);
    });
  });

  describe('classifyMessages', () => {
    test('should handle empty/null input', () => {
      const result = classifyMessages([]);
      expect(result.acknowledgments.all).toHaveLength(0);
      expect(result.displays.all).toHaveLength(0);
      expect(result.summary.totalMessages).toBe(0);
    });

    test('should handle non-array input', () => {
      const result = classifyMessages(null);
      expect(result.acknowledgments.all).toHaveLength(0);
      expect(result.displays.all).toHaveLength(0);
    });

    test('should separate acknowledgments from displays', () => {
      const messages = [
        { type: 'acknowledge', display_type: 'modal' },
        { type: 'display', display_type: 'inline' },
        { action_type: 'user_acknowledge', display_type: 'inline' },
      ];

      const result = classifyMessages(messages);

      expect(result.acknowledgments.all).toHaveLength(2);
      expect(result.displays.all).toHaveLength(1);
    });

    test('should classify by display_type', () => {
      const messages = [
        { type: 'acknowledge', display_type: 'modal' },
        { type: 'acknowledge', display_type: 'inline' },
        { type: 'display', display_type: 'modal' },
        { type: 'display', display_type: 'inline' },
      ];

      const result = classifyMessages(messages);

      expect(result.acknowledgments.modal).toHaveLength(1);
      expect(result.acknowledgments.inline).toHaveLength(1);
      expect(result.displays.modal).toHaveLength(1);
      expect(result.displays.inline).toHaveLength(1);
    });

    test('should default acknowledgments without display_type to modal', () => {
      const messages = [{ type: 'acknowledge' }];
      const result = classifyMessages(messages);

      expect(result.acknowledgments.modal).toHaveLength(1);
      expect(result.acknowledgments.inline).toHaveLength(0);
    });

    test('should generate accurate summary', () => {
      const messages = [
        { type: 'acknowledge', display_type: 'modal' },
        { type: 'display', display_type: 'inline' },
      ];

      const result = classifyMessages(messages);

      expect(result.summary.totalMessages).toBe(2);
      expect(result.summary.totalAcknowledgments).toBe(1);
      expect(result.summary.totalDisplays).toBe(1);
      expect(result.summary.hasModalAcknowledgments).toBe(true);
      expect(result.summary.hasInlineDisplays).toBe(true);
    });
  });

  describe('getMessageVariant', () => {
    test('should return info for null/undefined', () => {
      expect(getMessageVariant(null)).toBe('info');
      expect(getMessageVariant(undefined)).toBe('info');
    });

    test('should return variant from message.variant', () => {
      expect(getMessageVariant({ variant: 'warning' })).toBe('warning');
      expect(getMessageVariant({ variant: 'error' })).toBe('error');
      expect(getMessageVariant({ variant: 'success' })).toBe('success');
    });

    test('should return variant from message_type', () => {
      expect(getMessageVariant({ message_type: 'warning' })).toBe('warning');
    });

    test('should return variant from content.variant', () => {
      expect(getMessageVariant({ content: { variant: 'error' } })).toBe('error');
    });

    test('should normalize alert to warning', () => {
      expect(getMessageVariant({ variant: 'alert' })).toBe('warning');
    });

    test('should normalize danger to error', () => {
      expect(getMessageVariant({ variant: 'danger' })).toBe('error');
    });

    test('should normalize primary to info', () => {
      expect(getMessageVariant({ variant: 'primary' })).toBe('info');
    });

    test('should handle case-insensitive variants', () => {
      expect(getMessageVariant({ variant: 'WARNING' })).toBe('warning');
      expect(getMessageVariant({ variant: 'Error' })).toBe('error');
    });
  });

  describe('requiresUserAction', () => {
    test('should return false for null/undefined', () => {
      expect(requiresUserAction(null)).toBe(false);
      expect(requiresUserAction(undefined)).toBe(false);
    });

    test('should return true for acknowledgment messages', () => {
      expect(requiresUserAction({ type: 'acknowledge' })).toBe(true);
    });

    test('should return true for required messages', () => {
      expect(requiresUserAction({ required: true })).toBe(true);
    });

    test('should return true for blocking messages', () => {
      expect(requiresUserAction({ blocking: true })).toBe(true);
    });

    test('should return false for non-actionable messages', () => {
      expect(requiresUserAction({ type: 'display' })).toBe(false);
      expect(requiresUserAction({ type: 'info' })).toBe(false);
    });
  });

  describe('getMessagePriority', () => {
    test('should return 0 for null/undefined', () => {
      expect(getMessagePriority(null)).toBe(0);
      expect(getMessagePriority(undefined)).toBe(0);
    });

    test('should return explicit priority', () => {
      expect(getMessagePriority({ priority: 50 })).toBe(50);
      expect(getMessagePriority({ priority: 0 })).toBe(0);
    });

    test('should return 100 for blocking messages', () => {
      expect(getMessagePriority({ blocking: true })).toBe(100);
    });

    test('should return 90 for required messages', () => {
      expect(getMessagePriority({ required: true })).toBe(90);
    });

    test('should return 80 for acknowledgment messages', () => {
      expect(getMessagePriority({ type: 'acknowledge' })).toBe(80);
    });

    test('should return 70 for error messages', () => {
      expect(getMessagePriority({ variant: 'error' })).toBe(70);
    });

    test('should return 60 for warning messages', () => {
      expect(getMessagePriority({ variant: 'warning' })).toBe(60);
    });

    test('should return 40 for success messages', () => {
      expect(getMessagePriority({ variant: 'success' })).toBe(40);
    });

    test('should return 30 for default info messages', () => {
      expect(getMessagePriority({ variant: 'info' })).toBe(30);
      expect(getMessagePriority({})).toBe(30);
    });
  });

  describe('sortMessagesByPriority', () => {
    test('should handle empty array', () => {
      expect(sortMessagesByPriority([])).toEqual([]);
    });

    test('should sort by priority descending', () => {
      const messages = [
        { priority: 10 },
        { priority: 50 },
        { priority: 30 },
      ];

      const sorted = sortMessagesByPriority(messages);

      expect(sorted[0].priority).toBe(50);
      expect(sorted[1].priority).toBe(30);
      expect(sorted[2].priority).toBe(10);
    });

    test('should not mutate original array', () => {
      const messages = [{ priority: 10 }, { priority: 50 }];
      const original = [...messages];

      sortMessagesByPriority(messages);

      expect(messages).toEqual(original);
    });

    test('should sort by derived priority', () => {
      const messages = [
        { variant: 'info' },    // 30
        { blocking: true },     // 100
        { variant: 'warning' }, // 60
      ];

      const sorted = sortMessagesByPriority(messages);

      expect(sorted[0].blocking).toBe(true);
      expect(sorted[1].variant).toBe('warning');
      expect(sorted[2].variant).toBe('info');
    });
  });

  describe('parseMessageContent', () => {
    test('should return defaults for null message', () => {
      const result = parseMessageContent(null);

      expect(result.title).toBe('Notice');
      expect(result.checkboxText).toBe('I acknowledge');
      expect(result.variant).toBe('info');
    });

    test('should handle string message', () => {
      const result = parseMessageContent('Test message');

      expect(result.message).toBe('Test message');
      expect(result.title).toBe('Notice');
    });

    test('should extract title from message', () => {
      const result = parseMessageContent({ title: 'Custom Title' });

      expect(result.title).toBe('Custom Title');
    });

    test('should extract message from various fields', () => {
      expect(parseMessageContent({ content: { message: 'From message' } }).message).toBe('From message');
      expect(parseMessageContent({ content: { body: 'From body' } }).message).toBe('From body');
      expect(parseMessageContent({ content: { text: 'From text' } }).message).toBe('From text');
    });

    test('should handle array messages', () => {
      const result = parseMessageContent({ content: { message: ['Line 1', 'Line 2'] } });

      expect(result.message).toBe('Line 1\nLine 2');
    });

    test('should extract checkbox text', () => {
      const result = parseMessageContent({ content: { checkbox_text: 'I agree' } });

      expect(result.checkboxText).toBe('I agree');
    });

    test('should extract ackKey and templateId', () => {
      const result = parseMessageContent({
        ack_key: 'terms_v1',
        template_id: 'tmpl_terms',
      });

      expect(result.ackKey).toBe('terms_v1');
      expect(result.templateId).toBe('tmpl_terms');
    });

    test('should handle nested content.content structure', () => {
      const result = parseMessageContent({
        content: {
          content: {
            title: 'Nested Title',
            message: 'Nested Message',
          },
        },
      });

      expect(result.title).toBe('Nested Title');
      expect(result.message).toBe('Nested Message');
    });

    test('should parse link from string', () => {
      const result = parseMessageContent({
        link: 'https://example.com',
      });

      expect(result.link.url).toBe('https://example.com');
      expect(result.link.text).toBe('Learn more');
    });

    test('should parse link from object', () => {
      const result = parseMessageContent({
        link: { url: 'https://example.com', text: 'Click here' },
      });

      expect(result.link.url).toBe('https://example.com');
      expect(result.link.text).toBe('Click here');
    });

    test('should parse details array', () => {
      const result = parseMessageContent({
        content: { details: ['Item 1', 'Item 2'] },
      });

      expect(result.details).toEqual(['Item 1', 'Item 2']);
    });

    test('should parse buttons', () => {
      const result = parseMessageContent({
        content: {
          buttons: [{ label: 'Accept', action: 'acknowledge' }],
        },
      });

      expect(result.buttons).toHaveLength(1);
      expect(result.buttons[0].label).toBe('Accept');
      expect(result.buttons[0].action).toBe('acknowledge');
    });

    test('should use custom defaults', () => {
      const result = parseMessageContent(null, {
        title: 'Custom Default',
        checkboxText: 'Custom Checkbox',
      });

      expect(result.title).toBe('Custom Default');
      expect(result.checkboxText).toBe('Custom Checkbox');
    });
  });

  describe('formatMessageText', () => {
    test('should return non-string input unchanged', () => {
      expect(formatMessageText(null)).toBe(null);
      expect(formatMessageText(undefined)).toBe(undefined);
      expect(formatMessageText(123)).toBe(123);
    });

    test('should format bold text', () => {
      expect(formatMessageText('**bold**')).toBe('<strong>bold</strong>');
    });

    test('should format italic text', () => {
      expect(formatMessageText('*italic*')).toBe('<em>italic</em>');
    });

    test('should format line breaks', () => {
      expect(formatMessageText('line1\nline2')).toBe('line1<br />line2');
    });

    test('should format links', () => {
      expect(formatMessageText('[Click](https://example.com)')).toBe(
        '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Click</a>'
      );
    });

    test('should format multiple markdown elements', () => {
      const input = '**Bold** and *italic* with [link](https://example.com)';
      const result = formatMessageText(input);

      expect(result).toContain('<strong>Bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('href="https://example.com"');
    });
  });

  describe('extractAcknowledgmentConfig', () => {
    test('should extract ackKey and templateId', () => {
      const message = {
        ack_key: 'terms_v1',
        template_id: 'tmpl_terms',
      };

      const config = extractAcknowledgmentConfig(message);

      expect(config.ackKey).toBe('terms_v1');
      expect(config.templateId).toBe('tmpl_terms');
    });

    test('should extract scope and persistTo', () => {
      const message = {
        scope: 'user',
        persistTo: 'database',
      };

      const config = extractAcknowledgmentConfig(message);

      expect(config.scope).toBe('user');
      expect(config.persistTo).toBe('database');
    });

    test('should default scope to session', () => {
      const config = extractAcknowledgmentConfig({});

      expect(config.scope).toBe('session');
      expect(config.persistTo).toBe('session');
    });

    test('should extract blocking flag', () => {
      const config = extractAcknowledgmentConfig({ blocking: true });

      expect(config.blocking).toBe(true);
    });
  });

  describe('buildRulesContext', () => {
    // Mock browser globals
    const originalWindow = global.window;
    const originalDocument = global.document;
    const originalNavigator = global.navigator;

    beforeEach(() => {
      global.window = {
        location: {
          pathname: '/test',
          search: '?q=test',
          hash: '#section',
        },
      };
      global.document = {
        referrer: 'https://referrer.com',
      };
      global.navigator = {
        userAgent: 'test-agent',
        language: 'en-US',
        platform: 'MacIntel',
      };
    });

    afterEach(() => {
      global.window = originalWindow;
      global.document = originalDocument;
      global.navigator = originalNavigator;
    });

    describe('checkout', () => {
      test('should return null cart for missing data', () => {
        const result = buildRulesContext.checkout(null);
        expect(result.cart).toBe(null);
      });

      test('should return null cart for missing id', () => {
        const result = buildRulesContext.checkout({});
        expect(result.cart).toBe(null);
      });

      test('should return null cart for invalid id', () => {
        const result = buildRulesContext.checkout({ id: 'invalid' });
        expect(result.cart).toBe(null);
      });

      test('should build valid checkout context', () => {
        const cartData = {
          id: 123,
          user_id: 456,
          session_key: 'sess_123',
        };
        const cartItems = [
          { id: 1, quantity: 2, actual_price: '10.00' },
        ];

        const result = buildRulesContext.checkout(cartData, cartItems);

        expect(result.cart.id).toBe(123);
        expect(result.cart.user_id).toBe(456);
        expect(result.cart.items).toHaveLength(1);
        expect(result.cart.total).toBe(20);
        expect(result.acknowledgments).toEqual({});
      });

      test('should calculate total from items', () => {
        const cartData = { id: 1 };
        const cartItems = [
          { id: 1, quantity: 2, price: '10.00' },
          { id: 2, quantity: 1, actual_price: '5.00' },
        ];

        const result = buildRulesContext.checkout(cartData, cartItems);

        expect(result.cart.total).toBe(25);
      });
    });

    describe('homePage', () => {
      test('should build home page context without user', () => {
        const result = buildRulesContext.homePage();

        expect(result.current_date).toBeDefined();
        expect(result.current_time).toBeDefined();
        expect(result.page.name).toBe('home');
        expect(result.user.is_authenticated).toBe(false);
      });

      test('should build home page context with user', () => {
        const user = { id: 1, email: 'test@example.com', region: 'UK' };
        const result = buildRulesContext.homePage(user);

        expect(result.user.id).toBe(1);
        expect(result.user.email).toBe('test@example.com');
        expect(result.user.is_authenticated).toBe(true);
      });
    });

    describe('productCard', () => {
      test('should return null product for missing data', () => {
        const result = buildRulesContext.productCard(null);
        expect(result.product).toBe(null);
      });

      test('should build product card context', () => {
        const product = {
          id: 1,
          name: 'Test Product',
          product_type: 'material',
          price: 50.00,
        };

        const result = buildRulesContext.productCard(product);

        expect(result.product.id).toBe(1);
        expect(result.product.name).toBe('Test Product');
        expect(result.product.type).toBe('material');
        expect(result.product.price).toBe(50.00);
      });

      test('should include selected variation', () => {
        const product = { id: 1, name: 'Test' };
        const options = { selectedVariation: { id: 10 } };

        const result = buildRulesContext.productCard(product, options);

        expect(result.product.selected_variation).toEqual({ id: 10 });
      });
    });

    describe('productList', () => {
      test('should handle empty products', () => {
        const result = buildRulesContext.productList([]);

        expect(result.products.count).toBe(0);
        expect(result.products.items).toHaveLength(0);
      });

      test('should limit items to 10', () => {
        const products = Array(20).fill({ id: 1, product_type: 'material' });
        const result = buildRulesContext.productList(products);

        expect(result.products.items).toHaveLength(10);
        expect(result.products.count).toBe(20);
      });

      test('should aggregate types and subjects', () => {
        const products = [
          { id: 1, product_type: 'material', subject: 'CM1' },
          { id: 2, product_type: 'tutorial', subject: 'CM2' },
          { id: 3, product_type: 'material', subject: 'CM1' },
        ];

        const result = buildRulesContext.productList(products);

        expect(result.products.types).toContain('material');
        expect(result.products.types).toContain('tutorial');
        expect(result.products.subjects).toContain('CM1');
        expect(result.products.subjects).toContain('CM2');
      });
    });

    describe('userRegistration', () => {
      test('should build registration context', () => {
        const formData = {
          email: 'test@example.com',
          country: 'UK',
          termsAccepted: true,
        };

        const result = buildRulesContext.userRegistration(formData);

        expect(result.registration.email).toBe('test@example.com');
        expect(result.registration.country).toBe('UK');
        expect(result.registration.has_accepted_terms).toBe(true);
        expect(result.page.name).toBe('registration');
      });
    });

    describe('checkoutTerms', () => {
      test('should return checkout context as base', () => {
        const cartData = { id: 1 };
        const result = buildRulesContext.checkoutTerms(cartData);

        expect(result.cart).toBeDefined();
        expect(result.step.name).toBe('terms_conditions');
      });

      test('should include user if provided', () => {
        const cartData = { id: 1 };
        const user = { id: 1, email: 'test@example.com' };

        const result = buildRulesContext.checkoutTerms(cartData, [], user);

        expect(result.user.email).toBe('test@example.com');
        expect(result.user.is_authenticated).toBe(true);
      });
    });

    describe('generic', () => {
      test('should build generic context', () => {
        const result = buildRulesContext.generic('test_entry', { custom: 'data' });

        expect(result.entry_point).toBe('test_entry');
        expect(result.timestamp).toBeDefined();
        expect(result.custom).toBe('data');
        // page.path comes from window.location.pathname (whatever current environment has)
        expect(result.page.path).toBeDefined();
        expect(typeof result.page.path).toBe('string');
      });
    });
  });

  describe('validateContext', () => {
    test('should validate checkout context - missing cart', () => {
      const result = validateContext({}, 'checkout_terms');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required cart context - cart object is null or undefined');
    });

    test('should validate checkout context - missing cart ID', () => {
      const result = validateContext({ cart: { items: [] } }, 'checkout_terms');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cart ID is required but missing');
    });

    test('should validate checkout context - invalid items', () => {
      const result = validateContext({ cart: { id: 1, items: 'invalid' } }, 'checkout_terms');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cart items must be an array');
    });

    test('should validate checkout context - valid', () => {
      const result = validateContext({ cart: { id: 1, items: [], total: 0 } }, 'checkout_terms');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate home_page_mount - warnings for missing fields', () => {
      const result = validateContext({}, 'home_page_mount');

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Current date is missing');
      expect(result.warnings).toContain('Page context is missing');
    });

    test('should validate product_card_mount - missing product', () => {
      const result = validateContext({}, 'product_card_mount');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required product context');
    });

    test('should validate user_registration - missing registration', () => {
      const result = validateContext({}, 'user_registration');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required registration context');
    });
  });

  describe('processRulesResponse', () => {
    test('should handle null response', () => {
      const result = processRulesResponse(null);

      expect(result.success).toBe(true);
      expect(result.messages.processed).toHaveLength(0);
    });

    test('should handle empty messages', () => {
      const result = processRulesResponse({ messages: [] });

      expect(result.messages.summary.totalMessages).toBe(0);
    });

    test('should process messages with parsed content', () => {
      const response = {
        messages: [
          { type: 'acknowledge', content: { title: 'Terms' } },
          { type: 'display', variant: 'warning' },
        ],
      };

      const result = processRulesResponse(response);

      expect(result.messages.processed).toHaveLength(2);
      expect(result.messages.processed[0].parsed.title).toBe('Terms');
      expect(result.messages.processed[1].variant).toBe('warning');
    });

    test('should extract acknowledgments', () => {
      const response = {
        messages: [
          { type: 'acknowledge', ack_key: 'terms_v1' },
        ],
      };

      const result = processRulesResponse(response);

      expect(result.acknowledgments).toHaveLength(1);
      expect(result.acknowledgments[0].ackKey).toBe('terms_v1');
    });

    test('should sort by priority when requested', () => {
      const response = {
        messages: [
          { variant: 'info' },
          { blocking: true },
        ],
      };

      const result = processRulesResponse(response, { sortByPriority: true });

      expect(result.messages.filtered[0].blocking).toBe(true);
    });

    test('should filter modal messages when requested', () => {
      const response = {
        messages: [
          { display_type: 'modal' },
          { display_type: 'inline' },
        ],
      };

      const result = processRulesResponse(response, { filterModal: true });

      expect(result.messages.filtered).toHaveLength(1);
      expect(result.messages.filtered[0].display_type).toBe('inline');
    });

    test('should generate accurate summary', () => {
      const response = {
        messages: [
          { type: 'acknowledge', variant: 'warning' },
          { type: 'display', variant: 'error' },
        ],
      };

      const result = processRulesResponse(response);

      expect(result.messages.summary.hasAcknowledgments).toBe(true);
      expect(result.messages.summary.hasDisplays).toBe(true);
      expect(result.messages.summary.hasWarnings).toBe(true);
      expect(result.messages.summary.hasErrors).toBe(true);
    });

    test('should capture blocked state', () => {
      const response = {
        blocked: true,
        requires_acknowledgment: true,
        messages: [],
      };

      const result = processRulesResponse(response);

      expect(result.blocked).toBe(true);
      expect(result.requires_acknowledgment).toBe(true);
    });
  });

  describe('processForUI', () => {
    test('should return UI-compatible structure', () => {
      const response = {
        messages: [
          { type: 'acknowledge', display_type: 'modal' },
          { type: 'display', display_type: 'inline' },
        ],
      };

      const result = processForUI(response);

      expect(result.messages).toHaveLength(1);
      expect(result.acknowledgments.modal).toHaveLength(1);
      expect(result.processed).toHaveLength(2);
      expect(result.summary).toBeDefined();
    });
  });

  describe('executeAndProcessRules', () => {
    test('should validate context and execute rules', async () => {
      const mockService = {
        executeRules: jest.fn().mockResolvedValue({
          success: true,
          messages: [{ type: 'display' }],
        }),
      };

      const context = { cart: { id: 1, items: [] } };
      const result = await executeAndProcessRules('checkout_terms', context, mockService);

      expect(mockService.executeRules).toHaveBeenCalledWith('checkout_terms', context);
      expect(result.success).toBe(true);
    });

    test('should throw on invalid context with strict validation', async () => {
      const mockService = {
        executeRules: jest.fn(),
      };

      const context = {}; // Missing required cart
      const result = await executeAndProcessRules('checkout_terms', context, mockService, {
        strictValidation: true,
      });

      expect(mockService.executeRules).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Context validation failed');
    });

    test('should handle service errors', async () => {
      const mockService = {
        executeRules: jest.fn().mockRejectedValue(new Error('Service error')),
      };

      const context = { cart: { id: 1, items: [] } };
      const result = await executeAndProcessRules('checkout_terms', context, mockService);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Service error');
    });
  });

  describe('rulesEngineHelpers', () => {
    // Mock browser globals
    beforeEach(() => {
      global.window = {
        location: { pathname: '/checkout' },
      };
      global.document = { referrer: '' };
    });

    afterEach(() => {
      delete global.window;
      delete global.document;
    });

    test('executeCheckoutTerms should build context and execute', async () => {
      const mockService = {
        executeRules: jest.fn().mockResolvedValue({ success: true, messages: [] }),
      };

      const cartData = { id: 1 };
      const cartItems = [];
      await rulesEngineHelpers.executeCheckoutTerms(cartData, cartItems, mockService);

      expect(mockService.executeRules).toHaveBeenCalledWith(
        'checkout_terms',
        expect.objectContaining({ cart: expect.any(Object) })
      );
    });

    test('executeHomePage should build context and execute', async () => {
      const mockService = {
        executeRules: jest.fn().mockResolvedValue({ success: true, messages: [] }),
      };

      await rulesEngineHelpers.executeHomePage(null, mockService);

      expect(mockService.executeRules).toHaveBeenCalledWith(
        'home_page_mount',
        expect.objectContaining({ page: expect.any(Object) })
      );
    });

    test('executeProductCard should build context and execute', async () => {
      const mockService = {
        executeRules: jest.fn().mockResolvedValue({ success: true, messages: [] }),
      };

      const product = { id: 1, name: 'Test' };
      await rulesEngineHelpers.executeProductCard(product, mockService);

      expect(mockService.executeRules).toHaveBeenCalledWith(
        'product_card_mount',
        expect.objectContaining({ product: expect.any(Object) })
      );
    });
  });
});
