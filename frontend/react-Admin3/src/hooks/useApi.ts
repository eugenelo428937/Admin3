// frontend/react_Admin3/src/hooks/useApi.ts
import { useState, useCallback } from 'react';

interface UseApiReturn<T> {
    data: T | null;
    error: any;
    loading: boolean;
    execute: (...args: any[]) => Promise<T>;
}

export const useApi = <T = any>(apiFunc: (...args: any[]) => Promise<{ data: T }>): UseApiReturn<T> => {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const execute = useCallback(async (...args: any[]): Promise<T> => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiFunc(...args);
            setData(result.data);
            return result.data;
        } catch (err: any) {
            setError(err.response?.data || err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiFunc]);

    return {
        data,
        error,
        loading,
        execute
    };
};
