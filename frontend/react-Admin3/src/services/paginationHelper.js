/**
 * Parse a DRF paginated response into a standard format.
 * Handles both paginated ({count, results}) and unpaginated (array) responses.
 *
 * @param {Object|Array} data - The response.data from axios
 * @returns {{results: Array, count: number}}
 */
export const parsePaginatedResponse = (data) => {
    if (!data) return { results: [], count: 0 };
    if (Array.isArray(data)) return { results: data, count: data.length };
    return {
        results: data.results || [],
        count: data.count || 0,
    };
};
