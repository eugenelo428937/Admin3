import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { EmailTemplate, TemplateType } from '../../../../types/email';

export interface TemplateTypeOption {
    value: TemplateType | 'all';
    label: string;
}

export interface EmailTemplateListVM {
    templates: EmailTemplate[];
    loading: boolean;
    error: string | null;
    page: number;
    rowsPerPage: number;
    totalCount: number;
    filterTemplateType: TemplateType | 'all';
    templateTypeOptions: TemplateTypeOption[];
    fetchTemplates: () => Promise<void>;
    handleEdit: (id: number) => void;
    handleDelete: (id: number) => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
    setFilterTemplateType: (type: TemplateType | 'all') => void;
}

const useEmailTemplateListVM = (): EmailTemplateListVM => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(25);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [filterTemplateType, setFilterTemplateType] = useState<TemplateType | 'all'>('all');
    const [templateTypeOptions, setTemplateTypeOptions] = useState<TemplateTypeOption[]>([
        { value: 'all', label: 'All Types' },
    ]);

    useEffect(() => {
        let cancelled = false;
        emailService
            .getTemplateTypes()
            .then((choices) => {
                if (cancelled) return;
                setTemplateTypeOptions([
                    { value: 'all', label: 'All Types' },
                    ...choices.map((c) => ({ value: c.value as TemplateType, label: c.label })),
                ]);
            })
            .catch((err) => {
                console.error('Error fetching template types:', err);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const fetchTemplates = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, any> = {
                page: page + 1,
                page_size: rowsPerPage,
            };
            if (filterTemplateType !== 'all') {
                params.template_type = filterTemplateType;
            }
            const { results, count } = await emailService.getTemplates(params);
            setTemplates(results as EmailTemplate[]);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching email templates:', err);
            setError('Failed to fetch email templates. Please try again later.');
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterTemplateType]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleEdit = (id: number) => {
        navigate(`/admin/email/templates/${id}/edit`);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this email template?')) {
            return;
        }
        try {
            await emailService.deleteTemplate(id);
            await fetchTemplates();
        } catch (err) {
            console.error('Error deleting email template:', err);
            setError('Failed to delete email template. Please try again later.');
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
        templates,
        loading,
        error,
        page,
        rowsPerPage,
        totalCount,
        filterTemplateType,
        templateTypeOptions,
        fetchTemplates,
        handleEdit,
        handleDelete,
        handleChangePage,
        handleChangeRowsPerPage,
        setFilterTemplateType,
    };
};

export default useEmailTemplateListVM;
