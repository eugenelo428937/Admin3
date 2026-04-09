import httpService from "./httpService";
import config from "../config";
import type { LegacyProduct } from "../types/legacy-product.types";

interface LegacyProductSearchParams {
  q?: string;
  subject?: string;
  session?: string;
  delivery?: string;
  page?: number;
  page_size?: number;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const baseUrl = `${config.apiBaseUrl}/api/legacy/products`;

const legacyProductService = {
  async search(
    params: LegacyProductSearchParams = {}
  ): Promise<PaginatedResponse<LegacyProduct>> {
    const queryParams: Record<string, string> = {};

    if (params.q) queryParams.q = params.q;
    if (params.subject) queryParams.subject = params.subject;
    if (params.session) queryParams.session = params.session;
    if (params.delivery) queryParams.delivery = params.delivery;
    if (params.page) queryParams.page = String(params.page);
    if (params.page_size) queryParams.page_size = String(params.page_size);

    const response = await httpService.get(baseUrl, { params: queryParams });
    return response.data;
  },
};

export default legacyProductService;
