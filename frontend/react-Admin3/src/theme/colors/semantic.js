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
    tutorial: colorTheme.palette.purple['020'],
    material: colorTheme.palette.sky['020'],
    bundle: colorTheme.palette.green['030'],
    onlineClassroom: colorTheme.palette.cobalt['020'],
    marking: colorTheme.palette.pink['020'],
    markingVoucher: colorTheme.palette.orange['020'],
  },

  // Card action area backgrounds
  cardActions: {
    tutorial: colorTheme.palette.purple['030'],
    material: colorTheme.palette.sky['030'],
    bundle: colorTheme.palette.green['040'],
    onlineClassroom: colorTheme.palette.cobalt['030'],
    marking: colorTheme.palette.pink['030'],
    markingVoucher: colorTheme.palette.orange['030'],
  },

  // Badge backgrounds
  badge: {
    tutorial: colorTheme.palette.purple['010'],
    material: colorTheme.palette.sky['010'],
    bundle: colorTheme.palette.green['010'],
    onlineClassroom: colorTheme.palette.cobalt['010'],
    marking: colorTheme.palette.pink['010'],
    default: 'rgba(255, 255, 255, 0.5)',
  },

  // Text colors by product type (dark variants for headers)
  cardText: {
    tutorial: {
      title: colorTheme.palette.sky['100'],
      subtitle: colorTheme.palette.sky['090'],
      price: colorTheme.palette.purple['100'],
    },
    material: {
      title: colorTheme.palette.sky['100'],
      subtitle: colorTheme.palette.sky['090'],
      price: colorTheme.palette.sky['100'],
    },
    bundle: {
      title: colorTheme.palette.green['100'],
      subtitle: colorTheme.palette.green['090'],
      price: colorTheme.palette.green['100'],
    },
    onlineClassroom: {
      title: colorTheme.palette.cobalt['100'],
      subtitle: colorTheme.palette.cobalt['090'],
      price: colorTheme.palette.cobalt['100'],
    },
    marking: {
      title: colorTheme.palette.pink['100'],
      subtitle: colorTheme.palette.pink['090'],
      price: colorTheme.palette.granite['100'],
    },
  },

  // Button colors by product type
  addToCartButton: {
    tutorial: {
      background: colorTheme.palette.purple['050'],
      hover: colorTheme.palette.purple['070'],
    },
    material: {
      background: colorTheme.palette.sky['060'],
      hover: colorTheme.palette.sky['070'],
    },
    bundle: {
      background: colorTheme.palette.green['060'],
      hover: colorTheme.palette.green['080'],
    },
    onlineClassroom: {
      background: colorTheme.palette.cobalt['055'],
      hover: colorTheme.palette.cobalt['070'],
    },
    marking: {
      background: colorTheme.palette.pink['060'],
      hover: colorTheme.palette.pink['080'],
    },
  },

  // Avatar backgrounds
  avatar: {
    default: colorTheme.palette.granite['020'],
  },

  // Navigation semantic tokens (20260113-Styling-Clean-up)
  // Centralized colors for navigation components - enables theme switching by changing token values
  navigation: {
    text: {
      primary: colorTheme.palette.offwhite['000'],      // Main nav text (#fdfdfd)
      secondary: colorTheme.palette.offwhite['001'],    // Secondary nav text (#f0edf1)
      muted: colorTheme.palette.granite['040'],     // Disabled/placeholder text (#9e9e9e)
    },
    border: {
      subtle: colorTheme.palette.granite['020'],    // "View All" underlines (#d9d9d9)
      divider: colorTheme.palette.granite['030'],   // Menu dividers (#bababa)
    },
    background: {
      color: colorTheme.palette.granite['080'],
      hover: colorTheme.palette.granite['070'],     // Menu item hover (#525252)
      active: colorTheme.palette.granite['080'],    // Active/selected state (#3b3b3a)
    },
    button: {
      color: colorTheme.palette.offwhite['009'],        // Nav button text (#fdfdfd)

      hoverColor: colorTheme.palette.purple[110],   // Button hover accent (#8953fd)
    },
    // Mobile navigation tokens (Phase 7 - US4)
    mobile: {
      icon: {
        color: colorTheme.palette.offwhite['000'],      // Mobile nav icon color (#fdfdfd)
      },
      border: {
        color: 'rgba(255, 255, 255, 0.12)',     // Mobile header border (semi-transparent white)
      },
      title: {
        color: colorTheme.palette.offwhite['000'],      // Mobile panel title color (#fdfdfd)
      },
      background: colorTheme.palette.granite['080'], // Mobile drawer background (#3b3b3a)
    },
    hamburger: {
      hover: {
        background: colorTheme.palette.granite['070'], // Hamburger hover background (#525252)
      },
    },
  },

  // Icon colors by product type
  icon: {
    tutorial: colorTheme.palette.purple['090'],
    material: colorTheme.palette.sky['090'],
    bundle: colorTheme.palette.green['090'],
    onlineClassroom: colorTheme.palette.cobalt['090'],
    marking: colorTheme.palette.pink['090'],
  },
};

export default semanticColors;
