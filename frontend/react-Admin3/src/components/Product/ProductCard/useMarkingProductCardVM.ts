import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme, Theme } from "@mui/material/styles";
import { CalendarMonthOutlined } from "@mui/icons-material";
import { useCart } from "../../../contexts/CartContext.tsx";
import productService from "../../../services/productService";
import type {
	BrowseProduct,
	BrowseProductVariation,
	BrowseProductPrice,
	MarkingDeadline,
	ParsedMarkingDeadline,
	DeadlineScenario,
	PriceType,
} from "../../../types/browse/browse.types";

// ─── Price Data (returned instead of JSX) ───────────────────────

export interface PriceData {
	amount: number | string;
	formatted: string;
}

// ─── ViewModel Interface ────────────────────────────────────────

export interface MarkingProductCardVM {
	// State
	deadlines: MarkingDeadline[];
	loading: boolean;
	showModal: boolean;
	setShowModal: (open: boolean) => void;
	showPriceModal: boolean;
	setShowPriceModal: (open: boolean) => void;
	selectedVariations: number[];
	selectedPriceType: string;
	showExpiredWarning: boolean;
	setShowExpiredWarning: (open: boolean) => void;
	isHovered: boolean;
	speedDialOpen: boolean;
	setSpeedDialOpen: (open: boolean) => void;

	// Cart / theme
	userRegion: string;
	theme: Theme;

	// Variation info
	hasVariations: boolean;
	singleVariation: BrowseProductVariation | null;
	currentVariation: BrowseProductVariation | null | undefined;

	// Price helpers
	getPriceData: (variation: BrowseProductVariation | null | undefined, priceType: string) => PriceData | null;
	hasPriceType: (variation: BrowseProductVariation | null | undefined, priceType: string) => boolean;
	getPriceForType: (variation: any, priceType: string) => BrowseProductPrice | undefined;

	// Deadline data
	parsedDeadlines: ParsedMarkingDeadline[];
	upcoming: ParsedMarkingDeadline[];
	expired: ParsedMarkingDeadline[];
	allExpired: boolean;
	currentDeadlineScenario: DeadlineScenario;

	// Handlers
	handlePriceTypeChange: (priceType: string) => void;
	handleAddToCart: () => void;
	addToCartConfirmed: () => void;
	handleBuyMarkingOnly: () => void;
	handleBuyWithRecommended: () => void;
	handleMouseEnter: () => void;
	handleMouseLeave: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────

const useMarkingProductCardVM = (
	product: BrowseProduct,
	onAddToCart: ((product: BrowseProduct | any, priceInfo: any) => void) | undefined,
	allEsspIds: number[] | undefined,
	bulkDeadlines: Record<number | string, MarkingDeadline[]> | undefined,
): MarkingProductCardVM => {
	const [deadlines, setDeadlines] = useState<MarkingDeadline[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [showModal, setShowModal] = useState<boolean>(false);
	const [showPriceModal, setShowPriceModal] = useState<boolean>(false);
	const [selectedVariations, setSelectedVariations] = useState<number[]>([]);
	const [selectedPriceType, setSelectedPriceType] = useState<string>("");
	const [showExpiredWarning, setShowExpiredWarning] = useState<boolean>(false);
	const [isHovered, setIsHovered] = useState<boolean>(false);
	const [speedDialOpen, setSpeedDialOpen] = useState<boolean>(false);

	const { cartData } = useCart();
	const theme = useTheme();

	// Get user's VAT region from cart data
	const userRegion = (cartData as any)?.vat_calculations?.region_info?.region || "UK";

	// Memoize variation calculations for performance
	const variationInfo = useMemo(() => {
		const hasVariations = !!(product.variations && product.variations.length > 0);
		const singleVariation =
			product.variations && product.variations.length === 1
				? product.variations[0]
				: null;
		const currentVariation = hasVariations
			? selectedVariations.length > 0
				? product.variations!.find((v) => selectedVariations.includes(v.id))
				: singleVariation || product.variations![0]
			: singleVariation;

		return { hasVariations, singleVariation, currentVariation };
	}, [product.variations, selectedVariations]);

	const { hasVariations, singleVariation, currentVariation } = variationInfo;

	// Return price data (not JSX) for the View to render
	const getPriceData = useMemo(() => {
		return (variation: BrowseProductVariation | null | undefined, priceType: string): PriceData | null => {
			if (!variation || !variation.prices) return null;
			const priceObj = variation.prices.find((p) => p.price_type === priceType);
			if (!priceObj) return null;

			const formatted = new Intl.NumberFormat("en-GB", {
				style: "currency",
				currency: "GBP",
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}).format(Number(priceObj.amount));

			return {
				amount: priceObj.amount,
				formatted,
			};
		};
	}, []);

	// Helper function to find price by type
	const getPriceForType = useCallback(
		(variation: any, priceType: string): BrowseProductPrice | undefined => {
			return variation?.prices?.find((p: BrowseProductPrice) => p.price_type === priceType);
		},
		[]
	);

	const hasPriceType = useCallback(
		(variation: BrowseProductVariation | null | undefined, priceType: string): boolean => {
			if (!variation || !variation.prices) return false;
			return variation.prices.some((p) => p.price_type === priceType);
		},
		[]
	);

	// Fetch deadlines
	useEffect(() => {
		setLoading(true);
		// Use store product ID (id) after cart-orders refactoring
		const storeProductId = product.id || product.store_product_id;

		// Only call single API if bulkDeadlines is undefined (not just empty)
		if (bulkDeadlines && storeProductId && storeProductId in bulkDeadlines) {
			setDeadlines(bulkDeadlines[storeProductId] || []);
			setLoading(false);
		} else if (bulkDeadlines && Object.keys(bulkDeadlines).length === 0) {
			// Do nothing, wait for bulkDeadlines to be populated
			setLoading(true);
		} else if (storeProductId) {
			// fallback: only for single product view
			productService.getMarkingDeadlines(storeProductId).then((data: MarkingDeadline[]) => {
				setDeadlines(data || []);
				setLoading(false);
			});
		} else {
			setDeadlines([]);
			setLoading(false);
		}
	}, [product, bulkDeadlines]);

	// Parsed deadlines
	const now = new Date();
	const parsedDeadlines: ParsedMarkingDeadline[] = deadlines.map((d) => ({
		...d,
		deadline: new Date(d.deadline),
		recommended_submit_date: new Date(d.recommended_submit_date),
	}));
	const upcoming = parsedDeadlines
		.filter((d) => d.deadline > now)
		.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
	const expired = parsedDeadlines
		.filter((d) => d.deadline <= now)
		.sort((a, b) => b.deadline.getTime() - a.deadline.getTime());
	const allExpired = deadlines.length > 0 && expired.length === deadlines.length;

	// Auto-select single variation
	useEffect(() => {
		if (singleVariation && selectedVariations.length === 0) {
			setSelectedVariations([singleVariation.id]);
		}
	}, [singleVariation, selectedVariations.length]);

	// Reset price type to standard if current selection is not available for the current variation
	useEffect(() => {
		if (currentVariation && selectedPriceType !== "standard") {
			if (!hasPriceType(currentVariation, selectedPriceType)) {
				setSelectedPriceType("standard");
			}
		}
	}, [currentVariation, selectedPriceType, hasPriceType]);

	// Determine deadline scenario based on actual conditions
	const currentDeadlineScenario: DeadlineScenario = useMemo(() => {
		if (loading) {
			return {
				type: "info",
				icon: CalendarMonthOutlined,
				message: "Loading deadlines...",
				bgColor: "grey.50",
				borderColor: "grey.300",
				textColor: "grey.700",
			};
		}

		if (deadlines.length === 0) {
			return {
				type: "info",
				icon: CalendarMonthOutlined,
				message: "No upcoming deadlines",
				submessage: "Check back later for new submissions.",
				bgColor: "grey.50",
				borderColor: "grey.300",
				textColor: "grey.700",
			};
		}

		if (allExpired) {
			return {
				type: "error",
				icon: CalendarMonthOutlined,
				message: "All deadlines expired",
				submessage: "Consider using Marking Voucher instead.",
				bgColor: "error.50",
				borderColor: "error.light",
				textColor: "error.dark",
			};
		}

		if (expired.length > 0) {
			return {
				type: "warning",
				icon: CalendarMonthOutlined,
				message: `${expired.length}/${deadlines.length} deadlines expired`,
				submessage: "Consider using Marking Voucher instead.",
				bgColor: "error.50",
				borderColor: "error.light",
				textColor: "error.dark",
			};
		}

		// Check if upcoming deadline is within 7 days
		if (upcoming.length > 0) {
			const nextDeadline = upcoming[0].deadline;
			const daysDiff = Math.ceil(
				(nextDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
			);

			if (daysDiff <= 7) {
				return {
					type: "warning",
					icon: CalendarMonthOutlined,
					message: `Next deadline: ${nextDeadline.toLocaleDateString()}`,
					submessage: `Deadline due in ${daysDiff} day${daysDiff !== 1 ? "s" : ""}.`,
					bgColor: "warning.50",
					borderColor: "warning.light",
					textColor: "warning.dark",
				};
			}
		}

		// All available - no issues
		if (upcoming.length > 0) {
			return {
				type: "info",
				icon: CalendarMonthOutlined,
				message: `Next deadline: ${upcoming[0].deadline.toLocaleDateString()}`,
				bgColor: "info.50",
				borderColor: "info.light",
				textColor: "info.dark",
			};
		}

		return {
			type: "info",
			icon: CalendarMonthOutlined,
			message: "No deadline information available",
			bgColor: "grey.50",
			borderColor: "grey.300",
			textColor: "grey.700",
		};
	}, [loading, deadlines.length, allExpired, expired.length, upcoming]);

	const handlePriceTypeChange = useCallback(
		(priceType: string) => {
			if (selectedPriceType === priceType) {
				setSelectedPriceType("");
			} else {
				setSelectedPriceType(priceType);
			}
		},
		[selectedPriceType]
	);

	const addToCartConfirmed = useCallback(() => {
		const finalPriceType = "standard";

		if (selectedVariations.length > 0) {
			// Handle selected variations (including auto-selected single variations)
			selectedVariations.forEach((variationId) => {
				const variation = product.variations!.find((v) => v.id === variationId);
				const priceObj = variation?.prices?.find((p) => p.price_type === finalPriceType);

				// Build metadata
				const metadata = {
					type: "marking",
					producttype: product.type,
					variationId: variation!.id,
					variationName: variation!.name,
					variationType: variation!.variation_type,
					subjectCode: product.subject_code,
					productName: product.product_name,
					deadlineCount: deadlines.length,
					expiredDeadlineCount: expired.length,
				};

				onAddToCart?.(product, {
					variationId: variation!.id,
					variationName: variation!.name,
					priceType: finalPriceType,
					actualPrice: priceObj?.amount,
					metadata,
				});
			});
		} else if (singleVariation) {
			// Handle single variation (fallback if auto-selection didn't work)
			const priceObj = singleVariation.prices?.find((p) => p.price_type === finalPriceType);

			const metadata = {
				type: "marking",
				producttype: product.type,
				variationId: singleVariation.id,
				variationName: singleVariation.name,
				variationType: singleVariation.variation_type,
				subjectCode: product.subject_code,
				productName: product.product_name,
				deadlineCount: deadlines.length,
				expiredDeadlineCount: expired.length,
			};

			onAddToCart?.(product, {
				variationId: singleVariation.id,
				variationName: singleVariation.name,
				priceType: finalPriceType,
				actualPrice: priceObj?.amount,
				metadata,
			});
		} else if (!hasVariations) {
			// Handle products without variations
			let actualPrice: number | string | null = null;
			if (currentVariation && currentVariation.prices) {
				const priceObj = currentVariation.prices.find((p) => p.price_type === finalPriceType);
				actualPrice = priceObj?.amount || null;
			}

			const metadata = {
				type: "marking",
				producttype: product.type,
				variationId: currentVariation?.id,
				variationName: currentVariation?.name,
				variationType: currentVariation?.variation_type,
				subjectCode: product.subject_code,
				productName: product.product_name,
				deadlineCount: deadlines.length,
				expiredDeadlineCount: expired.length,
			};

			onAddToCart?.(product, {
				priceType: finalPriceType,
				actualPrice,
				variationId: currentVariation?.id,
				variationName: currentVariation?.name,
				metadata,
			});
		}
		setShowExpiredWarning(false);
	}, [selectedVariations, product, singleVariation, hasVariations, currentVariation, deadlines.length, expired.length, onAddToCart]);

	const handleAddToCart = useCallback(() => {
		if (expired.length > 0 && !allExpired) {
			// Some deadlines are expired but not all - show warning
			setShowExpiredWarning(true);
		} else {
			// No expired deadlines or all expired
			addToCartConfirmed();
		}
	}, [expired.length, allExpired, addToCartConfirmed]);

	// Memoized SpeedDial handlers to prevent unnecessary re-renders
	const handleBuyMarkingOnly = useCallback(() => {
		handleAddToCart();
		setSpeedDialOpen(false);
	}, [handleAddToCart]);

	const handleBuyWithRecommended = useCallback(() => {
		const priceType = selectedPriceType || "standard";
		const recommendedProduct = currentVariation?.recommended_product;

		if (!recommendedProduct) return;

		// Add marking product with user's selected price type
		const markingPriceObj = getPriceForType(currentVariation, priceType);
		if (markingPriceObj) {
			onAddToCart?.(product, {
				variationId: currentVariation!.id,
				variationName: currentVariation!.name,
				priceType,
				actualPrice: markingPriceObj.amount,
			});
		}

		// Add recommended product with STANDARD price (no discounts)
		const recommendedPriceObj = getPriceForType(recommendedProduct, "standard");
		if (recommendedPriceObj) {
			onAddToCart?.(
				{
					// Use store product ID (id) after cart-orders refactoring
					id: recommendedProduct.id || recommendedProduct.store_product_id,
					product_code: recommendedProduct.product_code,
					product_name: recommendedProduct.product_name,
					product_short_name: recommendedProduct.product_short_name,
					type: "Materials",
				},
				{
					variationId: recommendedProduct.esspv_id,
					variationName: recommendedProduct.variation_type,
					priceType: "standard",
					actualPrice: recommendedPriceObj.amount,
				}
			);
		}
		setSpeedDialOpen(false);
	}, [currentVariation, selectedPriceType, product, onAddToCart, getPriceForType]);

	const handleMouseEnter = useCallback(() => {
		setIsHovered(true);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setIsHovered(false);
	}, []);

	return {
		// State
		deadlines,
		loading,
		showModal,
		setShowModal,
		showPriceModal,
		setShowPriceModal,
		selectedVariations,
		selectedPriceType,
		showExpiredWarning,
		setShowExpiredWarning,
		isHovered,
		speedDialOpen,
		setSpeedDialOpen,

		// Cart / theme
		userRegion,
		theme,

		// Variation info
		hasVariations,
		singleVariation,
		currentVariation,

		// Price helpers
		getPriceData,
		hasPriceType,
		getPriceForType,

		// Deadline data
		parsedDeadlines,
		upcoming,
		expired,
		allExpired,
		currentDeadlineScenario,

		// Handlers
		handlePriceTypeChange,
		handleAddToCart,
		addToCartConfirmed,
		handleBuyMarkingOnly,
		handleBuyWithRecommended,
		handleMouseEnter,
		handleMouseLeave,
	};
};

export default useMarkingProductCardVM;
