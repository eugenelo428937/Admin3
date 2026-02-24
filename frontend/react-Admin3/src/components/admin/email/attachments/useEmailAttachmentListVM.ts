import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { EmailAttachment } from '../../../../types/email';

export interface EmailAttachmentListVM {
    attachments: EmailAttachment[];
    loading: boolean;
    error: string | null;
    page: number;
    rowsPerPage: number;
    totalCount: number;
    fetchAttachments: () => Promise<void>;
    handleEdit: (id: number) => void;
    handleDelete: (id: number) => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const useEmailAttachmentListVM = (): EmailAttachmentListVM => {
    const navigate = useNavigate();
    const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(25);
    const [totalCount, setTotalCount] = useState<number>(0);

    const fetchAttachments = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await emailService.getAttachments({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setAttachments(results as EmailAttachment[]);
            setTotalCount(count);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching email attachments:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to fetch email attachments.');
            setAttachments([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    const handleEdit = (id: number) => {
        navigate(`/admin/email/attachments/${id}/edit`);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this attachment?')) {
            return;
        }
        try {
            await emailService.deleteAttachment(id);
            await fetchAttachments();
        } catch (err: any) {
            console.error('Error deleting email attachment:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to delete attachment.');
        }
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return {
        attachments,
        loading,
        error,
        page,
        rowsPerPage,
        totalCount,
        fetchAttachments,
        handleEdit,
        handleDelete,
        handleChangePage,
        handleChangeRowsPerPage,
    };
};

export default useEmailAttachmentListVM;
