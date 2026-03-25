// Polyfills for MSW v2 in Node/Jest environment
// This file runs BEFORE setupTests.js to ensure polyfills are available
// Using CommonJS format for Jest compatibility

const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

global.BroadcastChannel = class BroadcastChannel {
  constructor(name) {
    this.name = name;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

// ResizeObserver polyfill for Radix UI components (not available in jsdom)
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};
