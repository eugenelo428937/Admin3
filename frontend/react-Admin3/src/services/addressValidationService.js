// frontend/react-Admin3/src/services/addressValidationService.js
import config from '../config';
import addressMetadataService from './addressMetadataService';

/**
 * Service for validating addresses against Postcoder API
 * and comparing user-entered addresses with API suggestions.
 */
const addressValidationService = {
  /**
   * Validate an address by looking it up in the Postcoder API
   * @param {Object} address - User-entered address
   * @param {string} address.address - Street address
   * @param {string} address.city - City/town
   * @param {string} address.postal_code - Postal code
   * @param {string} address.country - Country name
   * @returns {Promise<Object>} Validation result
   */
  async validateAddress(address) {
    if (!address || !address.country) {
      return { hasMatch: false, bestMatch: null, needsComparison: false, error: 'Invalid address' };
    }

    const countryCode = addressMetadataService.getCountryCode(address.country);

    // Build search query from address components
    const searchQuery = this.buildSearchQuery(address);

    if (!searchQuery) {
      return { hasMatch: false, bestMatch: null, needsComparison: false, error: 'No search query' };
    }

    try {
      // Build query parameters
      let queryParams = `query=${encodeURIComponent(searchQuery)}&country=${countryCode}`;

      // Add postcode if available (for UK addresses)
      if (address.postal_code && countryCode === 'GB') {
        queryParams += `&postcode=${encodeURIComponent(address.postal_code)}`;
      }

      const response = await fetch(
        `${config.apiBaseUrl}/api/utils/address-lookup/?${queryParams}`
      );

      if (!response.ok) {
        return { hasMatch: false, bestMatch: null, needsComparison: false, error: 'API error' };
      }

      const data = await response.json();
      const addresses = data.addresses || [];

      if (addresses.length === 0) {
        return { hasMatch: false, bestMatch: null, needsComparison: false };
      }

      // Get the best match (first result)
      const bestMatch = this.transformApiAddress(addresses[0], address.country);

      // Check if comparison is needed
      const needsComparison = !this.compareAddresses(address, bestMatch);

      return {
        hasMatch: true,
        bestMatch,
        needsComparison,
        allMatches: addresses.map(addr => this.transformApiAddress(addr, address.country))
      };
    } catch (error) {
      console.error('Address validation error:', error);
      return { hasMatch: false, bestMatch: null, needsComparison: false, error: error.message };
    }
  },

  /**
   * Build a search query from address components
   * @param {Object} address - Address object
   * @returns {string} Search query
   */
  buildSearchQuery(address) {
    const parts = [];

    if (address.address) parts.push(address.address);
    if (address.city) parts.push(address.city);

    return parts.join(' ').trim();
  },

  /**
   * Transform API response address to standard format
   * @param {Object} apiAddress - Address from API
   * @param {string} country - Country name
   * @returns {Object} Standardized address
   */
  transformApiAddress(apiAddress, country) {
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
   * @param {Object} addr1 - First address
   * @param {Object} addr2 - Second address
   * @returns {boolean} True if addresses are effectively the same
   */
  compareAddresses(addr1, addr2) {
    if (!addr1 || !addr2) return false;

    // Normalize a value for comparison
    const normalize = (val) => (val || '').toLowerCase().replace(/\s+/g, ' ').trim();

    // Key fields to compare
    const fieldsToCompare = ['address', 'city', 'postal_code'];

    for (const field of fieldsToCompare) {
      const val1 = normalize(addr1[field]);
      const val2 = normalize(addr2[field]);

      // If both are empty, continue
      if (!val1 && !val2) continue;

      // If one is empty but not the other, or values differ
      if (val1 !== val2) {
        return false;
      }
    }

    return true;
  },

  /**
   * Get differences between two addresses
   * @param {Object} addr1 - First address (user's)
   * @param {Object} addr2 - Second address (suggested)
   * @returns {Object} Object with differing fields
   */
  getDifferences(addr1, addr2) {
    const normalize = (val) => (val || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const differences = {};

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
