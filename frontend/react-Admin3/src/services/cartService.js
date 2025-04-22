import axios from "axios";
import config from "../config";

axios.defaults.withCredentials = true;

const API_BASE = config.cartUrl;

const cartService = {
	fetchCart: () => axios.get(API_BASE),
	addToCart: (product, quantity = 1) =>
		axios.post(`${API_BASE}/add/`, { product: product.id, quantity }),
	updateItem: (itemId, quantity) =>
		axios.patch(`${API_BASE}/update_item/`, { item_id: itemId, quantity }),
	removeItem: (itemId) =>
		axios.delete(`${API_BASE}/remove/`, { data: { item_id: itemId } }),
	clearCart: () => axios.post(`${API_BASE}/clear/`),
};

export default cartService;
