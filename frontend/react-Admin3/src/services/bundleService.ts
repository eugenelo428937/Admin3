import config from "../config";
import httpService from "./httpService";

const PRODUCTS_API_URL = (config as any).productsUrl || `${(config as any).apiBaseUrl}/products`;

interface BundleFilters {
    examSession?: string;
    subject?: string;
}

interface BundleResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

interface CartItemData {
    product: any;
    priceInfo: any;
    quantity: number;
}

interface ProcessBundleResult {
    success: boolean;
    cartItems?: CartItemData[];
    summary?: {
        bundleProduct: any;
        totalItems: number;
        uniqueProducts: number;
        bundleMetadata: any;
    };
    error?: string;
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings?: string[];
    componentCount?: number;
}

const bundleService = {
    baseURL: `${PRODUCTS_API_URL}/bundles`,

    // ─── Get All Bundles ─────────────────────────────────────
    getAllBundles: async (filters: BundleFilters = {}): Promise<BundleResult<any>> => {
        try {
            const params: Record<string, string> = {};
            if (filters.examSession) params.exam_session = filters.examSession;
            if (filters.subject) params.subject = filters.subject;

            const response = await httpService.get(
                `${PRODUCTS_API_URL}/bundles/`,
                { params }
            );
            return { success: true, data: response.data };
        } catch (error: any) {
            console.error("Error fetching bundles:", error);
            return { success: false, error: error.message };
        }
    },

    // ─── Get Bundle Contents ─────────────────────────────────
    getBundleContents: async (bundleId: number | string): Promise<BundleResult<any>> => {
        try {
            const response = await httpService.get(
                `${PRODUCTS_API_URL}/bundles/${bundleId}/`
            );
            return { success: true, data: response.data };
        } catch (error: any) {
            console.error("Error fetching bundle contents:", error);
            return { success: false, error: error.message };
        }
    },

    // ─── Process Bundle for Cart ─────────────────────────────
    processBundleForCart: async (
        bundleProduct: any,
        selectedPriceType: string = "standard",
        selectedVariations: any[] = []
    ): Promise<ProcessBundleResult> => {
        try {
            const bundleResult = await bundleService.getBundleContents(bundleProduct.id);

            if (!bundleResult.success) {
                throw new Error(bundleResult.error);
            }

            const { components } = bundleResult.data;
            const cartItems: CartItemData[] = [];

            for (const component of components) {
                const componentQuantity = component.quantity || 1;
                const priceType = selectedPriceType;

                let actualPrice = null;
                if (component.prices && Array.isArray(component.prices)) {
                    let priceObj = component.prices.find(
                        (p: any) => p.price_type === priceType
                    );
                    if (!priceObj || !priceObj.amount) {
                        priceObj = component.prices.find(
                            (p: any) => p.price_type === "standard"
                        );
                    }
                    actualPrice = priceObj?.amount;
                }

                const esspId = component.exam_session_product_id;

                const productForCart = {
                    id: esspId,
                    essp_id: esspId,
                    product_id: component.product?.id,
                    product_name: component.product?.fullname || "Unknown Product",
                    subject_code: bundleProduct.subject_code,
                    exam_session_code: bundleProduct.exam_session_code,
                    type: bundleService.determineProductType(component),
                };

                const priceInfoForCart = {
                    priceType: priceType,
                    actualPrice: actualPrice,
                    variationId: component.product_variation?.id,
                    variationName: component.product_variation?.name,
                    examSessionProductCode: component.exam_session_product_code,
                    metadata: {
                        addedViaBundle: {
                            bundleId: bundleProduct.id,
                            bundleName: bundleProduct.shortname || bundleProduct.product_name,
                            bundleSubject: bundleProduct.code || bundleProduct.subject_code,
                            examSessionCode: bundleResult.data.exam_session_code,
                        },
                    },
                };

                cartItems.push({
                    product: productForCart,
                    priceInfo: priceInfoForCart,
                    quantity: componentQuantity,
                });
            }

            return {
                success: true,
                cartItems,
                summary: {
                    bundleProduct,
                    totalItems: cartItems.length,
                    uniqueProducts: components.length,
                    bundleMetadata: bundleResult.data.bundle_product?.metadata || null,
                },
            };
        } catch (error: any) {
            console.error("Error processing bundle for cart:", error);
            return { success: false, error: error.message };
        }
    },

    // ─── Get Bundle Metadata ─────────────────────────────────
    getBundleMetadata: async (bundleId: number | string) => {
        try {
            const bundleResult = await bundleService.getBundleContents(bundleId);

            if (!bundleResult.success) {
                throw new Error(bundleResult.error);
            }

            return {
                success: true,
                metadata: bundleResult.data.bundle_product?.metadata || null,
                componentCount: bundleResult.data.total_components,
            };
        } catch (error: any) {
            console.error("Error fetching bundle metadata:", error);
            return { success: false, error: error.message };
        }
    },

    // ─── Validate Bundle ─────────────────────────────────────
    validateBundle: async (bundleProduct: any): Promise<ValidationResult> => {
        try {
            const bundleResult = await bundleService.getBundleContents(bundleProduct.id);

            if (!bundleResult.success) {
                return { valid: false, errors: [bundleResult.error!] };
            }

            const { components } = bundleResult.data;
            const errors: string[] = [];
            const warnings: string[] = [];

            for (const component of components) {
                if (!component.variations || component.variations.length === 0) {
                    warnings.push(`${component.product_name} has no available variations`);
                    continue;
                }

                const hasValidPrices = component.variations.some(
                    (variation: any) => variation.prices && variation.prices.length > 0
                );

                if (!hasValidPrices) {
                    errors.push(`${component.product_name} has no valid pricing information`);
                }
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings,
                componentCount: components.length,
            };
        } catch (error: any) {
            return { valid: false, errors: [error.message] };
        }
    },

    // ─── Determine Product Type ──────────────────────────────
    determineProductType: (component: any): string => {
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
        return 'Materials';
    },
};

export default bundleService;
