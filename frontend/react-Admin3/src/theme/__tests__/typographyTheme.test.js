/**
 * Tests for Typography Theme Configuration
 * Validates typography configuration from tokens/typography.js
 */

import theme from '../theme.js';

describe('Typography Theme', () => {
  const typography = theme.typography;

  describe('font family', () => {
    test('has Inter as primary font', () => {
      expect(typography.fontFamily).toContain('Inter');
    });

    test('has sans-serif as secondary fallback', () => {
      // fontFamilies.inter = "'Inter',sans-serif" (no Poppins in current config)
      expect(typography.fontFamily).toContain('sans-serif');
    });

    test('has sans-serif fallback', () => {
      expect(typography.fontFamily).toContain('sans-serif');
    });
  });

  describe('heading styles', () => {
    describe('h1', () => {
      test('has correct configuration', () => {
        expect(typography.h1).toBeDefined();
        expect(typography.h1.fontFamily).toContain('DM Sans');
        expect(typography.h1.fontWeight).toBe(400);
      });
    });

    describe('h2', () => {
      test('has correct configuration', () => {
        expect(typography.h2).toBeDefined();
        expect(typography.h2.fontFamily).toContain('DM Sans');
        expect(typography.h2.fontWeight).toBe(400);
      });
    });

    describe('h3', () => {
      test('has correct configuration', () => {
        expect(typography.h3).toBeDefined();
        expect(typography.h3.fontFamily).toContain('Inter');
        expect(typography.h3.fontWeight).toBe(400);
      });
    });

    describe('h4', () => {
      test('has correct configuration', () => {
        expect(typography.h4).toBeDefined();
        expect(typography.h4.fontFamily).toContain('Inter');
        expect(typography.h4.fontWeight).toBe(400);
      });
    });

    describe('h5', () => {
      test('has correct configuration', () => {
        expect(typography.h5).toBeDefined();
        expect(typography.h5.fontFamily).toContain('Inter');
        expect(typography.h5.fontWeight).toBe(500); // Medium weight
      });
    });

    describe('h6', () => {
      test('has correct configuration', () => {
        expect(typography.h6).toBeDefined();
        expect(typography.h6.fontFamily).toContain('Inter');
        expect(typography.h6.fontWeight).toBe(600);
      });
    });
  });

  describe('body styles', () => {
    describe('body1', () => {
      test('has correct configuration', () => {
        expect(typography.body1).toBeDefined();
        expect(typography.body1.fontFamily).toContain('Inter');
        expect(typography.body1.fontWeight).toBe(400);
      });
    });

    describe('body2', () => {
      test('has correct configuration', () => {
        expect(typography.body2).toBeDefined();
        expect(typography.body2.fontFamily).toContain('Inter');
        expect(typography.body2.fontWeight).toBe(400);
      });
    });
  });

  describe('subtitle styles', () => {
    describe('subtitle1', () => {
      test('has correct configuration', () => {
        expect(typography.subtitle1).toBeDefined();
        expect(typography.subtitle1.fontFamily).toContain('Inter');
        expect(typography.subtitle1.fontWeight).toBe(400);
      });
    });

    describe('subtitle2', () => {
      test('has correct configuration', () => {
        expect(typography.subtitle2).toBeDefined();
        expect(typography.subtitle2.fontFamily).toContain('Inter');
        // MUI default subtitle2 fontWeight is 500
        expect(typography.subtitle2.fontWeight).toBe(500);
      });
    });
  });

  describe('button style', () => {
    test('has correct configuration', () => {
      expect(typography.button).toBeDefined();
      expect(typography.button.fontFamily).toContain('Inter');
      expect(typography.button.fontWeight).toBe(500);
      // Button variant is not customized in typographyConfig, MUI defaults to uppercase
      expect(typography.button.textTransform).toBe('uppercase');
    });
  });

  describe('caption style', () => {
    test('has correct configuration', () => {
      expect(typography.caption).toBeDefined();
      expect(typography.caption.fontFamily).toContain('Inter');
      expect(typography.caption.fontWeight).toBe(400);
    });
  });

  describe('overline style', () => {
    test('has correct configuration', () => {
      expect(typography.overline).toBeDefined();
      expect(typography.overline.fontFamily).toContain('Inter');
      expect(typography.overline.fontWeight).toBe(400);
      expect(typography.overline.textTransform).toBe('uppercase');
    });
  });

  describe('custom typography variants', () => {
    describe('title_BPP', () => {
      test('has correct configuration', () => {
        expect(typography.title_BPP).toBeDefined();
        expect(typography.title_BPP.fontFamily).toContain('DM Sans');
        expect(typography.title_BPP.fontWeight).toContain('700');
        expect(typography.title_BPP.letterSpacing).toContain('-0.0618em');
      });
    });

    describe('title_Acted', () => {
      test('has correct configuration', () => {
        expect(typography.title_Acted).toBeDefined();
        expect(typography.title_Acted.fontFamily).toContain('Inter');
        expect(typography.title_Acted.fontWeight).toContain('300');
        expect(typography.title_Acted.letterSpacing).toContain('-0.017em');
      });
    });

    describe('price', () => {
      test('has correct configuration', () => {
        expect(typography.price).toBeDefined();
        expect(typography.price.fontFamily).toContain('Inter');
        expect(typography.price.fontWeight).toBe(400);
        // lineHeight uses CSS custom property var(--quarterstep)
        expect(typography.price.lineHeight).toContain('quarterstep');
      });
    });

    describe('caption2', () => {
      test('has correct configuration', () => {
        expect(typography.caption2).toBeDefined();
        expect(typography.caption2.fontFamily).toContain('Inter');
        expect(typography.caption2.fontWeight).toBe(400);
      });
    });

    describe('fineprint', () => {
      test('has correct configuration', () => {
        expect(typography.fineprint).toBeDefined();
        expect(typography.fineprint.fontFamily).toContain('Inter');
        // fontWeights.light = 300
        expect(typography.fineprint.fontWeight).toBe(300);
      });
    });
  });

  describe('letter spacing', () => {
    test('h1-h4 have negative letter spacing', () => {
      // h1-h4 use letterSpacings.scale[40] = '-0.017em'
      expect(typography.h1.letterSpacing).toContain('-');
      expect(typography.h2.letterSpacing).toContain('-');
      expect(typography.h3.letterSpacing).toContain('-');
      expect(typography.h4.letterSpacing).toContain('-');
    });

    test('h5-h6 have non-negative letter spacing', () => {
      // h5 uses letterSpacings.scale[80] = '0.012em'
      // h6 uses letterSpacings.normal = 'normal'
      expect(typography.h5.letterSpacing).toContain('0.012em');
      expect(typography.h6.letterSpacing).toContain('normal');
    });

    test('body text has normal letter spacing', () => {
      // body1 and body2 use letterSpacings.normal = 'normal'
      expect(typography.body1.letterSpacing).toContain('normal');
      expect(typography.body2.letterSpacing).toContain('normal');
    });

    test('overline has positive letter spacing', () => {
      // overline uses letterSpacings.scale[80] = '0.012em'
      expect(typography.overline.letterSpacing).not.toContain('-');
      expect(typography.overline.letterSpacing).toContain('0.012em');
    });
  });

  describe('font weights', () => {
    test('regular weight variants use 400', () => {
      expect(typography.h1.fontWeight).toBe(400);
      expect(typography.body1.fontWeight).toBe(400);
      expect(typography.caption.fontWeight).toBe(400);
    });

    test('medium weight variants use 500', () => {
      expect(typography.button.fontWeight).toBe(500);
      expect(typography.h5.fontWeight).toBe(500);
    });

    test('bold variants use 600', () => {
      expect(typography.h6.fontWeight).toBe(600);
      expect(typography.captionBold.fontWeight).toBe(600);
    });

    test('light weight variants use 300', () => {
      // fontWeights.light = 300
      expect(typography.fineprint.fontWeight).toBe(300);
    });
  });

  describe('line heights', () => {
    test('all typography variants have line height defined', () => {
      expect(typography.h1.lineHeight).toBeDefined();
      expect(typography.h2.lineHeight).toBeDefined();
      expect(typography.body1.lineHeight).toBeDefined();
      expect(typography.button.lineHeight).toBeDefined();
      expect(typography.caption.lineHeight).toBeDefined();
    });
  });
});
