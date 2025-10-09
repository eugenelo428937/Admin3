import config from "../config";
import httpService from "./httpService";

// Use the proper products API URL like other services
const PRODUCTS_API_URL = config.productsUrl || `${config.apiBaseUrl || config.apiUrl}/products`;

class BundleService {
	constructor() {
		this.baseURL = `${PRODUCTS_API_URL}/bundles`;
	}

	/**
	 * Get all available bundles for a specific exam session and/or subject
	 * @param {Object} filters - Filtering options
	 * @param {string} filters.examSession - Exam session code (e.g., 'MAR24')
	 * @param {string} filters.subject - Subject code (e.g., 'CM1') 
	 * @returns {Promise} - Promise resolving to list of bundles
	 */
	async getAllBundles(filters = {}) {
		try {
			// Build query parameters
			const params = {};
			if (filters.examSession) {
				params.exam_session = filters.examSession;
			}
			if (filters.subject) {
				params.subject = filters.subject;
			}
			
			const response = await httpService.get(`${this.baseURL}/`, { params });
			
			return {
				success: true,
				data: response.data,
			};
		} catch (error) {
			console.error("Error fetching bundles:", error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	/**
	 * Get all products included in a bundle
	 * @param {number} bundleId - The ID of the bundle
	 * @returns {Promise} - Promise resolving to bundle contents data
	 */
	async getBundleContents(bundleId) {
		try {

			const response = await httpService.get(`${this.baseURL}/${bundleId}/`);

			return {
				success: true,
				data: response.data,
			};
		} catch (error) {
			console.error("Error fetching bundle contents:", error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	/**
	 * Process bundle for adding to cart - converts bundle into individual products
	 * @param {Object} bundleProduct - The bundle product object
	 * @param {string} selectedPriceType - Price type selected by user (standard, retaker, additional)
	 * @param {Array} selectedVariations - Array of selected variation IDs if applicable
	 * @returns {Promise} - Promise resolving to array of individual products to add to cart
	 */
	async processBundleForCart(
		bundleProduct,
		selectedPriceType = "standard",
		selectedVariations = []
	) {
		try {
			// Get bundle contents
			const bundleResult = await this.getBundleContents(bundleProduct.id);

			if (!bundleResult.success) {
				throw new Error(bundleResult.error);
			}

			const { components } = bundleResult.data;
			const cartItems = [];
			
			// Process each component for cart addition
			for (const component of components) {
				// Get quantity from component (default 1)
				const componentQuantity = component.quantity || 1;

				// Always use the user's selected price type for cart tracking
				const priceType = selectedPriceType;

				// Find the price for the exact type the user selected
				// If it doesn't exist, fall back to standard price (but keep the selected price type)
				let actualPrice = null;
				if (component.prices && Array.isArray(component.prices)) {
					// First try to find the requested price type
					let priceObj = component.prices.find(
						(p) => p.price_type === priceType
					);
					
					// If requested price type not found, fall back to standard price
					if (!priceObj || !priceObj.amount) {
						priceObj = component.prices.find(
							(p) => p.price_type === "standard"
						);
					}
					
					actualPrice = priceObj?.amount;
				}

				// Create a properly structured product object for the cart service
				// This matches what individual product cards send to the cart
				// Get ESSP ID from exam_session_product_id field (numeric ID, not string code)
				const esspId = component.exam_session_product_id;
				
				const productForCart = {
					id: esspId,
					essp_id: esspId,  // Cart service looks for this ESSP ID
					product_id: component.product?.id,
					product_name: component.product?.fullname || "Unknown Product",
					subject_code: bundleProduct.subject_code,
					exam_session_code: bundleProduct.exam_session_code,
					type: this.determineProductType(component),
				};

				// Create priceInfo that matches cart service expectations
				const priceInfoForCart = {
					priceType: priceType,
					actualPrice: actualPrice,
					variationId: component.product_variation?.id,
					variationName: component.product_variation?.name,
					examSessionProductCode: component.exam_session_product_code,
					// Additional metadata for bundle tracking (will be spread into final metadata)
					metadata: {
						addedViaBundle: {
							bundleId: bundleProduct.id,
							bundleName:
								bundleProduct.shortname || bundleProduct.product_name,
							bundleSubject:
								bundleProduct.code || bundleProduct.subject_code,
							examSessionCode:
								bundleResult.data.bundle_product?.exam_session_code,
						},
					},
				};

				// Create cart item data for this component
				const cartItemData = {
					product: productForCart,
					priceInfo: priceInfoForCart,
					quantity: componentQuantity,
				};

				// Add this component to the cart items array
				// Quantity will be handled when adding to cart in BundleCard
				cartItems.push(cartItemData);
			}

			return {
				success: true,
				cartItems: cartItems,
				summary: {
					bundleProduct: bundleProduct,
					totalItems: cartItems.length,
					uniqueProducts: components.length,
					bundleMetadata: bundleResult.data.bundle_product.metadata,
				},
			};
		} catch (error) {
			console.error("Error processing bundle for cart:", error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	/**
	 * Get bundle metadata including savings information
	 * @param {number} bundleId - The ID of the bundle
	 * @returns {Promise} - Promise resolving to bundle metadata
	 */
	async getBundleMetadata(bundleId) {
		try {
			const bundleResult = await this.getBundleContents(bundleId);

			if (!bundleResult.success) {
				throw new Error(bundleResult.error);
			}

			return {
				success: true,
				metadata: bundleResult.data.bundle_product.metadata,
				componentCount: bundleResult.data.total_components,
			};
		} catch (error) {
			console.error("Error fetching bundle metadata:", error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	/**
	 * Validate bundle before adding to cart
	 * @param {Object} bundleProduct - The bundle product
	 * @returns {Promise} - Promise resolving to validation result
	 */
	async validateBundle(bundleProduct) {
		try {
			const bundleResult = await this.getBundleContents(bundleProduct.id);

			if (!bundleResult.success) {
				return {
					valid: false,
					errors: [bundleResult.error],
				};
			}

			const { components } = bundleResult.data;
			const errors = [];
			const warnings = [];

			// Validate each component
			for (const component of components) {
				// Check if component has available variations/prices
				if (!component.variations || component.variations.length === 0) {
					warnings.push(
						`${component.product_name} has no available variations`
					);
					continue;
				}

				// Check if component has valid prices
				const hasValidPrices = component.variations.some(
					(variation) => variation.prices && variation.prices.length > 0
				);

				if (!hasValidPrices) {
					errors.push(
						`${component.product_name} has no valid pricing information`
					);
				}
			}

			return {
				valid: errors.length === 0,
				errors: errors,
				warnings: warnings,
				componentCount: components.length,
			};
		} catch (error) {
			return {
				valid: false,
				errors: [error.message],
			};
		}
	}

	/**
	 * Determine product type based on component data
	 * @param {Object} component - Bundle component
	 * @returns {string} - Product type
	 */
	determineProductType(component) {
		const variationType = component.product_variation?.variation_type?.toLowerCase();
		const productName = component.product?.fullname?.toLowerCase() || '';
		
		if (variationType === 'marking' || productName.includes('marking')) {
			return 'Markings';
		}
		
		if (productName.includes('tutorial')) {
			return 'Tutorial';
		}
		
		if (productName.includes('online classroom') || productName.includes('recording')) {
			return 'OnlineClassroom';
		}
		
		return 'Materials';  // Default type
	}
}

export default new BundleService();
