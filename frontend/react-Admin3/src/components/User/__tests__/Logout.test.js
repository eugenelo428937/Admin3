// src/components/User/__tests__/Logout.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Logout from '../Logout';

// Mock fetch
global.fetch = jest.fn();

describe('Logout', () => {
  const mockSetIsAuthenticated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
      global.fetch.mockResolvedValueOnce({ ok: true });
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
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderLogout();

      fireEvent.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error logging out:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    test('does not update state when API returns non-ok response', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false });
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
