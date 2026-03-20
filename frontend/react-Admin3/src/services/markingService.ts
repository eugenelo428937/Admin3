import config from "../config";
import httpService from "./httpService";

const MARKING_API_URL = (config as any).markingUrl;

const markingService = {
    // ─── Get Marking Deadlines ───────────────────────────────
    getMarkingDeadlines: async (storeProductId: number | string) => {
        const response = await httpService.get(
            `${MARKING_API_URL}/papers/deadlines/?store_product_id=${storeProductId}`
        );
        return response.data;
    },

    // ─── Get Bulk Marking Deadlines ──────────────────────────
    getBulkMarkingDeadlines: async (storeProductIds: (number | string)[]) => {
        const response = await httpService.post(
            `${MARKING_API_URL}/papers/bulk-deadlines/`,
            { store_product_ids: storeProductIds }
        );
        return response.data;
    },
};

export default markingService;
