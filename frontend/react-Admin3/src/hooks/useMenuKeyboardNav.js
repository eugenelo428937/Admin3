// frontend/react-Admin3/src/hooks/useMenuKeyboardNav.js
import { useState, useCallback } from 'react';

/**
 * Hook for keyboard navigation in menus.
 * Handles arrow keys, Home/End, Escape, Enter/Space, and Tab.
 *
 * @param {number} itemCount - Total number of items in the menu
 * @param {function} onClose - Callback when menu should close
 * @param {function} onSelect - Callback when item is selected, receives focusedIndex
 * @returns {object} { focusedIndex, setFocusedIndex, handleKeyDown, resetFocus }
 */
const useMenuKeyboardNav = (itemCount, onClose, onSelect) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback((event) => {
    // Handle empty menu gracefully
    if (itemCount <= 0) {
      if (event.key === 'Escape' || event.key === 'Tab') {
        onClose?.();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, itemCount - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(itemCount - 1);
        break;
      case 'Escape':
        event.preventDefault();
        onClose?.();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Use functional update to avoid stale closure over focusedIndex
        setFocusedIndex(currentIndex => {
          onSelect?.(currentIndex);
          return currentIndex;
        });
        break;
      case 'Tab':
        // Intentionally allow default Tab behavior to move focus to next element
        onClose?.();
        break;
      default:
        break;
    }
  }, [itemCount, onClose, onSelect]);

  const resetFocus = useCallback(() => {
    setFocusedIndex(0);
  }, []);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    resetFocus
  };
};

export default useMenuKeyboardNav;
