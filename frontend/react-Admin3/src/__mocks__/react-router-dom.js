/**
 * Mock react-router-dom for Jest tests (Story 1.16)
 *
 * React Router v7 is ESM-only which causes issues with Jest.
 * This mock provides MemoryRouter and other router utilities for testing.
 */

import React from 'react';

// Mock MemoryRouter
export const MemoryRouter = ({ children, initialEntries = ['/'], initialIndex = 0 }) => {
  // Simple router mock that just renders children
  return React.createElement('div', { 'data-testid': 'memory-router' }, children);
};

// Mock useNavigate
export const useNavigate = () => {
  return jest.fn();
};

// Mock useLocation
export const useLocation = () => {
  return {
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default'
  };
};

// Mock useParams
export const useParams = () => {
  return {};
};

// Mock Link
export const Link = ({ children, to, ...props }) => {
  return React.createElement('a', { href: to, ...props }, children);
};

// Mock Navigate
export const Navigate = ({ to }) => {
  return null;
};

// Export all mocks
export default {
  MemoryRouter,
  useNavigate,
  useLocation,
  useParams,
  Link,
  Navigate
};
