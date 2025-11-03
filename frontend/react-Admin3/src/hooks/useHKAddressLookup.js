/**
 * Custom hook for Hong Kong address lookup
 *
 * Provides address lookup functionality using the HK government API
 * via our backend proxy endpoint.
 *
 * Contract: /api/utils/address-lookup-hk/?search_text=<query>
 */

import { useState, useCallback } from 'react';
import config from '../config';

const useHKAddressLookup = () => {
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allowManual, setAllowManual] = useState(false);

  /**
   * Search for Hong Kong addresses
   * @param {string} searchText - Free-text search query (min 2 characters)
   */
  const searchAddresses = useCallback(async (searchText) => {
    // Validate minimum search length for non-empty strings
    // Empty strings are allowed (backend will return 400)
    if (searchText && searchText.trim().length > 0 && searchText.trim().length < 2) {
      return;
    }

    // Clear previous results and errors
    setError(null);
    setAllowManual(false);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${config.apiBaseUrl}/api/utils/address-lookup-hk/?search_text=${encodeURIComponent(searchText)}`
      );

      if (response.ok) {
        // Success (200)
        const data = await response.json();
        setAddresses(data.addresses || []);
        setError(null);
        setAllowManual(false);
      } else {
        // Error responses (400, 500)
        const errorData = await response.json();
        setError(errorData.error || 'Address lookup failed');
        setAllowManual(errorData.allow_manual || false);
        setAddresses([]);
      }
    } catch (err) {
      // Network errors
      setError(err.message || 'Network error occurred');
      setAllowManual(true);
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear all addresses and errors
   */
  const clearAddresses = useCallback(() => {
    setAddresses([]);
    setError(null);
    setAllowManual(false);
  }, []);

  return {
    addresses,
    isLoading,
    error,
    allowManual,
    searchAddresses,
    clearAddresses
  };
};

export default useHKAddressLookup;
