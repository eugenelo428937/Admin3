/**
 * Mock mockHandlers for tests (Story 1.16)
 *
 * Avoids ESM import issues with MSW v2 in Jest environment
 */

// Mock server instance
export const server = {
  listen: jest.fn(),
  close: jest.fn(),
  resetHandlers: jest.fn(),
  use: jest.fn(),
};

// Mock handlers array
export const handlers = [];

// Mock configureMockHandlers
export const configureMockHandlers = jest.fn((options = {}) => {
  // No-op mock - MSW handlers not actually registered in test environment
  console.log('Mock configureMockHandlers called with:', options);
});

// Mock setupMockServer
export const setupMockServer = jest.fn(() => {
  // No-op mock - MSW server lifecycle handled by setupTests.js
  console.log('Mock setupMockServer called');
});

// Mock resetMockHandlers
export const resetMockHandlers = jest.fn();
