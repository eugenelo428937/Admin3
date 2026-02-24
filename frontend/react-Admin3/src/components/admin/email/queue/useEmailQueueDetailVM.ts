import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { EmailQueue } from '../../../../types/email';

interface EmailQueueDetailVM {
    queueItem: EmailQueue | null;
    loading: boolean;
    error: string | null;
    fetchDetail: () => Promise<void>;
}

export const useEmailQueueDetailVM = (): EmailQueueDetailVM => {
    const { id } = useParams<{ id: string }>();

    const [queueItem, setQueueItem] = useState<EmailQueue | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDetail = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await emailService.getQueueItemById(Number(id));
            setQueueItem(data);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load queue item details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    return {
        queueItem,
        loading,
        error,
        fetchDetail,
    };
};
