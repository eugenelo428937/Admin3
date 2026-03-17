import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Constants
const CHOICE_LEVELS: string[] = ["1st", "2nd", "3rd"];
const STORAGE_KEY = "tutorialChoices";

export interface TutorialEventChoice {
  eventId: string;
  choiceLevel: string;
  timestamp: string;
  isDraft: boolean;
  variation?: any;
  productId?: number;
  productName?: string;
  subjectName?: string;
  location?: string;
  [key: string]: any;
}

export type TutorialChoices = Record<string, Record<string, TutorialEventChoice>>;

export type EditDialogState = { subjectCode: string; location: string | null } | null;

interface ProductMetadata {
  productId?: number;
  productName?: string;
  subjectName?: string;
}

export interface TutorialChoiceContextValue {
  tutorialChoices: TutorialChoices;
  showChoicePanel: boolean;
  activeSubject: string | null;
  editDialogOpen: EditDialogState;

  // Choice management
  addTutorialChoice: (subjectCode: string, choiceLevel: string, eventData: any, productMetadata?: ProductMetadata) => void;
  removeTutorialChoice: (subjectCode: string, choiceLevel: string) => void;
  removeSubjectChoices: (subjectCode: string) => void;
  removeAllChoices: () => void;
  updateChoiceLevel: (subjectCode: string, fromLevel: string, toLevel: string) => void;

  // Getters
  getSubjectChoices: (subjectCode: string) => Record<string, TutorialEventChoice>;
  getOrderedChoices: (subjectCode: string) => TutorialEventChoice[];
  isChoiceLevelAvailable: (subjectCode: string, choiceLevel: string) => boolean;
  getNextAvailableChoiceLevel: (subjectCode: string) => string | null;
  getTotalSubjectsWithChoices: () => number;
  getTotalChoices: () => number;
  isEventSelected: (subjectCode: string, eventId: string) => boolean;
  getEventChoiceLevel: (subjectCode: string, eventId: string) => string | null;

  // Panel management
  showChoicePanelForSubject: (subjectCode: string) => void;
  hideChoicePanel: () => void;

  // Dialog management
  openEditDialog: (subjectCode: string, location?: string | null) => void;
  closeEditDialog: () => void;

  // Pricing
  getSubjectPrice: (subjectCode: string) => number;
  getTotalPrice: () => number;

  // Draft state management
  markChoicesAsAdded: (subjectCode: string) => void;
  restoreChoicesToDraft: (subjectCode: string) => void;
  getDraftChoices: (subjectCode: string) => TutorialEventChoice[];
  getCartedChoices: (subjectCode: string) => TutorialEventChoice[];
  hasCartedChoices: (subjectCode: string) => boolean;
}

interface TutorialChoiceProviderProps {
  children: ReactNode;
  initialChoices?: TutorialChoices;
}

const TutorialChoiceContext = createContext<TutorialChoiceContextValue | undefined>(undefined);

export const TutorialChoiceProvider: React.FC<TutorialChoiceProviderProps> = ({ children, initialChoices }) => {
  // Structure: { subjectCode: { "1st": eventData, "2nd": eventData, "3rd": eventData } }
  const [tutorialChoices, setTutorialChoices] = useState<TutorialChoices>(initialChoices || {});
  const [showChoicePanel, setShowChoicePanel] = useState<boolean>(false);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState<EditDialogState>(null); // T010: Track which subject's edit dialog is open

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
   */
  const addTutorialChoice = (subjectCode: string, choiceLevel: string, eventData: any, productMetadata: ProductMetadata = {}) => {
    setTutorialChoices(prev => {
      const subjectChoices = prev[subjectCode] || {};

      // Remove this event from any other choice level if it exists
      const cleanedChoices: Record<string, TutorialEventChoice> = {};
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
   */
  const removeTutorialChoice = (subjectCode: string, choiceLevel: string) => {
    setTutorialChoices(prev => {
      const newChoices = { ...prev };
      if (newChoices[subjectCode]) {
        const subjectChoices = { ...newChoices[subjectCode] };
        delete subjectChoices[choiceLevel];

        // If no choices left for this subject, remove the subject entirely
        if (Object.keys(subjectChoices).length === 0) {
          delete newChoices[subjectCode];
        } else {
          newChoices[subjectCode] = subjectChoices;
        }
      }
      return newChoices;
    });
  };

  /**
   * Remove all tutorial choices for a subject
   */
  const removeSubjectChoices = (subjectCode: string) => {
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
   */
  const getSubjectChoices = (subjectCode: string): Record<string, TutorialEventChoice> => {
    return tutorialChoices[subjectCode] || {};
  };

  /**
   * Get all choices for a subject ordered by preference level
   */
  const getOrderedChoices = (subjectCode: string): TutorialEventChoice[] => {
    const choices = getSubjectChoices(subjectCode);
    const ordered: TutorialEventChoice[] = [];

    CHOICE_LEVELS.forEach(level => {
      if (choices[level]) {
        ordered.push(choices[level]);
      }
    });

    return ordered;
  };

  /**
   * Check if a specific choice level is available for a subject
   */
  const isChoiceLevelAvailable = (subjectCode: string, choiceLevel: string): boolean => {
    const choices = getSubjectChoices(subjectCode);
    return !choices[choiceLevel];
  };

  /**
   * Get the next available choice level for a subject
   */
  const getNextAvailableChoiceLevel = (subjectCode: string): string | null => {
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
   */
  const updateChoiceLevel = (subjectCode: string, fromLevel: string, toLevel: string) => {
    setTutorialChoices(prev => {
      const newChoices = { ...prev };

      if (newChoices[subjectCode] && newChoices[subjectCode][fromLevel]) {
        const subjectChoices = { ...newChoices[subjectCode] };
        const eventData = subjectChoices[fromLevel];

        // If target level is occupied, we need to handle the swap
        if (subjectChoices[toLevel]) {
          // Swap the choices
          const targetEventData = subjectChoices[toLevel];
          subjectChoices[toLevel] = { ...eventData, choiceLevel: toLevel };
          subjectChoices[fromLevel] = { ...targetEventData, choiceLevel: fromLevel };
        } else {
          // Move to empty level
          subjectChoices[toLevel] = { ...eventData, choiceLevel: toLevel };
          delete subjectChoices[fromLevel];
        }

        newChoices[subjectCode] = subjectChoices;
      }

      return newChoices;
    });
  };

  /**
   * Get total number of subjects with tutorial choices
   */
  const getTotalSubjectsWithChoices = (): number => {
    return Object.keys(tutorialChoices).length;
  };

  /**
   * Get total number of tutorial choices across all subjects
   */
  const getTotalChoices = (): number => {
    return Object.values(tutorialChoices).reduce((total, subjectChoices) => {
      return total + Object.keys(subjectChoices).length;
    }, 0);
  };

  /**
   * Check if a specific tutorial event is already selected
   */
  const isEventSelected = (subjectCode: string, eventId: string): boolean => {
    const choices = getSubjectChoices(subjectCode);
    return Object.values(choices).some(choice => choice.eventId === eventId);
  };

  /**
   * Get the choice level for a specific tutorial event
   */
  const getEventChoiceLevel = (subjectCode: string, eventId: string): string | null => {
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
   */
  const showChoicePanelForSubject = (subjectCode: string) => {
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
   */
  const openEditDialog = (subjectCode: string, location: string | null = null) => {
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
   */
  const getSubjectPrice = (subjectCode: string): number => {
    const choices = getSubjectChoices(subjectCode);
    const firstChoice = choices["1st"];

    if (firstChoice && firstChoice.variation && firstChoice.variation.prices) {
      const priceObj = firstChoice.variation.prices.find((p: any) => p.price_type === "standard");
      return priceObj ? priceObj.amount : 0;
    }

    return 0;
  };

  /**
   * Calculate total price for all subjects' tutorial choices
   */
  const getTotalPrice = (): number => {
    return Object.keys(tutorialChoices).reduce((total, subjectCode) => {
      return total + getSubjectPrice(subjectCode);
    }, 0);
  };

  /**
   * Internal helper: Update draft state for all choices in a subject
   */
  const updateDraftState = (subjectCode: string, isDraft: boolean) => {
    setTutorialChoices(prev => {
      const subjectChoices = prev[subjectCode];

      if (!subjectChoices) {
        return prev;
      }

      const updatedChoices: Record<string, TutorialEventChoice> = {};
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
   */
  const markChoicesAsAdded = (subjectCode: string) => updateDraftState(subjectCode, false);

  /**
   * Restore all tutorial choices for a subject to draft state
   * Sets isDraft: true for all choices of the specified subject
   * Used when cart item is removed but choices should be kept in localStorage
   */
  const restoreChoicesToDraft = (subjectCode: string) => updateDraftState(subjectCode, true);

  /**
   * Get only draft tutorial choices for a subject
   * Returns choices that have not been added to cart yet (isDraft: true)
   */
  const getDraftChoices = (subjectCode: string): TutorialEventChoice[] => {
    const choices = getSubjectChoices(subjectCode);
    return Object.values(choices).filter(choice => choice.isDraft === true);
  };

  /**
   * Get only carted tutorial choices for a subject
   * Returns choices that have been added to cart (isDraft: false)
   */
  const getCartedChoices = (subjectCode: string): TutorialEventChoice[] => {
    const choices = getSubjectChoices(subjectCode);
    return Object.values(choices).filter(choice => choice.isDraft === false);
  };

  /**
   * Check if a subject has any choices that have been added to cart
   */
  const hasCartedChoices = (subjectCode: string): boolean => {
    const choices = getSubjectChoices(subjectCode);
    return Object.values(choices).some(choice => choice.isDraft === false);
  };

  const value: TutorialChoiceContextValue = {
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
 */
export const useTutorialChoice = (): TutorialChoiceContextValue => {
  const context = useContext(TutorialChoiceContext);
  if (!context) {
    throw new Error("useTutorialChoice must be used within a TutorialChoiceProvider");
  }
  return context;
};

export { TutorialChoiceContext };
export default TutorialChoiceContext;
