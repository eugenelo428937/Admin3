import { parsePhoneNumber, isValidPhoneNumber, getCountryCallingCode } from 'libphonenumber-js';
import config from '../config';

class PhoneValidationService {
  constructor() {
    // Cache for country data fetched from backend
    this.countriesCache = null;
    this.countriesFetchPromise = null;
  }

  /**
   * Fetch countries from backend API
   * @returns {Promise<Array>} List of countries with code and name
   */
  async fetchCountries() {
    // Return cached data if available
    if (this.countriesCache) {
      return this.countriesCache;
    }

    // Return existing promise if fetch is in progress
    if (this.countriesFetchPromise) {
      return this.countriesFetchPromise;
    }

    // Start new fetch
    this.countriesFetchPromise = fetch(config.apiBaseUrl + '/api/countries/')
      .then((res) => res.json())
      .then((data) => {
        const countries = Array.isArray(data) ? data : data.results || [];
        this.countriesCache = countries;
        this.countriesFetchPromise = null;
        return countries;
      })
      .catch((err) => {
        console.error('Failed to load countries from backend:', err);
        this.countriesFetchPromise = null;
        // Return empty array as fallback
        return [];
      });

    return this.countriesFetchPromise;
  }
  /**
   * Validates a phone number for a specific country
   * @param {string} phoneNumber - The phone number to validate
   * @param {string} countryCode - The ISO country code (e.g., 'US', 'GB', 'IN')
   * @returns {Promise<Object>} - Validation result with isValid, error, and formatted number
   */
  async validatePhoneNumber(phoneNumber, countryCode) {
    try {
      if (!phoneNumber || !phoneNumber.trim()) {
        return {
          isValid: false,
          error: 'Phone number is required',
          formattedNumber: null,
          parsedNumber: null
        };
      }

      if (!countryCode) {
        return {
          isValid: false,
          error: 'Country code is required for validation',
          formattedNumber: null,
          parsedNumber: null
        };
      }

      // Parse the phone number
      const parsedNumber = parsePhoneNumber(phoneNumber, countryCode);

      if (!parsedNumber) {
        return {
          isValid: false,
          error: 'Invalid phone number format',
          formattedNumber: null,
          parsedNumber: null
        };
      }

      // Check if the number is valid
      const isValid = parsedNumber.isValid();

      if (!isValid) {
        return {
          isValid: false,
          error: await this.getValidationErrorMessage(phoneNumber, countryCode),
          formattedNumber: null,
          parsedNumber: null
        };
      }

      return {
        isValid: true,
        error: null,
        formattedNumber: parsedNumber.formatNational(),
        internationalFormat: parsedNumber.formatInternational(),
        e164Format: parsedNumber.format('E.164'),
        parsedNumber: parsedNumber
      };

    } catch (error) {
      return {
        isValid: false,
        error: await this.getValidationErrorMessage(phoneNumber, countryCode),
        formattedNumber: null,
        parsedNumber: null
      };
    }
  }

  /**
   * Validates phone number without country context (international format)
   * @param {string} phoneNumber - The phone number in international format
   * @returns {Object} - Validation result
   */
  validateInternationalPhoneNumber(phoneNumber) {
    try {
      if (!phoneNumber || !phoneNumber.trim()) {
        return {
          isValid: false,
          error: 'Phone number is required',
          formattedNumber: null
        };
      }

      // Check if it's a valid international phone number
      const isValid = isValidPhoneNumber(phoneNumber);
      
      if (!isValid) {
        return {
          isValid: false,
          error: 'Invalid international phone number format',
          formattedNumber: null
        };
      }

      const parsedNumber = parsePhoneNumber(phoneNumber);
      
      return {
        isValid: true,
        error: null,
        formattedNumber: parsedNumber.formatNational(),
        internationalFormat: parsedNumber.formatInternational(),
        e164Format: parsedNumber.format('E.164'),
        country: parsedNumber.country,
        parsedNumber: parsedNumber
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid phone number format',
        formattedNumber: null
      };
    }
  }

  /**
   * Gets the calling code for a country
   * @param {string} countryCode - The ISO country code
   * @returns {string} - The calling code with + prefix
   */
  getCountryCallingCode(countryCode) {
    try {
      return `+${getCountryCallingCode(countryCode)}`;
    } catch (error) {
      return '';
    }
  }

  /**
   * Formats a phone number for display
   * @param {string} phoneNumber - The phone number to format
   * @param {string} countryCode - The ISO country code
   * @param {string} format - The format type ('national', 'international', 'e164')
   * @returns {string} - The formatted phone number
   */
  formatPhoneNumber(phoneNumber, countryCode, format = 'national') {
    try {
      const parsedNumber = parsePhoneNumber(phoneNumber, countryCode);
      
      if (!parsedNumber || !parsedNumber.isValid()) {
        return phoneNumber; // Return original if can't parse
      }

      switch (format.toLowerCase()) {
        case 'international':
          return parsedNumber.formatInternational();
        case 'e164':
          return parsedNumber.format('E.164');
        case 'national':
        default:
          return parsedNumber.formatNational();
      }
    } catch (error) {
      return phoneNumber; // Return original if formatting fails
    }
  }

  /**
   * Gets a user-friendly error message for validation failures
   * @param {string} phoneNumber - The phone number that failed validation
   * @param {string} countryCode - The country code used for validation
   * @returns {Promise<string>} - User-friendly error message
   */
  async getValidationErrorMessage(phoneNumber, countryCode) {
    if (!phoneNumber || !phoneNumber.trim()) {
      return 'Phone number is required';
    }

    if (!countryCode) {
      return 'Please select a country first';
    }

    // Check for common issues
    if (phoneNumber.length < 3) {
      return 'Phone number is too short';
    }

    if (phoneNumber.length > 20) {
      return 'Phone number is too long';
    }

    if (!/^[\d\s\-\+\(\)]+$/.test(phoneNumber)) {
      return 'Phone number contains invalid characters';
    }

    // Country-specific messages
    const countryName = await this.getCountryName(countryCode);
    return `Please enter a valid ${countryName} phone number`;
  }

  /**
   * Gets country name from country code
   * @param {string} countryCode - The ISO country code
   * @returns {Promise<string>} - Country name
   */
  async getCountryName(countryCode) {
    try {
      const countries = await this.fetchCountries();
      // Backend uses 'iso_code' field
      const country = countries.find((c) => c.iso_code === countryCode);

      if (country) {
        return country.name;
      }

      // Fallback to country code if not found
      return countryCode;
    } catch (error) {
      console.error('Error getting country name:', error);
      return countryCode;
    }
  }

  /**
   * Gets the ISO country code from country name
   * @param {string} countryName - The country name
   * @returns {Promise<string|null>} - ISO country code
   */
  async getCountryCodeFromName(countryName) {
    try {
      const countries = await this.fetchCountries();
      const country = countries.find((c) => c.name === countryName);

      if (country) {
        // Backend uses 'iso_code' field
        return country.iso_code;
      }

      // Fallback to null if not found
      return null;
    } catch (error) {
      console.error('Error getting country code from name:', error);
      return null;
    }
  }

  /**
   * Auto-detects country from phone number
   * @param {string} phoneNumber - The phone number to analyze
   * @returns {string|null} - The detected country code or null
   */
  detectCountryFromPhoneNumber(phoneNumber) {
    try {
      const parsedNumber = parsePhoneNumber(phoneNumber);
      return parsedNumber ? parsedNumber.country : null;
    } catch (error) {
      return null;
    }
  }
}

export default new PhoneValidationService();