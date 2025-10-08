import React, { createContext, useContext, useState, useEffect } from "react";

// Constants
const CHOICE_LEVELS = ["1st", "2nd", "3rd"];
const STORAGE_KEY = "tutorialChoices";

const TutorialChoiceContext = createContext();

export const TutorialChoiceProvider = ({ children, initialChoices }) => {
  // Structure: { subjectCode: { "1st": eventData, "2nd": eventData, "3rd": eventData } }
  const [tutorialChoices, setTutorialChoices] = useState(initialChoices || {});
  const [showChoicePanel, setShowChoicePanel] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(null); // T010: Track which subject's edit dialog is open

  /**
   * Load tutorial choices from localStorage on mount
   * Skip if initialChoices provided (for testing)
   */
  useEffect(() => {
    if (initialChoices) return; // Skip localStorage load if initial choices provided

    const savedChoices = localStorage.getItem(STORAGE_KEY);
    if (!savedChoices) return;

    try {
      const data = JSON.parse(savedChoices);
      setTutorialChoices(data);
    } catch (error) {
      console.error("Error loading tutorial choices from localStorage:", error);
      setTutorialChoices({});
    }
  }, [initialChoices]);

  /**
   * Save tutorial choices to localStorage whenever they change
   */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tutorialChoices));
  }, [tutorialChoices]);

  /**
   * Add or update a tutorial choice for a subject
   * If the same event is already selected at a different choice level, it removes the old level first
   * This ensures each event can only be selected once (at one choice level)
   * @param {string} subjectCode - Subject identifier (e.g., "CS2")
   * @param {string} choiceLevel - Choice level ("1st", "2nd", or "3rd")
   * @param {Object} eventData - Tutorial event data including eventId, location, variation
   * @param {Object} productMetadata - T011: Product metadata for cart integration
   * @param {number} productMetadata.productId - Product ID from backend
   * @param {string} productMetadata.productName - Display name of product
   * @param {string} productMetadata.subjectName - Subject name for display
   */
  const addTutorialChoice = (subjectCode, choiceLevel, eventData, productMetadata = {}) => {
    setTutorialChoices(prev => {
      const subjectChoices = prev[subjectCode] || {};

      // Remove this event from any other choice level if it exists
      const cleanedChoices = {};
      Object.entries(subjectChoices).forEach(([level, choice]) => {
        // Keep the choice only if it's a different event OR it's the same level we're updating
        if (choice.eventId !== eventData.eventId || level === choiceLevel) {
          cleanedChoices[level] = choice;
        }
      });

      // Add the new choice at the specified level
      return {
        ...prev,
        [subjectCode]: {
          ...cleanedChoices,
          [choiceLevel]: {
            ...eventData,
            choiceLevel,
            timestamp: new Date().toISOString(),
            isDraft: true,  // T008: New choices default to draft state
            // T011: Store product metadata for Add to Cart functionality
            productId: productMetadata.productId,
            productName: productMetadata.productName,
            subjectName: productMetadata.subjectName
          }
        }
      };
    });
  };

  /**
   * Remove a specific tutorial choice
   * Removes the entire subject if no choices remain
   * @param {string} subjectCode - Subject identifier
   * @param {string} choiceLevel - Choice level to remove
   */
  const removeTutorialChoice = (subjectCode, choiceLevel) => {
    setTutorialChoices(prev => {
      const newChoices = { ...prev };
      if (newChoices[subjectCode]) {
        delete newChoices[subjectCode][choiceLevel];
        
        // If no choices left for this subject, remove the subject entirely
        if (Object.keys(newChoices[subjectCode]).length === 0) {
          delete newChoices[subjectCode];
        }
      }
      return newChoices;
    });
  };

  /**
   * Remove all tutorial choices for a subject
   * @param {string} subjectCode - Subject identifier
   */
  const removeSubjectChoices = (subjectCode) => {
    setTutorialChoices(prev => {
      const newChoices = { ...prev };
      delete newChoices[subjectCode];
      return newChoices;
    });
  };

  /**
   * Remove all tutorial choices for all subjects
   * Used when cart is completely cleared
   */
  const removeAllChoices = () => {
    setTutorialChoices({});
  };

  /**
   * Get choices for a specific subject
   * @param {string} subjectCode - Subject identifier
   * @returns {Object} Choices object
   */
  const getSubjectChoices = (subjectCode) => {
    return tutorialChoices[subjectCode] || {};
  };

  /**
   * Get all choices for a subject ordered by preference level
   * @param {string} subjectCode - Subject identifier
   * @returns {Array} Array of choices ordered by preference (1st, 2nd, 3rd)
   */
  const getOrderedChoices = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);
    const ordered = [];

    CHOICE_LEVELS.forEach(level => {
      if (choices[level]) {
        ordered.push(choices[level]);
      }
    });

    return ordered;
  };

  /**
   * Check if a specific choice level is available for a subject
   * @param {string} subjectCode - Subject identifier
   * @param {string} choiceLevel - Choice level to check
   * @returns {boolean} True if choice level is available
   */
  const isChoiceLevelAvailable = (subjectCode, choiceLevel) => {
    const choices = getSubjectChoices(subjectCode);
    return !choices[choiceLevel];
  };

  /**
   * Get the next available choice level for a subject
   * @param {string} subjectCode - Subject identifier
   * @returns {string|null} Next available choice level or null if all levels taken
   */
  const getNextAvailableChoiceLevel = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);

    for (const level of CHOICE_LEVELS) {
      if (!choices[level]) {
        return level;
      }
    }

    return null; // All levels are taken
  };

  /**
   * Update choice level by moving a choice from one level to another
   * Supports swapping if target level is occupied
   * @param {string} subjectCode - Subject identifier
   * @param {string} fromLevel - Source choice level
   * @param {string} toLevel - Target choice level
   */
  const updateChoiceLevel = (subjectCode, fromLevel, toLevel) => {
    setTutorialChoices(prev => {
      const newChoices = { ...prev };
      
      if (newChoices[subjectCode] && newChoices[subjectCode][fromLevel]) {
        const eventData = newChoices[subjectCode][fromLevel];
        
        // If target level is occupied, we need to handle the swap
        if (newChoices[subjectCode][toLevel]) {
          // Swap the choices
          const targetEventData = newChoices[subjectCode][toLevel];
          newChoices[subjectCode][toLevel] = { ...eventData, choiceLevel: toLevel };
          newChoices[subjectCode][fromLevel] = { ...targetEventData, choiceLevel: fromLevel };
        } else {
          // Move to empty level
          newChoices[subjectCode][toLevel] = { ...eventData, choiceLevel: toLevel };
          delete newChoices[subjectCode][fromLevel];
        }
      }
      
      return newChoices;
    });
  };

  /**
   * Get total number of subjects with tutorial choices
   * @returns {number} Count of subjects with choices
   */
  const getTotalSubjectsWithChoices = () => {
    return Object.keys(tutorialChoices).length;
  };

  /**
   * Get total number of tutorial choices across all subjects
   * @returns {number} Total count of all choices
   */
  const getTotalChoices = () => {
    return Object.values(tutorialChoices).reduce((total, subjectChoices) => {
      return total + Object.keys(subjectChoices).length;
    }, 0);
  };

  /**
   * Check if a specific tutorial event is already selected
   * @param {string} subjectCode - Subject identifier
   * @param {string} eventId - Tutorial event ID
   * @returns {boolean} True if event is selected at any choice level
   */
  const isEventSelected = (subjectCode, eventId) => {
    const choices = getSubjectChoices(subjectCode);
    return Object.values(choices).some(choice => choice.eventId === eventId);
  };

  /**
   * Get the choice level for a specific tutorial event
   * @param {string} subjectCode - Subject identifier
   * @param {string} eventId - Tutorial event ID
   * @returns {string|null} Choice level or null if not found
   */
  const getEventChoiceLevel = (subjectCode, eventId) => {
    const choices = getSubjectChoices(subjectCode);
    for (const [level, choice] of Object.entries(choices)) {
      if (choice.eventId === eventId) {
        return level;
      }
    }
    return null;
  };

  /**
   * Show the tutorial choice panel for a specific subject
   * @param {string} subjectCode - Subject identifier
   */
  const showChoicePanelForSubject = (subjectCode) => {
    setActiveSubject(subjectCode);
    setShowChoicePanel(true);
  };

  /**
   * Hide the tutorial choice panel
   */
  const hideChoicePanel = () => {
    setShowChoicePanel(false);
    setActiveSubject(null);
  };

  /**
   * Open the edit dialog for a specific subject
   * T010: Used by TutorialSummaryBarContainer to trigger card's edit dialog
   * @param {string} subjectCode - Subject identifier
   */
  const openEditDialog = (subjectCode, location = null) => {
    setEditDialogOpen({ subjectCode, location });
  };

  /**
   * Close the edit dialog
   * T010: Used by TutorialProductCard after dialog closes
   */
  const closeEditDialog = () => {
    setEditDialogOpen(null);
  };

  /**
   * Get the price for a subject's tutorial choices
   * Only the 1st choice is charged; 2nd and 3rd choices are free
   * @param {string} subjectCode - Subject identifier
   * @returns {number} Price amount (0 if no 1st choice or price not found)
   */
  const getSubjectPrice = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);
    const firstChoice = choices["1st"];

    if (firstChoice && firstChoice.variation && firstChoice.variation.prices) {
      const priceObj = firstChoice.variation.prices.find(p => p.price_type === "standard");
      return priceObj ? priceObj.amount : 0;
    }

    return 0;
  };

  /**
   * Calculate total price for all subjects' tutorial choices
   * @returns {number} Total price across all subjects
   */
  const getTotalPrice = () => {
    return Object.keys(tutorialChoices).reduce((total, subjectCode) => {
      return total + getSubjectPrice(subjectCode);
    }, 0);
  };

  /**
   * Internal helper: Update draft state for all choices in a subject
   * @param {string} subjectCode - Subject identifier
   * @param {boolean} isDraft - Target draft state
   * @private
   */
  const updateDraftState = (subjectCode, isDraft) => {
    setTutorialChoices(prev => {
      const subjectChoices = prev[subjectCode];

      if (!subjectChoices) {
        console.warn(`⚠️ [TutorialChoiceContext] No choices found for subject: ${subjectCode}`);
        return prev;
      }

      const updatedChoices = {};
      Object.entries(subjectChoices).forEach(([level, choice]) => {
        updatedChoices[level] = {
          ...choice,
          isDraft
        };
      });

      return {
        ...prev,
        [subjectCode]: updatedChoices
      };
    });
  };

  /**
   * Mark all tutorial choices for a subject as added to cart
   * Sets isDraft: false for all choices of the specified subject
   * @param {string} subjectCode - Subject identifier
   */
  const markChoicesAsAdded = (subjectCode) => updateDraftState(subjectCode, false);

  /**
   * Restore all tutorial choices for a subject to draft state
   * Sets isDraft: true for all choices of the specified subject
   * Used when cart item is removed but choices should be kept in localStorage
   * @param {string} subjectCode - Subject identifier
   */
  const restoreChoicesToDraft = (subjectCode) => updateDraftState(subjectCode, true);

  /**
   * Get only draft tutorial choices for a subject
   * Returns choices that have not been added to cart yet (isDraft: true)
   * @param {string} subjectCode - Subject identifier
   * @returns {Array} Array of draft choices
   */
  const getDraftChoices = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);
    return Object.values(choices).filter(choice => choice.isDraft === true);
  };

  /**
   * Get only carted tutorial choices for a subject
   * Returns choices that have been added to cart (isDraft: false)
   * @param {string} subjectCode - Subject identifier
   * @returns {Array} Array of carted choices
   */
  const getCartedChoices = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);
    return Object.values(choices).filter(choice => choice.isDraft === false);
  };

  /**
   * Check if a subject has any choices that have been added to cart
   * @param {string} subjectCode - Subject identifier
   * @returns {boolean} True if subject has at least one carted choice
   */
  const hasCartedChoices = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);
    return Object.values(choices).some(choice => choice.isDraft === false);
  };

  const value = {
    tutorialChoices,
    showChoicePanel,
    activeSubject,
    editDialogOpen, // T010: Dialog state for global summary bar integration

    // Choice management
    addTutorialChoice,
    removeTutorialChoice,
    removeSubjectChoices,
    removeAllChoices,
    updateChoiceLevel,

    // Getters
    getSubjectChoices,
    getOrderedChoices,
    isChoiceLevelAvailable,
    getNextAvailableChoiceLevel,
    getTotalSubjectsWithChoices,
    getTotalChoices,
    isEventSelected,
    getEventChoiceLevel,

    // Panel management
    showChoicePanelForSubject,
    hideChoicePanel,

    // T010: Dialog management for global summary bar
    openEditDialog,
    closeEditDialog,

    // Pricing
    getSubjectPrice,
    getTotalPrice,

    // T015: Draft state management methods
    markChoicesAsAdded,
    restoreChoicesToDraft,
    getDraftChoices,
    getCartedChoices,
    hasCartedChoices,
  };

  return (
    <TutorialChoiceContext.Provider value={value}>
      {children}
    </TutorialChoiceContext.Provider>
  );
};

/**
 * Custom hook to access Tutorial Choice context
 * Must be used within TutorialChoiceProvider
 * @returns {Object} Tutorial choice context with all methods and state
 * @throws {Error} If used outside of TutorialChoiceProvider
 */
export const useTutorialChoice = () => {
  const context = useContext(TutorialChoiceContext);
  if (!context) {
    throw new Error("useTutorialChoice must be used within a TutorialChoiceProvider");
  }
  return context;
};