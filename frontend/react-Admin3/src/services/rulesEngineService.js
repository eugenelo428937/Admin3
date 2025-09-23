import httpService from './httpService';

// Entry point constants for consistency across the application
const ENTRY_POINTS = {
    CHECKOUT_START: 'checkout_start',
    CHECKOUT_TERMS: 'checkout_terms',
    CHECKOUT_PREFERENCE: 'checkout_preference',
    CHECKOUT_PAYMENT: 'checkout_payment',
    PRODUCT_CARD_MOUNT: 'product_card_mount',
    PRODUCT_LIST_MOUNT: 'product_list_mount',
    HOME_PAGE_MOUNT: 'home_page_mount',
    USER_REGISTRATION: 'user_registration'
};

const rulesEngineService = {
    // Entry point constants for external use
    ENTRY_POINTS,
    
    /**
     * Execute rules at a specific entry point with given context
     * @param {string} entryPoint - The entry point to execute rules for
     * @param {object} context - The context data to pass to the rules engine
     * @returns {Promise<object>} The response from the rules engine
     * @throws {SchemaValidationError} When context schema validation fails
     * @throws {Error} For other API errors
     */
    executeRules: async (entryPoint, context = {}) => {
        try {
            const response = await httpService.post('/api/rules/engine/execute/', {
                entryPoint,
                context
            });
            return response.data;
        } catch (error) {
            // Handle schema validation errors specifically
            if (error.response && error.response.status === 400 && 
                error.response.data && error.response.data.schema_validation_errors) {
                const schemaError = new Error('Schema validation failed');
                schemaError.name = 'SchemaValidationError';
                schemaError.schemaErrors = error.response.data.schema_validation_errors;
                schemaError.entryPoint = entryPoint;
                schemaError.context = context;
                schemaError.details = error.response.data.details || 'Context schema validation failed';
                throw schemaError;
            }
            // Re-throw other errors
            throw error;
        }
    }
};

export default rulesEngineService;
