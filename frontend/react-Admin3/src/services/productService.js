// src/services/productService.js
import config from "../config";
import httpService from "./httpService";

// Use fallback if productsUrl is not defined
const PRODUCTS_API_URL = config.productsUrl || `${config.apiBaseUrl || config.apiUrl}/products`;
// Catalog API for navigation, search, products, bundles (002-catalog-api-consolidation)
const CATALOG_API_URL = config.catalogUrl || `${config.apiBaseUrl || config.apiUrl}/catalog`;
// Store API for purchasable products (20250115-store-app-consolidation)
// Derive from productsUrl pattern: /api/products -> /api/store
const STORE_API_URL = config.productsUrl ? config.productsUrl.replace('/products', '/store') : `${config.apiBaseUrl || config.apiUrl}/store`;
const MARKING_API_URL = config.markingUrl;
const MARKING_VOUCHERS_API_URL = `${config.apiBaseUrl || config.apiUrl}/api/marking-vouchers`;

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

	// Get all navigation data in a single API call (subjects, navbar groups, distance learning, tutorials)
	getNavigationData: async () => {
		try {
			const response = await httpService.get(
				`${CATALOG_API_URL}/navigation-data/`
			);
			const data = response.data;
			return {
				subjects: data.subjects || [],
				navbarProductGroups: data.navbar_product_groups?.results || [],
				distanceLearningData: data.distance_learning_dropdown?.results || [],
				tutorialData: data.tutorial_dropdown?.results || null,
			};
		} catch (error) {
			console.error("Error fetching navigation data:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch navigation data",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Get available products from store API (purchasable items)
	getAvailableProducts: async (params = {}, page = 1, pageSize = 50) => {
		try {
			// Add pagination parameters
			const paginationParams = new URLSearchParams(params);
			paginationParams.append('page', page);
			paginationParams.append('page_size', pageSize);

			const response = await httpService.get(
				`${STORE_API_URL}/products/`,
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


	// Get exam session bundles only (no master bundles)
	getBundles: async (params = {}) => {
		try {
			// Use the BundleViewSet endpoint that only returns exam session bundles
			const response = await httpService.get(
				`${PRODUCTS_API_URL}/bundles/`,
				{ params }
			);
			return response.data.results || response.data;
		} catch (error) {
			console.error("Error fetching exam session bundles:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch exam session bundles",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Get combined products and bundles for listing (now uses unified endpoint)
	getProductsAndBundles: async (params = {}, page = 1, pageSize = 50) => {
		try {
			// Use the unified endpoint that includes both products and exam session bundles
			const response = await productService.getAvailableProducts(params, page, pageSize);

			return {
				results: response.results || [],
				count: response.count || 0,
				products_count: response.products_count || 0,
				bundles_count: response.bundles_count || 0,
				page: response.page || page,
				has_next: response.has_next || false,
				has_previous: response.has_previous || false
			};
		} catch (error) {
			console.error("Error fetching products and bundles:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch products and bundles",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Get bundle contents by bundle ID
	getBundleContents: async (bundleId) => {
		try {
			const response = await httpService.get(
				`${PRODUCTS_API_URL}/products/${bundleId}/bundle-contents/`
			);
			return response.data;
		} catch (error) {
			console.error("Error fetching bundle contents:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch bundle contents",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Get dynamic filter configuration
	getFilterConfiguration: async (filterTypes = []) => {
		try {
			const params = filterTypes.length > 0 ? { types: filterTypes } : {};
			const response = await httpService.get(
				`${PRODUCTS_API_URL}/filter-configuration/`,
				{ params }
			);
			return response.data;
		} catch (error) {
			console.error("Error fetching filter configuration:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to fetch filter configuration",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	},

	// Marking Vouchers API methods
	getMarkingVouchers: async (params = {}) => {
		try {
			const response = await httpService.get(
				`${MARKING_VOUCHERS_API_URL}/`,
				{ params }
			);
			return response.data.results || response.data;
		} catch (error) {
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

	getMarkingVoucherById: async (id) => {
		try {
			const response = await httpService.get(
				`${MARKING_VOUCHERS_API_URL}/${id}/`
			);
			return response.data;
		} catch (error) {
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

	addMarkingVoucherToCart: async (voucherId, quantity = 1) => {
		try {
			const response = await httpService.post(
				`${MARKING_VOUCHERS_API_URL}/add-to-cart/`,
				{
					voucher_id: voucherId,
					quantity: quantity
				}
			);
			return response.data;
		} catch (error) {
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

	// Search products with query and filters
	searchProducts: async (params = {}) => {
		try {
			const response = await httpService.get(
				`${CATALOG_API_URL}/search/`,
				{ params }
			);
			return {
				data: response.data.results || response.data || []
			};
		} catch (error) {
			console.error("Error searching products:", error);
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					"Failed to search products",
				status: error.response?.status || 0,
				data: error.response?.data || null,
			};
		}
	}
};

export default productService;