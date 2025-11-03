/**
 * Tests for useHKAddressLookup hook
 *
 * TDD Phase: RED
 * These tests define the expected behavior before implementation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useHKAddressLookup from '../useHKAddressLookup';
import config from '../../config';

// Mock fetch
global.fetch = jest.fn();

describe('useHKAddressLookup', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Contract: API Integration', () => {
    test('should call correct API endpoint with search text', async () => {
      // Arrange
      const mockResponse = {
        addresses: [
          {
            building: 'Central Government Offices',
            street: '2 TIM MEI AVENUE',
            district: 'Central & Western District',
            region: 'HK',
            formatted_address: 'Central Government Offices, 2 TIM MEI AVENUE, Central & Western District, HK',
            is_3d: false
          }
        ],
        total: 1,
        search_text: 'central government'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      // Act
      const { result } = renderHook(() => useHKAddressLookup());

      await act(async () => {
        await result.current.searchAddresses('central government');
      });

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        `${config.apiBaseUrl}/api/utils/address-lookup-hk/?search_text=${encodeURIComponent('central government')}`
      );
    });

    test('should return formatted addresses matching contract', async () => {
      // Arrange
      const mockApiResponse = {
        addresses: [
          {
            building: 'Abbey Court',
            street: 'PICTORIAL GARDEN PHASE I',
            district: 'Sha Tin District',
            region: 'NT',
            formatted_address: 'Abbey Court, PICTORIAL GARDEN PHASE I, Sha Tin District, NT',
            is_3d: true
          }
        ],
        total: 1,
        search_text: 'abbey court'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse
      });

      // Act
      const { result } = renderHook(() => useHKAddressLookup());

      await act(async () => {
        await result.current.searchAddresses('abbey court');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.addresses).toHaveLength(1);
        expect(result.current.addresses[0]).toMatchObject({
          building: 'Abbey Court',
          street: 'PICTORIAL GARDEN PHASE I',
          district: 'Sha Tin District',
          region: 'NT',
          is_3d: true
        });
      });
    });
  });

  describe('Loading States', () => {
    test('should set loading to true while fetching', async () => {
      // Arrange
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      fetch.mockReturnValueOnce(promise);

      // Act
      const { result } = renderHook(() => useHKAddressLookup());

      act(() => {
        result.current.searchAddresses('test query');
      });

      // Assert - loading should be true immediately
      expect(result.current.isLoading).toBe(true);

      // Cleanup
      resolvePromise({
        ok: true,
        status: 200,
        json: async () => ({ addresses: [], total: 0, search_text: 'test query' })
      });
    });

    test('should set loading to false after fetch completes', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ addresses: [], total: 0, search_text: 'test' })
      });

      // Act
      const { result } = renderHook(() => useHKAddressLookup());

      await act(async () => {
        await result.current.searchAddresses('test');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 400 Bad Request (missing search_text)', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Missing search_text parameter',
          allow_manual: true
        })
      });

      // Act
      const { result } = renderHook(() => useHKAddressLookup());

      await act(async () => {
        await result.current.searchAddresses('');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.allowManual).toBe(true);
        expect(result.current.addresses).toEqual([]);
      });
    });

    test('should handle 500 Service Unavailable', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Address lookup service temporarily unavailable',
          allow_manual: true,
          details: 'Connection timeout to HK ALS API'
        })
      });

      // Act
      const { result } = renderHook(() => useHKAddressLookup());

      await act(async () => {
        await result.current.searchAddresses('test query');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.allowManual).toBe(true);
        expect(result.current.addresses).toEqual([]);
      });
    });

    test('should handle network errors', async () => {
      // Arrange
      fetch.mockRejectedValueOnce(new Error('Network error'));

      // Act
      const { result } = renderHook(() => useHKAddressLookup());

      await act(async () => {
        await result.current.searchAddresses('test query');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.allowManual).toBe(true);
        expect(result.current.addresses).toEqual([]);
      });
    });
  });

  describe('Empty Results', () => {
    test('should handle no results gracefully', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          addresses: [],
          total: 0,
          search_text: 'nonexistent address'
        })
      });

      // Act
      const { result } = renderHook(() => useHKAddressLookup());

      await act(async () => {
        await result.current.searchAddresses('nonexistent address');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.addresses).toEqual([]);
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Minimum Search Length', () => {
    test('should not search with less than 2 characters', async () => {
      // Act
      const { result } = renderHook(() => useHKAddressLookup());

      await act(async () => {
        await result.current.searchAddresses('a');
      });

      // Assert - should not call API
      expect(fetch).not.toHaveBeenCalled();
      expect(result.current.addresses).toEqual([]);
    });

    test('should search with 2 or more characters', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ addresses: [], total: 0, search_text: 'ab' })
      });

      // Act
      const { result } = renderHook(() => useHKAddressLookup());

      await act(async () => {
        await result.current.searchAddresses('ab');
      });

      // Assert
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Clear Function', () => {
    test('should clear addresses and error when clearAddresses is called', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          addresses: [
            {
              building: 'Test Building',
              street: 'Test Street',
              district: 'Test District',
              region: 'HK',
              formatted_address: 'Test Building, Test Street, Test District, HK',
              is_3d: false
            }
          ],
          total: 1,
          search_text: 'test'
        })
      });

      const { result } = renderHook(() => useHKAddressLookup());

      // First, perform a search
      await act(async () => {
        await result.current.searchAddresses('test');
      });

      await waitFor(() => {
        expect(result.current.addresses).toHaveLength(1);
      });

      // Act - clear addresses
      act(() => {
        result.current.clearAddresses();
      });

      // Assert
      expect(result.current.addresses).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });
});
