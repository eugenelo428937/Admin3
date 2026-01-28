/**
 * Tests for Theme Configuration
 * Tests the consolidated theme structure with semantic tokens
 */

import theme from '../index';
import { md3, scales, staticColors } from '../tokens/colors';
import { semantic } from '../semantic/common';
import productCards from '../semantic/productCards';
import navigation from '../semantic/navigation';

describe('Theme Configuration', () => {
  describe('theme exports', () => {
    test('exports default theme object', () => {
      expect(theme).toBeDefined();
      expect(typeof theme).toBe('object');
    });
  });

  describe('theme structure', () => {
    test('has palette configuration', () => {
      expect(theme.palette).toBeDefined();
    });

    test('has typography configuration', () => {
      expect(theme.typography).toBeDefined();
    });

    test('has components configuration', () => {
      expect(theme.components).toBeDefined();
    });

    test('has breakpoints configuration', () => {
      expect(theme.breakpoints).toBeDefined();
      expect(theme.breakpoints.values).toBeDefined();
    });

    test('has gradients configuration', () => {
      expect(theme.gradients).toBeDefined();
    });

    test('has spacing configuration', () => {
      expect(theme.spacing).toBeDefined();
      expect(theme.spacingTokens).toBeDefined();
    });
  });

  describe('palette - MUI standard roles', () => {
    test('has primary colors from md3', () => {
      expect(theme.palette.primary).toBeDefined();
      expect(theme.palette.primary.main).toBe(md3.primary);
    });

    test('has secondary colors from md3', () => {
      expect(theme.palette.secondary).toBeDefined();
      expect(theme.palette.secondary.main).toBe(md3.secondary);
    });

    test('has tertiary colors from md3', () => {
      expect(theme.palette.tertiary).toBeDefined();
      expect(theme.palette.tertiary.main).toBe(md3.tertiary);
    });

    test('has error colors from md3', () => {
      expect(theme.palette.error).toBeDefined();
      expect(theme.palette.error.main).toBe(md3.error);
    });

    test('has warning colors from scales', () => {
      expect(theme.palette.warning).toBeDefined();
      expect(theme.palette.warning.main).toBe(scales.orange[50]);
    });

    test('has info colors from scales', () => {
      expect(theme.palette.info).toBeDefined();
      expect(theme.palette.info.main).toBe(scales.cobalt[60]);
    });

    test('has success colors from scales', () => {
      expect(theme.palette.success).toBeDefined();
      expect(theme.palette.success.main).toBe(scales.green[60]);
    });

    test('has background colors from md3', () => {
      expect(theme.palette.background).toBeDefined();
      expect(theme.palette.background.default).toBe(md3.background);
      expect(theme.palette.background.paper).toBe(staticColors.white);
    });

    test('has surface colors from md3', () => {
      expect(theme.palette.surface).toBeDefined();
      expect(theme.palette.surface.main).toBe(md3.surface);
    });

    test('has text colors from md3', () => {
      expect(theme.palette.text).toBeDefined();
      expect(theme.palette.text.primary).toBe(md3.onSurface);
      expect(theme.palette.text.secondary).toBe(md3.onSurfaceVariant);
    });
  });

  describe('palette - scales access', () => {
    test('has scales object for theme layer', () => {
      expect(theme.palette.scales).toBeDefined();
      expect(theme.palette.scales).toStrictEqual(scales);
    });

    test('scales has numeric keys', () => {
      expect(theme.palette.scales.granite[10]).toBeDefined();
      expect(theme.palette.scales.granite[50]).toBeDefined();
      expect(theme.palette.scales.granite[90]).toBeDefined();
    });

    test('scales has all BPP color families', () => {
      expect(theme.palette.scales.granite).toBeDefined();
      expect(theme.palette.scales.purple).toBeDefined();
      expect(theme.palette.scales.sky).toBeDefined();
      expect(theme.palette.scales.mint).toBeDefined();
      expect(theme.palette.scales.orange).toBeDefined();
      expect(theme.palette.scales.pink).toBeDefined();
      expect(theme.palette.scales.yellow).toBeDefined();
      expect(theme.palette.scales.cobalt).toBeDefined();
      expect(theme.palette.scales.green).toBeDefined();
      expect(theme.palette.scales.red).toBeDefined();
    });
  });

  describe('palette - semantic tokens', () => {
    test('has semantic object', () => {
      expect(theme.palette.semantic).toBeDefined();
    });

    test('semantic matches imported semantic', () => {
      expect(theme.palette.semantic.textPrimary).toBe(semantic.textPrimary);
      expect(theme.palette.semantic.bgPaper).toBe(semantic.bgPaper);
    });
  });

  describe('palette - productCards tokens', () => {
    test('has productCards object', () => {
      expect(theme.palette.productCards).toBeDefined();
      expect(theme.palette.productCards).toStrictEqual(productCards);
    });

    test('productCards has all product types', () => {
      expect(theme.palette.productCards.material).toBeDefined();
      expect(theme.palette.productCards.tutorial).toBeDefined();
      expect(theme.palette.productCards.marking).toBeDefined();
      expect(theme.palette.productCards.bundle).toBeDefined();
      expect(theme.palette.productCards.onlineClassroom).toBeDefined();
      expect(theme.palette.productCards.markingVoucher).toBeDefined();
    });
  });

  describe('palette - navigation tokens', () => {
    test('has navigation object', () => {
      expect(theme.palette.navigation).toBeDefined();
      expect(theme.palette.navigation).toStrictEqual(navigation);
    });

    test('navigation has all sections', () => {
      expect(theme.palette.navigation.text).toBeDefined();
      expect(theme.palette.navigation.border).toBeDefined();
      expect(theme.palette.navigation.background).toBeDefined();
      expect(theme.palette.navigation.button).toBeDefined();
      expect(theme.palette.navigation.mobile).toBeDefined();
      expect(theme.palette.navigation.hamburger).toBeDefined();
      expect(theme.palette.navigation.megaMenu).toBeDefined();
    });
  });

  describe('typography configuration', () => {
    test('has fontFamily defined', () => {
      expect(theme.typography.fontFamily).toBeDefined();
      expect(theme.typography.fontFamily).toContain('Inter');
    });

    test('has standard heading styles', () => {
      expect(theme.typography.h1).toBeDefined();
      expect(theme.typography.h2).toBeDefined();
      expect(theme.typography.h3).toBeDefined();
      expect(theme.typography.h4).toBeDefined();
      expect(theme.typography.h5).toBeDefined();
      expect(theme.typography.h6).toBeDefined();
    });

    test('has body styles', () => {
      expect(theme.typography.body1).toBeDefined();
      expect(theme.typography.body2).toBeDefined();
    });

    test('has button style with no text transform', () => {
      expect(theme.typography.button).toBeDefined();
      expect(theme.typography.button.textTransform).toBe('none');
    });
  });

  describe('breakpoints configuration', () => {
    test('has correct breakpoint values', () => {
      expect(theme.breakpoints.values.xs).toBe(0);
      expect(theme.breakpoints.values.sm).toBe(600);
      expect(theme.breakpoints.values.md).toBe(960);
      expect(theme.breakpoints.values.lg).toBe(1280);
      expect(theme.breakpoints.values.xl).toBe(1920);
    });
  });

  describe('component overrides', () => {
    test('has MuiDivider override', () => {
      expect(theme.components.MuiDivider).toBeDefined();
    });

    test('has MuiButton override', () => {
      expect(theme.components.MuiButton).toBeDefined();
    });

    test('has MuiTextField override', () => {
      expect(theme.components.MuiTextField).toBeDefined();
    });

    test('has MuiCard override with product variants', () => {
      expect(theme.components.MuiCard).toBeDefined();
      expect(theme.components.MuiCard.variants).toBeDefined();
      expect(theme.components.MuiCard.variants.length).toBeGreaterThan(0);
    });
  });

  describe('gradients configuration', () => {
    test('has createGradientStyle function', () => {
      expect(theme.gradients.createGradientStyle).toBeDefined();
      expect(typeof theme.gradients.createGradientStyle).toBe('function');
    });

    test('has color schemes', () => {
      expect(theme.gradients.colorSchemes).toBeDefined();
      expect(theme.gradients.colorSchemes.material).toBeDefined();
      expect(theme.gradients.colorSchemes.tutorial).toBeDefined();
      expect(theme.gradients.colorSchemes.bundle).toBeDefined();
    });

    test('createGradientStyle returns gradient object', () => {
      const result = theme.gradients.createGradientStyle(
        { x: 50, y: 50 },
        true,
        theme.gradients.colorSchemes.material
      );

      expect(result).toHaveProperty('background');
      expect(result.background).toContain('linear-gradient');
    });
  });
});
