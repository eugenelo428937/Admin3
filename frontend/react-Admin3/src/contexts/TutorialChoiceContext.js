import React, { createContext, useContext, useState, useEffect } from "react";

const TutorialChoiceContext = createContext();

export const TutorialChoiceProvider = ({ children }) => {
  // Structure: { subjectCode: { "1st": eventData, "2nd": eventData, "3rd": eventData } }
  const [tutorialChoices, setTutorialChoices] = useState({});
  const [showChoicePanel, setShowChoicePanel] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);

  // Load tutorial choices from localStorage on mount
  useEffect(() => {
    const savedChoices = localStorage.getItem("tutorialChoices");
    if (savedChoices) {
      try {
        setTutorialChoices(JSON.parse(savedChoices));
      } catch (error) {
        console.error("Error loading tutorial choices from localStorage:", error);
      }
    }
  }, []);

  // Save tutorial choices to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("tutorialChoices", JSON.stringify(tutorialChoices));
  }, [tutorialChoices]);

  // Add or update a tutorial choice
  const addTutorialChoice = (subjectCode, choiceLevel, eventData) => {
    setTutorialChoices(prev => ({
      ...prev,
      [subjectCode]: {
        ...prev[subjectCode],
        [choiceLevel]: {
          ...eventData,
          choiceLevel,
          timestamp: new Date().toISOString()
        }
      }
    }));
  };

  // Remove a specific tutorial choice
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

  // Remove all choices for a subject
  const removeSubjectChoices = (subjectCode) => {
    setTutorialChoices(prev => {
      const newChoices = { ...prev };
      delete newChoices[subjectCode];
      return newChoices;
    });
  };

  // Get choices for a specific subject
  const getSubjectChoices = (subjectCode) => {
    return tutorialChoices[subjectCode] || {};
  };

  // Get all choices ordered by preference
  const getOrderedChoices = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);
    const ordered = [];
    
    ["1st", "2nd", "3rd"].forEach(level => {
      if (choices[level]) {
        ordered.push(choices[level]);
      }
    });
    
    return ordered;
  };

  // Check if a choice level is available for a subject
  const isChoiceLevelAvailable = (subjectCode, choiceLevel) => {
    const choices = getSubjectChoices(subjectCode);
    return !choices[choiceLevel];
  };

  // Get the next available choice level for a subject
  const getNextAvailableChoiceLevel = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);
    const levels = ["1st", "2nd", "3rd"];
    
    for (const level of levels) {
      if (!choices[level]) {
        return level;
      }
    }
    
    return null; // All levels are taken
  };

  // Update choice level (move a choice from one level to another)
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

  // Get total number of subjects with choices
  const getTotalSubjectsWithChoices = () => {
    return Object.keys(tutorialChoices).length;
  };

  // Get total number of choices across all subjects
  const getTotalChoices = () => {
    return Object.values(tutorialChoices).reduce((total, subjectChoices) => {
      return total + Object.keys(subjectChoices).length;
    }, 0);
  };

  // Check if a specific event is already selected
  const isEventSelected = (subjectCode, eventId) => {
    const choices = getSubjectChoices(subjectCode);
    return Object.values(choices).some(choice => choice.eventId === eventId);
  };

  // Get the choice level for a specific event
  const getEventChoiceLevel = (subjectCode, eventId) => {
    const choices = getSubjectChoices(subjectCode);
    for (const [level, choice] of Object.entries(choices)) {
      if (choice.eventId === eventId) {
        return level;
      }
    }
    return null;
  };

  // Show choice panel for a specific subject
  const showChoicePanelForSubject = (subjectCode) => {
    setActiveSubject(subjectCode);
    setShowChoicePanel(true);
  };

  // Hide choice panel
  const hideChoicePanel = () => {
    setShowChoicePanel(false);
    setActiveSubject(null);
  };

  // Get price for a subject (only 1st choice is charged)
  const getSubjectPrice = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);
    const firstChoice = choices["1st"];
    
    if (firstChoice && firstChoice.variation && firstChoice.variation.prices) {
      const priceObj = firstChoice.variation.prices.find(p => p.price_type === "standard");
      return priceObj ? priceObj.amount : 0;
    }
    
    return 0;
  };

  // Calculate total price for all subjects
  const getTotalPrice = () => {
    return Object.keys(tutorialChoices).reduce((total, subjectCode) => {
      return total + getSubjectPrice(subjectCode);
    }, 0);
  };

  const value = {
    tutorialChoices,
    showChoicePanel,
    activeSubject,
    
    // Choice management
    addTutorialChoice,
    removeTutorialChoice,
    removeSubjectChoices,
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
    
    // Pricing
    getSubjectPrice,
    getTotalPrice,
  };

  return (
    <TutorialChoiceContext.Provider value={value}>
      {children}
    </TutorialChoiceContext.Provider>
  );
};

export const useTutorialChoice = () => {
  const context = useContext(TutorialChoiceContext);
  if (!context) {
    throw new Error("useTutorialChoice must be used within a TutorialChoiceProvider");
  }
  return context;
};