import config from "../config";
import httpService from "./httpService";
import { createCrudService } from "./createCrudService";

const API_URL = `${(config as any).catalogUrl}/bundle-products`;

const catalogBundleProductService = {
    ...createCrudService({
        apiUrl: API_URL,
        resourceName: "catalog bundle products",
    }),

    // ─── Get by Bundle ID ────────────────────────────────────
    getByBundleId: async (bundleId: number | string) => {
        try {
            const response = await httpService.get(`${API_URL}/?bundle=${bundleId}`);
            if (!response.data) return [];
            return Array.isArray(response.data)
                ? response.data
                : response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching bundle products for bundle:", error);
            return [];
        }
    },
};

export default catalogBundleProductService;
