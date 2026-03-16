import config from "../config";
import httpService from "./httpService";
import { createCrudService } from "./createCrudService";

const API_URL = `${(config as any).apiBaseUrl}/api/store/bundle-products`;

const storeBundleProductService = {
    ...createCrudService({
        apiUrl: API_URL,
        resourceName: "store bundle products",
    }),

    // ─── Get by Bundle ID ────────────────────────────────────
    getByBundleId: async (bundleId: number | string) => {
        try {
            const response = await httpService.get(
                `${(config as any).apiBaseUrl}/api/store/bundles/${bundleId}/products/`
            );
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

export default storeBundleProductService;
