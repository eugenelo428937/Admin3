/**
 * Redux Store Configuration with Redux Toolkit
 *
 * Centralized store for the product filtering system with:
 * - RTK Query API integration
 * - URL sync middleware (Story 1.1)
 * - Performance monitoring middleware (Story 1.15)
 * - DevTools integration for development
 */

import { configureStore } from '@reduxjs/toolkit';
import { catalogApi } from './api/catalogApi';
import filtersReducer from './slices/filtersSlice';
import { urlSyncMiddleware, setupUrlToReduxSync } from './middleware/urlSyncMiddleware';
import performanceMonitoringMiddleware from './middleware/performanceMonitoring';

export const store = configureStore({
  reducer: {
    // Add the generated reducer as a specific top-level slice
    [catalogApi.reducerPath]: catalogApi.reducer,
    filters: filtersReducer,
  },
  
  // Adding the API middleware enables caching, invalidation, polling,
  // and other useful features of RTK Query
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore RTK Query action types that contain non-serializable values
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    })
      .prepend(urlSyncMiddleware.middleware) // Story 1.1: Redux → URL sync
      .prepend(performanceMonitoringMiddleware) // Story 1.15: Performance tracking (development-only)
      .concat(catalogApi.middleware),

  // Enable Redux DevTools Extension in development (Story 1.2 - AC13)
  // Redux Toolkit's configureStore automatically connects to Redux DevTools Extension
  // No need for window.__REDUX_DEVTOOLS_EXTENSION__ - it's handled internally!
  // See: https://redux-toolkit.js.org/api/configureStore#devtools
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup URL → Redux synchronization (Story 1.16)
// Listen for popstate events and update Redux when URL changes
setupUrlToReduxSync(store.dispatch);

// Export types for TypeScript (optional - can be used if converting to TS later)
export const { dispatch, getState } = store;

// Required for RTK Query
export const { useUnifiedSearchQuery } = catalogApi;

export default store;