import { useState, useMemo, useCallback } from "react";
import { useTheme, type Theme } from "@mui/material/styles";
import { useCart } from "../../../contexts/CartContext.tsx";
import bundleService from "../../../services/bundleService";
import type {
  BrowseProduct,
  BundleContents,
  BundleComponent,
  PriceType,
} from "../../../types/browse";

// ─── ViewModel Interface ─────────────────────────────────────────

export interface BundleCardVM {
  theme: Theme;
  showContentsModal: boolean;
  bundleContents: BundleContents | null;
  loadingContents: boolean;
  selectedPriceType: string;
  isHovered: boolean;
  loadingPrices: boolean;
  getBundlePrice: (priceType?: string) => number | null;
  hasBundlePriceType: (priceType: string) => boolean;
  handlePriceTypeChange: (priceType: string) => void;
  handleShowContents: () => Promise<void>;
  handleAddToCart: () => Promise<void>;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  handleCloseContentsModal: () => void;
  formatPrice: (amount: number | string | null | undefined) => string;
  getComponentPrice: (component: BundleComponent, priceType?: string) => number | null;
}

// ─── ViewModel Hook ──────────────────────────────────────────────

const useBundleCardVM = (
  bundle: BrowseProduct,
  onAddToCart?: (product: BrowseProduct, priceInfo: any) => void
): BundleCardVM => {
  const theme = useTheme();
  const [showContentsModal, setShowContentsModal] = useState(false);
  const [bundleContents, setBundleContents] = useState<BundleContents | null>(null);
  const [loadingContents, setLoadingContents] = useState(false);
  const [selectedPriceType, setSelectedPriceType] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  // Bundle data with components and prices is already included from unified search API
  // No need to fetch separately - use bundle.components directly
  const [loadingPrices] = useState(false);

  const { addToCart } = useCart();

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleCloseContentsModal = useCallback(() => {
    setShowContentsModal(false);
  }, []);

  // Calculate bundle total price by summing component prices with fallback logic
  const getBundlePrice = useMemo(() => {
    return (priceType: string = "standard"): number | null => {
      // Use fetched bundleContents if available, otherwise fall back to bundle prop
      const components = bundleContents?.components || bundle.components;

      if (!components || components.length === 0) return null;

      let totalPrice = 0;
      let hasValidPrices = false;

      // Calculate sum of all component prices with fallback to standard if discount not available
      for (const component of components) {
        // Check if component has pricing information (new API structure)
        if (component.prices && Array.isArray(component.prices)) {
          // First try to find the requested price type
          let priceObj = component.prices.find(
            (p) => p.price_type === priceType
          );

          // If requested price type not found, fallback to standard price
          if (!priceObj || !priceObj.amount) {
            priceObj = component.prices.find(
              (p) => p.price_type === "standard"
            );
          }

          if (priceObj && priceObj.amount) {
            const quantity = component.quantity || 1;
            totalPrice += parseFloat(String(priceObj.amount)) * quantity;
            hasValidPrices = true;
          }
        }
      }

      return hasValidPrices ? totalPrice : null;
    };
  }, [bundleContents, bundle.components]);

  // Check if bundle has pricing for a specific price type
  // Returns true if ANY component has this price type
  // Components without this price type will fallback to standard pricing
  const hasBundlePriceType = useCallback(
    (priceType: string): boolean => {
      // Use fetched bundleContents if available, otherwise fall back to bundle prop
      const components = bundleContents?.components || bundle.components;

      if (!components || components.length === 0) return false;

      return components.some((component) => {
        // Check if component has pricing information (new API structure)
        if (component.prices && Array.isArray(component.prices)) {
          return component.prices.some((p) => p.price_type === priceType);
        }
        return false;
      });
    },
    [bundleContents, bundle.components]
  );

  // Handle price type change for discounts
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

  // Fetch bundle contents when modal is opened
  const handleShowContents = useCallback(async () => {
    setShowContentsModal(true);
    if (!bundleContents) {
      setLoadingContents(true);
      try {
        const response = await bundleService.getBundleContents(bundle.id);
        if (response.success) {
          setBundleContents(response.data as BundleContents);
        }
      } catch (error) {
        console.error("Error fetching bundle contents:", error);
      } finally {
        setLoadingContents(false);
      }
    }
  }, [bundleContents, bundle.id]);

  // Handle adding bundle to cart
  const handleAddToCart = useCallback(async () => {
    try {
      // Process bundle for cart - this will convert bundle into individual products
      // Pass the selected price type to handle discount pricing
      const result = await bundleService.processBundleForCart(
        bundle,
        selectedPriceType
      );

      if (result.success && result.cartItems) {
        // Add each component product to cart sequentially to avoid overwriting
        for (const cartItem of result.cartItems) {
          const quantity = cartItem.quantity || 1;
          const priceInfoToSend = {
            variationId: cartItem.priceInfo.variationId,
            variationName: cartItem.priceInfo.variationName,
            priceType: cartItem.priceInfo.priceType,
            actualPrice: cartItem.priceInfo.actualPrice,
          };

          // Add with the correct quantity - CartContext now handles synchronization
          for (let i = 0; i < quantity; i++) {
            // Wait for each add to complete before proceeding to prevent race conditions
            await addToCart(cartItem.product, priceInfoToSend);
          }
        }

        // For bundles, we don't call the onAddToCart callback since we've already
        // processed and added all components. The callback would cause the parent
        // to try adding the bundle itself as a single product, which fails.
      }
    } catch (error) {
      console.error("Error adding bundle to cart:", error);
    }
  }, [bundle, selectedPriceType, addToCart]);

  // Helper function to format price
  const formatPrice = useCallback(
    (amount: number | string | null | undefined): string => {
      if (!amount) return "N/A";
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(amount));
    },
    []
  );

  // Helper function to get component price
  const getComponentPrice = useCallback(
    (component: BundleComponent, priceType: string = "standard"): number | null => {
      if (!component.prices || !Array.isArray(component.prices)) return null;

      // Try to find the requested price type
      let priceObj = component.prices.find((p) => p.price_type === priceType);

      // Fallback to standard if requested type not found
      if (!priceObj || !priceObj.amount) {
        priceObj = component.prices.find((p) => p.price_type === "standard");
      }

      return priceObj?.amount ? Number(priceObj.amount) : null;
    },
    []
  );

  return {
    theme,
    showContentsModal,
    bundleContents,
    loadingContents,
    selectedPriceType,
    isHovered,
    loadingPrices,
    getBundlePrice,
    hasBundlePriceType,
    handlePriceTypeChange,
    handleShowContents,
    handleAddToCart,
    handleMouseEnter,
    handleMouseLeave,
    handleCloseContentsModal,
    formatPrice,
    getComponentPrice,
  };
};

export default useBundleCardVM;
