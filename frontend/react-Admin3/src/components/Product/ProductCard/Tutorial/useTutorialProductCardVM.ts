import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '@mui/material';
import type { Theme } from '@mui/material';
import { useTutorialChoice } from '../../../../contexts/TutorialChoiceContext';
import { useCart } from '../../../../contexts/CartContext.tsx';
import tutorialService from '../../../../services/tutorialService';
import {
  buildTutorialMetadata,
  buildTutorialProductData,
  buildTutorialPriceData,
} from '../../../../utils/tutorialMetadataBuilder.js';
import type {
  TutorialProductCardProps,
  BrowseProductVariation,
  FlattenedTutorialEvent,
  TutorialChoiceData,
  SubjectChoices,
} from '../../../../types/browse';

// ─── Speed Dial Action ──────────────────────────────────────────

export interface SpeedDialActionItem {
  key: string;
  icon: React.ReactNode;
  name: string;
  show: boolean;
  onClick: () => void;
}

// ─── Display Price ──────────────────────────────────────────────

export interface DisplayPrice {
  standard: number | string | null;
  retaker: number | string | null | undefined;
  additional: number | string | null | undefined;
}

// ─── Summary Info ───────────────────────────────────────────────

export interface SummaryInfo {
  totalEvents: number;
  distinctDescriptions: string[];
  distinctVenues: string[];
}

// ─── ViewModel Interface ────────────────────────────────────────

export interface TutorialProductCardVM {
  // Theme
  theme: Theme;

  // Data state
  variations: BrowseProductVariation[];
  loading: boolean;
  error: string | null;

  // UI state
  isHovered: boolean;
  selectedPriceType: string;
  speedDialOpen: boolean;
  priceInfoOpen: boolean;
  isDialogOpen: boolean;

  // Derived data
  subjectChoices: SubjectChoices;
  hasChoices: boolean;
  choiceCount: number;
  tutorialsInCartCount: number;
  uniqueVariations: BrowseProductVariation[];
  displayPrice: DisplayPrice;
  flattenedEvents: FlattenedTutorialEvent[];
  summaryInfo: SummaryInfo;
  speedDialActions: SpeedDialActionItem[];

  // Actions
  handleDialogClose: () => void;
  handleDialogOpen: () => void;
  handleSpeedDialOpen: () => void;
  handleSpeedDialClose: () => void;
  handleAddToCart: () => Promise<void>;
  handlePriceInfoOpen: () => void;
  handlePriceInfoClose: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  setSelectedPriceType: React.Dispatch<React.SetStateAction<string>>;
  setSpeedDialOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// ─── ViewModel Hook ─────────────────────────────────────────────

/**
 * This hook must be called with speedDialActions icons injected from the view,
 * because React elements (JSX) belong in the view layer.
 * We accept an `iconFactory` to let the view provide the icons.
 */
export interface SpeedDialIconFactory {
  addShoppingCart: React.ReactNode;
  calendarWithBadge: (badgeContent: number | null) => React.ReactNode;
  viewModule: React.ReactNode;
}

const useTutorialProductCardVM = (
  props: TutorialProductCardProps,
  iconFactory?: SpeedDialIconFactory,
): TutorialProductCardVM => {
  const {
    subjectCode,
    subjectName,
    location,
    productId,
    product,
    variations: preloadedVariations = null,
    onAddToCart = null,
    dialogOpen = null,
    onDialogClose = null,
  } = props;

  const theme = useTheme();
  const [variations, setVariations] = useState<BrowseProductVariation[]>(preloadedVariations || []);
  const [loading, setLoading] = useState(!preloadedVariations);
  const [error, setError] = useState<string | null>(null);
  const [localDialogOpen, setLocalDialogOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedPriceType, setSelectedPriceType] = useState(''); // Empty means standard pricing
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [priceInfoOpen, setPriceInfoOpen] = useState(false);

  // T014: Get context hooks BEFORE using their values
  const {
    getSubjectChoices,
    markChoicesAsAdded,
    removeTutorialChoice,
    editDialogOpen,
    closeEditDialog,
    openEditDialog,
    addTutorialChoice,
  } = useTutorialChoice();

  const { addToCart, updateCartItem, cartItems } = useCart();

  // T014: Use controlled state from multiple sources
  // Priority: dialogOpen prop > context editDialogOpen > local state
  // Check both subjectCode and location (or open if location not specified)
  const shouldOpenFromContext =
    editDialogOpen &&
    editDialogOpen.subjectCode === subjectCode &&
    (!editDialogOpen.location || editDialogOpen.location === location);

  const isDialogOpen =
    dialogOpen !== null && dialogOpen !== undefined
      ? dialogOpen
      : shouldOpenFromContext
      ? true
      : localDialogOpen;

  const handleDialogClose = (): void => {
    // T014: Clear context dialog state when closing
    if (shouldOpenFromContext) {
      closeEditDialog();
    }
    // Clear local state
    setLocalDialogOpen(false);
    // Call parent callback if provided
    if (onDialogClose) {
      onDialogClose();
    }
  };

  const handleDialogOpen = (): void => {
    // Pre-populate cart items into context when opening dialog
    const existingCartItem = cartItems.find((item: any) => {
      const itemSubjectCode =
        item.subject_code || item.metadata?.subjectCode;
      return (
        itemSubjectCode === subjectCode &&
        item.product_type === 'tutorial'
      );
    });

    if (
      existingCartItem &&
      (existingCartItem as any).metadata?.locations?.[0]?.choices
    ) {
      // Extract choices from cart metadata and add to context with isDraft=false
      const cartChoices = (existingCartItem as any).metadata.locations[0].choices;

      cartChoices.forEach((cartChoice: any) => {
        const choiceLocation = cartChoice.location || location;

        // Convert cart choice format to tutorialChoice format
        addTutorialChoice(
          subjectCode,
          cartChoice.choice, // "1st", "2nd", or "3rd"
          {
            eventId: cartChoice.eventId,
            eventTitle: cartChoice.eventTitle,
            eventCode: cartChoice.eventCode,
            venue: cartChoice.venue,
            startDate: cartChoice.startDate,
            endDate: cartChoice.endDate,
            variationId: cartChoice.variationId,
            variationName: cartChoice.variationName,
            location: choiceLocation, // FIX: Use cart choice location, not current product location
            subjectCode: subjectCode,
            subjectName: subjectName,
            isDraft: false, // Mark as not draft since it's from cart
          },
          {
            productId: productId,
            productName: subjectName,
            subjectName: subjectName,
          }
        );
      });
    }

    if (dialogOpen !== null && dialogOpen !== undefined && onDialogClose) {
      // In controlled mode, parent handles opening via dialogOpen prop
      // Do nothing here - parent should set dialogOpen=true
    } else {
      setLocalDialogOpen(true);
    }
  };

  // Get current choices for this subject
  const subjectChoices = getSubjectChoices(subjectCode) as SubjectChoices;
  const hasChoices = Object.keys(subjectChoices).length > 0;
  const choiceCount = Object.keys(subjectChoices).length;

  // Calculate total tutorials in cart for this subject
  const tutorialsInCartCount = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return 0;

    // Filter cart items for this subject
    // Subject code can be at top level or in metadata
    const tutorialItems = cartItems.filter((item: any) => {
      const itemSubjectCode =
        item.subject_code || item.metadata?.subjectCode;
      return (
        itemSubjectCode === subjectCode &&
        item.product_type === 'tutorial'
      );
    });

    // Count total choices across all tutorial items
    return tutorialItems.reduce((total: number, item: any) => {
      // Check if item has metadata with choice count
      const metadata = item.metadata || item.priceInfo?.metadata;
      if (metadata && metadata.totalChoiceCount) {
        return total + metadata.totalChoiceCount;
      }
      // Fallback: count each item as 1
      return total + 1;
    }, 0);
  }, [cartItems, subjectCode]);

  // Compute unique variations (deduplicate by name, preferring ones with standard price)
  // This fixes the issue where multiple variations with the same name appear in the price table
  const uniqueVariations = useMemo(() => {
    if (!variations || variations.length === 0) return [];

    const variationMap = new Map<string, BrowseProductVariation>();

    variations.forEach((variation) => {
      const name = variation.name;
      const existingVariation = variationMap.get(name);

      // Check if this variation has a standard price
      const hasStandardPrice = variation.prices?.some(
        (p) => p.price_type === 'standard' && p.amount != null
      );
      const existingHasStandardPrice = existingVariation?.prices?.some(
        (p) => p.price_type === 'standard' && p.amount != null
      );

      // Prefer the variation with a standard price
      if (!existingVariation || (hasStandardPrice && !existingHasStandardPrice)) {
        variationMap.set(name, variation);
      }
    });

    return Array.from(variationMap.values());
  }, [variations]);

  // Compute display price from the first variation's standard price
  // This fixes the fallback issue when product.price is undefined
  const displayPrice = useMemo((): DisplayPrice => {
    // Find the first variation with a standard price
    for (const variation of uniqueVariations) {
      const standardPrice = variation.prices?.find(
        (p) => p.price_type === 'standard'
      );
      if (standardPrice?.amount != null) {
        return {
          standard: standardPrice.amount,
          retaker: variation.prices?.find((p) => p.price_type === 'retaker')?.amount,
          additional: variation.prices?.find((p) => p.price_type === 'additional')?.amount,
        };
      }
    }
    // Fallback to product.price if no variation prices found
    return {
      standard: product.price || null,
      retaker: product.retaker_price || null,
      additional: product.additional_copy_price || null,
    };
  }, [uniqueVariations, product.price, product.retaker_price, product.additional_copy_price]);

  // Flatten events from variations for TutorialSelectionDialog
  const flattenedEvents = useMemo((): FlattenedTutorialEvent[] => {
    const events: FlattenedTutorialEvent[] = [];
    variations.forEach((variation) => {
      if (variation.events) {
        variation.events.forEach((event) => {
          events.push({
            eventId: event.id,
            eventTitle: event.title,
            eventCode: event.code,
            location: event.location || location,
            venue: event.venue,
            startDate: event.start_date,
            endDate: event.end_date,
            variation: {
              variationId: variation.id,
              variationName: variation.name,
              prices: variation.prices,
            },
          });
        });
      }
    });
    // Sort by start date
    const sorted = events.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return sorted;
  }, [variations, location, subjectCode]);

  // SpeedDial event handlers - memoized to prevent unnecessary re-renders
  const handleSpeedDialOpen = useCallback(() => setSpeedDialOpen(true), []);
  const handleSpeedDialClose = useCallback(
    () => setSpeedDialOpen(false),
    []
  );

  const handleAddToCart = useCallback(async () => {
    setSpeedDialOpen(false);

    if (!hasChoices) {
      return;
    }

    // Get actual price from first choice
    const primaryChoice = Object.values(subjectChoices).find((c) => c) as TutorialChoiceData | undefined;
    const actualPrice =
      primaryChoice?.variation?.prices?.find(
        (p: any) => p.price_type === 'standard'
      )?.amount || product.price;

    // Build metadata using utility function
    const tutorialMetadata = buildTutorialMetadata(
      subjectChoices,
      subjectCode,
      location,
      actualPrice
    );

    if (!tutorialMetadata) {
      return;
    }

    // Build product and price data using utility functions
    const productData = buildTutorialProductData(
      productId,
      subjectCode,
      subjectName,
      location
    );

    const priceData = buildTutorialPriceData(
      actualPrice,
      tutorialMetadata
    );

    try {
      // Lookup: Check if cart already has an item for this subject
      // Subject code can be at top level or in metadata
      const existingCartItem = cartItems.find((item: any) => {
        const itemSubjectCode =
          item.subject_code || item.metadata?.subjectCode;
        return (
          itemSubjectCode === subjectCode &&
          item.product_type === 'tutorial'
        );
      });

      if (existingCartItem) {
        // Merge: Update existing cart item with new choices
        await updateCartItem(
          existingCartItem.id,
          productData,
          priceData
        );
      } else {
        // Create: Add new cart item
        await addToCart(productData, priceData);
      }

      // Mark choices as added (state transition: isDraft false)
      markChoicesAsAdded(subjectCode);
    } catch (error) {
      console.error(
        '[TutorialProductCard] Error adding to cart:',
        error
      );
      // TODO: Show user error feedback
    }
  }, [
    addToCart,
    updateCartItem,
    cartItems,
    markChoicesAsAdded,
    hasChoices,
    subjectChoices,
    product,
    productId,
    subjectCode,
    subjectName,
    location,
  ]);

  const handleSelectTutorial = useCallback(() => {
    setSpeedDialOpen(false);
    handleDialogOpen();
  }, []);

  const handleViewSelections = useCallback(() => {
    setSpeedDialOpen(false);
    // Open edit dialog to show current choices (same as clicking Edit in summary bar)
    openEditDialog(subjectCode);
  }, [openEditDialog, subjectCode]);

  const handlePriceInfoOpen = useCallback(() => {
    setPriceInfoOpen(true);
  }, []);

  const handlePriceInfoClose = useCallback(() => {
    setPriceInfoOpen(false);
  }, []);

  // SpeedDial actions configuration - memoized to prevent unnecessary re-renders
  // Uses icon factory if provided, otherwise returns placeholder actions
  const speedDialActions = useMemo(
    (): SpeedDialActionItem[] => {
      if (!iconFactory) return [];
      return [
        {
          key: 'addToCart',
          icon: iconFactory.addShoppingCart,
          name: 'Add to Cart',
          show: hasChoices,
          onClick: handleAddToCart,
        },
        {
          key: 'selectTutorial',
          icon: iconFactory.calendarWithBadge(
            tutorialsInCartCount > 0 ? tutorialsInCartCount : null
          ),
          name: 'Select Tutorial',
          show: true,
          onClick: handleSelectTutorial,
        },
        {
          key: 'viewSelections',
          icon: iconFactory.viewModule,
          name: 'View selections',
          show: hasChoices,
          onClick: handleViewSelections,
        },
      ].filter((action) => action.show);
    },
    [
      hasChoices,
      tutorialsInCartCount,
      handleAddToCart,
      handleSelectTutorial,
      handleViewSelections,
      iconFactory,
    ]
  );

  useEffect(() => {
    // Only fetch if variations weren't preloaded
    if (!preloadedVariations && productId && subjectCode) {
      const fetchTutorialVariations = async () => {
        try {
          setLoading(true);
          const data = await tutorialService.getTutorialVariations(
            productId,
            subjectCode
          );
          setVariations(data || []);
          setError(null);
        } catch (err) {
          console.error('Error fetching tutorial variations:', err);
          setError('Failed to load tutorial variations');
        } finally {
          setLoading(false);
        }
      };

      fetchTutorialVariations();
    } else if (preloadedVariations) {
      setVariations(preloadedVariations);
      setLoading(false);
    }
  }, [productId, subjectCode, preloadedVariations]);

  const getSummaryInfo = (): SummaryInfo => {
    const totalEvents = variations.reduce(
      (sum, variation) => sum + (variation.events?.length || 0),
      0
    );
    const distinctDescriptions = [
      ...new Set(
        variations
          .map((v) => v.description_short || v.description)
          .filter(Boolean) as string[]
      ),
    ];
    const distinctVenues = [
      ...new Set(
        variations
          .flatMap((v) => v.events || [])
          .map((e) => e.venue)
          .filter(Boolean) as string[]
      ),
    ];

    return { totalEvents, distinctDescriptions, distinctVenues };
  };

  const summaryInfo = getSummaryInfo();

  const handleMouseEnter = (): void => {
    setIsHovered(true);
  };

  const handleMouseLeave = (): void => {
    setIsHovered(false);
  };

  return {
    theme,
    variations,
    loading,
    error,
    isHovered,
    selectedPriceType,
    speedDialOpen,
    priceInfoOpen,
    isDialogOpen,
    subjectChoices,
    hasChoices,
    choiceCount,
    tutorialsInCartCount,
    uniqueVariations,
    displayPrice,
    flattenedEvents,
    summaryInfo,
    speedDialActions,
    handleDialogClose,
    handleDialogOpen,
    handleSpeedDialOpen,
    handleSpeedDialClose,
    handleAddToCart,
    handlePriceInfoOpen,
    handlePriceInfoClose,
    handleMouseEnter,
    handleMouseLeave,
    setSelectedPriceType,
    setSpeedDialOpen,
  };
};

export default useTutorialProductCardVM;
