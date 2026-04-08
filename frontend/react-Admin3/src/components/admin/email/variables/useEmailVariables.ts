/**
 * Fetches the flat list of registered email variables from
 * `GET /api/email/variables/tree/`.
 *
 * NOTE: the approved design spec calls this an "RTK Query hook", but the
 * existing email admin area does not use RTK Query — it uses `httpService`
 * via `emailService`. To stay consistent with the rest of the email admin
 * (templates, batches, queue, placeholders all use emailService), this hook
 * is implemented as a plain React hook over httpService. Migrating the whole
 * email admin to RTK Query is out of scope for Session B.
 */

import { useEffect, useState, useCallback } from 'react';
import httpService from '../../../../services/httpService';
import config from '../../../../config';
import type { EmailVariableRow } from './variableTree';

const BASE_URL = `${(config as any).emailUrl}`;

interface UseEmailVariablesResult {
    data: EmailVariableRow[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useEmailVariables(): UseEmailVariablesResult {
    const [data, setData] = useState<EmailVariableRow[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVariables = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await httpService.get(`${BASE_URL}/variables/tree/`);
            const payload = response.data;
            const rows: EmailVariableRow[] = Array.isArray(payload)
                ? payload
                : (payload?.variables ?? []);
            setData(rows);
        } catch (err: any) {
            setError(err?.message ?? 'Failed to load email variables');
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchVariables();
    }, [fetchVariables]);

    return { data, isLoading, error, refetch: fetchVariables };
}
