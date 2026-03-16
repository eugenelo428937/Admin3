import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import catalogProductService from '../../../services/catalogProductService';

export interface ProductImportVM {
    file: File | null;
    preview: Record<string, any>[];
    loading: boolean;
    error: string | null;
    success: string | null;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleCancel: () => void;
}

const useProductImportVM = (): ProductImportVM => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFile(selectedFile);

        if (selectedFile) {
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (result: Papa.ParseResult<Record<string, any>>) => {
                    setPreview(result.data.slice(0, 5));
                    if (result.errors.length > 0) {
                        setError(`CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}`);
                    } else {
                        setError(null);
                    }
                },
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file to import');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (result: Papa.ParseResult<Record<string, any>>) => {
                    if (result.errors.length > 0) {
                        setError(`CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}`);
                        setLoading(false);
                        return;
                    }

                    try {
                        const products = result.data.map(product => ({
                            ...product,
                            active: product.active === 'true' || product.active === true,
                        }));

                        const response = await catalogProductService.bulkImport(products);
                        setSuccess(`Successfully imported ${response.created || products.length} products.`);
                        setFile(null);
                        setPreview([]);

                        setTimeout(() => {
                            navigate('/products');
                        }, 3000);
                    } catch (err: any) {
                        setError(`Import failed: ${err.message || 'Unknown error'}`);
                    } finally {
                        setLoading(false);
                    }
                },
            });
        } catch (err: any) {
            setError(`File processing error: ${err.message || 'Unknown error'}`);
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/products');
    };

    return {
        file, preview, loading, error, success,
        handleFileChange, handleSubmit, handleCancel,
    };
};

export default useProductImportVM;
