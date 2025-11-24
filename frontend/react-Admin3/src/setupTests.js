// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill Performance API for performance tracking tests
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

// NOTE: MSW (Mock Service Worker) is available in test-utils/mockApi.js
// Individual tests can import and use it as needed with manual setup

// Mock scrollIntoView (not implemented in JSDOM)
Element.prototype.scrollIntoView = jest.fn();
