import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import adminOrderService from '../../../services/adminOrderService';
import type { AdminOrderDetail } from '../../../types/admin-order.types';

const useOrderDetailVM = () => {
  const { isSuperuser } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await adminOrderService.getById(id);
      setOrder(data);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 404 ? 'Order not found' : 'Failed to load order');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  return { isSuperuser, order, loading, error, orderId: id };
};

export default useOrderDetailVM;
