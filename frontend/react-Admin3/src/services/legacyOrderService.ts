import httpService from './httpService';
import config from '../config';
import type { LegacyOrder } from '../types/legacy-order.types';

interface LegacyOrderSearchParams {
  ref?: string;
  name?: string;
  email?: string;
  session?: string;
  subject?: string;
  date_from?: string;
  date_to?: string;
  product?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const baseUrl = `${config.apiBaseUrl}/api/legacy/admin-orders`;

const legacyOrderService = {
  async search(
    params: LegacyOrderSearchParams = {},
  ): Promise<PaginatedResponse<LegacyOrder>> {
    const queryParams: Record<string, string> = {};

    if (params.ref) queryParams.ref = params.ref;
    if (params.name) queryParams.name = params.name;
    if (params.email) queryParams.email = params.email;
    if (params.session) queryParams.session = params.session;
    if (params.subject) queryParams.subject = params.subject;
    if (params.date_from) queryParams.date_from = params.date_from;
    if (params.date_to) queryParams.date_to = params.date_to;
    if (params.product) queryParams.product = params.product;
    if (params.ordering) queryParams.ordering = params.ordering;
    if (params.page) queryParams.page = String(params.page);
    if (params.page_size) queryParams.page_size = String(params.page_size);

    const response = await httpService.get(baseUrl, { params: queryParams });
    return response.data;
  },
};

export default legacyOrderService;
