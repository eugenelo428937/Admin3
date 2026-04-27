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
const storeProductsUrl = `${config.apiBaseUrl}/api/store/products`;

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
    // Loads all store.Product codes for the product-code filter combobox.
    // NOTE: voucher/fee Purchasables are NOT included — those item codes can
    // still be filtered server-side via free-text URL param if needed.
    const response = await httpService.get(`${storeProductsUrl}/`, {
      params: { page_size: 10000 },
    });
    const results = response.data?.results ?? response.data ?? [];
    return results
      .filter((p: { product_code?: string }) => Boolean(p.product_code))
      .map((p: { product_code: string; name?: string }) => ({
        code: p.product_code,
        name: p.name ?? '',
      }));
  },
};

export default adminOrderService;
