// Address Validation Service
// Validates addresses against Postcoder API and compares user-entered addresses with API suggestions.

import config from '../config.js';
import addressMetadataService from './addressMetadataService.ts';
import type { AddressLookupValidationResult, AddressDifference, PostcoderAddress } from '../types/address';

interface AddressInput {
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  [key: string]: string | undefined;
}

const addressValidationService = {
  /**
   * Validate an address by looking it up in the Postcoder API
   */
  async validateAddress(address: AddressInput): Promise<AddressLookupValidationResult> {
    if (!address || !address.country) {
      return { hasMatch: false, bestMatch: null, needsComparison: false, error: 'Invalid address' };
    }

    const countryCode = addressMetadataService.getCountryCode(address.country);

    const searchQuery = this.buildSearchQuery(address);

    if (!searchQuery) {
      return { hasMatch: false, bestMatch: null, needsComparison: false, error: 'No search query' };
    }

    try {
      let queryParams = `query=${encodeURIComponent(searchQuery)}&country=${countryCode}`;

      if (address.postal_code && countryCode === 'GB') {
        queryParams += `&postcode=${encodeURIComponent(address.postal_code)}`;
      }

      const response = await fetch(
        `${(config as any).apiBaseUrl}/api/utils/address-lookup/?${queryParams}`
      );

      if (!response.ok) {
        return { hasMatch: false, bestMatch: null, needsComparison: false, error: 'API error' };
      }

      const data = await response.json();
      const addresses: PostcoderAddress[] = data.addresses || [];

      if (addresses.length === 0) {
        return { hasMatch: false, bestMatch: null, needsComparison: false };
      }

      const bestAutocompleteMatch = addresses[0];

      let fullAddressDetails: PostcoderAddress = bestAutocompleteMatch;
      if (bestAutocompleteMatch.id) {
        try {
          const retrieveResponse = await fetch(
            `${(config as any).apiBaseUrl}/api/utils/address-retrieve/?id=${encodeURIComponent(bestAutocompleteMatch.id)}&country=${countryCode}`
          );
          if (retrieveResponse.ok) {
            const retrieveData = await retrieveResponse.json();
            if (retrieveData.addresses && retrieveData.addresses.length > 0) {
              fullAddressDetails = retrieveData.addresses[0];
            }
          }
        } catch (retrieveError) {
          console.warn('Failed to retrieve full address details:', retrieveError);
        }
      }

      const bestMatch = this.transformApiAddress(fullAddressDetails, address.country);

      const needsComparison = !this.compareAddresses(address as Record<string, string>, bestMatch);

      return {
        hasMatch: true,
        bestMatch,
        needsComparison,
        allMatches: addresses.map(addr => this.transformApiAddress(addr, address.country!))
      };
    } catch (error) {
      console.error('Address validation error:', error);
      return { hasMatch: false, bestMatch: null, needsComparison: false, error: (error as Error).message };
    }
  },

  /**
   * Build a search query from address components
   */
  buildSearchQuery(address: AddressInput): string {
    const parts: string[] = [];

    if (address.address) parts.push(address.address);
    if (address.city) parts.push(address.city);

    return parts.join(' ').trim();
  },

  /**
   * Transform API response address to standard format
   */
  transformApiAddress(apiAddress: PostcoderAddress, country?: string): Record<string, string> {
    return {
      building: apiAddress.building_name || '',
      address: apiAddress.line_1 || '',
      district: apiAddress.line_3 || '',
      city: apiAddress.town_or_city || '',
      county: apiAddress.county || '',
      state: apiAddress.state || '',
      postal_code: apiAddress.postcode || '',
      country: apiAddress.country || country || ''
    };
  },

  /**
   * Compare two addresses to determine if they are effectively the same
   */
  compareAddresses(addr1: Record<string, string>, addr2: Record<string, string>): boolean {
    if (!addr1 || !addr2) return false;

    const normalize = (val: string | undefined): string => (val || '').toLowerCase().replace(/\s+/g, ' ').trim();

    const fieldsToCompare = ['address', 'city', 'postal_code'];

    for (const field of fieldsToCompare) {
      const val1 = normalize(addr1[field]);
      const val2 = normalize(addr2[field]);

      if (!val1 && !val2) continue;

      if (val1 !== val2) {
        return false;
      }
    }

    return true;
  },

  /**
   * Get differences between two addresses
   */
  getDifferences(addr1: Record<string, string>, addr2: Record<string, string>): Record<string, AddressDifference> {
    const normalize = (val: string | undefined): string => (val || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const differences: Record<string, AddressDifference> = {};

    const allFields = ['building', 'address', 'district', 'city', 'county', 'state', 'postal_code', 'country'];

    for (const field of allFields) {
      const val1 = normalize(addr1[field]);
      const val2 = normalize(addr2[field]);

      if (val1 !== val2) {
        differences[field] = {
          user: addr1[field] || '',
          suggested: addr2[field] || ''
        };
      }
    }

    return differences;
  }
};

export default addressValidationService;
