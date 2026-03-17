import { useState, useMemo, useCallback } from "react";
import { useTheme, Theme } from "@mui/material/styles";
import { useCart } from "../../../contexts/CartContext.tsx";
import { formatPrice } from "../../../utils/priceFormatter";
import type { BrowseProduct } from "../../../types/browse/browse.types";

// ─── ViewModel Interface ────────────────────────────────────────

export interface MarkingVoucherProductCardVM {
	// State
	quantity: number;
	selectedPriceType: string;
	setSelectedPriceType: (value: string) => void;
	isLoading: boolean;
	isHovered: boolean;
	isAlertExpanded: boolean;
	setIsAlertExpanded: (value: boolean) => void;

	// Theme
	theme: Theme;

	// Computed
	numericVoucherId: number;
	isAvailable: boolean;
	formattedExpiryDate: string | null;
	basePrice: number;
	totalPrice: number;

	// Handlers
	handleQuantityChange: (details: { value: string }) => void;
	handleMouseEnter: () => void;
	handleMouseLeave: () => void;
	handleAddToCart: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────

const useMarkingVoucherProductCardVM = (
	voucher: BrowseProduct,
): MarkingVoucherProductCardVM => {
	const theme = useTheme();
	const { addVoucherToCart } = useCart();
	const [quantity, setQuantity] = useState<number>(1);
	const [selectedPriceType, setSelectedPriceType] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isHovered, setIsHovered] = useState<boolean>(false);
	const [isAlertExpanded, setIsAlertExpanded] = useState<boolean>(false);

	/**
	 * Extract numeric voucher ID from string format
	 * Backend returns id as "voucher-{numeric_id}" to avoid conflicts with ESSP IDs
	 * This extracts the numeric part for the add-to-cart API call
	 */
	const numericVoucherId = useMemo<number>(() => {
		// If voucher.voucher_id exists (direct from marking vouchers API), use it
		if (voucher.voucher_id) {
			return parseInt(String(voucher.voucher_id));
		}
		// Handle string format "voucher-{id}" from unified search
		if (typeof voucher.id === "string" && (voucher.id as string).startsWith("voucher-")) {
			return parseInt((voucher.id as string).replace("voucher-", ""));
		}
		// Fallback to numeric id
		return parseInt(String(voucher.id));
	}, [voucher.id, voucher.voucher_id]);

	/**
	 * Handle quantity change from NumberInput
	 */
	const handleQuantityChange = useCallback((details: { value: string }) => {
		const value = parseInt(details.value);
		if (!isNaN(value) && value >= 1 && value <= 99) {
			setQuantity(value);
		}
	}, []);

	/**
	 * Determine if voucher is available for purchase
	 */
	const isAvailable = useMemo<boolean>(() => {
		if (!voucher.is_active) return false;
		if (voucher.expiry_date) {
			const expiryDate = new Date(voucher.expiry_date);
			const now = new Date();
			return now <= expiryDate;
		}
		return true;
	}, [voucher.is_active, voucher.expiry_date]);

	/**
	 * Format expiry date for display
	 */
	const formattedExpiryDate = useMemo<string | null>(() => {
		if (!voucher.expiry_date) return null;
		const date = new Date(voucher.expiry_date);
		return date.toLocaleDateString("en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	}, [voucher.expiry_date]);

	/**
	 * Get base price from voucher variations
	 */
	const basePrice = useMemo<number>(() => {
		if (voucher.price) {
			return parseFloat(String(voucher.price));
		}
		if (!voucher.variations || voucher.variations.length === 0) {
			return 0;
		}
		const firstVariation = voucher.variations[0];
		if (!firstVariation.prices || firstVariation.prices.length === 0) {
			return 0;
		}
		return parseFloat(String(firstVariation.prices[0].amount));
	}, [voucher.variations, voucher.price]);

	/**
	 * Calculate total price based on quantity
	 */
	const totalPrice = basePrice * quantity;

	/**
	 * Handle mouse enter for hover effect
	 */
	const handleMouseEnter = useCallback(() => {
		setIsHovered(true);
	}, []);

	/**
	 * Handle mouse leave for hover effect
	 */
	const handleMouseLeave = useCallback(() => {
		setIsHovered(false);
	}, []);

	/**
	 * Handle add to cart action
	 * Uses dedicated voucher cart endpoint with numeric voucher ID
	 */
	const handleAddToCart = useCallback(async () => {
		if (!isAvailable || isLoading) return;

		setIsLoading(true);
		try {
			// Use dedicated voucher cart endpoint with numeric ID
			await addVoucherToCart(numericVoucherId, quantity);
		} catch (error) {
			console.error("Error adding voucher to cart:", error);
		} finally {
			setIsLoading(false);
		}
	}, [isAvailable, isLoading, addVoucherToCart, numericVoucherId, quantity]);

	return {
		// State
		quantity,
		selectedPriceType,
		setSelectedPriceType,
		isLoading,
		isHovered,
		isAlertExpanded,
		setIsAlertExpanded,

		// Theme
		theme,

		// Computed
		numericVoucherId,
		isAvailable,
		formattedExpiryDate,
		basePrice,
		totalPrice,

		// Handlers
		handleQuantityChange,
		handleMouseEnter,
		handleMouseLeave,
		handleAddToCart,
	};
};

export default useMarkingVoucherProductCardVM;
