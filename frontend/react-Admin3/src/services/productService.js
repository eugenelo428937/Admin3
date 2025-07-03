// src/services/productService.js
import config from "../config";
import httpService from "./httpService";

// Use fallback if productsUrl is not defined
const PRODUCTS_API_URL = config.productsUrl || `${config.apiBaseUrl || config.apiUrl}/products`;
const MARKING_API_URL = config.markingUrl;

const productService = {
	// Get all products with optional filtering
	getAll: async (params = {}) => {
		try {
			const response = await httpService.get(
				`${PRODUCTS_API_URL}/products/`,
				{ params }
			);
			return response.data.results || response.data;
		} catch (error) {
			console.error("ProductService API error:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch products",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Get product group filters
	getProductGroupFilters: async () => {
		try {
			const response = await httpService.get(
				`${PRODUCTS_API_URL}/product-group-filters/`
			);
			return response.data.results || response.data;
		} catch (error) {
			console.error("Error fetching product group filters:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch product group filters",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Get navbar product groups with their products
	getNavbarProductGroups: async () => {
		try {
			const response = await httpService.get(
				`${PRODUCTS_API_URL}/navbar-product-groups/`
			);
			return response.data.results || response.data;
		} catch (error) {
			console.error("Error fetching navbar product groups:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch navbar product groups",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Get available products from exam_sessions_subjects_products
	getAvailableProducts: async (params = {}, page = 1, pageSize = 50) => {
		try {
			// Add pagination parameters
			const paginationParams = new URLSearchParams(params);
			paginationParams.append('page', page);
			paginationParams.append('page_size', pageSize);

			const response = await httpService.get(
				`${PRODUCTS_API_URL}/current/list/`,
				{ params: paginationParams }
			);
			return response.data;
		} catch (error) {
			console.error("Error fetching available products:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch available products",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Get product by ID
	getById: async (id) => {
		try {
			const response = await httpService.get(`${PRODUCTS_API_URL}/${id}/`);
			return response.data;
		} catch (error) {
			console.error("Error fetching product by ID:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch product",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Create product
	create: async (productData) => {
		try {
			const response = await httpService.post(
				`${PRODUCTS_API_URL}/`,
				productData
			);
			return response.data;
		} catch (error) {
			console.error("Error creating product:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to create product",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Update product
	update: async (id, productData) => {
		try {
			const response = await httpService.put(
				`${PRODUCTS_API_URL}/${id}/`,
				productData
			);
			return response.data;
		} catch (error) {
			console.error("Error updating product:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to update product",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Delete product
	delete: async (id) => {
		try {
			await httpService.delete(`${PRODUCTS_API_URL}/products/${id}/`);
			return { success: true };
		} catch (error) {
			console.error("Error deleting product:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to delete product",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Bulk import products
	bulkImport: async (productsData) => {
		try {
			const response = await httpService.post(
				`${PRODUCTS_API_URL}/products/bulk-import/`,
				{
					products: productsData,
				}
			);
			return response.data;
		} catch (error) {
			console.error("Error bulk importing products:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to bulk import products",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	getMarkingDeadlines: async (esspId) => {
		const response = await httpService.get(
			`${MARKING_API_URL}/papers/deadlines/?essp_id=${esspId}`
		);
		return response.data;
	},

	// Add a new function for bulk deadlines
	getBulkMarkingDeadlines: async (esspIds) => {
		const response = await httpService.post(
			`${MARKING_API_URL}/papers/bulk-deadlines/`,
			{ essp_ids: esspIds }
		);
		return response.data;
	},

	// Get distance learning dropdown data
	getDistanceLearningDropdown: async () => {
		try {
			const response = await httpService.get(
				`${PRODUCTS_API_URL}/distance-learning-dropdown/`
			);
			return response.data.results || response.data;
		} catch (error) {
			console.error("Error fetching distance learning dropdown:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch distance learning dropdown",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Get tutorial dropdown data
	getTutorialDropdown: async () => {
		try {
			const response = await httpService.get(
				`${PRODUCTS_API_URL}/tutorial-dropdown/`
			);
			return response.data.results || response.data;
		} catch (error) {
			console.error("Error fetching tutorial dropdown:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch tutorial dropdown",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	}
};

export default productService;