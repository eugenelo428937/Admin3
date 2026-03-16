import type { AxiosResponse } from "axios";
import type {
	CartItemMetadata,
	PriceInfo,
	ProductDetectionParams,
	AddToCartPayload,
	UpdateCartItemPayload,
	CartData,
	CartItem,
} from "../types/cart";
import httpService from "./httpService";
import config from "../config";

const API_BASE: string = (config as any).cartUrl;
const ORDERS_API_URL: string = `${(config as any).apiBaseUrl}/api/orders`;
const MARKING_VOUCHERS_API_URL: string = `${(config as any).apiBaseUrl}/api/marking-vouchers`;

export const isDigitalProduct = ({ variationType, variationName, metadataType, productType, productName }: ProductDetectionParams): boolean => {
	const varType = (variationType || '').toLowerCase();
	const varName = (variationName || '').toLowerCase();
	const metaType = (metadataType || '').toLowerCase();
	const prodName = (productName || '').toLowerCase();
	if (['ebook', 'hub'].includes(varType)) return true;
	if (varName.includes('ebook') || varName.includes('hub')) return true;
	if (metaType === 'online_classroom') return true;
	if (prodName.includes('online classroom') || prodName.includes('recording')) return true;
	return false;
};

export const isMarkingProduct = ({ metadataType, productType }: ProductDetectionParams): boolean => {
	const metaType = (metadataType || '').toLowerCase();
	const prodType = (productType || '').toLowerCase();
	return metaType === 'marking' || prodType === 'markings' || prodType === 'markingvoucher' || prodType.includes('marking');
};

export const isMaterialProduct = ({ variationType, productType }: ProductDetectionParams): boolean => {
	const varType = (variationType || '').toLowerCase();
	const prodType = (productType || '').toLowerCase();
	if (['ebook', 'printed'].includes(varType)) return true;
	return prodType === 'materials' || prodType === 'material';
};

export const isTutorialProduct = ({ metadataType, productType }: ProductDetectionParams): boolean => {
	const metaType = (metadataType || '').toLowerCase();
	const prodType = (productType || '').toLowerCase();
	return metaType === 'tutorial' || prodType === 'tutorial';
};

export interface ProductParam {
	id?: number;
	store_product_id?: number;
	quantity?: number;
	type?: string;
	product_name?: string;
	name?: string;
	[key: string]: any;
}

export const buildCartMetadata = (priceInfo: PriceInfo = {}, product: ProductParam = {}): CartItemMetadata => {
	const existingMetadata: CartItemMetadata = priceInfo.metadata || {};
	const variationId = existingMetadata.variationId ?? priceInfo.variationId;
	const variationName = existingMetadata.variationName ?? priceInfo.variationName;
	const variationType = existingMetadata.variationType ?? priceInfo.variationType;
	const metadataType = existingMetadata.type;
	const productType = existingMetadata.producttype || product?.type;
	const productName = existingMetadata.productName || product?.product_name || product?.name;
	const detectionParams: ProductDetectionParams = { variationType, variationName, metadataType, productType, productName };

	return {
		...existingMetadata,
		variationId,
		variationName,
		variationType,
		is_digital: existingMetadata.is_digital ?? isDigitalProduct(detectionParams),
		is_marking: existingMetadata.is_marking ?? isMarkingProduct(detectionParams),
		is_material: existingMetadata.is_material ?? isMaterialProduct(detectionParams),
		is_tutorial: existingMetadata.is_tutorial ?? isTutorialProduct(detectionParams),
	};
};

export interface PaymentData {
	[key: string]: any;
}

const cartService = {
	fetchCart: (): Promise<AxiosResponse<CartData>> =>
		httpService.get(API_BASE),

	addToCart: (product: ProductParam, quantity: number = 1, priceInfo: PriceInfo = {}): Promise<AxiosResponse<CartData>> => {
		const payload: AddToCartPayload = {
			current_product: product.id || product.store_product_id || 0,
			quantity,
			price_type: priceInfo.priceType || 'standard',
			actual_price: priceInfo.actualPrice,
			metadata: buildCartMetadata(priceInfo, product),
		};
		return httpService.post(`${API_BASE}/add/`, payload);
	},

	updateItem: (itemId: number, product: ProductParam, priceInfo: PriceInfo = {}): Promise<AxiosResponse<CartData>> => {
		const payload: UpdateCartItemPayload = {
			item_id: itemId,
			quantity: product?.quantity || 1,
			price_type: priceInfo.priceType || 'standard',
			actual_price: priceInfo.actualPrice,
			metadata: buildCartMetadata(priceInfo, product),
		};
		return httpService.patch(`${API_BASE}/update_item/`, payload);
	},

	removeItem: (itemId: number): Promise<AxiosResponse<CartData>> =>
		httpService.delete(`${API_BASE}/remove/`, { data: { item_id: itemId } }),

	clearCart: (): Promise<AxiosResponse<CartData>> =>
		httpService.post(`${API_BASE}/clear/`),

	checkout: (paymentData: PaymentData = {}): Promise<AxiosResponse<any>> =>
		httpService.post(`${ORDERS_API_URL}/checkout/`, paymentData),

	fetchOrders: (): Promise<AxiosResponse<any>> =>
		httpService.get(`${ORDERS_API_URL}/`),

	addVoucherToCart: (voucherId: number, quantity: number = 1): Promise<AxiosResponse<CartData>> => {
		const payload = {
			voucher_id: voucherId,
			quantity,
		};
		return httpService.post(`${MARKING_VOUCHERS_API_URL}/add-to-cart/`, payload);
	},
};

export default cartService;
