/**
 * Shared Pact matchers and response shape helpers.
 *
 * These matchers define the expected "shape" of API responses without
 * requiring exact values. Pact uses these to validate that the provider
 * returns structurally compatible responses.
 */
const { MatchersV3 } = require('@pact-foundation/pact');

const {
  like,
  eachLike,
  string,
  integer,
  decimal,
  boolean,
  regex,
  datetime,
} = MatchersV3;

// --- Common Headers ---

const JSON_CONTENT_TYPE = { 'Content-Type': 'application/json' };
const JSON_REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};
const JSON_RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
};

// --- Auth Response Shapes ---

const authTokenResponse = {
  status: string('success'),
  token: string('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test'),
  refresh: string('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.refresh'),
  user: like({
    id: integer(1),
    email: string('test@example.com'),
    first_name: string('Test'),
    last_name: string('User'),
  }),
  message: string('Login successful'),
};

const authErrorResponse = {
  status: string('error'),
  message: string('Invalid credentials'),
};

const authStatusResponse = {
  status: string('success'),
  message: string('Operation completed'),
};

// --- Cart Response Shapes ---

const cartItemShape = like({
  id: integer(1),
  product_code: string('CM2/PCSM01P/2025-04'),
  product_name: string('CM2 Study Material'),
  quantity: integer(1),
  price_type: string('standard'),
  actual_price: decimal(59.99),
  metadata: like({
    variationId: integer(1),
    variationName: string('Printed'),
    variationType: string('Material'),
    is_digital: boolean(false),
  }),
});

const cartResponse = like({
  id: integer(1),
  items: eachLike({
    id: integer(1),
    product_code: string('CM2/PCSM01P/2025-04'),
    product_name: string('CM2 Study Material'),
    quantity: integer(1),
    actual_price: decimal(59.99),
  }),
});

// --- Product/Store Response Shapes ---

const paginatedResponse = (itemShape) => ({
  results: eachLike(itemShape),
  count: integer(1),
  page: integer(1),
  has_next: boolean(false),
  has_previous: boolean(false),
});

const storeProductShape = {
  id: integer(1),
  product_code: string('CM2/PCSM01P/2025-04'),
  name: string('CM2 Study Material'),
  exam_session_subject: like({
    id: integer(1),
    subject_code: string('CM2'),
  }),
  product_product_variation: like({
    id: integer(1),
    variation_name: string('Printed'),
  }),
  is_active: boolean(true),
};

const navigationDataResponse = {
  subjects: eachLike({
    code: string('CM2'),
    name: string('CM2 - Models'),
  }),
  navbarProductGroups: eachLike({
    id: integer(1),
    name: string('Study Materials'),
  }),
};

// --- Search Response Shapes ---

const searchResponse = {
  suggested_filters: like({
    subjects: eachLike(string('CM2')),
    product_groups: eachLike(string('Study Materials')),
  }),
  suggested_products: eachLike({
    id: integer(1),
    name: string('CM2 Study Material'),
  }),
  total_count: integer(1),
};

const advancedSearchResponse = {
  results: eachLike({
    id: integer(1),
    name: string('CM2 Study Material'),
  }),
  count: integer(1),
  has_next: boolean(false),
  has_previous: boolean(false),
};

// --- User Profile Shapes ---

const userProfileResponse = {
  status: string('success'),
  data: like({
    user: like({
      id: integer(1),
      email: string('test@example.com'),
      first_name: string('Test'),
      last_name: string('User'),
    }),
    profile: like({
      title: string('Mr'),
      date_of_birth: string('1990-01-01'),
    }),
  }),
};

// --- Utility ---

/**
 * Create an axios-compatible HTTP client pointed at the Pact mock server.
 * Used inside executeTest() callbacks.
 *
 * @param {string} mockServerUrl - The mock server base URL from Pact
 * @returns {object} Axios-like config override
 */
function mockServerConfig(mockServerUrl) {
  return {
    baseURL: mockServerUrl,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    // Skip auth interceptor in Pact tests
    transformRequest: [(data) => (data ? JSON.stringify(data) : data)],
  };
}

module.exports = {
  // Matchers (re-exported for convenience)
  like,
  eachLike,
  string,
  integer,
  decimal,
  boolean,
  regex,
  datetime,

  // Headers
  JSON_CONTENT_TYPE,
  JSON_REQUEST_HEADERS,
  JSON_RESPONSE_HEADERS,

  // Auth shapes
  authTokenResponse,
  authErrorResponse,
  authStatusResponse,

  // Cart shapes
  cartItemShape,
  cartResponse,

  // Product shapes
  paginatedResponse,
  storeProductShape,
  navigationDataResponse,

  // Search shapes
  searchResponse,
  advancedSearchResponse,

  // User shapes
  userProfileResponse,

  // Utilities
  mockServerConfig,
};
