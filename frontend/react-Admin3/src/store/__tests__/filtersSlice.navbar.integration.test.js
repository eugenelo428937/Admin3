/**
 * Integration tests for navbar filters Redux integration
 * Tests T030: Verify Redux state updates propagate correctly
 */

import { configureStore } from '@reduxjs/toolkit';
import filtersReducer, {
    setTutorialFormat,
    setDistanceLearning,
    setTutorial,
    clearAllFilters,
    selectActiveFilterCount
} from '../slices/filtersSlice';

describe('Navbar Filters Redux Integration (T030)', () => {
    let store;

    beforeEach(() => {
        store = configureStore({
            reducer: {
                filters: filtersReducer
            }
        });
    });

    describe('State updates propagate correctly', () => {
        test('setTutorialFormat updates state and selector reflects change', () => {
            // Initial state
            expect(store.getState().filters.tutorial_format).toBeNull();
            expect(selectActiveFilterCount(store.getState())).toBe(0);

            // Dispatch action
            store.dispatch(setTutorialFormat('online'));

            // Verify state updated
            expect(store.getState().filters.tutorial_format).toBe('online');
            expect(selectActiveFilterCount(store.getState())).toBe(1);

            // Change to different format
            store.dispatch(setTutorialFormat('hybrid'));
            expect(store.getState().filters.tutorial_format).toBe('hybrid');
            expect(selectActiveFilterCount(store.getState())).toBe(1);

            // Clear filter
            store.dispatch(setTutorialFormat(null));
            expect(store.getState().filters.tutorial_format).toBeNull();
            expect(selectActiveFilterCount(store.getState())).toBe(0);
        });

        test('setDistanceLearning updates state and selector reflects change', () => {
            // Initial state
            expect(store.getState().filters.distance_learning).toBe(false);
            expect(selectActiveFilterCount(store.getState())).toBe(0);

            // Enable distance learning
            store.dispatch(setDistanceLearning(true));

            // Verify state updated
            expect(store.getState().filters.distance_learning).toBe(true);
            expect(selectActiveFilterCount(store.getState())).toBe(1);

            // Disable distance learning
            store.dispatch(setDistanceLearning(false));
            expect(store.getState().filters.distance_learning).toBe(false);
            expect(selectActiveFilterCount(store.getState())).toBe(0);
        });

        test('setTutorial updates state and selector reflects change', () => {
            // Initial state
            expect(store.getState().filters.tutorial).toBe(false);
            expect(selectActiveFilterCount(store.getState())).toBe(0);

            // Enable tutorial filter
            store.dispatch(setTutorial(true));

            // Verify state updated
            expect(store.getState().filters.tutorial).toBe(true);
            expect(selectActiveFilterCount(store.getState())).toBe(1);

            // Disable tutorial filter
            store.dispatch(setTutorial(false));
            expect(store.getState().filters.tutorial).toBe(false);
            expect(selectActiveFilterCount(store.getState())).toBe(0);
        });

        test('multiple navbar filters update count correctly', () => {
            expect(selectActiveFilterCount(store.getState())).toBe(0);

            // Add tutorial_format
            store.dispatch(setTutorialFormat('online'));
            expect(selectActiveFilterCount(store.getState())).toBe(1);

            // Add distance_learning
            store.dispatch(setDistanceLearning(true));
            expect(selectActiveFilterCount(store.getState())).toBe(2);

            // Add tutorial
            store.dispatch(setTutorial(true));
            expect(selectActiveFilterCount(store.getState())).toBe(3);

            // Add array-based filter to verify combined count
            store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });
            expect(selectActiveFilterCount(store.getState())).toBe(4);
        });

        test('clearAllFilters resets all navbar filters', () => {
            // Set all navbar filters
            store.dispatch(setTutorialFormat('hybrid'));
            store.dispatch(setDistanceLearning(true));
            store.dispatch(setTutorial(true));

            expect(selectActiveFilterCount(store.getState())).toBe(3);

            // Clear all filters
            store.dispatch(clearAllFilters());

            // Verify all navbar filters reset
            expect(store.getState().filters.tutorial_format).toBeNull();
            expect(store.getState().filters.distance_learning).toBe(false);
            expect(store.getState().filters.tutorial).toBe(false);
            expect(selectActiveFilterCount(store.getState())).toBe(0);
        });

        test('page resets to 1 when navbar filters change', () => {
            // Set page to 3
            store.dispatch({ type: 'filters/setCurrentPage', payload: 3 });
            expect(store.getState().filters.currentPage).toBe(3);

            // Change navbar filter
            store.dispatch(setTutorialFormat('online'));

            // Verify page reset to 1
            expect(store.getState().filters.currentPage).toBe(1);
        });

        test('lastUpdated timestamp updates when navbar filters change', () => {
            const initialTimestamp = store.getState().filters.lastUpdated;

            // Wait a bit to ensure timestamp difference
            jest.useFakeTimers();
            jest.setSystemTime(Date.now() + 1000);

            store.dispatch(setTutorialFormat('online'));

            const updatedTimestamp = store.getState().filters.lastUpdated;
            expect(updatedTimestamp).toBeGreaterThan(initialTimestamp || 0);

            jest.useRealTimers();
        });
    });
});
