import config from "../config";
import httpService from "./httpService";
import { createCrudService } from "./createCrudService";

const API_URL = `${(config as any).apiBaseUrl}/api/store/prices`;

const priceService = {
    ...createCrudService({
        apiUrl: API_URL,
        resourceName: "prices",
    }),

    // ─── Get by Product ID ───────────────────────────────────
    getByProductId: async (productId: number | string) => {
        try {
            const response = await httpService.get(
                `${(config as any).apiBaseUrl}/api/store/products/${productId}/prices/`
            );
            if (!response.data) return [];
            return Array.isArray(response.data)
                ? response.data
                : response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching prices for product:", error);
            return [];
        }
    },
};

export default priceService;
