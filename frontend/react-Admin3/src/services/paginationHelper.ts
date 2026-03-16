/**
 * Parse a DRF paginated response into a standard format.
 * Handles both paginated ({count, results}) and unpaginated (array) responses.
 */
export const parsePaginatedResponse = <T = any>(
    data: { results?: T[]; count?: number } | T[] | null | undefined
): { results: T[]; count: number } => {
    if (!data) return { results: [], count: 0 };
    if (Array.isArray(data)) return { results: data, count: data.length };
    return {
        results: data.results || [],
        count: data.count || 0,
    };
};
