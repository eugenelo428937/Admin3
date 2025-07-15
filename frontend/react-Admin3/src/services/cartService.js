import httpService from "./httpService";
import config from "../config";

const API_BASE = config.cartUrl;

const cartService = {
	fetchCart: () => httpService.get(API_BASE),
	addToCart: (product, quantity = 1, priceInfo = {}) => {
		const payload = { 
			current_product: product.essp_id || product.id, 
			quantity,
			price_type: priceInfo.priceType || 'standard',
			actual_price: priceInfo.actualPrice,
			metadata: {
				// Legacy fields for backward compatibility
				variationId: priceInfo.variationId,
				variationName: priceInfo.variationName,
				eventId: priceInfo.eventId,
				choice: priceInfo.choice,
				title: priceInfo.title,
				type: priceInfo.type,
				eventCode: priceInfo.eventCode,
				venue: priceInfo.venue,
				startDate: priceInfo.startDate,
				endDate: priceInfo.endDate,
				// New tutorial fields
				choices: priceInfo.choices,
				choiceCount: priceInfo.choiceCount,
				subjectCode: priceInfo.subjectCode,
				location: priceInfo.location,
				newLocation: priceInfo.newLocation,
				// Support for full metadata object (for tutorials)
				...(priceInfo.metadata || {})
			}
		};
		
		console.log('🛒 [CartService] Payload being sent:', payload);
		
		return httpService.post(`${API_BASE}/add/`, payload);
	},
	updateItem: (itemId, quantity) =>
		httpService.patch(`${API_BASE}/update_item/`, {
			item_id: itemId,
			quantity,
		}),
	removeItem: (itemId) =>
		httpService.delete(`${API_BASE}/remove/`, { data: { item_id: itemId } }),
	clearCart: () => httpService.post(`${API_BASE}/clear/`),
	checkout: (paymentData = {}) => httpService.post(`${API_BASE}/checkout/`, paymentData),
	fetchOrders: () => httpService.get(`${API_BASE}/orders/`),
};

export default cartService;
