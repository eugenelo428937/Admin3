import config from "../config";
import httpService from "./httpService";

// Search endpoints are now on the catalog API (002-catalog-api-consolidation)
const SEARCH_API_URL = (config as any).catalogUrl;
// Default search data endpoint is on the search API
const SEARCH_DEFAULT_API_URL = `${(config as any).apiBaseUrl ?? ''}/api/search`;

interface SearchFilters {
    subjects: any[];
    product_groups: any[];
    variations: any[];
    products: any[];
}

interface SearchResult {
    suggested_filters: SearchFilters;
    suggested_products: any[];
    search_info?: Record<string, any>;
    total_count: number;
}

interface AdvancedSearchParams {
    q?: string;
    subjects?: string[];
    groups?: string[];
    variations?: string[];
    products?: string[];
    page_size?: number;
    [key: string]: any;
}

interface AdvancedSearchResult {
    results: any[];
    count: number;
    has_next: boolean;
    has_previous: boolean;
    search_info: Record<string, any>;
    suggested_filters: Record<string, any>;
}

const searchService = {
    // ─── Fuzzy Search ────────────────────────────────────────
    fuzzySearch: async (query: string): Promise<SearchResult> => {
        try {
            if (!query || query.trim() === '') {
                return {
                    suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
                    suggested_products: [],
                    total_count: 0,
                };
            }

            const response = await httpService.get(`${SEARCH_API_URL}/search/`, {
                params: { q: query.trim(), limit: 50 },
            });

            return {
                suggested_filters: response.data.suggested_filters || { subjects: [], product_groups: [], variations: [], products: [] },
                suggested_products: response.data.suggested_products || response.data.products || [],
                search_info: response.data.search_info || { query: response.data.query || '' },
                total_count: response.data.total_matches?.products || response.data.total_count || 0,
            };
        } catch (error: any) {
            console.error('FuzzyWuzzy search error:', error);

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

    // ─── Advanced Search ─────────────────────────────────────
    advancedSearch: async (searchParams: AdvancedSearchParams): Promise<AdvancedSearchResult> => {
        try {
            const params: Record<string, any> = {
                limit: searchParams.page_size || 50,
            };

            if (searchParams.q && searchParams.q.trim()) {
                params.q = searchParams.q.trim();
            }

            if (searchParams.subjects && searchParams.subjects.length > 0) {
                params.subjects = searchParams.subjects.join(',');
            }

            if (searchParams.groups && searchParams.groups.length > 0) {
                params.categories = searchParams.groups.join(',');
            }

            const response = await httpService.get(`${SEARCH_API_URL}/advanced-search/`, {
                params,
            });

            return {
                results: response.data.products || [],
                count: response.data.total_count || 0,
                has_next: false,
                has_previous: false,
                search_info: response.data.search_info || {},
                suggested_filters: response.data.suggested_filters || {},
            };
        } catch (error: any) {
            console.error('FuzzyWuzzy advanced search error:', error);

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

    // ─── Default Search Data ─────────────────────────────────
    getDefaultSearchData: async (): Promise<SearchResult> => {
        try {
            const response = await httpService.get(`${SEARCH_DEFAULT_API_URL}/default-data/`, {
                params: { limit: 5 },
            });

            return {
                suggested_filters: response.data.suggested_filters || { subjects: [], product_groups: [], variations: [], products: [] },
                suggested_products: response.data.popular_products || [],
                search_info: { query: '', type: 'default' },
                total_count: response.data.total_count || 0,
            };
        } catch (error: any) {
            console.error('Default search data error:', error);

            return {
                suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
                suggested_products: [],
                search_info: { query: '', type: error.response?.status === 404 ? 'fallback' : 'error' },
                total_count: 0,
            };
        }
    },

    // ─── Debounce utility ────────────────────────────────────
    debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => {
        let timeout: ReturnType<typeof setTimeout>;
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    },
};

export default searchService;
