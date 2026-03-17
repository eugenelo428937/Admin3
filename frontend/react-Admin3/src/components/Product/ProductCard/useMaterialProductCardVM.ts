import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTheme, Theme } from '@mui/material/styles';
import { useCart } from '../../../contexts/CartContext.tsx';
import { formatPrice } from '../../../utils/priceFormatter';
import type {
  BrowseProduct,
  BrowseProductVariation,
  BrowseProductPrice,
  MarkingDeadline,
  RecommendedProduct,
} from '../../../types/browse';

// ─── Interfaces ──────────────────────────────────────────────

export interface ProductTypeCheck {
  isTutorial: boolean;
  isMarking: boolean;
  isMarkingVoucher: boolean;
  isOnlineClassroom: boolean;
  isBundle: boolean;
}

export interface VariationInfo {
  hasVariations: boolean;
  singleVariation: BrowseProductVariation | null;
  currentVariation: BrowseProductVariation | null | undefined;
}

export interface MaterialProductCardVM {
  // Routing / delegation
  producttypeCheck: ProductTypeCheck;

  // State
  selectedVariation: string;
  setSelectedVariation: React.Dispatch<React.SetStateAction<string>>;
  showPriceModal: boolean;
  setShowPriceModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedPriceType: string;
  setSelectedPriceType: React.Dispatch<React.SetStateAction<string>>;
  isHovered: boolean;
  speedDialOpen: boolean;
  setSpeedDialOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Computed
  variationInfo: VariationInfo;
  userRegion: string;
  theme: Theme;
  cardRef: React.RefObject<HTMLDivElement | null>;

  // Price helpers
  getPriceAmount: (variation: BrowseProductVariation | null | undefined, priceType: string) => string | null;
  hasPriceType: (variation: BrowseProductVariation | null | undefined, priceType: string) => boolean;
  getDisplayPrice: () => string;
  getPriceLevelText: () => string;

  // Handlers
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  handlePriceTypeChange: (priceType: string) => void;
  handleVariationChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddToCart: () => void;
  handleBuyBothEbook: () => void;
  handleBuyBothPrinted: () => void;
  handleBuyWithRecommended: () => void;

  // Product data (pass-through for view convenience)
  product: BrowseProduct;
  onAddToCart?: (product: BrowseProduct | any, priceInfo: any) => void;
  allEsspIds?: number[];
  bulkDeadlines?: Record<number | string, MarkingDeadline[]>;
}

// ─── Hook ────────────────────────────────────────────────────

const useMaterialProductCardVM = (
  product: BrowseProduct,
  onAddToCart?: (product: BrowseProduct | any, priceInfo: any) => void,
  allEsspIds?: number[],
  bulkDeadlines?: Record<number | string, MarkingDeadline[]>,
): MaterialProductCardVM => {
  const [selectedVariation, setSelectedVariation] = useState<string>('');
  const [showPriceModal, setShowPriceModal] = useState<boolean>(false);
  const [selectedPriceType, setSelectedPriceType] = useState<string>('');
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [speedDialOpen, setSpeedDialOpen] = useState<boolean>(false);
  const theme = useTheme();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const { cartData } = useCart();

  // Get user's VAT region from cart data
  const userRegion: string =
    (cartData as any)?.vat_calculations?.region_info?.region || 'UK';

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Memoize expensive calculations
  const producttypeCheck = useMemo<ProductTypeCheck>(
    () => ({
      isTutorial: product.type === 'Tutorial',
      isMarking: product.type === 'Markings',
      isMarkingVoucher:
        product.type === 'MarkingVoucher' ||
        (product as any).is_voucher === true ||
        product.product_name?.toLowerCase().includes('voucher') ||
        (product as any).code?.startsWith('VOUCHER'),
      isOnlineClassroom:
        product.product_name?.toLowerCase().includes('online classroom') ||
        product.product_name?.toLowerCase().includes('recording') ||
        (product as any).learning_mode === 'LMS',
      isBundle:
        product.type === 'Bundle' ||
        product.product_name?.toLowerCase().includes('bundle') ||
        product.product_name?.toLowerCase().includes('package') ||
        product.is_bundle === true,
    }),
    [
      product.type,
      product.product_name,
      (product as any).learning_mode,
      product.is_bundle,
      (product as any).is_voucher,
      (product as any).code,
    ],
  );

  // Memoize variation calculations
  const variationInfo = useMemo<VariationInfo>(() => {
    const hasVariations =
      product.variations != null && product.variations.length > 0;
    const singleVariation =
      product.variations != null && product.variations.length === 1
        ? product.variations[0]
        : null;

    const currentVariation = hasVariations
      ? selectedVariation
        ? product.variations!.find(
            (v) => v.id.toString() === selectedVariation,
          )
        : singleVariation || product.variations![0]
      : singleVariation;

    return { hasVariations, singleVariation, currentVariation };
  }, [product.variations, selectedVariation]);

  // Initialize selectedVariation when product loads
  useEffect(() => {
    if (
      product.variations &&
      product.variations.length > 0 &&
      !selectedVariation
    ) {
      setSelectedVariation(product.variations[0].id.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.essp_id]); // Only when product changes

  const { currentVariation } = variationInfo;

  const hasPriceType = useCallback(
    (variation: BrowseProductVariation | null | undefined, priceType: string): boolean => {
      if (!variation || !variation.prices) return false;
      return variation.prices.some((p) => p.price_type === priceType);
    },
    [],
  );

  // Reset price type if current selection is not available for the current variation
  useEffect(() => {
    if (currentVariation && selectedPriceType) {
      if (!hasPriceType(currentVariation, selectedPriceType)) {
        setSelectedPriceType('');
      }
    }
  }, [currentVariation, selectedPriceType, hasPriceType]);

  // Price helpers (return numeric/string values, not JSX)
  const getPriceAmount = useCallback(
    (variation: BrowseProductVariation | null | undefined, priceType: string): string | null => {
      if (!variation || !variation.prices) return null;
      const priceObj = variation.prices.find((p) => p.price_type === priceType);
      if (!priceObj) return null;
      return formatPrice(priceObj.amount);
    },
    [],
  );

  const getDisplayPrice = useCallback((): string => {
    if (!currentVariation) return '-';
    const priceType = selectedPriceType || 'standard';
    const priceObj = currentVariation.prices?.find(
      (p) => p.price_type === priceType,
    );
    return priceObj ? formatPrice(priceObj.amount) : '-';
  }, [currentVariation, selectedPriceType]);

  const getPriceLevelText = useCallback((): string => {
    if (selectedPriceType === 'retaker') return 'Retaker discount applied';
    if (selectedPriceType === 'additional') return 'Additional copy discount applied';
    return 'Standard pricing';
  }, [selectedPriceType]);

  const handlePriceTypeChange = useCallback(
    (priceType: string) => {
      if (selectedPriceType === priceType) {
        setSelectedPriceType('');
      } else {
        setSelectedPriceType(priceType);
      }
    },
    [selectedPriceType],
  );

  const handleVariationChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedVariation(event.target.value);
    },
    [],
  );

  // Add to cart - current selected variation
  const handleAddToCart = useCallback(() => {
    const priceType = selectedPriceType || 'standard';
    if (!currentVariation || !onAddToCart) return;
    const priceObj = currentVariation.prices?.find(
      (p) => p.price_type === priceType,
    );
    if (priceObj) {
      onAddToCart(product, {
        variationId: currentVariation.id,
        variationName: currentVariation.name,
        priceType: priceType,
        actualPrice: priceObj.amount,
      });
    }
    setSpeedDialOpen(false);
  }, [currentVariation, selectedPriceType, onAddToCart, product]);

  // Buy both (add both variations)
  const handleBuyBothEbook = useCallback(() => {
    if (!product.variations || product.variations.length < 2 || !onAddToCart) return;
    const priceType = selectedPriceType || 'standard';
    const variation1 = product.variations[0];
    const variation2 = product.variations[1];
    const price1 = variation1?.prices?.find((p) => p.price_type === priceType);
    const price2 = variation2?.prices?.find((p) => p.price_type === priceType);

    if (variation1 && variation2 && price1 && price2) {
      // Add first variation
      onAddToCart(product, {
        variationId: variation1.id,
        variationName: variation1.name,
        priceType: priceType,
        actualPrice: price1.amount,
      });

      // Add second variation
      onAddToCart(product, {
        variationId: variation2.id,
        variationName: variation2.name,
        priceType: priceType,
        actualPrice: price2.amount,
      });
    }
    setSpeedDialOpen(false);
  }, [product, selectedPriceType, onAddToCart]);

  // Alias for the same buy-both handler
  const handleBuyBothPrinted = handleBuyBothEbook;

  // Buy with recommended product
  const handleBuyWithRecommended = useCallback(() => {
    if (!currentVariation || !onAddToCart) return;
    const priceType = selectedPriceType || 'standard';
    const recommendedProduct = currentVariation.recommended_product;
    if (!recommendedProduct) return;

    // Add current variation
    const currentPriceObj = currentVariation.prices?.find(
      (p) => p.price_type === priceType,
    );
    if (currentPriceObj) {
      onAddToCart(product, {
        variationId: currentVariation.id,
        variationName: currentVariation.name,
        priceType: priceType,
        actualPrice: currentPriceObj.amount,
      });
    }

    // Add recommended product
    const recommendedPriceObj = recommendedProduct.prices?.find(
      (p) => p.price_type === priceType,
    );
    if (recommendedPriceObj) {
      onAddToCart(
        {
          id: (recommendedProduct as any).essp_id,
          essp_id: (recommendedProduct as any).essp_id,
          product_code: recommendedProduct.product_code,
          product_name: recommendedProduct.product_name,
          product_short_name: recommendedProduct.product_short_name,
          type: 'Materials',
        },
        {
          variationId: recommendedProduct.esspv_id,
          variationName: recommendedProduct.variation_type,
          priceType: priceType,
          actualPrice: recommendedPriceObj.amount,
        },
      );
    }
    setSpeedDialOpen(false);
  }, [currentVariation, selectedPriceType, onAddToCart, product]);

  return {
    producttypeCheck,
    selectedVariation,
    setSelectedVariation,
    showPriceModal,
    setShowPriceModal,
    selectedPriceType,
    setSelectedPriceType,
    isHovered,
    speedDialOpen,
    setSpeedDialOpen,
    variationInfo,
    userRegion,
    theme,
    cardRef,
    getPriceAmount,
    hasPriceType,
    getDisplayPrice,
    getPriceLevelText,
    handleMouseEnter,
    handleMouseLeave,
    handlePriceTypeChange,
    handleVariationChange,
    handleAddToCart,
    handleBuyBothEbook,
    handleBuyBothPrinted,
    handleBuyWithRecommended,
    product,
    onAddToCart,
    allEsspIds,
    bulkDeadlines,
  };
};

export default useMaterialProductCardVM;
