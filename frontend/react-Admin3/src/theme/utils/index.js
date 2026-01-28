/**
 * Theme Utilities
 *
 * Gradient functions and style helpers for the theme system.
 * @module theme/utils
 */

// =============================================================================
// SX Composition Utilities
// =============================================================================

/**
 * Merges multiple sx objects into a single sx object.
 * Later objects take precedence over earlier ones for conflicting keys.
 *
 * @param {...(object|function)} sxObjects - sx objects or sx callbacks to merge
 * @returns {function} - A merged sx callback function
 *
 * @example
 * // Merge static sx objects
 * const combinedSx = composeSx(
 *   { padding: 2, margin: 1 },
 *   { padding: 3 }  // padding becomes 3
 * );
 * <Box sx={combinedSx} />
 *
 * @example
 * // Merge with theme callbacks
 * const baseSx = { color: 'primary.main' };
 * const responsiveSx = (theme) => ({ padding: { xs: 1, md: 2 } });
 * <Box sx={composeSx(baseSx, responsiveSx)} />
 */
export const composeSx = (...sxObjects) => {
  return (theme) => {
    return sxObjects.reduce((merged, sx) => {
      if (!sx) return merged;
      const resolved = typeof sx === 'function' ? sx(theme) : sx;
      return { ...merged, ...resolved };
    }, {});
  };
};

/**
 * Returns product card styling based on product type.
 * Maps product types to semantic color tokens.
 *
 * @param {object} theme - MUI theme object
 * @param {string} productType - Product type ('tutorial', 'material', 'bundle', 'marking', 'online-classroom', 'marking-voucher')
 * @returns {object} - sx-compatible style object with header, button, and text colors
 *
 * @example
 * const CardComponent = ({ productType }) => {
 *   const theme = useTheme();
 *   const cardStyles = productCardSx(theme, productType);
 *
 *   return (
 *     <Card>
 *       <CardHeader sx={{ bgcolor: cardStyles.header }} />
 *       <Button sx={{ bgcolor: cardStyles.button, color: cardStyles.buttonText }}>
 *         Action
 *       </Button>
 *     </Card>
 *   );
 * };
 *
 * @example
 * // Available product types and their colors:
 * // 'tutorial'         -> purple scale (scales.purple[60])
 * // 'material'         -> sky scale (scales.sky[60])
 * // 'bundle'           -> green scale (scales.green[60])
 * // 'marking'          -> pink scale (scales.pink[60])
 * // 'online-classroom' -> cobalt scale (scales.cobalt[60])
 * // 'marking-voucher'  -> orange scale (scales.orange[50])
 */
export const productCardSx = (theme, productType) => {
  const productCards = theme.palette.productCards;

  // Normalize product type to match semantic token keys
  const normalizedType = productType?.toLowerCase().replace('-', '') || 'material';

  // Map product type to semantic token key
  const typeMap = {
    tutorial: 'tutorial',
    material: 'material',
    bundle: 'bundle',
    marking: 'marking',
    onlineclassroom: 'onlineClassroom',
    markingvoucher: 'markingVoucher',
  };

  const tokenKey = typeMap[normalizedType] || 'material';
  const tokens = productCards[tokenKey] || productCards.material;

  return {
    header: tokens.header,
    headerHover: tokens.headerHover,
    button: tokens.button,
    buttonHover: tokens.buttonHover,
    buttonText: tokens.buttonText,
    accent: tokens.accent,
  };
};

// =============================================================================
// Gradient Utilities (legacy - extracted from theme.js)
// =============================================================================

export const createGradientStyle = (mousePosition, isHovered, colorScheme) => {
  const { x, y } = mousePosition;
  const intensity = isHovered ? 0.15 : 0.03;
  const gradientAngle = Math.atan2(y - 50, x - 50) * (180 / Math.PI);

  return {
    background: `linear-gradient(${gradientAngle}deg,
      rgba(${colorScheme.primary}, ${intensity}) 0%,
      rgba(${colorScheme.secondary}, ${intensity * 0.7}) 30%,
      rgba(255, 255, 255, 0) 60%,
      rgba(${colorScheme.accent}, ${intensity * 0.5}) 100%)`,
    transition: isHovered
      ? "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      : "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
  };
};

export const gradientColorSchemes = {
  material: {
    primary: "140, 250, 250",
    secondary: "33, 150, 243",
    accent: "173, 63, 181",
  },
  tutorial: {
    primary: "156, 39, 176",
    secondary: "233, 30, 99",
    accent: "103, 58, 183",
  },
  online: {
    primary: "33, 150, 243",
    secondary: "3, 169, 244",
    accent: "63, 81, 181",
  },
  bundle: {
    primary: "76, 175, 80",
    secondary: "139, 195, 74",
    accent: "46, 125, 50",
  },
  assessment: {
    primary: "156, 39, 176",
    secondary: "233, 30, 99",
    accent: "103, 58, 183",
  },
  marking: {
    primary: "255, 152, 0",
    secondary: "255, 193, 7",
    accent: "255, 111, 0",
  },
};

export default {
  // Style composition helpers
  composeSx,
  productCardSx,
  // Gradient utilities
  createGradientStyle,
  gradientColorSchemes,
};
