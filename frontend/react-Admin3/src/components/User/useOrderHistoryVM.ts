// src/components/User/useOrderHistoryVM.ts
import { useEffect, useState } from "react";
import cartService from "../../services/cartService.js";
import type { Order } from "../../types/auth";

export interface OrderHistoryVM {
  orders: Order[];
  loading: boolean;
  error: string;
}

export const useOrderHistoryVM = (): OrderHistoryVM => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await cartService.fetchOrders();
        setOrders(res.data || []);
      } catch (err) {
        setError("Failed to load order history.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return { orders, loading, error };
};
