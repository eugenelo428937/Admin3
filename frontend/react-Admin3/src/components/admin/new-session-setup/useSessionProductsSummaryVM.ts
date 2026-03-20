import { useState, useEffect } from 'react';
import storeProductService from '../../../services/storeProductService';

// ─── Interfaces ───────────────────────────────────────────────

export interface SessionProduct {
  id: number;
  product_code: string;
  subject_code: string;
  product_name: string;
  variation_name: string;
  is_active: boolean;
}

export interface SessionProductsSummaryProps {
  sessionId: number | null;
}

export interface SessionProductsSummaryVM {
  products: SessionProduct[];
  loading: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────

const useSessionProductsSummaryVM = ({ sessionId }: SessionProductsSummaryProps): SessionProductsSummaryVM => {
  const [products, setProducts] = useState<SessionProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { results } = await storeProductService.adminList({ exam_session_id: sessionId, page_size: 500 });
        setProducts(results || []);
      } catch {
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [sessionId]);

  return { products, loading, error };
};

export default useSessionProductsSummaryVM;
