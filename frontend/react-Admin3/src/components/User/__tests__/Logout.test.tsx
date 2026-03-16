import { vi } from 'vitest';
// src/components/User/__tests__/Logout.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Logout from '../Logout.tsx';

// Mock fetch
global.fetch = vi.fn() as any;

describe('Logout', () => {
  const mockSetIsAuthenticated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderLogout = () => {
    return render(<Logout setIsAuthenticated={mockSetIsAuthenticated} />);
  };

  describe('rendering', () => {
    test('renders logout button', () => {
      renderLogout();
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });
  });

  describe('logout functionality', () => {
    test('calls API and updates state on successful logout', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true });
      localStorage.setItem('isAuthenticated', 'true');

      renderLogout();

      fireEvent.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://127.0.0.1:8888/students/logout/',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
          })
        );
        expect(localStorage.getItem('isAuthenticated')).toBeNull();
        expect(mockSetIsAuthenticated).toHaveBeenCalledWith(false);
      });
    });

    test('handles API error gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderLogout();

      fireEvent.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error logging out:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    test('does not update state when API returns non-ok response', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: false });
      localStorage.setItem('isAuthenticated', 'true');

      renderLogout();

      fireEvent.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Should not have called setIsAuthenticated since response was not ok
      expect(mockSetIsAuthenticated).not.toHaveBeenCalled();
      expect(localStorage.getItem('isAuthenticated')).toBe('true');
    });
  });
});
