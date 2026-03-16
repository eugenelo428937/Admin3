import config from "../config";
import httpService from "./httpService";
import { createAdminCrudService } from "./createCrudService";

const API_URL = `${(config as any).apiBaseUrl}/api/store/bundles`;
const ADMIN_API_URL = `${(config as any).apiBaseUrl}/api/store/admin-bundles`;

const storeBundleService = {
    ...createAdminCrudService({
        apiUrl: API_URL,
        adminApiUrl: ADMIN_API_URL,
        resourceName: "store bundles",
    }),

    // ─── Get Products for Bundle ─────────────────────────────
    getProducts: async (bundleId: number | string) => {
        try {
            const response = await httpService.get(
                `${ADMIN_API_URL}/${bundleId}/products/`
            );
            if (!response.data) return [];
            return Array.isArray(response.data)
                ? response.data
                : response.data.results || [];
        } catch (error) {
            console.error("Error fetching bundle products:", error);
            return [];
        }
    },
};

export default storeBundleService;
