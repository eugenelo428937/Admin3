import config from "../config";
import httpService from "./httpService";
import { createCrudService } from "./createCrudService";

const API_URL = `${(config as any).catalogUrl}/products`;

const catalogProductService = {
    ...createCrudService({
        apiUrl: API_URL,
        resourceName: "catalog products",
    }),

    // ─── Bulk Import ─────────────────────────────────────────
    bulkImport: async (products: any[]) => {
        const response = await httpService.post(`${API_URL}/bulk-import/`, { products });
        return response.data;
    },
};

export default catalogProductService;
