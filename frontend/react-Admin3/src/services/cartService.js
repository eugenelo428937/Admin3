import httpService from "./httpService";
import config from "../config";

const API_BASE = config.cartUrl;

const cartService = {
	fetchCart: () => httpService.get(API_BASE),
	addToCart: (product, quantity = 1) =>
		httpService.post(`${API_BASE}/add/`, { product: product.id, quantity }),
	updateItem: (itemId, quantity) =>
		httpService.patch(`${API_BASE}/update_item/`, {
			item_id: itemId,
			quantity,
		}),
	removeItem: (itemId) =>
		httpService.delete(`${API_BASE}/remove/`, { data: { item_id: itemId } }),
	clearCart: () => httpService.post(`${API_BASE}/clear/`),
	checkout: () => httpService.post(`${API_BASE}/checkout/`),
	fetchOrders: () => httpService.get(`${API_BASE}/orders/`),
};

export default cartService;
