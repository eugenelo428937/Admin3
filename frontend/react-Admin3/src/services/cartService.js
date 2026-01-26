import httpService from "./httpService";
import config from "../config";

const API_BASE = config.cartUrl;
const ORDERS_API_URL = `${config.apiBaseUrl}/api/orders`;
const MARKING_VOUCHERS_API_URL = `${config.apiBaseUrl}/api/marking-vouchers`;

/**
 * Determine if a product/variation is digital.
 * Digital products include: eBooks, Hub access, Online Classroom.
 *
 * @param {Object} params - Parameters for digital detection
 * @param {string} params.variationType - Variation type (eBook, Hub, Printed, etc.)
 * @param {string} params.variationName - Variation name
 * @param {string} params.metadataType - Type from metadata (online_classroom, etc.)
 * @param {string} params.productType - Product type (Materials, Tutorial, etc.)
 * @param {string} params.productName - Product name
 * @returns {boolean} True if the product is digital
 */
const isDigitalProduct = ({ variationType, variationName, metadataType, productType, productName }) => {
	const varType = (variationType || '').toLowerCase();
	const varName = (variationName || '').toLowerCase();
	const metaType = (metadataType || '').toLowerCase();
	const prodName = (productName || '').toLowerCase();

	// Check variation type
	if (['ebook', 'hub'].includes(varType)) return true;

	// Check variation name contains digital keywords
	if (varName.includes('ebook') || varName.includes('hub')) return true;

	// Check metadata type for online classroom
	if (metaType === 'online_classroom') return true;

	// Check product name for online classroom/recording
	if (prodName.includes('online classroom') || prodName.includes('recording')) return true;

	return false;
};

/**
 * Determine if a product is a marking product.
 *
 * @param {Object} params - Parameters for marking detection
 * @param {string} params.metadataType - Type from metadata
 * @param {string} params.productType - Product type
 * @returns {boolean} True if the product is a marking product
 */
const isMarkingProduct = ({ metadataType, productType }) => {
	const metaType = (metadataType || '').toLowerCase();
	const prodType = (productType || '').toLowerCase();

	return metaType === 'marking' ||
		prodType === 'markings' ||
		prodType === 'markingvoucher' ||
		prodType.includes('marking');
};

/**
 * Determine if a product is a material product (printed books, eBooks).
 *
 * @param {Object} params - Parameters for material detection
 * @param {string} params.variationType - Variation type
 * @param {string} params.productType - Product type
 * @returns {boolean} True if the product is a material product
 */
const isMaterialProduct = ({ variationType, productType }) => {
	const varType = (variationType || '').toLowerCase();
	const prodType = (productType || '').toLowerCase();

	// Materials include printed books and eBooks
	if (['ebook', 'printed'].includes(varType)) return true;

	return prodType === 'materials' || prodType === 'material';
};

/**
 * Determine if a product is a tutorial product.
 *
 * @param {Object} params - Parameters for tutorial detection
 * @param {string} params.metadataType - Type from metadata
 * @param {string} params.productType - Product type
 * @returns {boolean} True if the product is a tutorial product
 */
const isTutorialProduct = ({ metadataType, productType }) => {
	const metaType = (metadataType || '').toLowerCase();
	const prodType = (productType || '').toLowerCase();

	return metaType === 'tutorial' || prodType === 'tutorial';
};

/**
 * Build metadata object for cart operations.
 * Auto-promotes variation fields from top-level priceInfo to metadata for backend compatibility.
 * Also derives product type flags (is_digital, is_marking, is_material, is_tutorial).
 *
 * @param {Object} priceInfo - Price info object from product cards
 * @param {Object} product - Product object with type and name information
 * @returns {Object} Normalized metadata object with derived flags
 */
const buildCartMetadata = (priceInfo = {}, product = {}) => {
	const existingMetadata = priceInfo.metadata || {};

	// Resolve variation fields (metadata takes precedence over top-level)
	const variationId = existingMetadata.variationId ?? priceInfo.variationId;
	const variationName = existingMetadata.variationName ?? priceInfo.variationName;
	const variationType = existingMetadata.variationType ?? priceInfo.variationType;

	// Get product type info from multiple sources (with null safety)
	const metadataType = existingMetadata.type;
	const productType = existingMetadata.producttype || product?.type;
	const productName = existingMetadata.productName || product?.product_name || product?.name;

	// Derive product type flags (existing metadata flags take precedence)
	const detectionParams = { variationType, variationName, metadataType, productType, productName };

	return {
		// Spread any existing metadata first
		...existingMetadata,
		// Auto-promote variation fields from top-level to metadata
		variationId,
		variationName,
		variationType,
		// Derive product type flags (existing values in metadata take precedence)
		is_digital: existingMetadata.is_digital ?? isDigitalProduct(detectionParams),
		is_marking: existingMetadata.is_marking ?? isMarkingProduct(detectionParams),
		is_material: existingMetadata.is_material ?? isMaterialProduct(detectionParams),
		is_tutorial: existingMetadata.is_tutorial ?? isTutorialProduct(detectionParams),
	};
};

const cartService = {
	fetchCart: () => httpService.get(API_BASE),
	addToCart: (product, quantity = 1, priceInfo = {}) => {
		const payload = {
			// Use store product ID (id) which is the correct identifier after cart-orders refactoring
			current_product: product.id || product.store_product_id,
			quantity,
			price_type: priceInfo.priceType || 'standard',
			actual_price: priceInfo.actualPrice,
			// Auto-promote variation fields and derive product type flags
			metadata: buildCartMetadata(priceInfo, product)
		};

		return httpService.post(`${API_BASE}/add/`, payload);
	},
	updateItem: (itemId, product, priceInfo = {}) => {
		const payload = {
			item_id: itemId,
			quantity: product?.quantity || 1,
			price_type: priceInfo.priceType || 'standard',
			actual_price: priceInfo.actualPrice,
			// Auto-promote variation fields and derive product type flags
			metadata: buildCartMetadata(priceInfo, product)
		};

		return httpService.patch(`${API_BASE}/update_item/`, payload);
	},
	removeItem: (itemId) =>
		httpService.delete(`${API_BASE}/remove/`, { data: { item_id: itemId } }),
	clearCart: () => httpService.post(`${API_BASE}/clear/`),
	checkout: (paymentData = {}) => httpService.post(`${ORDERS_API_URL}/checkout/`, paymentData),
	fetchOrders: () => httpService.get(`${ORDERS_API_URL}/`),

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
