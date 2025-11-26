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
// Jest hoists jest.mock() calls to the top of the file automatically.
// These mocks break the import chain that causes:
// "SyntaxError: Cannot use import statement outside a module" from axios
// =============================================================================

// Mock react-router-dom to fix ESM module resolution issues with Jest
// react-router-dom v7 uses ESM exports that Jest has trouble resolving
// We provide standalone mock implementations instead of using jest.requireActual()
jest.mock('react-router-dom', () => {
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

    // Navigation hooks
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    useMatch: () => null,
    useMatches: () => [],
    useHref: (to) => typeof to === 'string' ? to : (to?.pathname || '/'),
    useInRouterContext: () => true,
    useNavigationType: () => 'PUSH',
    useOutlet: () => null,
    useOutletContext: () => undefined,
    useResolvedPath: (to) => ({ pathname: typeof to === 'string' ? to : (to?.pathname || '/'), search: '', hash: '' }),
    useRoutes: () => null,
    useLinkClickHandler: () => jest.fn((e) => e.preventDefault()),

    // Data hooks (React Router v6.4+)
    useLoaderData: () => ({}),
    useActionData: () => undefined,
    useRouteError: () => null,
    useNavigation: () => ({ state: 'idle', location: undefined, formMethod: undefined, formAction: undefined, formEncType: undefined, formData: undefined }),
    useRevalidator: () => ({ state: 'idle', revalidate: jest.fn() }),
    useFetcher: () => ({ state: 'idle', data: undefined, load: jest.fn(), submit: jest.fn(), Form: 'form' }),
    useFetchers: () => [],
    useBeforeUnload: jest.fn(),
    useBlocker: () => ({ state: 'unblocked', proceed: undefined, reset: undefined }),
    useRouteLoaderData: () => undefined,

    // Form component
    Form: React.forwardRef(({ children, ...props }, ref) =>
      React.createElement('form', { ref, ...props }, children)
    ),

    // Utility functions
    createBrowserRouter: jest.fn(() => ({})),
    createHashRouter: jest.fn(() => ({})),
    createMemoryRouter: jest.fn(() => ({})),
    createRoutesFromElements: jest.fn(() => []),
    createRoutesFromChildren: jest.fn(() => []),
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

jest.mock('./services/httpService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    create: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ data: {} })),
      post: jest.fn(() => Promise.resolve({ data: {} })),
      put: jest.fn(() => Promise.resolve({ data: {} })),
      delete: jest.fn(() => Promise.resolve({ data: {} })),
      patch: jest.fn(() => Promise.resolve({ data: {} })),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    })),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

jest.mock('./services/cartService', () => ({
  __esModule: true,
  default: {
    getCart: jest.fn(() => Promise.resolve({
      data: {
        items: [],
        vat_calculations: {
          region_info: { region: 'UK' }
        }
      }
    })),
    fetchCart: jest.fn(() => Promise.resolve({
      data: {
        items: [],
        vat_calculations: {
          region_info: { region: 'UK' }
        }
      }
    })),
    addToCart: jest.fn(() => Promise.resolve({ data: { success: true } })),
    updateItem: jest.fn(() => Promise.resolve({ data: { success: true } })),
    updateCartItem: jest.fn(() => Promise.resolve({ data: { success: true } })),
    removeFromCart: jest.fn(() => Promise.resolve({ data: { success: true } })),
    removeItem: jest.fn(() => Promise.resolve({ data: { success: true } })),
    clearCart: jest.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

jest.mock('./services/authService', () => ({
  __esModule: true,
  default: {
    login: jest.fn(() => Promise.resolve({ data: { token: 'mock-token' } })),
    logout: jest.fn(() => Promise.resolve({ data: {} })),
    refreshToken: jest.fn(() => Promise.resolve({ data: { token: 'mock-token' } })),
    register: jest.fn(() => Promise.resolve({ data: {} })),
    getCurrentUser: jest.fn(() => Promise.resolve({ data: {} })),
    isAuthenticated: jest.fn(() => false),
  },
}));

// =============================================================================
// CONTEXT MOCKS - Mock React contexts used across many components
// =============================================================================

// Mock TutorialChoiceContext - used by CartPanel, TutorialSelectionDialog, etc.
jest.mock('./contexts/TutorialChoiceContext', () => {
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
      getTutorialChoice: jest.fn(),
      addTutorialChoice: jest.fn(),
      removeTutorialChoice: jest.fn(),
      removeSubjectChoices: jest.fn(),
      removeAllChoices: jest.fn(),
      clearTutorialChoices: jest.fn(),
      updateChoiceLevel: jest.fn(),
      // Getters
      getSubjectChoices: jest.fn(() => ({})),
      getOrderedChoices: jest.fn(() => []),
      getAllChoices: jest.fn(() => ({})),
      isChoiceLevelAvailable: jest.fn(() => true),
      getNextAvailableChoiceLevel: jest.fn(() => '1st'),
      getTotalSubjectsWithChoices: jest.fn(() => 0),
      getTotalChoices: jest.fn(() => 0),
      isEventSelected: jest.fn(() => false),
      getEventChoiceLevel: jest.fn(() => null),
      // Panel management
      showChoicePanelForSubject: jest.fn(),
      hideChoicePanel: jest.fn(),
      // Dialog management
      openEditDialog: jest.fn(),
      closeEditDialog: jest.fn(),
      // Pricing
      getSubjectPrice: jest.fn(() => 0),
      getTotalPrice: jest.fn(() => 0),
      // Draft choice methods (Story 3.8)
      getDraftChoices: jest.fn(() => []),
      hasDraftChoices: jest.fn(() => false),
      markChoicesAsAdded: jest.fn(),
      restoreChoicesToDraft: jest.fn(),
      hasCartedChoices: jest.fn(() => false),
      getCartedChoices: jest.fn(() => []),
      // Validation methods
      validateChoices: jest.fn(() => ({ valid: true, errors: [] })),
      getChoiceValidationStatus: jest.fn(() => 'valid'),
    }),
    TutorialChoiceProvider: ({ children }) => children,
    TutorialChoiceContext: React.createContext({}),
  };
});

// Mock CartContext - used by navigation, checkout, product cards, etc.
jest.mock('./contexts/CartContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    useCart: () => ({
      cartItems: [],
      cartData: { items: [], vat_calculations: { region_info: { region: 'UK' } } },
      addToCart: jest.fn(() => Promise.resolve()),
      updateCartItem: jest.fn(() => Promise.resolve()),
      removeFromCart: jest.fn(() => Promise.resolve()),
      clearCart: jest.fn(() => Promise.resolve()),
      refreshCart: jest.fn(() => Promise.resolve()),
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

// jest-dom adds custom jest matchers for asserting on DOM nodes.
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
Element.prototype.scrollIntoView = jest.fn();
