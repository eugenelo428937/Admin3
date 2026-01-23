// Semantic Color Mappings
// Maps design intent to actual colors for consistent usage across components

import { legacyScales } from '../tokens/colors';
import { scales } from '../tokens/colors';
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
    tutorial: legacyScales.purple['020'],
    material: legacyScales.sky['020'],
    bundle: legacyScales.green['030'],
    onlineClassroom: legacyScales.cobalt['020'],
    marking: legacyScales.pink['020'],
    markingVoucher: legacyScales.orange['020'],
  },

  // Card action area backgrounds
  cardActions: {
    tutorial: legacyScales.purple['030'],
    material: legacyScales.sky['030'],
    bundle: legacyScales.green['040'],
    onlineClassroom: legacyScales.cobalt['030'],
    marking: legacyScales.pink['030'],
    markingVoucher: legacyScales.orange['030'],
  },

  // Badge backgrounds
  badge: {
    tutorial: legacyScales.purple['010'],
    material: legacyScales.sky['010'],
    bundle: legacyScales.green['010'],
    onlineClassroom: legacyScales.cobalt['010'],
    marking: legacyScales.pink['010'],
    default: 'rgba(255, 255, 255, 0.5)',
  },

  // Text colors by product type (dark variants for headers)
  cardText: {
    tutorial: {
      title: legacyScales.sky['100'],
      subtitle: legacyScales.sky['090'],
      price: legacyScales.purple['100'],
    },
    material: {
      title: legacyScales.sky['100'],
      subtitle: legacyScales.sky['090'],
      price: legacyScales.sky['100'],
    },
    bundle: {
      title: legacyScales.green['100'],
      subtitle: legacyScales.green['090'],
      price: legacyScales.green['100'],
    },
    onlineClassroom: {
      title: legacyScales.cobalt['100'],
      subtitle: legacyScales.cobalt['090'],
      price: legacyScales.cobalt['100'],
    },
    marking: {
      title: legacyScales.pink['100'],
      subtitle: legacyScales.pink['090'],
      price: legacyScales.granite['100'],
    },
  },

  // Button colors by product type
  addToCartButton: {
    tutorial: {
      background: legacyScales.purple['050'],
      hover: legacyScales.purple['070'],
    },
    material: {
      background: legacyScales.sky['060'],
      hover: legacyScales.sky['070'],
    },
    bundle: {
      background: legacyScales.green['060'],
      hover: legacyScales.green['080'],
    },
    onlineClassroom: {
      background: legacyScales.cobalt['055'],
      hover: legacyScales.cobalt['070'],
    },
    marking: {
      background: legacyScales.pink['060'],
      hover: legacyScales.pink['080'],
    },
  },

  // Avatar backgrounds
  avatar: {
    default: legacyScales.granite['020'],
  },
  topnavbar: {
    text: {
      primary: legacyScales.offwhite['000'],      // Main nav text (#fdfdfd)
      secondary: legacyScales.offwhite['001'],    // Secondary nav text (#f0edf1)
      muted: legacyScales.granite['040'],     // Disabled/placeholder text (#9e9e9e)
    },
    background: {
      color: legacyScales.granite['090'],
      hover: legacyScales.granite['080'],     // Menu item hover (#525252)
      active: legacyScales.granite['080'],    // Active/selected state (#3b3b3a)
    },
  },
  // Navigation semantic tokens (20260113-Styling-Clean-up)
  // Centralized colors for navigation components - enables theme switching by changing token values
  navigation: {
    text: {
      primary: legacyScales.offwhite['000'],      // Main nav text (#fdfdfd)
      secondary: legacyScales.offwhite['001'],    // Secondary nav text (#f0edf1)
      muted: legacyScales.granite['040'],     // Disabled/placeholder text (#9e9e9e)
    },
    border: {
      subtle: legacyScales.granite['020'],    // "View All" underlines (#d9d9d9)
      divider: legacyScales.granite['030'],   // Menu dividers (#bababa)
    },
    background: {
      color: legacyScales.granite['090'],
      hover: legacyScales.granite['070'],     // Menu item hover (#525252)
      active: legacyScales.granite['080'],    // Active/selected state (#3b3b3a)
    },
    button: {
      color: legacyScales.offwhite['009'],        // Nav button text (#fdfdfd)

      hoverColor: legacyScales.purple[110],   // Button hover accent (#8953fd)
    },
    // Mobile navigation tokens (Phase 7 - US4)
    mobile: {
      icon: {
        color: legacyScales.offwhite['000'],      // Mobile nav icon color (#fdfdfd)
      },
      border: {
        color: 'rgba(255, 255, 255, 0.12)',     // Mobile header border (semi-transparent white)
      },
      title: {
        color: legacyScales.offwhite['000'],      // Mobile panel title color (#fdfdfd)
      },
      background: legacyScales.granite['080'], // Mobile drawer background (#3b3b3a)
    },
    hamburger: {
      hover: {
        background: legacyScales.granite['070'], // Hamburger hover background (#525252)
      },
    },
  },

  // Icon colors by product type
  icon: {
    tutorial: legacyScales.purple['090'],
    material: legacyScales.sky['090'],
    bundle: legacyScales.green['090'],
    onlineClassroom: legacyScales.cobalt['090'],
    marking: legacyScales.pink['090'],
  },
};

export default semanticColors;
