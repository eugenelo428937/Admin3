import { vi } from 'vitest';

// =============================================================================
// POLYFILLS - Must be FIRST to ensure availability for all imports
// =============================================================================
// TextEncoder/TextDecoder polyfill for MSW (Mock Service Worker)
// Required for @mswjs/interceptors which uses Buffer utilities
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// BroadcastChannel polyfill for MSW WebSocket support
class BroadcastChannelPolyfill {
  constructor(name) {
    this.name = name;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}
global.BroadcastChannel = BroadcastChannelPolyfill;

// =============================================================================
// SERVICE MOCKS - Must be BEFORE any imports to prevent axios import errors
// =============================================================================
// Vitest hoists vi.mock() calls to the top of the file automatically.
// These mocks break the import chain that causes:
// "SyntaxError: Cannot use import statement outside a module" from axios
// =============================================================================

// Mock react-router-dom to fix ESM module resolution issues
// We provide standalone mock implementations instead of using vi.importActual()
vi.mock('react-router-dom', () => {
  const React = require('react');

  return {
    __esModule: true,
    // Router components - simple div wrappers that pass through children
    BrowserRouter: ({ children }) => React.createElement('div', { 'data-testid': 'browser-router' }, children),
    MemoryRouter: ({ children, initialEntries }) => React.createElement('div', { 'data-testid': 'memory-router' }, children),
    HashRouter: ({ children }) => React.createElement('div', { 'data-testid': 'hash-router' }, children),
    Router: ({ children }) => React.createElement('div', { 'data-testid': 'router' }, children),
    RouterProvider: ({ router }) => React.createElement('div', { 'data-testid': 'router-provider' }),
    StaticRouter: ({ children }) => React.createElement('div', { 'data-testid': 'static-router' }, children),

    // Navigation components
    Link: React.forwardRef(({ to, children, ...props }, ref) =>
      React.createElement('a', { href: typeof to === 'string' ? to : (to?.pathname || '/'), ref, ...props }, children)
    ),
    NavLink: React.forwardRef(({ to, children, className, ...props }, ref) => {
      const href = typeof to === 'string' ? to : (to?.pathname || '/');
      const resolvedClassName = typeof className === 'function' ? className({ isActive: false, isPending: false }) : className;
      return React.createElement('a', { href, ref, className: resolvedClassName, ...props }, children);
    }),
    Navigate: ({ to }) => null,
    Outlet: () => null,

    // Route components
    Routes: ({ children }) => React.createElement(React.Fragment, null, children),
    Route: ({ element }) => element || null,

    // Navigation hooks — wrapped in vi.fn() so tests can override with mockReturnValue
    useNavigate: vi.fn(() => vi.fn()),
    useLocation: vi.fn(() => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' })),
    useParams: vi.fn(() => ({})),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
    useMatch: vi.fn(() => null),
    useMatches: vi.fn(() => []),
    useHref: vi.fn((to) => typeof to === 'string' ? to : (to?.pathname || '/')),
    useInRouterContext: vi.fn(() => true),
    useNavigationType: vi.fn(() => 'PUSH'),
    useOutlet: vi.fn(() => null),
    useOutletContext: vi.fn(() => undefined),
    useResolvedPath: vi.fn((to) => ({ pathname: typeof to === 'string' ? to : (to?.pathname || '/'), search: '', hash: '' })),
    useRoutes: vi.fn(() => null),
    useLinkClickHandler: vi.fn(() => vi.fn((e) => e.preventDefault())),

    // Data hooks (React Router v6.4+)
    useLoaderData: vi.fn(() => ({})),
    useActionData: vi.fn(() => undefined),
    useRouteError: vi.fn(() => null),
    useNavigation: vi.fn(() => ({ state: 'idle', location: undefined, formMethod: undefined, formAction: undefined, formEncType: undefined, formData: undefined })),
    useRevalidator: vi.fn(() => ({ state: 'idle', revalidate: vi.fn() })),
    useFetcher: vi.fn(() => ({ state: 'idle', data: undefined, load: vi.fn(), submit: vi.fn(), Form: 'form' })),
    useFetchers: vi.fn(() => []),
    useBeforeUnload: vi.fn(),
    useBlocker: vi.fn(() => ({ state: 'unblocked', proceed: undefined, reset: undefined })),
    useRouteLoaderData: vi.fn(() => undefined),

    // Form component
    Form: React.forwardRef(({ children, ...props }, ref) =>
      React.createElement('form', { ref, ...props }, children)
    ),

    // Utility functions
    createBrowserRouter: vi.fn(() => ({})),
    createHashRouter: vi.fn(() => ({})),
    createMemoryRouter: vi.fn(() => ({})),
    createRoutesFromElements: vi.fn(() => []),
    createRoutesFromChildren: vi.fn(() => []),
    createSearchParams: (init) => new URLSearchParams(init),
    generatePath: (path) => path,
    matchPath: () => null,
    matchRoutes: () => null,
    renderMatches: () => null,
    resolvePath: (to) => ({ pathname: typeof to === 'string' ? to : (to?.pathname || '/'), search: '', hash: '' }),
    createPath: ({ pathname = '/', search = '', hash = '' }) => pathname + search + hash,
    parsePath: (path) => ({ pathname: path, search: '', hash: '' }),

    // Scroll restoration
    ScrollRestoration: () => null,

    // Await component
    Await: ({ children, resolve }) => {
      if (typeof children === 'function') {
        return children(resolve);
      }
      return children;
    },

    // Navigation type enum
    NavigationType: { Pop: 'POP', Push: 'PUSH', Replace: 'REPLACE' },
  };
});

// =============================================================================
// GLOBAL THEME WRAPPER - Wrap all RTL renders with ThemeProvider
// =============================================================================
// Components use custom theme properties (productCards, semantic, navigation).
// Without ThemeProvider, MUI useTheme() returns bare default theme.
vi.mock('@testing-library/react', async (importOriginal) => {
  const actual = await importOriginal();
  const React = await import('react');
  const { ThemeProvider } = await import('@mui/material/styles');
  const { default: appTheme } = await import('./theme');

  return {
    ...actual,
    render: (ui, options = {}) => {
      const { wrapper: UserWrapper, ...restOptions } = options;
      const ThemeWrapper = ({ children }) => {
        const content = React.createElement(ThemeProvider, { theme: appTheme }, children);
        return UserWrapper ? React.createElement(UserWrapper, null, content) : content;
      };
      return actual.render(ui, { wrapper: ThemeWrapper, ...restOptions });
    },
  };
});

// Mock @sentry/react (not installed as dependency)
vi.mock('@sentry/react', () => ({
  __esModule: true,
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  withScope: vi.fn((cb) => cb({ setExtra: vi.fn(), setLevel: vi.fn() })),
  Severity: { Error: 'error', Warning: 'warning', Info: 'info' },
}));

vi.mock('./config.js', () => ({
  __esModule: true,
  default: {
    apiBaseUrl: 'http://localhost:8888',
    authUrl: 'http://localhost:8888/api/auth',
    userUrl: 'http://localhost:8888/api/users',
    examSessionUrl: 'http://localhost:8888/api/exam-sessions',
    productsUrl: 'http://localhost:8888/api/products',
    catalogUrl: 'http://localhost:8888/api/catalog',
    subjectUrl: 'http://localhost:8888/api/subjects',
    examSessionSubjectUrl: 'http://localhost:8888/api/exam-session-subjects',
    cartUrl: 'http://localhost:8888/api/cart',
    countryUrl: 'http://localhost:8888/api/countries',
    markingUrl: 'http://localhost:8888/api/marking',
    tutorialUrl: 'http://localhost:8888/api/tutorials',
    isDevelopment: false,
    isUAT: false,
    pageSize: 20,
    enableDebugLogs: false,
  },
}));

vi.mock('./services/httpService.js', () => ({
  __esModule: true,
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    create: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({ data: {} })),
      post: vi.fn(() => Promise.resolve({ data: {} })),
      put: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ data: {} })),
      patch: vi.fn(() => Promise.resolve({ data: {} })),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    })),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

vi.mock('./services/cartService.js', () => ({
  __esModule: true,
  default: {
    getCart: vi.fn(() => Promise.resolve({
      data: {
        items: [],
        vat_calculations: {
          region_info: { region: 'UK' }
        }
      }
    })),
    fetchCart: vi.fn(() => Promise.resolve({
      data: {
        items: [],
        vat_calculations: {
          region_info: { region: 'UK' }
        }
      }
    })),
    addToCart: vi.fn(() => Promise.resolve({ data: { success: true } })),
    updateItem: vi.fn(() => Promise.resolve({ data: { success: true } })),
    updateCartItem: vi.fn(() => Promise.resolve({ data: { success: true } })),
    removeFromCart: vi.fn(() => Promise.resolve({ data: { success: true } })),
    removeItem: vi.fn(() => Promise.resolve({ data: { success: true } })),
    clearCart: vi.fn(() => Promise.resolve({ data: { success: true } })),
    checkout: vi.fn(() => Promise.resolve({ data: { success: true, order_id: 12345 } })),
    fetchOrders: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

vi.mock('./services/authService.js', () => ({
  __esModule: true,
  default: {
    login: vi.fn(() => Promise.resolve({ data: { token: 'mock-token' } })),
    logout: vi.fn(() => Promise.resolve({ data: {} })),
    refreshToken: vi.fn(() => Promise.resolve({ data: { token: 'mock-token' } })),
    register: vi.fn(() => Promise.resolve({ data: {} })),
    getCurrentUser: vi.fn(() => Promise.resolve({ data: {} })),
    isAuthenticated: vi.fn(() => false),
  },
}));

// =============================================================================
// CONTEXT MOCKS - Mock React contexts used across many components
// =============================================================================

// Mock TutorialChoiceContext - used by CartPanel, TutorialSelectionDialog, etc.
vi.mock('./contexts/TutorialChoiceContext.js', () => {
  const React = require('react');
  return {
    __esModule: true,
    useTutorialChoice: () => ({
      // State
      tutorialChoices: {},
      showChoicePanel: false,
      activeSubject: null,
      editDialogOpen: null,
      // Basic choice management
      getTutorialChoice: vi.fn(),
      addTutorialChoice: vi.fn(),
      removeTutorialChoice: vi.fn(),
      removeSubjectChoices: vi.fn(),
      removeAllChoices: vi.fn(),
      clearTutorialChoices: vi.fn(),
      updateChoiceLevel: vi.fn(),
      // Getters
      getSubjectChoices: vi.fn(() => ({})),
      getOrderedChoices: vi.fn(() => []),
      getAllChoices: vi.fn(() => ({})),
      isChoiceLevelAvailable: vi.fn(() => true),
      getNextAvailableChoiceLevel: vi.fn(() => '1st'),
      getTotalSubjectsWithChoices: vi.fn(() => 0),
      getTotalChoices: vi.fn(() => 0),
      isEventSelected: vi.fn(() => false),
      getEventChoiceLevel: vi.fn(() => null),
      // Panel management
      showChoicePanelForSubject: vi.fn(),
      hideChoicePanel: vi.fn(),
      // Dialog management
      openEditDialog: vi.fn(),
      closeEditDialog: vi.fn(),
      // Pricing
      getSubjectPrice: vi.fn(() => 0),
      getTotalPrice: vi.fn(() => 0),
      // Draft choice methods (Story 3.8)
      getDraftChoices: vi.fn(() => []),
      hasDraftChoices: vi.fn(() => false),
      markChoicesAsAdded: vi.fn(),
      restoreChoicesToDraft: vi.fn(),
      hasCartedChoices: vi.fn(() => false),
      getCartedChoices: vi.fn(() => []),
      // Validation methods
      validateChoices: vi.fn(() => ({ valid: true, errors: [] })),
      getChoiceValidationStatus: vi.fn(() => 'valid'),
    }),
    TutorialChoiceProvider: ({ children }) => children,
    TutorialChoiceContext: React.createContext({}),
  };
});

// Mock CartContext - used by navigation, checkout, product cards, etc.
vi.mock('./contexts/CartContext.js', () => {
  const React = require('react');
  return {
    __esModule: true,
    useCart: () => ({
      cartItems: [],
      cartData: { items: [], vat_calculations: { region_info: { region: 'UK' } } },
      addToCart: vi.fn(() => Promise.resolve()),
      updateCartItem: vi.fn(() => Promise.resolve()),
      removeFromCart: vi.fn(() => Promise.resolve()),
      clearCart: vi.fn(() => Promise.resolve()),
      refreshCart: vi.fn(() => Promise.resolve()),
      cartCount: 0,
      loading: false,
    }),
    CartProvider: ({ children }) => children,
    CartContext: React.createContext({}),
  };
});

// =============================================================================
// IMPORTS - After service mocks
// =============================================================================

// jest-dom adds custom matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill Performance API for performance tracking tests
// JSDOM doesn't fully implement performance API - we need to polyfill missing methods
const performanceEntries = [];

if (typeof performance !== 'undefined') {
  // Polyfill performance.mark if missing
  if (!performance.mark) {
    performance.mark = function(name) {
      performanceEntries.push({ entryType: 'mark', name, startTime: Date.now() });
    };
  }

  // Polyfill performance.measure if missing
  if (!performance.measure) {
    performance.measure = function(name, startMark, endMark) {
      const start = performanceEntries.find(e => e.name === startMark);
      const end = performanceEntries.find(e => e.name === endMark);
      if (start && end) {
        performanceEntries.push({
          entryType: 'measure',
          name,
          startTime: start.startTime,
          duration: end.startTime - start.startTime
        });
      }
    };
  }

  // Polyfill performance.getEntriesByName if missing
  if (!performance.getEntriesByName) {
    performance.getEntriesByName = function(name) {
      return performanceEntries.filter(e => e.name === name);
    };
  }

  // Polyfill performance.clearMarks if missing
  if (!performance.clearMarks) {
    performance.clearMarks = function(name) {
      if (name) {
        const index = performanceEntries.findIndex(e => e.entryType === 'mark' && e.name === name);
        if (index !== -1) performanceEntries.splice(index, 1);
      } else {
        // Clear all marks
        for (let i = performanceEntries.length - 1; i >= 0; i--) {
          if (performanceEntries[i].entryType === 'mark') {
            performanceEntries.splice(i, 1);
          }
        }
      }
    };
  }

  // Polyfill performance.clearMeasures if missing
  if (!performance.clearMeasures) {
    performance.clearMeasures = function(name) {
      if (name) {
        const index = performanceEntries.findIndex(e => e.entryType === 'measure' && e.name === name);
        if (index !== -1) performanceEntries.splice(index, 1);
      } else {
        // Clear all measures
        for (let i = performanceEntries.length - 1; i >= 0; i--) {
          if (performanceEntries[i].entryType === 'measure') {
            performanceEntries.splice(i, 1);
          }
        }
      }
    };
  }

  // Polyfill performance.getEntries if missing
  if (!performance.getEntries) {
    performance.getEntries = function() {
      return [...performanceEntries];
    };
  }

  // Polyfill performance.getEntriesByType if missing
  if (!performance.getEntriesByType) {
    performance.getEntriesByType = function(type) {
      return performanceEntries.filter(e => e.entryType === type);
    };
  }
}

// NOTE: MSW (Mock Service Worker) is available in test-utils/mockApi.js
// Individual tests can import and use it as needed with manual setup

// Mock scrollIntoView (not implemented in JSDOM)
Element.prototype.scrollIntoView = vi.fn();

