import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import priceService from '../../../services/priceService';
import storeProductService from '../../../services/storeProductService';
import type { PriceInput } from '../../../types/price';
import type { StoreProduct } from '../../../types/storeProduct';

export interface PriceFormVM {
    // Auth
    isSuperuser: boolean;

    // Form state
    formData: PriceInput;
    storeProducts: StoreProduct[];
    loading: boolean;
    error: string | null;
    isEditMode: boolean;

    // Actions
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: unknown } }) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleCancel: () => void;
}

const usePriceFormVM = (): PriceFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isSuperuser } = useAuth();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<PriceInput>({
        product: '',
        price_type: '',
        amount: '',
        currency: 'GBP',
    });

    const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const productsData = await storeProductService.getAll();
                setStoreProducts(Array.isArray(productsData) ? productsData as StoreProduct[] : []);
            } catch (err) {
                console.error('Error fetching store products:', err);
                setError('Failed to load store products.');
            }
        };

        const fetchPrice = async () => {
            try {
                const data = await priceService.getById(id!);
                setFormData({
                    product: (data as any).product?.id || (data as any).product || '',
                    price_type: (data as any).price_type || '',
                    amount: (data as any).amount !== undefined ? (data as any).amount : '',
                    currency: (data as any).currency || 'GBP',
                });
            } catch (err) {
                setError('Failed to load price data.');
                console.error(err);
            }
        };

        const init = async () => {
            await fetchDropdownData();
            if (isEditMode) {
                await fetchPrice();
            }
            setLoading(false);
        };

        init();
    }, [id, isEditMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: unknown } }) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name as string]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.product || !formData.price_type || formData.amount === '') {
            setError('Please fill in all required fields (product, price type, and amount).');
            return;
        }

        if (isNaN(Number(formData.amount)) || Number(formData.amount) < 0) {
            setError('Amount must be a valid non-negative number.');
            return;
        }

        try {
            const submitData = {
                product: formData.product,
                price_type: formData.price_type,
                amount: formData.amount,
                currency: formData.currency,
            };

            if (isEditMode) {
                await priceService.update(id!, submitData);
            } else {
                await priceService.create(submitData);
            }
            navigate('/admin/prices');
        } catch (err: any) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} price: ${err.response?.data?.message || err.message}`);
            console.error(err);
        }
    };

    const handleCancel = () => {
        navigate('/admin/prices');
    };

    return {
        isSuperuser,
        formData, storeProducts, loading, error, isEditMode,
        handleChange, handleSubmit, handleCancel,
    };
};

export default usePriceFormVM;
