/**
 * Redux Store Configuration with Redux Toolkit
 * 
 * Centralized store for the product filtering system with:
 * - RTK Query API integration
 * - Cookie persistence middleware
 * - DevTools integration for development
 */

import { configureStore } from '@reduxjs/toolkit';
import { catalogApi } from './api/catalogApi';
import filtersReducer from './slices/filtersSlice';
import cookiePersistenceMiddleware from '../utils/cookiePersistenceMiddleware';
import { urlSyncMiddleware } from './middleware/urlSyncMiddleware';

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
      .concat(catalogApi.middleware)
      .concat(cookiePersistenceMiddleware),
      
  // Enable Redux DevTools Extension in development
  devTools: process.env.NODE_ENV !== 'production',
});

// Export types for TypeScript (optional - can be used if converting to TS later)
export const { dispatch, getState } = store;

// Required for RTK Query
export const { useUnifiedSearchQuery } = catalogApi;

export default store;