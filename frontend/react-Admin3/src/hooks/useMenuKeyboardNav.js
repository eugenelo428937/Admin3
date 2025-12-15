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
        onSelect?.(focusedIndex);
        break;
      case 'Tab':
        onClose?.();
        break;
      default:
        break;
    }
  }, [itemCount, onClose, onSelect, focusedIndex]);

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
