import httpService from "./httpService";
import config from "../config";

const API_BASE = config.cartUrl;
const MARKING_VOUCHERS_API_URL = `${config.apiBaseUrl}/api/marking-vouchers`;

/**
 * Build metadata object for cart operations.
 * Auto-promotes variation fields from top-level priceInfo to metadata for backend compatibility.
 * The backend's _is_digital_product() method expects variationId/variationName inside metadata.
 *
 * @param {Object} priceInfo - Price info object from product cards
 * @returns {Object} Normalized metadata object
 */
const buildCartMetadata = (priceInfo = {}) => {
	const existingMetadata = priceInfo.metadata || {};

	return {
		// Spread any existing metadata first
		...existingMetadata,
		// Auto-promote variation fields from top-level to metadata (if not already in metadata)
		variationId: existingMetadata.variationId ?? priceInfo.variationId,
		variationName: existingMetadata.variationName ?? priceInfo.variationName,
		variationType: existingMetadata.variationType ?? priceInfo.variationType,
	};
};

const cartService = {
	fetchCart: () => httpService.get(API_BASE),
	addToCart: (product, quantity = 1, priceInfo = {}) => {
		const payload = {
			current_product: product.essp_id || product.id,
			quantity,
			price_type: priceInfo.priceType || 'standard',
			actual_price: priceInfo.actualPrice,
			// Auto-promote variation fields to metadata for backend compatibility
			metadata: buildCartMetadata(priceInfo)
		};

		return httpService.post(`${API_BASE}/add/`, payload);
	},
	updateItem: (itemId, product, priceInfo = {}) => {
		const payload = {
			item_id: itemId,
			quantity: product?.quantity || 1,
			price_type: priceInfo.priceType || 'standard',
			actual_price: priceInfo.actualPrice,
			// Auto-promote variation fields to metadata for backend compatibility
			metadata: buildCartMetadata(priceInfo)
		};

		return httpService.patch(`${API_BASE}/update_item/`, payload);
	},
	removeItem: (itemId) =>
		httpService.delete(`${API_BASE}/remove/`, { data: { item_id: itemId } }),
	clearCart: () => httpService.post(`${API_BASE}/clear/`),
	checkout: (paymentData = {}) => httpService.post(`${API_BASE}/checkout/`, paymentData),
	fetchOrders: () => httpService.get(`${API_BASE}/orders/`),

	// Add marking voucher to cart using dedicated voucher endpoint
	addVoucherToCart: (voucherId, quantity = 1) => {
		const payload = {
			voucher_id: voucherId,
			quantity,
		};
		return httpService.post(`${MARKING_VOUCHERS_API_URL}/add-to-cart/`, payload);
	},
};

export default cartService;
