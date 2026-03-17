// frontend/react-Admin3/src/hooks/useMenuKeyboardNav.ts
import { useState, useCallback } from 'react';

interface UseMenuKeyboardNavReturn {
  focusedIndex: number;
  setFocusedIndex: React.Dispatch<React.SetStateAction<number>>;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  resetFocus: () => void;
}

/**
 * Hook for keyboard navigation in menus.
 * Handles arrow keys, Home/End, Escape, Enter/Space, and Tab.
 *
 * @param itemCount - Total number of items in the menu
 * @param onClose - Callback when menu should close
 * @param onSelect - Callback when item is selected, receives focusedIndex
 * @returns { focusedIndex, setFocusedIndex, handleKeyDown, resetFocus }
 */
const useMenuKeyboardNav = (
  itemCount: number,
  onClose?: () => void,
  onSelect?: (index: number) => void
): UseMenuKeyboardNavReturn => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
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
