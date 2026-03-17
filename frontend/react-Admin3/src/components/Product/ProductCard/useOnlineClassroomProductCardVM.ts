import { useState, useCallback, useMemo } from 'react';
import { useCart } from '../../../contexts/CartContext.tsx';
import type {
  BrowseProduct,
  BrowseProductVariation,
  BrowseProductPrice,
} from '../../../types/browse';

// ─── Interfaces ──────────────────────────────────────────────

export interface OnlineClassroomProductCardVM {
  // State
  selectedVariation: string;
  selectedPriceType: string;
  setSelectedPriceType: React.Dispatch<React.SetStateAction<string>>;
  isHovered: boolean;
  showPriceModal: boolean;
  setShowPriceModal: React.Dispatch<React.SetStateAction<boolean>>;

  // Computed
  currentVariation: BrowseProductVariation | undefined;
  userRegion: string;
  displayPrice: string;
  priceLevelText: string;

  // Handlers
  handleVariationChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  handleAddToCart: () => void;

  // Product data (pass-through)
  product: BrowseProduct;
}

// ─── Hook ────────────────────────────────────────────────────

const useOnlineClassroomProductCardVM = (
  product: BrowseProduct,
  onAddToCart?: (product: BrowseProduct, priceInfo: any) => void,
): OnlineClassroomProductCardVM => {
  // Initialize with the first available variation ID instead of hardcoded string
  const [selectedVariation, setSelectedVariation] = useState<string>(
    product.variations?.[0]?.id?.toString() || '',
  );
  const [selectedPriceType, setSelectedPriceType] = useState<string>(''); // Empty means standard pricing
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [showPriceModal, setShowPriceModal] = useState<boolean>(false);

  const { cartData } = useCart();

  // Get user's VAT region from cart data
  const userRegion: string =
    (cartData as any)?.vat_calculations?.region_info?.region || 'UK';

  // Use actual product variations instead of hardcoded options
  const currentVariation = useMemo(
    () => product.variations?.find((v) => v.id.toString() === selectedVariation),
    [product.variations, selectedVariation],
  );

  const handleVariationChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedVariation(event.target.value);
    },
    [],
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Compute display price
  const displayPrice = useMemo((): string => {
    if (!currentVariation) return '\u00A30.00';

    const standardPrice = currentVariation.prices?.find(
      (p) => p.price_type === 'standard',
    );
    const retakerPrice = currentVariation.prices?.find(
      (p) => p.price_type === 'retaker',
    );
    const additionalPrice = currentVariation.prices?.find(
      (p) => p.price_type === 'additional',
    );

    if (selectedPriceType === 'retaker' && retakerPrice) {
      return `\u00A3${retakerPrice.amount}`;
    } else if (selectedPriceType === 'additional' && additionalPrice) {
      return `\u00A3${additionalPrice.amount}`;
    } else if (standardPrice) {
      return `\u00A3${standardPrice.amount}`;
    }
    return '\u00A30.00';
  }, [currentVariation, selectedPriceType]);

  // Compute price level text
  const priceLevelText = useMemo((): string => {
    if (selectedPriceType === 'retaker') return 'Retaker discount applied';
    if (selectedPriceType === 'additional') return 'Additional copy discount applied';
    return 'Standard pricing';
  }, [selectedPriceType]);

  // Handle add to cart
  const handleAddToCart = useCallback(() => {
    if (!onAddToCart || !currentVariation) return;

    // Get the appropriate price based on selected price type
    const priceType = selectedPriceType || 'standard';
    const priceObj = currentVariation.prices?.find(
      (p) => p.price_type === priceType,
    );

    // Build metadata with is_digital flag
    const metadata = {
      type: 'online_classroom',
      producttype: product.type,
      variationId: currentVariation.id,
      variationName: currentVariation.name,
      variationType: currentVariation.variation_type,
      subjectCode: product.subject_code,
      productName: product.product_name,
      is_digital: true, // Online Classroom is always digital
    };

    // Construct context similar to MaterialProductCard
    const context = {
      // Use actual integer variation ID from database
      variationId: currentVariation.id,
      variationName: currentVariation.name,
      priceType: priceType,
      actualPrice: priceObj?.amount || '0.00',
      metadata: metadata,
    };

    onAddToCart(product, context);
  }, [onAddToCart, currentVariation, selectedPriceType, product]);

  return {
    selectedVariation,
    selectedPriceType,
    setSelectedPriceType,
    isHovered,
    showPriceModal,
    setShowPriceModal,
    currentVariation,
    userRegion,
    displayPrice,
    priceLevelText,
    handleVariationChange,
    handleMouseEnter,
    handleMouseLeave,
    handleAddToCart,
    product,
  };
};

export default useOnlineClassroomProductCardVM;
