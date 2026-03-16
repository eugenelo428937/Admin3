/**
 * Product Service Facade
 *
 * @deprecated Use domain-specific services directly:
 *   - navigationService: getNavigationData()
 *   - markingService: getMarkingDeadlines(), getBulkMarkingDeadlines()
 *   - markingVoucherService: getMarkingVouchers(), getMarkingVoucherById(), addMarkingVoucherToCart()
 *   - catalogProductService: CRUD operations, bulkImport()
 *   - storeProductService: getAvailableProducts()
 *   - searchService: fuzzySearch()
 */
import config from "../config";
import httpService from "./httpService";
import navigationService from "./navigationService";
import markingService from "./markingService";
import markingVoucherService from "./markingVoucherService";

const PRODUCTS_API_URL = (config as any).productsUrl || `${(config as any).apiBaseUrl}/products`;
const CATALOG_API_URL = (config as any).catalogUrl || `${(config as any).apiBaseUrl}/catalog`;
const STORE_API_URL = (config as any).productsUrl
    ? (config as any).productsUrl.replace('/products', '/store')
    : `${(config as any).apiBaseUrl}/store`;

const productService = {
    // ─── Delegated: Navigation ───────────────────────────────
    getNavigationData: navigationService.getNavigationData,

    // ─── Delegated: Marking ──────────────────────────────────
    getMarkingDeadlines: markingService.getMarkingDeadlines,
    getBulkMarkingDeadlines: markingService.getBulkMarkingDeadlines,

    // ─── Delegated: Marking Vouchers ─────────────────────────
    getMarkingVouchers: markingVoucherService.getMarkingVouchers,
    getMarkingVoucherById: markingVoucherService.getMarkingVoucherById,
    addMarkingVoucherToCart: markingVoucherService.addMarkingVoucherToCart,

    // ─── Products (kept for backward compat) ─────────────────
    getAll: async (params: Record<string, any> = {}) => {
        try {
            const response = await httpService.get(
                `${PRODUCTS_API_URL}/products/`,
                { params }
            );
            return response.data.results || response.data;
        } catch (error: any) {
            console.error("ProductService API error:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to fetch products",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    getAvailableProducts: async (params: any = {}, page: number = 1, pageSize: number = 50) => {
        try {
            const paginationParams = new URLSearchParams(params);
            paginationParams.append('page', String(page));
            paginationParams.append('page_size', String(pageSize));

            const response = await httpService.get(
                `${STORE_API_URL}/products/`,
                { params: paginationParams }
            );
            return response.data;
        } catch (error: any) {
            console.error("Error fetching available products:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to fetch available products",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    getById: async (id: number | string) => {
        try {
            const response = await httpService.get(`${PRODUCTS_API_URL}/${id}/`);
            return response.data;
        } catch (error: any) {
            console.error("Error fetching product by ID:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to fetch product",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    create: async (productData: any) => {
        try {
            const response = await httpService.post(`${PRODUCTS_API_URL}/`, productData);
            return response.data;
        } catch (error: any) {
            console.error("Error creating product:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to create product",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    update: async (id: number | string, productData: any) => {
        try {
            const response = await httpService.put(`${PRODUCTS_API_URL}/${id}/`, productData);
            return response.data;
        } catch (error: any) {
            console.error("Error updating product:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to update product",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    delete: async (id: number | string) => {
        try {
            await httpService.delete(`${PRODUCTS_API_URL}/products/${id}/`);
            return { success: true };
        } catch (error: any) {
            console.error("Error deleting product:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to delete product",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    bulkImport: async (productsData: any[]) => {
        try {
            const response = await httpService.post(
                `${PRODUCTS_API_URL}/products/bulk-import/`,
                { products: productsData }
            );
            return response.data;
        } catch (error: any) {
            console.error("Error bulk importing products:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to bulk import products",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    getBundles: async (params: Record<string, any> = {}) => {
        try {
            const response = await httpService.get(`${PRODUCTS_API_URL}/bundles/`, { params });
            return response.data.results || response.data;
        } catch (error: any) {
            console.error("Error fetching exam session bundles:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to fetch exam session bundles",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    getProductsAndBundles: async (params: any = {}, page: number = 1, pageSize: number = 50) => {
        try {
            const response = await productService.getAvailableProducts(params, page, pageSize);
            return {
                results: response.results || [],
                count: response.count || 0,
                products_count: response.products_count || 0,
                bundles_count: response.bundles_count || 0,
                page: response.page || page,
                has_next: response.has_next || false,
                has_previous: response.has_previous || false,
            };
        } catch (error: any) {
            console.error("Error fetching products and bundles:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to fetch products and bundles",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    getBundleContents: async (bundleId: number | string) => {
        try {
            const response = await httpService.get(
                `${PRODUCTS_API_URL}/products/${bundleId}/bundle-contents/`
            );
            return response.data;
        } catch (error: any) {
            console.error("Error fetching bundle contents:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to fetch bundle contents",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    getFilterConfiguration: async (filterTypes: string[] = []) => {
        try {
            const params = filterTypes.length > 0 ? { types: filterTypes } : {};
            const response = await httpService.get(
                `${PRODUCTS_API_URL}/filter-configuration/`,
                { params }
            );
            return response.data;
        } catch (error: any) {
            console.error("Error fetching filter configuration:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to fetch filter configuration",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },

    searchProducts: async (params: Record<string, any> = {}) => {
        try {
            const response = await httpService.get(`${CATALOG_API_URL}/search/`, { params });
            return {
                data: response.data.results || response.data || [],
            };
        } catch (error: any) {
            console.error("Error searching products:", error);
            throw {
                message: error.response?.data?.message || error.message || "Failed to search products",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },
};

export default productService;
