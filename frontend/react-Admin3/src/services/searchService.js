import config from "../config";
import httpService from "./httpService";

// Search endpoints are now on the products API (not /current/ which was ESSP)
const SEARCH_API_URL = config.productsUrl;
// Default search data endpoint is on the search API
const SEARCH_DEFAULT_API_URL = `${config.apiBaseUrl || config.apiUrl}/api/search`;

const searchService = {
    // Fuzzy search for suggestions using our new FuzzyWuzzy backend
    fuzzySearch: async (query) => {
        try {
            
            if (!query || query.trim() === '') {
                return {
                    suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
                    suggested_products: []
                };
            }
            
            // Use the products search endpoint
            // Note: min_score is not specified here, so it uses the backend default from FUZZY_SEARCH_MIN_SCORE env var
            const response = await httpService.get(`${SEARCH_API_URL}/search/`, {
                params: {
                    q: query.trim(),
                    // min_score: Backend will use FUZZY_SEARCH_MIN_SCORE from .env
                    limit: 50
                }
            });
            
            
            // The backend returns the data in the correct format
            return {
                suggested_filters: response.data.suggested_filters || { subjects: [], product_groups: [], variations: [], products: [] },
                suggested_products: response.data.products || [],
                search_info: response.data.search_info || {},
                total_count: response.data.total_count || 0
            };
            
        } catch (error) {
            console.error('FuzzyWuzzy search error:', error);
            
            // Handle different types of errors
            if (!error.response) {
                throw new Error('Cannot connect to server. Please ensure the Django server is running.');
            } else if (error.response.status === 404) {
                throw new Error('Search endpoint not found. Please check your API configuration.');
            } else if (error.response.status >= 500) {
                throw new Error('Server error occurred. Please try again later.');
            } else {
                throw new Error(error.response?.data?.error || error.response?.data?.message || error.message || 'Search failed');
            }
        }
    },

    // Advanced search with filters using our new FuzzyWuzzy backend
    advancedSearch: async (searchParams) => {
        try {
            
            // Build parameters for the advanced fuzzy search endpoint
            // Note: min_score is not specified here, so it uses the backend default from FUZZY_SEARCH_MIN_SCORE env var
            const params = {
                // min_score: Backend will use FUZZY_SEARCH_MIN_SCORE from .env
                limit: searchParams.page_size || 50
            };
            
            // Add query if provided
            if (searchParams.q && searchParams.q.trim()) {
                params.q = searchParams.q.trim();
            } else {
            }
            
            // Add subject filters (convert subject codes to IDs if needed)
            if (searchParams.subjects && searchParams.subjects.length > 0) {
                // If we have subject codes, we might need to convert them to IDs
                // For now, assume they are already IDs or the backend can handle codes
                params.subjects = searchParams.subjects.join(',');
            }
            
            // Add group filters 
            if (searchParams.groups && searchParams.groups.length > 0) {
                params.categories = searchParams.groups.join(',');
            }
            
            // Add variation filters
            if (searchParams.variations && searchParams.variations.length > 0) {
                // This would need to be implemented in the backend

            }
            
            // Add product filters
            if (searchParams.products && searchParams.products.length > 0) {
                // This would need to be implemented in the backend

            }
            
            const requestUrl = `${SEARCH_API_URL}/advanced-search/`;

            // Use the products advanced search endpoint
            const response = await httpService.get(requestUrl, {
                params: params
            });
            
            
            return {
                results: response.data.products || [],
                count: response.data.total_count || 0,
                has_next: false, // Our fuzzy search doesn't support pagination yet
                has_previous: false,
                search_info: response.data.search_info || {},
                suggested_filters: response.data.suggested_filters || {}
            };
            
        } catch (error) {
            console.error('FuzzyWuzzy advanced search error:', error);
            
            // Handle different types of errors
            if (!error.response) {
                throw new Error('Cannot connect to server. Please ensure the Django server is running.');
            } else if (error.response.status === 404) {
                throw new Error('Advanced search endpoint not found. Please check your API configuration.');
            } else if (error.response.status >= 500) {
                throw new Error('Server error occurred. Please try again later.');
            } else {
                throw new Error(error.response?.data?.error || error.response?.data?.message || error.message || 'Advanced search failed');
            }
        }
    },

    // Get default filters and popular products when no search query
    getDefaultSearchData: async () => {
        try {
            
            // Use the search API default-data endpoint
            const response = await httpService.get(`${SEARCH_DEFAULT_API_URL}/default-data/`, {
                params: { 
                    limit: 5 // Get top 5 for each category
                }
            });
            
            
            return {
                suggested_filters: response.data.suggested_filters || { 
                    subjects: [], 
                    product_groups: [], 
                    variations: [], 
                    products: [] 
                },
                suggested_products: response.data.popular_products || [],
                search_info: { query: '', type: 'default' },
                total_count: response.data.total_count || 0
            };
            
        } catch (error) {
            console.error('Default search data error:', error);
            
            // If the specific endpoint doesn't exist, try to fallback to existing endpoints
            if (error.response?.status === 404) {
                try {
                    // Try to get some basic data from existing endpoints
                    return {
                        suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
                        suggested_products: [],
                        search_info: { query: '', type: 'fallback' },
                        total_count: 0
                    };
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                }
            }
            
            // Return safe empty data for all errors
            return {
                suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
                suggested_products: [],
                search_info: { query: '', type: 'error' },
                total_count: 0
            };
        }
    },

    // Debounced search function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

export default searchService; 