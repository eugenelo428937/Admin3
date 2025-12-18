// Semantic Color Mappings
// Maps design intent to actual colors for consistent usage across components

import colorTheme from '../colorTheme';

/**
 * Semantic colors map purpose/intent to actual color values.
 * Use these in components instead of raw palette colors.
 *
 * Example usage:
 *   sx={{ backgroundColor: theme.palette.semantic.cardHeader.tutorial }}
 */
export const semanticColors = {
  // Card header backgrounds by product type
  cardHeader: {
    tutorial: colorTheme.bpp.purple['020'],
    material: colorTheme.bpp.sky['020'],
    bundle: colorTheme.bpp.green['030'],
    onlineClassroom: colorTheme.bpp.cobalt['020'],
    marking: colorTheme.bpp.pink['020'],
    markingVoucher: colorTheme.bpp.orange['020'],
  },

  // Card action area backgrounds
  cardActions: {
    tutorial: colorTheme.bpp.purple['030'],
    material: colorTheme.bpp.sky['030'],
    bundle: colorTheme.bpp.green['040'],
    onlineClassroom: colorTheme.bpp.cobalt['030'],
    marking: colorTheme.bpp.pink['030'],
    markingVoucher: colorTheme.bpp.orange['030'],
  },

  // Badge backgrounds
  badge: {
    tutorial: colorTheme.bpp.purple['010'],
    material: colorTheme.bpp.sky['010'],
    bundle: colorTheme.bpp.green['010'],
    onlineClassroom: colorTheme.bpp.cobalt['010'],
    marking: colorTheme.bpp.pink['010'],
    default: 'rgba(255, 255, 255, 0.5)',
  },

  // Text colors by product type (dark variants for headers)
  cardText: {
    tutorial: {
      title: colorTheme.bpp.sky['100'],
      subtitle: colorTheme.bpp.sky['090'],
      price: colorTheme.bpp.purple['100'],
    },
    material: {
      title: colorTheme.bpp.sky['100'],
      subtitle: colorTheme.bpp.sky['090'],
      price: colorTheme.bpp.sky['100'],
    },
    bundle: {
      title: colorTheme.bpp.green['100'],
      subtitle: colorTheme.bpp.green['090'],
      price: colorTheme.bpp.green['100'],
    },
    onlineClassroom: {
      title: colorTheme.bpp.cobalt['100'],
      subtitle: colorTheme.bpp.cobalt['090'],
      price: colorTheme.bpp.cobalt['100'],
    },
    marking: {
      title: colorTheme.bpp.pink['100'],
      subtitle: colorTheme.bpp.pink['090'],
      price: colorTheme.bpp.granite['100'],
    },
  },

  // Button colors by product type
  addToCartButton: {
    tutorial: {
      background: colorTheme.bpp.purple['050'],
      hover: colorTheme.bpp.purple['070'],
    },
    material: {
      background: colorTheme.bpp.sky['060'],
      hover: colorTheme.bpp.sky['070'],
    },
    bundle: {
      background: colorTheme.bpp.green['060'],
      hover: colorTheme.bpp.green['080'],
    },
    onlineClassroom: {
      background: colorTheme.bpp.cobalt['055'],
      hover: colorTheme.bpp.cobalt['070'],
    },
    marking: {
      background: colorTheme.bpp.pink['060'],
      hover: colorTheme.bpp.pink['080'],
    },
  },

  // Avatar backgrounds
  avatar: {
    default: colorTheme.bpp.granite['020'],
  },

  // Icon colors by product type
  icon: {
    tutorial: colorTheme.bpp.purple['090'],
    material: colorTheme.bpp.sky['090'],
    bundle: colorTheme.bpp.green['090'],
    onlineClassroom: colorTheme.bpp.cobalt['090'],
    marking: colorTheme.bpp.pink['090'],
  },
};

export default semanticColors;
