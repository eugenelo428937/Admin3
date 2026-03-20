import config from "../config";
import httpService from "./httpService";

const MARKING_VOUCHERS_API_URL = `${(config as any).apiBaseUrl ?? ''}/api/marking-vouchers`;

const markingVoucherService = {
    // ─── Get Marking Vouchers ────────────────────────────────
    getMarkingVouchers: async (params: Record<string, any> = {}) => {
        try {
            const response = await httpService.get(
                `${MARKING_VOUCHERS_API_URL}/`,
                { params }
            );
            return response.data.results || response.data;
        } catch (error: any) {
            console.error("Error fetching marking vouchers:", error);
            throw {
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Failed to fetch marking vouchers",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    // ─── Get Marking Voucher by ID ───────────────────────────
    getMarkingVoucherById: async (id: number | string) => {
        try {
            const response = await httpService.get(
                `${MARKING_VOUCHERS_API_URL}/${id}/`
            );
            return response.data;
        } catch (error: any) {
            console.error("Error fetching marking voucher:", error);
            throw {
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Failed to fetch marking voucher",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    // ─── Add Marking Voucher to Cart ─────────────────────────
    addMarkingVoucherToCart: async (voucherId: number | string, quantity: number = 1) => {
        try {
            const response = await httpService.post(
                `${MARKING_VOUCHERS_API_URL}/add-to-cart/`,
                {
                    voucher_id: voucherId,
                    quantity: quantity,
                }
            );
            return response.data;
        } catch (error: any) {
            console.error("Error adding marking voucher to cart:", error);
            throw {
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Failed to add marking voucher to cart",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },
};

export default markingVoucherService;
