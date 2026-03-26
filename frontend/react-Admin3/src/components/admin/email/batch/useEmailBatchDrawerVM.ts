import { useState, useCallback, useEffect } from 'react';
import emailService from '../../../../services/emailService';
import type { EmailBatch, EmailBatchEmail } from '../../../../types/email';

interface EmailBatchDrawerVM {
    batch: EmailBatch | null;
    emails: EmailBatchEmail[];
    loading: boolean;
    error: string | null;
    toFilter: string;
    totalCount: number;
    setToFilter: (value: string) => void;
}

export const useEmailBatchDrawerVM = (batchId: string | null): EmailBatchDrawerVM => {
    const [batch, setBatch] = useState<EmailBatch | null>(null);
    const [emails, setEmails] = useState<EmailBatchEmail[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toFilter, setToFilter] = useState('');
    const [totalCount, setTotalCount] = useState(0);

    const fetchBatch = useCallback(async () => {
        if (!batchId) return;
        try {
            const data = await emailService.getBatchById(batchId);
            setBatch(data);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load batch');
        }
    }, [batchId]);

    const fetchEmails = useCallback(async () => {
        if (!batchId) return;
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, any> = { page_size: 50 };
            if (toFilter) {
                params.to_email = toFilter;
            }
            const response = await emailService.getBatchEmails(batchId, params);
            setEmails(response.results);
            setTotalCount(response.count);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load emails');
            setEmails([]);
        } finally {
            setLoading(false);
        }
    }, [batchId, toFilter]);

    useEffect(() => {
        if (batchId) {
            setBatch(null);
            setEmails([]);
            setToFilter('');
            fetchBatch();
            fetchEmails();
        }
    }, [batchId, fetchBatch, fetchEmails]);

    return {
        batch,
        emails,
        loading,
        error,
        toFilter,
        totalCount,
        setToFilter,
    };
};
