import config from "../config";
import httpService from "./httpService";

// Use the new fuzzy search endpoints
const SEARCH_API_URL = `${config.productsUrl}/current`;

const searchService = {
    // Fuzzy search for suggestions using our new FuzzyWuzzy backend
    fuzzySearch: async (query) => {
        try {
            console.log('🔍 [SearchService] FuzzyWuzzy search for:', query);
            
            if (!query || query.trim() === '') {
                return {
                    suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
                    suggested_products: []
                };
            }
            
            // Use the new fuzzy search endpoint
            const response = await httpService.get(`${SEARCH_API_URL}/fuzzy-search/`, {
                params: { 
                    q: query.trim(),
                    min_score: 60,
                    limit: 50
                }
            });
            
            console.log('🔍 [SearchService] FuzzyWuzzy API response:', response.data);
            
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
            console.log('🔍 [SearchService] FuzzyWuzzy advanced search with params:', searchParams);
            console.log('🔍 [SearchService] searchParams.q details:', {
                value: searchParams.q,
                typeof: typeof searchParams.q,
                isEmpty: !searchParams.q,
                trimmed: searchParams.q?.trim(),
                length: searchParams.q?.length
            });
            
            // Build parameters for the advanced fuzzy search endpoint
            const params = {
                min_score: 60,
                limit: searchParams.page_size || 50
            };
            
            // Add query if provided
            if (searchParams.q && searchParams.q.trim()) {
                params.q = searchParams.q.trim();
                console.log('🔍 [SearchService] Added q parameter:', params.q);
            } else {
                console.log('🔍 [SearchService] NO q parameter added - searchParams.q is falsy or empty');
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
                console.warn('Variation filters not yet implemented in fuzzy search backend');
            }
            
            // Add product filters
            if (searchParams.products && searchParams.products.length > 0) {
                // This would need to be implemented in the backend
                console.warn('Product filters not yet implemented in fuzzy search backend');
            }
            
            console.log('🔍 [SearchService] Making advanced fuzzy search request with params:', params);
            
            const requestUrl = `${SEARCH_API_URL}/advanced-fuzzy-search/`;
            console.log('🔍 [SearchService] Request URL:', requestUrl);
            console.log('🔍 [SearchService] Final request params being sent:', JSON.stringify(params, null, 2));
            
            // Use the new advanced fuzzy search endpoint
            const response = await httpService.get(requestUrl, {
                params: params
            });
            
            console.log('🔍 [SearchService] FuzzyWuzzy advanced search results:', {
                totalProducts: response.data.total_count,
                returnedProducts: response.data.products?.length,
                searchParams
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
            console.log('🏠 [SearchService] Getting default search data');
            
            // Use the same endpoint but without query to get popular/default data
            const response = await httpService.get(`${SEARCH_API_URL}/default-search-data/`, {
                params: { 
                    limit: 5 // Get top 5 for each category
                }
            });
            
            console.log('🏠 [SearchService] Default search data response:', response.data);
            
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
                console.log('🏠 [SearchService] Default endpoint not found, using fallback');
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