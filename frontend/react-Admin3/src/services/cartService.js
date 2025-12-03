import httpService from "./httpService";
import config from "../config";

const API_BASE = config.cartUrl;
const MARKING_VOUCHERS_API_URL = `${config.apiBaseUrl}/api/marking-vouchers`;

const cartService = {
	fetchCart: () => httpService.get(API_BASE),
	addToCart: (product, quantity = 1, priceInfo = {}) => {
		const payload = {
			current_product: product.essp_id || product.id,
			quantity,
			price_type: priceInfo.priceType || 'standard',
			actual_price: priceInfo.actualPrice,
			// Pass through metadata directly (constructed by caller)
			metadata: priceInfo.metadata || {}
		};

		return httpService.post(`${API_BASE}/add/`, payload);
	},
	updateItem: (itemId, product, priceInfo = {}) => {
		const payload = {
			item_id: itemId,
			quantity: product?.quantity || 1,
			price_type: priceInfo.priceType || 'standard',
			actual_price: priceInfo.actualPrice,
			// Pass through metadata directly (constructed by caller)
			metadata: priceInfo.metadata || {}
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
