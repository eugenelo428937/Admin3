// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for MSW v2 (Node.js environment)
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill BroadcastChannel for MSW v2
global.BroadcastChannel = class BroadcastChannel {
  constructor(name) {
    this.name = name;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

// Polyfill Performance API for performance tracking tests (Story 1.16)
if (typeof performance !== 'undefined' && !performance.mark) {
  const performanceEntries = [];

  performance.mark = function(name) {
    performanceEntries.push({ entryType: 'mark', name, startTime: Date.now() });
  };

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

  performance.getEntriesByName = function(name) {
    return performanceEntries.filter(e => e.name === name);
  };

  performance.clearMarks = function(name) {
    if (name) {
      const index = performanceEntries.findIndex(e => e.name === name);
      if (index !== -1) performanceEntries.splice(index, 1);
    } else {
      performanceEntries.length = 0;
    }
  };
}

// MSW (Mock Service Worker) setup for API mocking in tests (Story 1.16)
// Note: This will be configured once mockHandlers.js is created in T025
// For now, we conditionally import to avoid errors during T003-T005
let server;
try {
  const { server: mswServer } = require('./test-utils/mockHandlers');
  server = mswServer;

  // Establish API mocking before all tests
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

  // Reset any request handlers that are declared in individual tests
  afterEach(() => server.resetHandlers());

  // Clean up after all tests are done
  afterAll(() => server.close());
} catch (error) {
  // mockHandlers.js doesn't exist yet - will be created in T025
  // Tests can still run without MSW for now
  console.log('MSW handlers not yet configured - will be added in T025');
}
