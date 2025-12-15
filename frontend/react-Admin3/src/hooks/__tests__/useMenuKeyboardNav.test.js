// frontend/react-Admin3/src/hooks/__tests__/useMenuKeyboardNav.test.js
import { renderHook, act } from '@testing-library/react';
import useMenuKeyboardNav from '../useMenuKeyboardNav';

describe('useMenuKeyboardNav', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with focusedIndex 0', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );
    expect(result.current.focusedIndex).toBe(0);
  });

  test('ArrowDown increments focusedIndex', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowDown',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(1);
  });

  test('ArrowDown does not exceed itemCount - 1', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(3, mockOnClose, mockOnSelect)
    );

    // Move to last item
    act(() => {
      result.current.setFocusedIndex(2);
    });

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowDown',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(2);
  });

  test('ArrowUp decrements focusedIndex', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.setFocusedIndex(2);
    });

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowUp',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(1);
  });

  test('ArrowUp does not go below 0', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowUp',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(0);
  });

  test('Home moves to first item', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.setFocusedIndex(3);
    });

    act(() => {
      result.current.handleKeyDown({
        key: 'Home',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(0);
  });

  test('End moves to last item', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({
        key: 'End',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(4);
  });

  test('Escape calls onClose', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({
        key: 'Escape',
        preventDefault: jest.fn()
      });
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('Enter calls onSelect with focusedIndex', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.setFocusedIndex(2);
    });

    act(() => {
      result.current.handleKeyDown({
        key: 'Enter',
        preventDefault: jest.fn()
      });
    });

    expect(mockOnSelect).toHaveBeenCalledWith(2);
  });

  test('Space calls onSelect with focusedIndex', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({
        key: ' ',
        preventDefault: jest.fn()
      });
    });

    expect(mockOnSelect).toHaveBeenCalledWith(0);
  });

  test('Tab calls onClose', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({ key: 'Tab' });
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('resetFocus sets focusedIndex to 0', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.setFocusedIndex(3);
    });

    act(() => {
      result.current.resetFocus();
    });

    expect(result.current.focusedIndex).toBe(0);
  });

  test('handles empty menu gracefully (itemCount = 0)', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(0, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: jest.fn() });
    });

    expect(result.current.focusedIndex).toBe(0);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  test('Escape still works on empty menu', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(0, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({ key: 'Escape', preventDefault: jest.fn() });
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
