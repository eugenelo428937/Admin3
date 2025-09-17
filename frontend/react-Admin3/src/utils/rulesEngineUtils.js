/**
 * Rules Engine Utilities
 * Centralized utilities for processing and classifying rules engine messages
 */

// Message Type Constants
export const MessageTypes = {
  ACKNOWLEDGE: 'acknowledge',
  USER_ACKNOWLEDGE: 'user_acknowledge',
  DISPLAY: 'display',
  MODAL: 'modal',
  INLINE: 'inline',
  ACKNOWLEDGMENT: 'acknowledgment'
};

/**
 * Check if a message is an acknowledgment type
 * @param {Object} msg - Message object from rules engine
 * @returns {boolean} True if message is acknowledgment type
 */
export const isAcknowledgmentMessage = (msg) => {
  if (!msg) return false;

  return msg.type === MessageTypes.ACKNOWLEDGE ||
         msg.action_type === MessageTypes.USER_ACKNOWLEDGE ||
         msg.content?.type === MessageTypes.ACKNOWLEDGMENT;
};

/**
 * Classify messages into different categories
 * @param {Array} messages - Array of messages from rules engine
 * @returns {Object} Classified messages object with acknowledgments and displays
 */
export const classifyMessages = (messages = []) => {
  // Ensure we have an array
  if (!Array.isArray(messages)) {
    console.warn('classifyMessages: messages is not an array', messages);
    messages = [];
  }

  // Separate acknowledgments from display messages
  const acknowledgments = messages.filter(isAcknowledgmentMessage);
  const displays = messages.filter(msg => !isAcknowledgmentMessage(msg));

  // Further classify by display type
  const result = {
    acknowledgments: {
      inline: acknowledgments.filter(msg => msg.display_type === 'inline'),
      modal: acknowledgments.filter(msg => msg.display_type === 'modal' || !msg.display_type),
      all: acknowledgments
    },
    displays: {
      inline: displays.filter(msg => msg.display_type !== 'modal'),
      modal: displays.filter(msg => msg.display_type === 'modal'),
      all: displays
    },
    // Summary information
    summary: {
      totalMessages: messages.length,
      totalAcknowledgments: acknowledgments.length,
      totalDisplays: displays.length,
      hasInlineAcknowledgments: acknowledgments.some(msg => msg.display_type === 'inline'),
      hasModalAcknowledgments: acknowledgments.some(msg => msg.display_type === 'modal' || !msg.display_type),
      hasInlineDisplays: displays.some(msg => msg.display_type !== 'modal'),
      hasModalDisplays: displays.some(msg => msg.display_type === 'modal')
    }
  };

  return result;
};

/**
 * Get message variant for styling
 * @param {Object} message - Message object
 * @returns {string} Variant type for styling (info, warning, error, success)
 */
export const getMessageVariant = (message) => {
  if (!message) return 'info';

  // Check multiple possible locations for variant/type
  const variant = message.variant ||
                  message.message_type ||
                  message.content?.variant ||
                  message.content?.message_type ||
                  'info';

  // Normalize to standard variants
  switch (variant.toLowerCase()) {
    case 'warning':
    case 'alert':
      return 'warning';
    case 'error':
    case 'danger':
      return 'error';
    case 'success':
      return 'success';
    case 'info':
    case 'primary':
    default:
      return 'info';
  }
};

/**
 * Check if a message requires user action
 * @param {Object} message - Message object
 * @returns {boolean} True if message requires action
 */
export const requiresUserAction = (message) => {
  if (!message) return false;

  return isAcknowledgmentMessage(message) ||
         message.required === true ||
         message.blocking === true;
};

/**
 * Get display priority for message ordering
 * @param {Object} message - Message object
 * @returns {number} Priority number (higher = more important)
 */
export const getMessagePriority = (message) => {
  if (!message) return 0;

  // Explicit priority
  if (message.priority !== undefined) {
    return message.priority;
  }

  // Derive priority from type
  if (message.blocking) return 100;
  if (message.required) return 90;
  if (isAcknowledgmentMessage(message)) return 80;
  if (getMessageVariant(message) === 'error') return 70;
  if (getMessageVariant(message) === 'warning') return 60;
  if (getMessageVariant(message) === 'success') return 40;

  return 30; // Default for info messages
};

/**
 * Sort messages by priority
 * @param {Array} messages - Array of messages
 * @returns {Array} Sorted messages (highest priority first)
 */
export const sortMessagesByPriority = (messages = []) => {
  return [...messages].sort((a, b) => getMessagePriority(b) - getMessagePriority(a));
};

// ============================================================================
// CONTENT PARSING UTILITIES
// ============================================================================

/**
 * Parse message content from various formats into normalized structure
 * @param {Object} message - Message object from rules engine
 * @param {Object} defaults - Default values for missing fields
 * @returns {Object} Normalized content object
 */
export const parseMessageContent = (message, defaults = {}) => {
  const fallback = {
    title: defaults.title || 'Notice',
    message: defaults.message || '',
    checkboxText: defaults.checkboxText || 'I acknowledge',
    icon: defaults.icon || 'info-circle',
    variant: defaults.variant || 'info',
    dismissible: defaults.dismissible !== undefined ? defaults.dismissible : false,
    link: defaults.link || null,
    details: defaults.details || [],
    buttons: defaults.buttons || []
  };

  if (!message) {
    return fallback;
  }

  // Handle string content
  if (typeof message === 'string') {
    return {
      ...fallback,
      message: message
    };
  }

  // Extract content based on structure
  let content = message.content || message;

  // Handle nested content structure (e.g., content.content from MessageTemplate)
  if (content.content && typeof content.content === 'object') {
    content = { ...content, ...content.content };
  }

  // Parse and normalize fields
  const parsed = {
    title: content.title || message.title || fallback.title,
    message: extractMessage(content, fallback.message),
    checkboxText: content.checkbox_text || content.checkboxText || fallback.checkboxText,
    icon: content.icon || fallback.icon,
    variant: getMessageVariant(message),
    dismissible: content.dismissible !== undefined ? content.dismissible : fallback.dismissible,
    link: parseLink(content.link || message.link),
    details: parseDetails(content),
    buttons: parseButtons(content),
    // Preserve original metadata
    templateId: message.template_id || message.templateId,
    ackKey: message.ack_key || message.ackKey,
    required: message.required !== undefined ? message.required : true,
    blocking: message.blocking || false,
    displayType: message.display_type || message.displayType || 'inline'
  };

  return parsed;
};

/**
 * Extract message text from various possible locations
 * @param {Object} content - Content object
 * @param {string} fallback - Fallback message
 * @returns {string} Extracted message text
 */
const extractMessage = (content, fallback) => {
  if (!content) return fallback;

  // Check various possible message field names
  const messageText = content.message ||
                      content.body ||
                      content.text ||
                      content.description ||
                      content.content;

  // Handle array of messages (join with newlines)
  if (Array.isArray(messageText)) {
    return messageText.join('\n');
  }

  // Handle object with text property
  if (typeof messageText === 'object' && messageText.text) {
    return messageText.text;
  }

  // Debug logging for development
  if (process.env.NODE_ENV === 'development' && !messageText) {
    console.warn('[extractMessage] No message found in content:', content);
    console.warn('[extractMessage] Available keys:', Object.keys(content));
  }

  return messageText || fallback;
};

/**
 * Parse link information
 * @param {Object|string} link - Link data
 * @returns {Object|null} Parsed link object
 */
const parseLink = (link) => {
  if (!link) return null;

  if (typeof link === 'string') {
    return {
      url: link,
      text: 'Learn more',
      target: '_blank'
    };
  }

  return {
    url: link.url || link.href || '#',
    text: link.text || link.label || 'Learn more',
    target: link.target || '_blank'
  };
};

/**
 * Parse details/items list
 * @param {Object} content - Content object
 * @returns {Array} Parsed details array
 */
const parseDetails = (content) => {
  if (!content) return [];

  // Check various possible detail field names
  const details = content.details ||
                  content.items ||
                  content.list ||
                  content.bulletPoints;

  if (!details) return [];

  // Ensure it's an array
  if (!Array.isArray(details)) {
    return [details];
  }

  // Normalize each detail item
  return details.map(detail => {
    if (typeof detail === 'string') {
      return detail;
    }
    if (typeof detail === 'object' && detail.text) {
      return detail.text;
    }
    return String(detail);
  });
};

/**
 * Parse button configurations
 * @param {Object} content - Content object
 * @returns {Array} Parsed buttons array
 */
const parseButtons = (content) => {
  if (!content || !content.buttons) return [];

  const buttons = Array.isArray(content.buttons) ? content.buttons : [content.buttons];

  return buttons.map(button => ({
    label: button.label || button.text || 'OK',
    action: button.action || button.onClick || 'close',
    variant: button.variant || button.type || 'primary',
    disabled: button.disabled || false
  }));
};

/**
 * Format content for display with markdown support
 * @param {string} text - Text to format
 * @returns {string} Formatted text with basic markdown support
 */
export const formatMessageText = (text) => {
  if (!text || typeof text !== 'string') return text;

  // Basic markdown support
  let formatted = text
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br />')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  return formatted;
};

/**
 * Extract acknowledgment configuration from message
 * @param {Object} message - Message object
 * @returns {Object} Acknowledgment configuration
 */
export const extractAcknowledgmentConfig = (message) => {
  const content = parseMessageContent(message, {
    checkboxText: 'I have read and accept'
  });

  return {
    ackKey: content.ackKey,
    templateId: content.templateId,
    required: content.required,
    checkboxText: content.checkboxText,
    scope: message.scope || 'session', // session, user, or order
    persistTo: message.persistTo || 'session',
    displayType: content.displayType,
    blocking: content.blocking
  };
};

// ============================================================================
// CONTEXT BUILDING UTILITIES
// ============================================================================

/**
 * Context builders for different entry points
 * Each builder returns a properly formatted context object for the rules engine
 */
export const buildRulesContext = {
  /**
   * Build context for checkout-related entry points
   * @param {Object} cartData - Cart data object
   * @param {Array} cartItems - Array of cart items
   * @returns {Object} Checkout context
   */
  checkout: (cartData, cartItems = []) => {
    // Enhanced debugging
    console.log('🔍 [checkout] Input cartData:', cartData);
    console.log('🔍 [checkout] Input cartItems length:', cartItems?.length || 0);

    if (!cartData) {
      console.error('❌ [checkout] No cart data provided');
      return { cart: null };
    }

    if (!cartData.id) {
      console.error('❌ [checkout] Cart data missing ID:', cartData);
      return { cart: null };
    }

    // Parse cart ID and check for NaN
    const cartId = parseInt(cartData.id, 10);
    if (isNaN(cartId)) {
      console.error('❌ [checkout] Cart ID is not a valid number:', cartData.id);
      return { cart: null };
    }

    // Calculate total from cart items
    const total = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.actual_price || item.price || 0);
      const quantity = parseInt(item.quantity || 1, 10);
      return sum + (price * quantity);
    }, 0);

    // Build schema-compliant context
    const context = {
      // Cart object - matches backend schema exactly
      cart: {
        // Required fields
        id: cartId, // Already validated as integer
        user_id: cartData.user_id || null,
        items: cartItems.map(item => ({
          // Required fields per schema
          id: parseInt(item.id, 10),
          quantity: parseInt(item.quantity || 1, 10),
          actual_price: String(item.actual_price || item.price || '0'),

          // Additional fields that may be present
          metadata: item.metadata && typeof item.metadata === 'object' ? {
            variationId: item.metadata.variationId || null,
            variationName: item.metadata.variationName || ''
          } : {},
          is_marking: Boolean(item.is_marking),
          price_type: item.price_type || 'standard',
          product_id: parseInt(item.product_id || item.product || 0, 10),
          product_code: item.product_code || '',
          product_name: item.product_name || item.name || '',
          product_type: item.product_type || item.type || '',
          subject_code: item.subject_code || '',
          current_product: item.current_product || null,
          exam_session_code: item.exam_session_code || '',
          has_expired_deadline: Boolean(item.has_expired_deadline)
        })),

        // Cart-level required and optional fields
        total: Number(total),
        discount: Number(cartData.discount || 0),
        created_at: cartData.created_at || new Date().toISOString(),
        updated_at: cartData.updated_at || new Date().toISOString(),
        has_marking: Boolean(cartData.has_marking),
        has_digital: Boolean(cartData.has_digital),
        session_key: cartData.session_key || null,
        has_material: Boolean(cartData.has_material),
        has_tutorial: Boolean(cartData.has_tutorial)
      },

      // User object - matches schema
      user: cartData.user_id ? {
        id: parseInt(cartData.user_id, 10),
        ip: null,
        tier: 'standard',
        email: '',
        region: '',
        preferences: {},
        home_country: null,
        work_country: null,
        is_authenticated: true
      } : null,

      // Session object - matches schema
      session: {
        ip_address: '127.0.0.1', // Default value
        session_id: cartData.session_key || 'guest_session'
      },

      // Acknowledgments object - matches schema
      acknowledgments: {}
    };

    // Debug logging for development
    console.log('🔥 [buildCheckoutContext] BUILT schema-compliant context:', context);
    console.log('🔥 [buildCheckoutContext] Cart data input:', cartData);
    console.log('🔥 [buildCheckoutContext] Cart items input:', cartItems);
    console.log('🔥 [buildCheckoutContext] Context keys:', Object.keys(context));

    return context;
  },

  /**
   * Build context for home page entry point
   * @param {Object} user - Optional user data
   * @returns {Object} Home page context
   */
  homePage: (user = null) => {
    const now = new Date();

    return {
      current_date: now.toISOString().split('T')[0],
      current_time: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      page: {
        name: 'home',
        path: '/',
        referrer: document.referrer || null
      },
      user: user ? {
        id: user.id,
        email: user.email,
        region: user.region || null,
        is_authenticated: true
      } : {
        is_authenticated: false
      }
    };
  },

  /**
   * Build context for product card entry points
   * @param {Object} product - Product data
   * @param {Object} options - Additional options
   * @returns {Object} Product card context
   */
  productCard: (product, options = {}) => {
    if (!product) {
      return { product: null };
    }

    return {
      product: {
        id: product.id,
        name: product.name,
        code: product.code || product.product_code,
        type: product.product_type || product.type,
        category: product.category || null,
        price: product.price || product.actual_price,

        // Variations
        variations: product.variations || [],
        selected_variation: options.selectedVariation || null,

        // Metadata
        exam_session: product.exam_session || null,
        subject: product.subject || null,
        location: product.location || null,

        // Availability
        in_stock: product.in_stock !== false,
        available: product.available !== false,

        // Special flags
        has_expired_deadline: product.has_expired_deadline || false,
        requires_shipping: product.requires_shipping || false,
        is_digital: product.is_digital || false
      },

      // Page context
      page: {
        name: options.pageName || 'product_list',
        path: options.pagePath || window.location.pathname
      }
    };
  },

  /**
   * Build context for product list entry points
   * @param {Array} products - Array of products
   * @param {Object} filters - Applied filters
   * @returns {Object} Product list context
   */
  productList: (products = [], filters = {}) => {
    return {
      products: {
        count: products.length,
        items: products.slice(0, 10), // Limit to first 10 for performance

        // Aggregate data
        types: [...new Set(products.map(p => p.product_type).filter(Boolean))],
        subjects: [...new Set(products.map(p => p.subject).filter(Boolean))],

        // Filter state
        filters: {
          subjects: filters.subjects || [],
          product_groups: filters.product_groups || [],
          variations: filters.variations || [],
          search_query: filters.q || filters.query || null
        }
      },

      page: {
        name: 'product_list',
        path: '/products',
        page_number: filters.page || 1
      }
    };
  },

  /**
   * Build context for user registration
   * @param {Object} formData - Registration form data
   * @returns {Object} Registration context
   */
  userRegistration: (formData = {}) => {
    return {
      registration: {
        email: formData.email || null,
        country: formData.country || null,
        region: formData.region || null,
        has_accepted_terms: formData.termsAccepted || false,
        has_accepted_marketing: formData.marketingAccepted || false,
        registration_source: formData.source || 'website',
        referrer: document.referrer || null
      },

      page: {
        name: 'registration',
        path: '/register'
      }
    };
  },

  /**
   * Build context for checkout terms
   * @param {Object} cartData - Cart data
   * @param {Array} cartItems - Cart items
   * @param {Object} user - User data
   * @returns {Object} Checkout terms context
   */
  checkoutTerms: (cartData, cartItems = [], user = null) => {
    console.log('🔥 [checkoutTerms] START - cartData:', cartData);
    console.log('🔥 [checkoutTerms] START - cartItems length:', cartItems?.length);

    // Use the checkout context as base
    const checkoutContext = buildRulesContext.checkout(cartData, cartItems);

    console.log('🔥 [checkoutTerms] checkoutContext:', checkoutContext);
    console.log('🔥 [checkoutTerms] checkoutContext.cart:', checkoutContext.cart);

    // Early return if no cart context (prevents "Missing required cart context" error)
    if (!checkoutContext.cart) {
      console.error('❌ [checkoutTerms] No cart data provided - returning empty context');
      return checkoutContext;
    }

    // Build the full context, preserving the schema-compliant structure
    const context = {
      ...checkoutContext,

      // Override user only if explicitly provided
      ...(user && { user: {
        id: parseInt(user.id || user.user_id, 10),
        email: user.email || '',
        ip: user.ip || null,
        tier: user.tier || 'standard',
        region: user.region || '',
        preferences: user.preferences || {},
        home_country: user.home_country || null,
        work_country: user.work_country || null,
        is_authenticated: true
      }}),

      // Add terms-specific step data
      step: {
        name: 'terms_conditions',
        number: 2,
        total_steps: 3
      }

      // Don't override acknowledgments - it's already properly set as {} in checkout context
      // The backend expects an object, not an array
    };

    // Debug logging
    console.log('🔥 [checkoutTerms] FINAL context:', context);
    console.log('🔥 [checkoutTerms] FINAL context keys:', Object.keys(context));
    console.log('🔥 [checkoutTerms] FINAL cart exists:', !!context.cart);
    console.log('🔥 [checkoutTerms] FINAL context JSON:', JSON.stringify(context, null, 2));

    return context;
  },

  /**
   * Build context for checkout payment
   * @param {Object} cartData - Cart data
   * @param {Array} cartItems - Cart items
   * @param {Object} paymentMethod - Selected payment method
   * @returns {Object} Checkout payment context
   */
  checkoutPayment: (cartData, cartItems = [], paymentMethod = null) => {
    const checkoutContext = buildRulesContext.checkout(cartData, cartItems);

    return {
      ...checkoutContext,

      payment: {
        method: paymentMethod?.type || null,
        provider: paymentMethod?.provider || null,
        requires_billing_address: paymentMethod?.requiresBillingAddress || false
      },

      step: {
        name: 'payment',
        number: 3,
        total_steps: 3
      }
    };
  },

  /**
   * Build generic context with common fields
   * @param {string} entryPoint - Entry point name
   * @param {Object} customData - Custom data to include
   * @returns {Object} Generic context
   */
  generic: (entryPoint, customData = {}) => {
    const now = new Date();

    return {
      entry_point: entryPoint,
      timestamp: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

      page: {
        path: window.location.pathname,
        query: window.location.search,
        hash: window.location.hash
      },

      browser: {
        user_agent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
      },

      ...customData
    };
  }
};

/**
 * Validate context against expected structure
 * @param {Object} context - Context object to validate
 * @param {string} entryPoint - Entry point name
 * @returns {Object} Validation result with any errors
 */
export const validateContext = (context, entryPoint) => {
  const errors = [];
  const warnings = [];

  // Check for required fields based on entry point
  switch (entryPoint) {
    case 'checkout_terms':
    case 'checkout_payment':
    case 'checkout_start':
      if (!context) {
        errors.push('Context is null or undefined');
      } else if (!context.cart) {
        errors.push('Missing required cart context - cart object is null or undefined');
        console.error('❌ [validateContext] Context structure:', JSON.stringify(context, null, 2));
        console.error('❌ [validateContext] Context keys:', Object.keys(context || {}));
        console.error('❌ [validateContext] Context.cart value:', context.cart);
      } else {
        if (!context.cart.items || !Array.isArray(context.cart.items)) {
          errors.push('Cart items must be an array');
        }
        if (context.cart.total === undefined) {
          warnings.push('Cart total is missing');
        }
        if (!context.cart.id) {
          errors.push('Cart ID is required but missing');
        }
        // Check acknowledgments type
        if (context.acknowledgments && !typeof context.acknowledgments === 'object') {
          errors.push(`Acknowledgments must be an object, got ${typeof context.acknowledgments}`);
        }
      }
      break;

    case 'home_page_mount':
      if (!context.current_date) {
        warnings.push('Current date is missing');
      }
      if (!context.page) {
        warnings.push('Page context is missing');
      }
      break;

    case 'product_card_mount':
      if (!context.product) {
        errors.push('Missing required product context');
      }
      break;

    case 'user_registration':
      if (!context.registration) {
        errors.push('Missing required registration context');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

// ============================================================================
// MESSAGE PROCESSING PIPELINE
// ============================================================================

/**
 * Complete message processing pipeline that combines all utilities
 * @param {Object} response - Raw response from rules engine
 * @param {Object} options - Processing options
 * @returns {Object} Fully processed response ready for UI consumption
 */
export const processRulesResponse = (response, options = {}) => {
  const {
    filterModal = false,
    filterInline = false,
    processAcknowledgments = true,
    sortByPriority = true,
    validateContent = true,
    entryPoint = null
  } = options;

  // Initialize result structure
  const result = {
    success: response?.success !== false,
    blocked: response?.blocked || false,
    requires_acknowledgment: response?.requires_acknowledgment || false,
    messages: {
      raw: response?.messages || [],
      processed: [],
      classified: {
        acknowledgments: { inline: [], modal: [], all: [] },
        displays: { inline: [], modal: [], all: [] }
      },
      summary: {
        totalMessages: 0,
        hasAcknowledgments: false,
        hasDisplays: false,
        hasErrors: false,
        hasWarnings: false,
        highestPriority: 0
      }
    },
    acknowledgments: [],
    errors: [],
    warnings: []
  };

  // Early return for empty or invalid responses
  if (!response || !response.messages || !Array.isArray(response.messages)) {
    return result;
  }

  try {
    // Step 1: Classify messages
    const classified = classifyMessages(response.messages);
    result.messages.classified = classified;

    // Step 2: Process and parse each message
    const processedMessages = response.messages.map((message, index) => {
      try {
        // Parse message content
        const parsedContent = parseMessageContent(message, {
          title: `Message ${index + 1}`,
          message: 'No content available'
        });

        // Get priority and variant
        const priority = getMessagePriority(message);
        const variant = getMessageVariant(message);
        const needsAction = requiresUserAction(message);

        // Create processed message
        const processed = {
          ...message,
          index,
          parsed: parsedContent,
          priority,
          variant,
          needsAction,
          isAcknowledgment: isAcknowledgmentMessage(message),
          // Add processing metadata
          processing: {
            timestamp: new Date().toISOString(),
            entryPoint: entryPoint,
            processedBy: 'rulesEngineUtils'
          }
        };

        // Extract acknowledgment config if needed
        if (processAcknowledgments && isAcknowledgmentMessage(message)) {
          processed.acknowledgmentConfig = extractAcknowledgmentConfig(message);
        }

        return processed;
      } catch (error) {
        console.error('Error processing message:', error, message);
        result.errors.push(`Failed to process message ${index}: ${error.message}`);

        // Return a fallback processed message
        return {
          ...message,
          index,
          parsed: parseMessageContent(null, { title: 'Error', message: 'Failed to process message' }),
          priority: 0,
          variant: 'error',
          needsAction: false,
          isAcknowledgment: false,
          error: error.message
        };
      }
    });

    result.messages.processed = processedMessages;

    // Step 3: Apply filters
    let filteredMessages = processedMessages;

    if (filterModal) {
      filteredMessages = filteredMessages.filter(msg =>
        msg.display_type !== 'modal' && msg.parsed?.displayType !== 'modal'
      );
    }

    if (filterInline) {
      filteredMessages = filteredMessages.filter(msg =>
        msg.display_type === 'modal' || msg.parsed?.displayType === 'modal'
      );
    }

    // Step 4: Sort by priority if requested
    if (sortByPriority) {
      filteredMessages = sortMessagesByPriority(filteredMessages);
    }

    // Step 5: Generate summary statistics
    const summary = {
      totalMessages: processedMessages.length,
      filteredMessages: filteredMessages.length,
      hasAcknowledgments: classified.acknowledgments.all.length > 0,
      hasDisplays: classified.displays.all.length > 0,
      hasInlineAcknowledgments: classified.acknowledgments.inline.length > 0,
      hasModalAcknowledgments: classified.acknowledgments.modal.length > 0,
      hasInlineDisplays: classified.displays.inline.length > 0,
      hasModalDisplays: classified.displays.modal.length > 0,
      hasErrors: processedMessages.some(msg => msg.variant === 'error'),
      hasWarnings: processedMessages.some(msg => msg.variant === 'warning'),
      highestPriority: Math.max(...processedMessages.map(msg => msg.priority || 0), 0),
      requiresAction: processedMessages.some(msg => msg.needsAction),
      blockingMessages: processedMessages.filter(msg => msg.blocking).length
    };

    result.messages.summary = summary;
    result.messages.filtered = filteredMessages;

    // Step 6: Extract acknowledgments for easy access
    result.acknowledgments = processedMessages
      .filter(msg => msg.isAcknowledgment)
      .map(msg => ({
        ackKey: msg.ack_key || msg.parsed?.ackKey,
        templateId: msg.template_id || msg.parsed?.templateId,
        required: msg.required !== false,
        displayType: msg.display_type || msg.parsed?.displayType || 'modal',
        config: msg.acknowledgmentConfig,
        message: msg
      }));

    // Step 7: Content validation if requested (validate original context, not response)
    // Note: response.context doesn't exist in API responses, this was validating wrong thing
    if (validateContent && entryPoint && options.originalContext) {
      const contextValidation = validateContext(options.originalContext, entryPoint);
      if (!contextValidation.valid) {
        result.errors.push(...contextValidation.errors);
        result.warnings.push(...contextValidation.warnings);
      }
    }

  } catch (error) {
    console.error('Error in processRulesResponse:', error);
    result.errors.push(`Pipeline processing failed: ${error.message}`);
  }

  return result;
};

/**
 * Process rules response specifically for UI components
 * Returns data in the format expected by existing components
 * @param {Object} response - Raw rules engine response
 * @param {Object} options - Processing options
 * @returns {Object} UI-ready data structure
 */
export const processForUI = (response, options = {}) => {
  const processed = processRulesResponse(response, options);

  return {
    // For existing component compatibility
    messages: processed.messages.classified.displays.all,
    acknowledgments: {
      inline: processed.messages.classified.acknowledgments.inline,
      modal: processed.messages.classified.acknowledgments.modal
    },

    // Enhanced data
    processed: processed.messages.processed,
    summary: processed.messages.summary,
    errors: processed.errors,
    warnings: processed.warnings,

    // Metadata
    success: processed.success,
    blocked: processed.blocked,
    requiresAcknowledgment: processed.requires_acknowledgment
  };
};

/**
 * End-to-end rules execution and processing
 * @param {string} entryPoint - Entry point to execute
 * @param {Object} context - Context data (will be validated)
 * @param {Function} rulesEngineService - Rules engine service instance
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Complete processed response
 */
export const executeAndProcessRules = async (entryPoint, context, rulesEngineService, options = {}) => {
  try {
    // Validate context before sending
    const contextValidation = validateContext(context, entryPoint);
    if (!contextValidation.valid && options.strictValidation !== false) {
      throw new Error(`Context validation failed: ${contextValidation.errors.join(', ')}`);
    }

    // Execute rules
    console.log(`🔍 [executeAndProcessRules] Executing ${entryPoint} with context:`, context);
    const response = await rulesEngineService.executeRules(entryPoint, context);

    // Process response
    const processed = processRulesResponse(response, {
      ...options,
      entryPoint,
      originalContext: context // Pass the original context for validation if needed
    });

    console.log(`📋 [executeAndProcessRules] Processed response:`, processed);

    return processed;
  } catch (error) {
    console.error(`❌ [executeAndProcessRules] Error:`, error);

    // Log specific details for backend attribute errors
    if (error.message && error.message.includes("object has no attribute 'get'")) {
      console.error('🚨 Backend AttributeError - likely context structure issue');
      console.error('🔍 Context sent:', JSON.stringify(context, null, 2));
      console.error('🔍 Entry point:', entryPoint);
    }

    return {
      success: false,
      blocked: true,
      requires_acknowledgment: false,
      messages: {
        raw: [],
        processed: [],
        classified: {
          acknowledgments: { inline: [], modal: [], all: [] },
          displays: { inline: [], modal: [], all: [] }
        },
        summary: {
          totalMessages: 0,
          hasErrors: true
        }
      },
      acknowledgments: [],
      errors: [error.message],
      warnings: []
    };
  }
};

/**
 * Simplified helper for common use cases
 */
export const rulesEngineHelpers = {
  /**
   * Execute checkout terms rules and process for UI
   */
  executeCheckoutTerms: async (cartData, cartItems, rulesEngineService) => {
    console.log('🎯 [executeCheckoutTerms] Starting with cartData:', cartData);
    console.log('🎯 [executeCheckoutTerms] Cart ID:', cartData?.id);

    const context = buildRulesContext.checkoutTerms(cartData, cartItems);

    console.log('🎯 [executeCheckoutTerms] Built context.cart:', context.cart);
    console.log('🎯 [executeCheckoutTerms] Context keys:', Object.keys(context));

    return executeAndProcessRules('checkout_terms', context, rulesEngineService, {
      processAcknowledgments: true,
      sortByPriority: true,
      strictValidation: false // Allow execution even if validation fails, to see backend response
    });
  },

  /**
   * Execute home page rules and process for UI
   */
  executeHomePage: async (user, rulesEngineService) => {
    const context = buildRulesContext.homePage(user);
    return executeAndProcessRules('home_page_mount', context, rulesEngineService, {
      filterModal: true, // Home page typically only shows inline messages
      sortByPriority: true
    });
  },

  /**
   * Execute product card rules and process for UI
   */
  executeProductCard: async (product, rulesEngineService, options = {}) => {
    const context = buildRulesContext.productCard(product, options);
    return executeAndProcessRules('product_card_mount', context, rulesEngineService, {
      processAcknowledgments: false, // Product cards typically don't have acknowledgments
      sortByPriority: true
    });
  }
};