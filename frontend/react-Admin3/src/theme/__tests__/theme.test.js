/**
 * Tests for Theme Configuration
 * T005: Test theme structure, palette, typography
 */

import theme, { liftKitTheme, colorTheme } from '../theme';

describe('Theme Configuration', () => {
  describe('theme exports', () => {
    test('exports default theme object', () => {
      expect(theme).toBeDefined();
      expect(typeof theme).toBe('object');
    });

    test('exports liftKitTheme', () => {
      expect(liftKitTheme).toBeDefined();
      expect(typeof liftKitTheme).toBe('object');
    });

    test('exports colorTheme', () => {
      expect(colorTheme).toBeDefined();
      expect(typeof colorTheme).toBe('object');
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

    test('has liftkit spacing and typography', () => {
      expect(theme.liftkit).toBeDefined();
      expect(theme.liftkit.spacing).toBeDefined();
      expect(theme.liftkit.typography).toBeDefined();
    });

    test('has gradients configuration', () => {
      expect(theme.gradients).toBeDefined();
    });
  });

  describe('palette configuration', () => {
    test('has primary colors', () => {
      expect(theme.palette.primary).toBeDefined();
      expect(theme.palette.primary.main).toBeDefined();
      expect(theme.palette.primary.light).toBeDefined();
      expect(theme.palette.primary.dark).toBeDefined();
      expect(theme.palette.primary.contrastText).toBeDefined();
    });

    test('has secondary colors', () => {
      expect(theme.palette.secondary).toBeDefined();
      expect(theme.palette.secondary.main).toBeDefined();
    });

    test('has tertiary colors', () => {
      expect(theme.palette.tertiary).toBeDefined();
      expect(theme.palette.tertiary.main).toBeDefined();
    });

    test('has error colors', () => {
      expect(theme.palette.error).toBeDefined();
      expect(theme.palette.error.main).toBeDefined();
    });

    test('has warning colors', () => {
      expect(theme.palette.warning).toBeDefined();
      expect(theme.palette.warning.main).toBeDefined();
    });

    test('has info colors', () => {
      expect(theme.palette.info).toBeDefined();
      expect(theme.palette.info.main).toBeDefined();
    });

    test('has success colors', () => {
      expect(theme.palette.success).toBeDefined();
      expect(theme.palette.success.main).toBeDefined();
    });

    test('has background colors', () => {
      expect(theme.palette.background).toBeDefined();
      expect(theme.palette.background.default).toBeDefined();
      expect(theme.palette.background.paper).toBeDefined();
    });

    test('has surface colors', () => {
      expect(theme.palette.surface).toBeDefined();
    });

    test('has text colors', () => {
      expect(theme.palette.text).toBeDefined();
      expect(theme.palette.text.primary).toBeDefined();
      expect(theme.palette.text.secondary).toBeDefined();
    });

    test('has BPP color system', () => {
      expect(theme.palette.bpp).toBeDefined();
    });

    test('has Material Design 3 system colors', () => {
      expect(theme.palette.md3).toBeDefined();
    });

    test('has Liftkit colors', () => {
      expect(theme.palette.liftkit).toBeDefined();
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

    test('has subtitle styles', () => {
      expect(theme.typography.subtitle1).toBeDefined();
      expect(theme.typography.subtitle2).toBeDefined();
    });

    test('has button style', () => {
      expect(theme.typography.button).toBeDefined();
      expect(theme.typography.button.textTransform).toBe('none');
    });

    test('has caption style', () => {
      expect(theme.typography.caption).toBeDefined();
    });

    test('has overline style', () => {
      expect(theme.typography.overline).toBeDefined();
      expect(theme.typography.overline.textTransform).toBe('uppercase');
    });

    test('has custom BPP typography', () => {
      expect(theme.typography.BPP).toBeDefined();
      expect(theme.typography.BPP.fontWeight).toBe(600);
    });

    test('has custom Acted typography', () => {
      expect(theme.typography.Acted).toBeDefined();
      expect(theme.typography.Acted.fontWeight).toBe(200);
    });

    test('has custom price typography', () => {
      expect(theme.typography.price).toBeDefined();
    });

    test('has custom fineprint typography', () => {
      expect(theme.typography.fineprint).toBeDefined();
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

    test('has MuiTypography override', () => {
      expect(theme.components.MuiTypography).toBeDefined();
    });

    test('has MuiCard override with product variants', () => {
      expect(theme.components.MuiCard).toBeDefined();
      expect(theme.components.MuiCard.variants).toBeDefined();
      expect(theme.components.MuiCard.variants.length).toBeGreaterThan(0);
    });

    test('has MuiTabs override', () => {
      expect(theme.components.MuiTabs).toBeDefined();
    });

    test('has MuiTab override', () => {
      expect(theme.components.MuiTab).toBeDefined();
    });

    test('has MuiSpeedDial override', () => {
      expect(theme.components.MuiSpeedDial).toBeDefined();
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
      expect(theme.gradients.colorSchemes.online).toBeDefined();
      expect(theme.gradients.colorSchemes.bundle).toBeDefined();
      expect(theme.gradients.colorSchemes.assessment).toBeDefined();
      expect(theme.gradients.colorSchemes.marking).toBeDefined();
    });

    test('createGradientStyle returns gradient object', () => {
      const result = theme.gradients.createGradientStyle(
        { x: 50, y: 50 },
        true,
        theme.gradients.colorSchemes.material
      );

      expect(result).toHaveProperty('background');
      expect(result).toHaveProperty('transition');
      expect(result.background).toContain('linear-gradient');
    });
  });

  describe('liftkit configuration', () => {
    test('liftkit spacing matches liftKitTheme spacing', () => {
      expect(theme.liftkit.spacing).toEqual(liftKitTheme.spacing);
    });

    test('liftkit typography matches liftKitTheme typography', () => {
      expect(theme.liftkit.typography).toEqual(liftKitTheme.typography);
    });
  });
});
