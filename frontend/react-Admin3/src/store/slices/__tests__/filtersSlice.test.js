/**
 * Tests for filtersSlice - Navbar Fields Extension (Story 1.2)
 *
 * These tests verify the new navbar filter fields and actions that will be added:
 * - tutorial_format (single selection: 'online' | 'in_person' | 'hybrid' | null)
 * - distance_learning (boolean)
 * - tutorial (boolean)
 *
 * TDD: These tests MUST FAIL before implementation.
 */

import { configureStore } from '@reduxjs/toolkit';
import filtersReducer, {
  setTutorialFormat,
  setDistanceLearning,
  setTutorial,
  clearAllFilters,
} from '../filtersSlice';

// Helper to create a test store
const createTestStore = (preloadedState) => {
  return configureStore({
    reducer: {
      filters: filtersReducer,
    },
    preloadedState,
  });
};

describe('filtersSlice - Navbar Fields (Story 1.2)', () => {
  let store;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('tutorial_format field', () => {
    it('should have tutorial_format in initial state set to null', () => {
      const state = store.getState().filters;
      expect(state).toHaveProperty('tutorial_format');
      expect(state.tutorial_format).toBeNull();
    });

    it('should update tutorial_format when setTutorialFormat action is dispatched', () => {
      store.dispatch(setTutorialFormat('online'));

      const state = store.getState().filters;
      expect(state.tutorial_format).toBe('online');
    });

    it('should accept valid tutorial format values', () => {
      const validFormats = ['online', 'in_person', 'hybrid', null];

      validFormats.forEach((format) => {
        store.dispatch(setTutorialFormat(format));
        const state = store.getState().filters;
        expect(state.tutorial_format).toBe(format);
      });
    });

    it('should update lastUpdated timestamp when tutorial_format changes', () => {
      const beforeTimestamp = Date.now();
      store.dispatch(setTutorialFormat('online'));
      const afterTimestamp = store.getState().filters.lastUpdated;

      expect(afterTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
    });
  });

  describe('distance_learning field', () => {
    it('should have distance_learning in initial state set to false', () => {
      const state = store.getState().filters;
      expect(state).toHaveProperty('distance_learning');
      expect(state.distance_learning).toBe(false);
    });

    it('should update distance_learning when setDistanceLearning action is dispatched', () => {
      store.dispatch(setDistanceLearning(true));

      const state = store.getState().filters;
      expect(state.distance_learning).toBe(true);
    });

    it('should toggle distance_learning between true and false', () => {
      // Set to true
      store.dispatch(setDistanceLearning(true));
      expect(store.getState().filters.distance_learning).toBe(true);

      // Set to false
      store.dispatch(setDistanceLearning(false));
      expect(store.getState().filters.distance_learning).toBe(false);

      // Set to true again
      store.dispatch(setDistanceLearning(true));
      expect(store.getState().filters.distance_learning).toBe(true);
    });

    it('should update lastUpdated timestamp when distance_learning changes', () => {
      const beforeTimestamp = Date.now();
      store.dispatch(setDistanceLearning(true));
      const afterTimestamp = store.getState().filters.lastUpdated;

      expect(afterTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
    });
  });

  describe('tutorial field', () => {
    it('should have tutorial in initial state set to false', () => {
      const state = store.getState().filters;
      expect(state).toHaveProperty('tutorial');
      expect(state.tutorial).toBe(false);
    });

    it('should update tutorial when setTutorial action is dispatched', () => {
      store.dispatch(setTutorial(true));

      const state = store.getState().filters;
      expect(state.tutorial).toBe(true);
    });

    it('should toggle tutorial between true and false', () => {
      // Set to true
      store.dispatch(setTutorial(true));
      expect(store.getState().filters.tutorial).toBe(true);

      // Set to false
      store.dispatch(setTutorial(false));
      expect(store.getState().filters.tutorial).toBe(false);

      // Set to true again
      store.dispatch(setTutorial(true));
      expect(store.getState().filters.tutorial).toBe(true);
    });

    it('should update lastUpdated timestamp when tutorial changes', () => {
      const beforeTimestamp = Date.now();
      store.dispatch(setTutorial(true));
      const afterTimestamp = store.getState().filters.lastUpdated;

      expect(afterTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
    });
  });

  describe('clearAllFilters action', () => {
    it('should reset tutorial_format to null', () => {
      // Set some value
      store.dispatch(setTutorialFormat('online'));
      expect(store.getState().filters.tutorial_format).toBe('online');

      // Clear all filters
      store.dispatch(clearAllFilters());
      expect(store.getState().filters.tutorial_format).toBeNull();
    });

    it('should reset distance_learning to false', () => {
      // Set to true
      store.dispatch(setDistanceLearning(true));
      expect(store.getState().filters.distance_learning).toBe(true);

      // Clear all filters
      store.dispatch(clearAllFilters());
      expect(store.getState().filters.distance_learning).toBe(false);
    });

    it('should reset tutorial to false', () => {
      // Set to true
      store.dispatch(setTutorial(true));
      expect(store.getState().filters.tutorial).toBe(true);

      // Clear all filters
      store.dispatch(clearAllFilters());
      expect(store.getState().filters.tutorial).toBe(false);
    });

    it('should reset all navbar fields together with other filters', () => {
      // Set multiple filters including navbar fields
      store.dispatch(setTutorialFormat('hybrid'));
      store.dispatch(setDistanceLearning(true));
      store.dispatch(setTutorial(true));

      // Verify they are set
      let state = store.getState().filters;
      expect(state.tutorial_format).toBe('hybrid');
      expect(state.distance_learning).toBe(true);
      expect(state.tutorial).toBe(true);

      // Clear all filters
      store.dispatch(clearAllFilters());

      // Verify all navbar fields are reset
      state = store.getState().filters;
      expect(state.tutorial_format).toBeNull();
      expect(state.distance_learning).toBe(false);
      expect(state.tutorial).toBe(false);
    });
  });

  describe('Redux state contract validation', () => {
    it('should match the FilterState schema structure', () => {
      const state = store.getState().filters;

      // Verify all navbar fields exist
      expect(state).toHaveProperty('tutorial_format');
      expect(state).toHaveProperty('distance_learning');
      expect(state).toHaveProperty('tutorial');

      // Verify types
      expect(state.tutorial_format === null || typeof state.tutorial_format === 'string').toBe(true);
      expect(typeof state.distance_learning).toBe('boolean');
      expect(typeof state.tutorial).toBe('boolean');
    });
  });
});
