import { parsePhoneNumber, isValidPhoneNumber, getCountryCallingCode, type CountryCode } from 'libphonenumber-js';
import config from '../config';
import httpService from './httpService';

interface PhoneValidationResult {
    isValid: boolean;
    error: string | null;
    formattedNumber: string | null;
    internationalFormat?: string;
    e164Format?: string;
    country?: string;
    parsedNumber?: any;
}

// Cache for country data
let countriesCache: any[] | null = null;
let countriesFetchPromise: Promise<any[]> | null = null;

const phoneValidationService = {
    // ─── Fetch Countries ─────────────────────────────────────
    fetchCountries: async (): Promise<any[]> => {
        if (countriesCache) return countriesCache;
        if (countriesFetchPromise) return countriesFetchPromise;

        countriesFetchPromise = httpService.get(`${(config as any).apiBaseUrl}/api/countries/`)
            .then((response) => {
                const countries = Array.isArray(response.data)
                    ? response.data
                    : response.data.results || [];
                countriesCache = countries;
                countriesFetchPromise = null;
                return countries;
            })
            .catch((err) => {
                console.error('Failed to load countries from backend:', err);
                countriesFetchPromise = null;
                return [];
            });

        return countriesFetchPromise;
    },

    // ─── Validate Phone Number ───────────────────────────────
    validatePhoneNumber: async (phoneNumber: string, countryCode: string): Promise<PhoneValidationResult> => {
        try {
            if (!phoneNumber || !phoneNumber.trim()) {
                return { isValid: false, error: 'Phone number is required', formattedNumber: null };
            }

            if (!countryCode) {
                return { isValid: false, error: 'Country code is required for validation', formattedNumber: null };
            }

            const parsedNumber = parsePhoneNumber(phoneNumber, countryCode as CountryCode);

            if (!parsedNumber) {
                return { isValid: false, error: 'Invalid phone number format', formattedNumber: null };
            }

            if (!parsedNumber.isValid()) {
                return {
                    isValid: false,
                    error: await phoneValidationService.getValidationErrorMessage(phoneNumber, countryCode),
                    formattedNumber: null,
                };
            }

            return {
                isValid: true,
                error: null,
                formattedNumber: parsedNumber.formatNational(),
                internationalFormat: parsedNumber.formatInternational(),
                e164Format: parsedNumber.format('E.164'),
                parsedNumber,
            };
        } catch (error) {
            return {
                isValid: false,
                error: await phoneValidationService.getValidationErrorMessage(phoneNumber, countryCode),
                formattedNumber: null,
            };
        }
    },

    // ─── Validate International Phone Number ─────────────────
    validateInternationalPhoneNumber: (phoneNumber: string): PhoneValidationResult => {
        try {
            if (!phoneNumber || !phoneNumber.trim()) {
                return { isValid: false, error: 'Phone number is required', formattedNumber: null };
            }

            const isValid = isValidPhoneNumber(phoneNumber);

            if (!isValid) {
                return { isValid: false, error: 'Invalid international phone number format', formattedNumber: null };
            }

            const parsedNumber = parsePhoneNumber(phoneNumber);

            return {
                isValid: true,
                error: null,
                formattedNumber: parsedNumber.formatNational(),
                internationalFormat: parsedNumber.formatInternational(),
                e164Format: parsedNumber.format('E.164'),
                country: parsedNumber.country,
                parsedNumber,
            };
        } catch (error) {
            return { isValid: false, error: 'Invalid phone number format', formattedNumber: null };
        }
    },

    // ─── Get Country Calling Code ────────────────────────────
    getCountryCallingCode: (countryCode: string): string => {
        try {
            return `+${getCountryCallingCode(countryCode as CountryCode)}`;
        } catch (error) {
            return '';
        }
    },

    // ─── Format Phone Number ─────────────────────────────────
    formatPhoneNumber: (phoneNumber: string, countryCode: string, format: string = 'national'): string => {
        try {
            const parsedNumber = parsePhoneNumber(phoneNumber, countryCode as CountryCode);

            if (!parsedNumber || !parsedNumber.isValid()) {
                return phoneNumber;
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
            return phoneNumber;
        }
    },

    // ─── Get Validation Error Message ────────────────────────
    getValidationErrorMessage: async (phoneNumber: string, countryCode: string): Promise<string> => {
        if (!phoneNumber || !phoneNumber.trim()) return 'Phone number is required';
        if (!countryCode) return 'Please select a country first';
        if (phoneNumber.length < 3) return 'Phone number is too short';
        if (phoneNumber.length > 20) return 'Phone number is too long';
        if (!/^[\d\s\-\+\(\)]+$/.test(phoneNumber)) return 'Phone number contains invalid characters';

        const countryName = await phoneValidationService.getCountryName(countryCode);
        return `Please enter a valid ${countryName} phone number`;
    },

    // ─── Get Country Name ────────────────────────────────────
    getCountryName: async (countryCode: string): Promise<string> => {
        try {
            const countries = await phoneValidationService.fetchCountries();
            const country = countries.find((c: any) => c.iso_code === countryCode);
            return country ? country.name : countryCode;
        } catch (error) {
            console.error('Error getting country name:', error);
            return countryCode;
        }
    },

    // ─── Get Country Code from Name ──────────────────────────
    getCountryCodeFromName: async (countryName: string): Promise<string | null> => {
        try {
            const countries = await phoneValidationService.fetchCountries();
            const country = countries.find((c: any) => c.name === countryName);
            return country ? country.iso_code : null;
        } catch (error) {
            console.error('Error getting country code from name:', error);
            return null;
        }
    },

    // ─── Detect Country from Phone Number ────────────────────
    detectCountryFromPhoneNumber: (phoneNumber: string): string | null => {
        try {
            const parsedNumber = parsePhoneNumber(phoneNumber);
            return parsedNumber ? (parsedNumber.country || null) : null;
        } catch (error) {
            return null;
        }
    },
};

export default phoneValidationService;
