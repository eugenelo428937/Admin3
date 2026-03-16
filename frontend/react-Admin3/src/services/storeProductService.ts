import config from "../config";
import httpService from "./httpService";
import { createAdminCrudService } from "./createCrudService";

const API_URL = `${(config as any).apiBaseUrl}/api/store/products`;
const ADMIN_API_URL = `${(config as any).apiBaseUrl}/api/store/admin-products`;

const storeProductService = {
    ...createAdminCrudService({
        apiUrl: API_URL,
        adminApiUrl: ADMIN_API_URL,
        resourceName: "store products",
    }),

    // ─── Get by Catalog Product ──────────────────────────────
    getByCatalogProduct: async (catalogProductId: number | string) => {
        try {
            const response = await httpService.get(`${ADMIN_API_URL}/`, {
                params: { catalog_product_id: catalogProductId },
            });
            if (!response.data) return [];
            return Array.isArray(response.data)
                ? response.data
                : response.data.results || [];
        } catch (error) {
            console.error("Error fetching store products by catalog product:", error);
            return [];
        }
    },
};

export default storeProductService;
