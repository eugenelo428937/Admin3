import { parsePhoneNumber, isValidPhoneNumber, getCountryCallingCode } from 'libphonenumber-js';

class PhoneValidationService {
  /**
   * Validates a phone number for a specific country
   * @param {string} phoneNumber - The phone number to validate
   * @param {string} countryCode - The ISO country code (e.g., 'US', 'GB', 'IN')
   * @returns {Object} - Validation result with isValid, error, and formatted number
   */
  validatePhoneNumber(phoneNumber, countryCode) {
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
          error: this.getValidationErrorMessage(phoneNumber, countryCode),
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
        error: this.getValidationErrorMessage(phoneNumber, countryCode),
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
   * @returns {string} - User-friendly error message
   */
  getValidationErrorMessage(phoneNumber, countryCode) {
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
    const countryName = this.getCountryName(countryCode);
    return `Please enter a valid ${countryName} phone number`;
  }

  /**
   * Gets country name from country code
   * @param {string} countryCode - The ISO country code
   * @returns {string} - Country name
   */
  getCountryName(countryCode) {
    const countryNames = {
      'US': 'US',
      'GB': 'UK',
      'IN': 'Indian',
      'ZA': 'South African',
      'AU': 'Australian',
      'CA': 'Canadian',
      'DE': 'German',
      'FR': 'French',
      'ES': 'Spanish',
      'IT': 'Italian',
      'NL': 'Dutch',
      'BE': 'Belgian',
      'CH': 'Swiss',
      'AT': 'Austrian',
      'SE': 'Swedish',
      'NO': 'Norwegian',
      'DK': 'Danish',
      'FI': 'Finnish',
      'IE': 'Irish',
      'PT': 'Portuguese',
      'GR': 'Greek',
      'PL': 'Polish',
      'CZ': 'Czech',
      'HU': 'Hungarian',
      'SK': 'Slovak',
      'SI': 'Slovenian',
      'HR': 'Croatian',
      'BG': 'Bulgarian',
      'RO': 'Romanian',
      'LT': 'Lithuanian',
      'LV': 'Latvian',
      'EE': 'Estonian',
      'HK': 'Hong Kong',
    };

    return countryNames[countryCode] || countryCode;
  }

  /**
   * Gets the ISO country code from country name
   * @param {string} countryName - The country name
   * @returns {string} - ISO country code
   */
  getCountryCodeFromName(countryName) {
    const countryMapping = {
      'United States': 'US',
      'United Kingdom': 'GB',
      'India': 'IN',
      'South Africa': 'ZA',
      'Australia': 'AU',
      'Canada': 'CA',
      'Germany': 'DE',
      'France': 'FR',
      'Spain': 'ES',
      'Italy': 'IT',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Switzerland': 'CH',
      'Austria': 'AT',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'Finland': 'FI',
      'Ireland': 'IE',
      'Portugal': 'PT',
      'Greece': 'GR',
      'Poland': 'PL',
      'Czech Republic': 'CZ',
      'Hungary': 'HU',
      'Slovakia': 'SK',
      'Slovenia': 'SI',
      'Croatia': 'HR',
      'Bulgaria': 'BG',
      'Romania': 'RO',
      'Lithuania': 'LT',
      'Latvia': 'LV',
      'Estonia': 'EE',
      'Hong Kong': 'HK'
    };

    return countryMapping[countryName] || null;
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