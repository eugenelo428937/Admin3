import { vi } from 'vitest';
/**
 * Mock mockHandlers for tests (Story 1.16)
 *
 * Avoids ESM import issues with MSW v2 in Jest environment
 */

// Mock server instance
export const server = {
  listen: vi.fn(),
  close: vi.fn(),
  resetHandlers: vi.fn(),
  use: vi.fn(),
};

// Mock handlers array
export const handlers = [];

// Mock configureMockHandlers
export const configureMockHandlers = vi.fn((options = {}) => {
  // No-op mock - MSW handlers not actually registered in test environment
  console.log('Mock configureMockHandlers called with:', options);
});

// Mock setupMockServer
export const setupMockServer = vi.fn(() => {
  // No-op mock - MSW server lifecycle handled by setupTests.js
  console.log('Mock setupMockServer called');
});

// Mock resetMockHandlers
export const resetMockHandlers = vi.fn();
