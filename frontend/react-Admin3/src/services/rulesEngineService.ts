import httpService from './httpService';
import type {
  EntryPoints,
  AcknowledgmentData,
  ExecuteRulesResponse,
  RulesEngineService,
} from '../types/rulesEngine';

// Entry point constants for consistency across the application
const ENTRY_POINTS: EntryPoints = {
    CHECKOUT_START: 'checkout_start',
    CHECKOUT_TERMS: 'checkout_terms',
    CHECKOUT_PREFERENCE: 'checkout_preference',
    CHECKOUT_PAYMENT: 'checkout_payment',
    PRODUCT_CARD_MOUNT: 'product_card_mount',
    PRODUCT_LIST_MOUNT: 'product_list_mount',
    HOME_PAGE_MOUNT: 'home_page_mount',
    USER_REGISTRATION: 'user_registration'
};

const rulesEngineService: RulesEngineService = {
    // Entry point constants for external use
    ENTRY_POINTS,

    /**
     * Execute rules at a specific entry point with given context
     */
    executeRules: async (entryPoint: string, context: Record<string, any> = {}): Promise<ExecuteRulesResponse> => {
        try {
            const response = await httpService.post('/api/rules/engine/execute/', {
                entryPoint,
                context
            });
            return response.data;
        } catch (error: any) {
            // Handle schema validation errors specifically
            if (error.response && error.response.status === 400 &&
                error.response.data && error.response.data.schema_validation_errors) {
                const schemaError: any = new Error('Schema validation failed');
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
    },

    /**
     * Acknowledge a rule in the session
     */
    acknowledgeRule: async (acknowledgmentData: AcknowledgmentData): Promise<any> => {
        try {
            const response = await httpService.post('/api/rules/acknowledge/', acknowledgmentData);
            return response.data;
        } catch (error) {
            console.error('Error acknowledging rule:', error);
            throw error;
        }
    }
};

export default rulesEngineService;
