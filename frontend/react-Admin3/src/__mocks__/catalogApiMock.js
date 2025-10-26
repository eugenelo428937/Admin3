/**
 * Mock catalogApi for tests (Story 1.16)
 *
 * Avoids ESM import issues with @standard-schema in Jest environment
 */

// Mock RTK Query API slice
export const catalogApi = {
  reducerPath: 'catalogApi',
  reducer: (state = {}) => state,
  middleware: () => next => action => next(action),
  endpoints: {},
  injectEndpoints: () => catalogApi,
  useLazyUnifiedSearchQuery: () => [
    jest.fn(() => Promise.resolve({ unwrap: () => Promise.resolve({}) })),
    {
      data: null,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    }
  ],
};
