import config from "../config";
import httpService from "./httpService";
import { createCrudService } from "./createCrudService";

const API_URL = `${(config as any).catalogUrl}/product-product-variations`;

const productProductVariationService = {
    ...createCrudService({
        apiUrl: API_URL,
        resourceName: "product-product variations",
    }),

    // ─── Get by Product ──────────────────────────────────────
    getByProduct: async (productId: number | string) => {
        const response = await httpService.get(`${API_URL}/`, {
            params: { product: productId },
        });
        if (!response.data) return [];
        return Array.isArray(response.data)
            ? response.data
            : response.data.results || [];
    },
};

export default productProductVariationService;
