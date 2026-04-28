import httpService from './httpService';
import config from '../config';
import type {
  AdminOrderListItem,
  AdminOrderDetail,
  PaginatedResponse,
} from '../types/admin-order.types';

export interface AdminOrderSearchParams {
  student_ref?: number | string;
  name?: string;
  email?: string;
  order_no?: number | string;
  product_code?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface ProductCodeOption {
  code: string;
  name: string;
}

const baseUrl = `${config.apiBaseUrl}/api/orders/admin`;

const adminOrderService = {
  async search(
    params: AdminOrderSearchParams = {},
  ): Promise<PaginatedResponse<AdminOrderListItem>> {
    const queryParams: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) {
        queryParams[k] = String(v);
      }
    });
    const response = await httpService.get(`${baseUrl}/`, { params: queryParams });
    return response.data;
  },

  async getById(id: number | string): Promise<AdminOrderDetail> {
    const response = await httpService.get(`${baseUrl}/${id}/`);
    return response.data;
  },

  async listProductCodes(): Promise<ProductCodeOption[]> {
    // Returns distinct purchasable codes appearing in actual order items
    // (products + vouchers + fees). Backed by /api/orders/admin/product-codes/.
    const response = await httpService.get(`${baseUrl}/product-codes/`);
    const results: ProductCodeOption[] = response.data ?? [];
    return results;
  },
};

export default adminOrderService;
