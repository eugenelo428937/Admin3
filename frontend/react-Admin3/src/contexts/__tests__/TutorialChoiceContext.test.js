import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TutorialChoiceProvider, useTutorialChoice } from '../TutorialChoiceContext';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console methods to suppress expected error logs
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('TutorialChoiceContext - isDraft State Management', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  // Mock event data for testing
  const mockEventData1 = {
    eventId: 'evt-cs2-bri-001',
    eventCode: 'TUT-CS2-BRI-001',
    location: 'Bristol',
    variation: {
      id: 42,
      name: 'In-Person Tutorial',
      prices: [{ price_type: 'standard', amount: 125.00 }]
    }
  };

  const mockEventData2 = {
    eventId: 'evt-cs2-lon-002',
    eventCode: 'TUT-CS2-LON-002',
    location: 'London',
    variation: {
      id: 42,
      name: 'In-Person Tutorial',
      prices: [{ price_type: 'standard', amount: 125.00 }]
    }
  };

  const mockEventData3 = {
    eventId: 'evt-cp1-man-001',
    eventCode: 'TUT-CP1-MAN-001',
    location: 'Manchester',
    variation: {
      id: 43,
      name: 'Online Tutorial',
      prices: [{ price_type: 'standard', amount: 110.00 }]
    }
  };

  /**
   * T001: Test that addTutorialChoice initializes new choices with isDraft: true
   * Expected to FAIL: isDraft field does not exist in current implementation
   */
  describe('T001: addTutorialChoice initializes isDraft: true', () => {
    it('should set isDraft: true when adding a new tutorial choice', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
      });

      const choices = result.current.getSubjectChoices('CS2');

      // EXPECTED TO FAIL: isDraft field does not exist yet
      expect(choices['1st']).toBeDefined();
      expect(choices['1st'].isDraft).toBe(true);
      expect(choices['1st'].eventId).toBe('evt-cs2-bri-001');
      expect(choices['1st'].choiceLevel).toBe('1st');
    });

    it('should set isDraft: true for all choice levels', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
        result.current.addTutorialChoice('CP1', '1st', mockEventData3);
      });

      const cs2Choices = result.current.getSubjectChoices('CS2');
      const cp1Choices = result.current.getSubjectChoices('CP1');

      // EXPECTED TO FAIL: isDraft field does not exist yet
      expect(cs2Choices['1st'].isDraft).toBe(true);
      expect(cs2Choices['2nd'].isDraft).toBe(true);
      expect(cp1Choices['1st'].isDraft).toBe(true);
    });
  });

  /**
   * T002: Test that markChoicesAsAdded sets isDraft: false for all subject choices
   * Expected to FAIL: markChoicesAsAdded method does not exist
   */
  describe('T002: markChoicesAsAdded sets isDraft: false', () => {
    it('should set isDraft: false for all choices of a subject', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      // Add multiple choices for CS2
      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
      });

      // EXPECTED TO FAIL: markChoicesAsAdded method does not exist
      act(() => {
        result.current.markChoicesAsAdded('CS2');
      });

      const choices = result.current.getSubjectChoices('CS2');
      expect(choices['1st'].isDraft).toBe(false);
      expect(choices['2nd'].isDraft).toBe(false);
    });

    it('should only affect the specified subject', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      // Add choices for multiple subjects
      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        result.current.addTutorialChoice('CP1', '1st', mockEventData3);
      });

      // Mark only CS2 as added
      act(() => {
        result.current.markChoicesAsAdded('CS2');
      });

      const cs2Choices = result.current.getSubjectChoices('CS2');
      const cp1Choices = result.current.getSubjectChoices('CP1');

      expect(cs2Choices['1st'].isDraft).toBe(false);
      expect(cp1Choices['1st'].isDraft).toBe(true); // CP1 should still be draft
    });

    it('should persist isDraft: false state to localStorage', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
      });

      act(() => {
        result.current.markChoicesAsAdded('CS2');
      });

      // Check localStorage
      const saved = JSON.parse(localStorage.getItem('tutorialChoices'));
      expect(saved.CS2['1st'].isDraft).toBe(false);
    });
  });

  /**
   * T003: Test that getDraftChoices filters and returns only draft choices (isDraft: true)
   * Expected to FAIL: getDraftChoices method does not exist
   */
  describe('T003: getDraftChoices filters correctly', () => {
    it('should return only choices where isDraft is true', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
      });

      // Mark first choice as added (isDraft: false)
      act(() => {
        result.current.markChoicesAsAdded('CS2');
      });

      // Then add a new 3rd choice (should be draft)
      act(() => {
        result.current.addTutorialChoice('CS2', '3rd', {
          ...mockEventData1,
          eventId: 'evt-cs2-man-003',
          location: 'Manchester'
        });
      });

      // EXPECTED TO FAIL: getDraftChoices method does not exist
      const draftChoices = result.current.getDraftChoices('CS2');

      expect(Array.isArray(draftChoices)).toBe(true);
      expect(draftChoices.length).toBe(1);
      expect(draftChoices[0].choiceLevel).toBe('3rd');
      expect(draftChoices[0].isDraft).toBe(true);
    });

    it('should return empty array when no draft choices exist', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        result.current.markChoicesAsAdded('CS2');
      });

      const draftChoices = result.current.getDraftChoices('CS2');
      expect(Array.isArray(draftChoices)).toBe(true);
      expect(draftChoices.length).toBe(0);
    });

    it('should return empty array for non-existent subject', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      const draftChoices = result.current.getDraftChoices('NON_EXISTENT');
      expect(Array.isArray(draftChoices)).toBe(true);
      expect(draftChoices.length).toBe(0);
    });
  });

  /**
   * T004: Test that getCartedChoices filters and returns only carted choices (isDraft: false)
   * Expected to FAIL: getCartedChoices method does not exist
   */
  describe('T004: getCartedChoices filters correctly', () => {
    it('should return only choices where isDraft is false', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
        result.current.markChoicesAsAdded('CS2');
      });

      // Add a new draft choice
      act(() => {
        result.current.addTutorialChoice('CS2', '3rd', {
          ...mockEventData1,
          eventId: 'evt-cs2-man-003'
        });
      });

      // EXPECTED TO FAIL: getCartedChoices method does not exist
      const cartedChoices = result.current.getCartedChoices('CS2');

      expect(Array.isArray(cartedChoices)).toBe(true);
      expect(cartedChoices.length).toBe(2);
      expect(cartedChoices.every(choice => choice.isDraft === false)).toBe(true);
    });

    it('should return empty array when no carted choices exist', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
      });

      const cartedChoices = result.current.getCartedChoices('CS2');
      expect(Array.isArray(cartedChoices)).toBe(true);
      expect(cartedChoices.length).toBe(0);
    });

    it('should return empty array for non-existent subject', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      const cartedChoices = result.current.getCartedChoices('NON_EXISTENT');
      expect(Array.isArray(cartedChoices)).toBe(true);
      expect(cartedChoices.length).toBe(0);
    });
  });

  /**
   * T005: Test that hasCartedChoices correctly detects if any choices have isDraft: false
   * Expected to FAIL: hasCartedChoices method does not exist
   */
  describe('T005: hasCartedChoices detection', () => {
    it('should return true when subject has choices with isDraft: false', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        result.current.markChoicesAsAdded('CS2');
      });

      // EXPECTED TO FAIL: hasCartedChoices method does not exist
      const hasCarted = result.current.hasCartedChoices('CS2');
      expect(hasCarted).toBe(true);
    });

    it('should return false when all choices are draft', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
      });

      const hasCarted = result.current.hasCartedChoices('CS2');
      expect(hasCarted).toBe(false);
    });

    it('should return false for non-existent subject', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      const hasCarted = result.current.hasCartedChoices('NON_EXISTENT');
      expect(hasCarted).toBe(false);
    });

    it('should return true when at least one choice is carted (mixed state)', () => {
      const { result } = renderHook(() => useTutorialChoice(), {
        wrapper: TutorialChoiceProvider
      });

      act(() => {
        result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
        result.current.markChoicesAsAdded('CS2');
      });

      // Add a new draft choice
      act(() => {
        result.current.addTutorialChoice('CS2', '3rd', {
          ...mockEventData1,
          eventId: 'evt-cs2-man-003'
        });
      });

      const hasCarted = result.current.hasCartedChoices('CS2');
      expect(hasCarted).toBe(true); // Should return true because 1st and 2nd are carted
    });
  });

  // Additional coverage tests for legacy methods
  describe('Legacy method coverage', () => {
    describe('removeTutorialChoice', () => {
      it('should remove a specific choice level', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        // Add two choices
        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
          result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
        });

        // Remove 1st choice
        act(() => {
          result.current.removeTutorialChoice('CS2', '1st');
        });

        const choices = result.current.getSubjectChoices('CS2');
        expect(choices['1st']).toBeUndefined();
        expect(choices['2nd']).toBeDefined();
      });

      it('should remove subject entirely when last choice is removed', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        });

        act(() => {
          result.current.removeTutorialChoice('CS2', '1st');
        });

        expect(result.current.tutorialChoices['CS2']).toBeUndefined();
      });
    });

    describe('removeSubjectChoices', () => {
      it('should remove all choices for a subject', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
          result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
          result.current.addTutorialChoice('CP1', '1st', mockEventData1);
        });

        act(() => {
          result.current.removeSubjectChoices('CS2');
        });

        expect(result.current.tutorialChoices['CS2']).toBeUndefined();
        expect(result.current.tutorialChoices['CP1']).toBeDefined();
      });
    });

    describe('getOrderedChoices', () => {
      it('should return choices ordered by preference level', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '3rd', mockEventData1);
          result.current.addTutorialChoice('CS2', '1st', mockEventData2);
          result.current.addTutorialChoice('CS2', '2nd', mockEventData3);
        });

        const ordered = result.current.getOrderedChoices('CS2');
        expect(ordered).toHaveLength(3);
        expect(ordered[0].choiceLevel).toBe('1st');
        expect(ordered[1].choiceLevel).toBe('2nd');
        expect(ordered[2].choiceLevel).toBe('3rd');
      });

      it('should return empty array for subject with no choices', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        const ordered = result.current.getOrderedChoices('CS2');
        expect(ordered).toEqual([]);
      });
    });

    describe('isChoiceLevelAvailable', () => {
      it('should return true if choice level is available', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        expect(result.current.isChoiceLevelAvailable('CS2', '1st')).toBe(true);
      });

      it('should return false if choice level is occupied', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        });

        expect(result.current.isChoiceLevelAvailable('CS2', '1st')).toBe(false);
      });
    });

    describe('getNextAvailableChoiceLevel', () => {
      it('should return first available choice level', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        });

        expect(result.current.getNextAvailableChoiceLevel('CS2')).toBe('2nd');
      });

      it('should return null when all levels are taken', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
          result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
          result.current.addTutorialChoice('CS2', '3rd', mockEventData3);
        });

        expect(result.current.getNextAvailableChoiceLevel('CS2')).toBeNull();
      });
    });

    describe('updateChoiceLevel', () => {
      it('should move choice to empty level', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        });

        act(() => {
          result.current.updateChoiceLevel('CS2', '1st', '2nd');
        });

        const choices = result.current.getSubjectChoices('CS2');
        expect(choices['1st']).toBeUndefined();
        expect(choices['2nd']).toBeDefined();
        expect(choices['2nd'].choiceLevel).toBe('2nd');
      });

      it('should swap choices when target level is occupied', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
          result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
        });

        act(() => {
          result.current.updateChoiceLevel('CS2', '1st', '2nd');
        });

        const choices = result.current.getSubjectChoices('CS2');
        expect(choices['1st'].eventId).toBe('evt-cs2-lon-002');
        expect(choices['2nd'].eventId).toBe('evt-cs2-bri-001');
      });
    });

    describe('getTotalSubjectsWithChoices', () => {
      it('should return total number of subjects', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
          result.current.addTutorialChoice('CP1', '1st', mockEventData2);
        });

        expect(result.current.getTotalSubjectsWithChoices()).toBe(2);
      });
    });

    describe('getTotalChoices', () => {
      it('should return total number of choices across all subjects', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
          result.current.addTutorialChoice('CS2', '2nd', mockEventData2);
          result.current.addTutorialChoice('CP1', '1st', mockEventData3);
        });

        expect(result.current.getTotalChoices()).toBe(3);
      });
    });

    describe('isEventSelected', () => {
      it('should return true if event is selected', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        });

        expect(result.current.isEventSelected('CS2', 'evt-cs2-bri-001')).toBe(true);
      });

      it('should return false if event is not selected', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        expect(result.current.isEventSelected('CS2', 'evt-cs2-bri-001')).toBe(false);
      });
    });

    describe('getEventChoiceLevel', () => {
      it('should return choice level for selected event', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '2nd', mockEventData1);
        });

        expect(result.current.getEventChoiceLevel('CS2', 'evt-cs2-bri-001')).toBe('2nd');
      });

      it('should return null for non-selected event', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        expect(result.current.getEventChoiceLevel('CS2', 'evt-cs2-bri-001')).toBeNull();
      });
    });

    describe('Panel management', () => {
      it('should show choice panel for subject', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.showChoicePanelForSubject('CS2');
        });

        expect(result.current.showChoicePanel).toBe(true);
        expect(result.current.activeSubject).toBe('CS2');
      });

      it('should hide choice panel', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.showChoicePanelForSubject('CS2');
        });

        act(() => {
          result.current.hideChoicePanel();
        });

        expect(result.current.showChoicePanel).toBe(false);
        expect(result.current.activeSubject).toBeNull();
      });
    });

    describe('Pricing', () => {
      it('should return price for 1st choice', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
        });

        expect(result.current.getSubjectPrice('CS2')).toBe(125.00);
      });

      it('should return 0 if no 1st choice exists', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '2nd', mockEventData1);
        });

        expect(result.current.getSubjectPrice('CS2')).toBe(0);
      });

      it('should calculate total price across all subjects', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        act(() => {
          result.current.addTutorialChoice('CS2', '1st', mockEventData1);
          result.current.addTutorialChoice('CP1', '1st', mockEventData2);
        });

        expect(result.current.getTotalPrice()).toBe(250.00);
      });
    });

    describe('Single choice per event constraint', () => {
      it('should allow only one choice level per event (replacing previous selection)', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        const sameEvent = {
          eventId: 'evt-cs2-bri-001',
          eventCode: 'TUT-CS2-BRI-001',
          location: 'Bristol',
        };

        // Add same event as 1st choice
        act(() => {
          result.current.addTutorialChoice('CS2', '1st', sameEvent);
        });

        expect(result.current.getSubjectChoices('CS2')['1st']).toBeDefined();
        expect(result.current.getSubjectChoices('CS2')['2nd']).toBeUndefined();
        expect(result.current.getSubjectChoices('CS2')['3rd']).toBeUndefined();

        // Add same event as 2nd choice - should remove from 1st
        act(() => {
          result.current.addTutorialChoice('CS2', '2nd', sameEvent);
        });

        expect(result.current.getSubjectChoices('CS2')['1st']).toBeUndefined();
        expect(result.current.getSubjectChoices('CS2')['2nd']).toBeDefined();
        expect(result.current.getSubjectChoices('CS2')['3rd']).toBeUndefined();
        expect(result.current.getSubjectChoices('CS2')['2nd'].eventId).toBe('evt-cs2-bri-001');

        // Add same event as 3rd choice - should remove from 2nd
        act(() => {
          result.current.addTutorialChoice('CS2', '3rd', sameEvent);
        });

        expect(result.current.getSubjectChoices('CS2')['1st']).toBeUndefined();
        expect(result.current.getSubjectChoices('CS2')['2nd']).toBeUndefined();
        expect(result.current.getSubjectChoices('CS2')['3rd']).toBeDefined();
        expect(result.current.getSubjectChoices('CS2')['3rd'].eventId).toBe('evt-cs2-bri-001');
      });

      it('should allow different events at different choice levels', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        const event1 = {
          eventId: 'evt-cs2-bri-001',
          eventCode: 'TUT-CS2-BRI-001',
          location: 'Bristol',
        };

        const event2 = {
          eventId: 'evt-cs2-bri-002',
          eventCode: 'TUT-CS2-BRI-002',
          location: 'Bristol',
        };

        // Add different events at different levels
        act(() => {
          result.current.addTutorialChoice('CS2', '1st', event1);
          result.current.addTutorialChoice('CS2', '2nd', event2);
        });

        expect(result.current.getSubjectChoices('CS2')['1st']).toBeDefined();
        expect(result.current.getSubjectChoices('CS2')['2nd']).toBeDefined();
        expect(result.current.getSubjectChoices('CS2')['1st'].eventId).toBe('evt-cs2-bri-001');
        expect(result.current.getSubjectChoices('CS2')['2nd'].eventId).toBe('evt-cs2-bri-002');
      });
    });

    describe('Error handling', () => {
      it('should handle corrupted localStorage data gracefully', () => {
        localStorage.setItem('tutorialChoices', '{invalid json}');

        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        expect(result.current.tutorialChoices).toEqual({});
      });

      it('should throw error when used outside provider', () => {
        expect(() => {
          renderHook(() => useTutorialChoice());
        }).toThrow('useTutorialChoice must be used within a TutorialChoiceProvider');
      });
    });

    /**
     * T008: RED Phase Test
     * Verify openEditDialog sets editDialogOpen state
     */
    describe('Dialog management (T008-T009)', () => {
      it('should set editDialogOpen when openEditDialog called', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        // Initially should be null
        expect(result.current.editDialogOpen).toBeNull();

        // Open dialog for CS2
        act(() => {
          result.current.openEditDialog('CS2');
        });

        expect(result.current.editDialogOpen).toBe('CS2');
      });

      /**
       * T009: RED Phase Test
       * Verify closeEditDialog clears editDialogOpen state
       */
      it('should clear editDialogOpen when closeEditDialog called', () => {
        const { result } = renderHook(() => useTutorialChoice(), {
          wrapper: TutorialChoiceProvider
        });

        // Open dialog first
        act(() => {
          result.current.openEditDialog('CS2');
        });

        expect(result.current.editDialogOpen).toBe('CS2');

        // Close dialog
        act(() => {
          result.current.closeEditDialog();
        });

        expect(result.current.editDialogOpen).toBeNull();
      });
    });
  });
});
