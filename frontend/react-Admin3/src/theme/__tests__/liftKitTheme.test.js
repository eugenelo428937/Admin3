/**
 * Tests for LiftKit Theme Configuration
 * T008: Test custom components, overrides, spacing system
 */

import liftKitTheme from '../liftKitTheme';

describe('liftKitTheme', () => {
  describe('exports', () => {
    test('exports default liftKitTheme object', () => {
      expect(liftKitTheme).toBeDefined();
      expect(typeof liftKitTheme).toBe('object');
    });
  });

  describe('spacing system', () => {
    test('has spacing object', () => {
      expect(liftKitTheme.spacing).toBeDefined();
    });

    describe('base spacing values', () => {
      test('has xs3 (3xs) spacing', () => {
        expect(liftKitTheme.spacing.xs3).toBeDefined();
        expect(liftKitTheme.spacing.xs3).toContain('calc');
      });

      test('has xs2 (2xs) spacing', () => {
        expect(liftKitTheme.spacing.xs2).toBeDefined();
        expect(liftKitTheme.spacing.xs2).toContain('calc');
      });

      test('has xs spacing', () => {
        expect(liftKitTheme.spacing.xs).toBeDefined();
        expect(liftKitTheme.spacing.xs).toContain('calc');
      });

      test('has sm spacing', () => {
        expect(liftKitTheme.spacing.sm).toBeDefined();
        expect(liftKitTheme.spacing.sm).toContain('calc');
      });

      test('has md (base) spacing', () => {
        expect(liftKitTheme.spacing.md).toBe('1rem');
      });

      test('has lg spacing', () => {
        expect(liftKitTheme.spacing.lg).toBeDefined();
        expect(liftKitTheme.spacing.lg).toContain('calc');
      });

      test('has xl spacing', () => {
        expect(liftKitTheme.spacing.xl).toBeDefined();
        expect(liftKitTheme.spacing.xl).toContain('calc');
      });

      test('has xl15 spacing', () => {
        expect(liftKitTheme.spacing.xl15).toBeDefined();
        expect(liftKitTheme.spacing.xl15).toContain('calc');
      });

      test('has xl2 (2xl) spacing', () => {
        expect(liftKitTheme.spacing.xl2).toBeDefined();
        expect(liftKitTheme.spacing.xl2).toContain('calc');
      });
    });

    describe('scale factors', () => {
      test('has scaleFactor (golden ratio)', () => {
        expect(liftKitTheme.spacing.scaleFactor).toBe('1.618');
      });

      test('has wholestep multiplier', () => {
        expect(liftKitTheme.spacing.wholestep).toBe('1.618');
      });

      test('has halfstep multiplier', () => {
        expect(liftKitTheme.spacing.halfstep).toBe('1.272');
      });

      test('has quarterstep multiplier', () => {
        expect(liftKitTheme.spacing.quarterstep).toBe('1.128');
      });

      test('has eighthstep multiplier', () => {
        expect(liftKitTheme.spacing.eighthstep).toBe('1.061');
      });
    });

    describe('decimal increments', () => {
      test('has wholestep-dec', () => {
        expect(liftKitTheme.spacing['wholestep-dec']).toBe('0.618');
      });

      test('has halfstep-dec', () => {
        expect(liftKitTheme.spacing['halfstep-dec']).toBe('0.272');
      });

      test('has quarterstep-dec', () => {
        expect(liftKitTheme.spacing['quarterstep-dec']).toBe('0.128');
      });

      test('has eighthstep-dec', () => {
        expect(liftKitTheme.spacing['eighthstep-dec']).toBe('0.061');
      });
    });
  });

  describe('typography system', () => {
    test('has typography object', () => {
      expect(liftKitTheme.typography).toBeDefined();
    });

    describe('display styles', () => {
      test('has display1 style', () => {
        expect(liftKitTheme.typography.display1).toBeDefined();
        expect(liftKitTheme.typography.display1.fontWeight).toBe(400);
      });

      test('has display1Bold style', () => {
        expect(liftKitTheme.typography.display1Bold).toBeDefined();
        expect(liftKitTheme.typography.display1Bold.fontWeight).toBe(700);
      });

      test('has display2 style', () => {
        expect(liftKitTheme.typography.display2).toBeDefined();
        expect(liftKitTheme.typography.display2.fontWeight).toBe(400);
      });

      test('has display2Bold style', () => {
        expect(liftKitTheme.typography.display2Bold).toBeDefined();
        expect(liftKitTheme.typography.display2Bold.fontWeight).toBe(700);
      });
    });

    describe('title styles', () => {
      test('has title1 style', () => {
        expect(liftKitTheme.typography.title1).toBeDefined();
        expect(liftKitTheme.typography.title1.fontWeight).toBe(400);
      });

      test('has title1Bold style', () => {
        expect(liftKitTheme.typography.title1Bold).toBeDefined();
        expect(liftKitTheme.typography.title1Bold.fontWeight).toBe(600);
      });

      test('has title2 style', () => {
        expect(liftKitTheme.typography.title2).toBeDefined();
      });

      test('has title2Bold style', () => {
        expect(liftKitTheme.typography.title2Bold).toBeDefined();
      });

      test('has title3 style', () => {
        expect(liftKitTheme.typography.title3).toBeDefined();
      });

      test('has title3Bold style', () => {
        expect(liftKitTheme.typography.title3Bold).toBeDefined();
      });
    });

    describe('heading styles', () => {
      test('has heading style', () => {
        expect(liftKitTheme.typography.heading).toBeDefined();
        expect(liftKitTheme.typography.heading.fontWeight).toBe(600);
      });

      test('has headingBold style', () => {
        expect(liftKitTheme.typography.headingBold).toBeDefined();
        expect(liftKitTheme.typography.headingBold.fontWeight).toBe(700);
      });
    });

    describe('subheading styles', () => {
      test('has subheading style', () => {
        expect(liftKitTheme.typography.subheading).toBeDefined();
        expect(liftKitTheme.typography.subheading.fontWeight).toBe(400);
      });

      test('has subheadingBold style', () => {
        expect(liftKitTheme.typography.subheadingBold).toBeDefined();
        expect(liftKitTheme.typography.subheadingBold.fontWeight).toBe(600);
      });
    });

    describe('body styles', () => {
      test('has body style', () => {
        expect(liftKitTheme.typography.body).toBeDefined();
        expect(liftKitTheme.typography.body.fontSize).toBe('1em');
        expect(liftKitTheme.typography.body.fontWeight).toBe(400);
      });

      test('has bodyBold style', () => {
        expect(liftKitTheme.typography.bodyBold).toBeDefined();
        expect(liftKitTheme.typography.bodyBold.fontSize).toBe('1em');
        expect(liftKitTheme.typography.bodyBold.fontWeight).toBe(600);
      });
    });

    describe('callout styles', () => {
      test('has callout style', () => {
        expect(liftKitTheme.typography.callout).toBeDefined();
        expect(liftKitTheme.typography.callout.fontWeight).toBe(400);
      });

      test('has calloutBold style', () => {
        expect(liftKitTheme.typography.calloutBold).toBeDefined();
        expect(liftKitTheme.typography.calloutBold.fontWeight).toBe(600);
      });
    });

    describe('label styles', () => {
      test('has label style', () => {
        expect(liftKitTheme.typography.label).toBeDefined();
        expect(liftKitTheme.typography.label.fontWeight).toBe(600);
      });

      test('has labelBold style', () => {
        expect(liftKitTheme.typography.labelBold).toBeDefined();
        expect(liftKitTheme.typography.labelBold.fontWeight).toBe(700);
      });
    });

    describe('caption styles', () => {
      test('has caption style', () => {
        expect(liftKitTheme.typography.caption).toBeDefined();
        expect(liftKitTheme.typography.caption.fontWeight).toBe(400);
      });

      test('has captionBold style', () => {
        expect(liftKitTheme.typography.captionBold).toBeDefined();
        expect(liftKitTheme.typography.captionBold.fontWeight).toBe(600);
      });
    });

    describe('overline styles', () => {
      test('has overline style', () => {
        expect(liftKitTheme.typography.overline).toBeDefined();
        expect(liftKitTheme.typography.overline.fontWeight).toBe(400);
        expect(liftKitTheme.typography.overline.textTransform).toBe('uppercase');
      });

      test('has overlineBold style', () => {
        expect(liftKitTheme.typography.overlineBold).toBeDefined();
        expect(liftKitTheme.typography.overlineBold.fontWeight).toBe(600);
        expect(liftKitTheme.typography.overlineBold.textTransform).toBe('uppercase');
      });
    });

    describe('rich text styles', () => {
      test('has richText object', () => {
        expect(liftKitTheme.typography.richText).toBeDefined();
      });

      test('richText has heading styles', () => {
        expect(liftKitTheme.typography.richText.h1).toBeDefined();
        expect(liftKitTheme.typography.richText.h2).toBeDefined();
        expect(liftKitTheme.typography.richText.h3).toBeDefined();
        expect(liftKitTheme.typography.richText.h4).toBeDefined();
        expect(liftKitTheme.typography.richText.h5).toBeDefined();
        expect(liftKitTheme.typography.richText.h6).toBeDefined();
      });

      test('richText has paragraph style', () => {
        expect(liftKitTheme.typography.richText.p).toBeDefined();
      });

      test('richText has link style', () => {
        expect(liftKitTheme.typography.richText.a).toBeDefined();
        expect(liftKitTheme.typography.richText.a.fontWeight).toBe(700);
      });

      test('richText has list styles', () => {
        expect(liftKitTheme.typography.richText.ul).toBeDefined();
        expect(liftKitTheme.typography.richText.ol).toBeDefined();
      });

      test('richText has blockquote style', () => {
        expect(liftKitTheme.typography.richText.blockquote).toBeDefined();
      });
    });
  });

  describe('breakpoints', () => {
    test('has breakpoints object', () => {
      expect(liftKitTheme.breakpoints).toBeDefined();
    });

    test('has mobile breakpoint', () => {
      expect(liftKitTheme.breakpoints.mobile).toBe('479px');
    });

    test('has tablet breakpoint', () => {
      expect(liftKitTheme.breakpoints.tablet).toBe('767px');
    });

    test('has desktop breakpoint', () => {
      expect(liftKitTheme.breakpoints.desktop).toBe('991px');
    });
  });

  describe('responsive typography', () => {
    test('has responsive object', () => {
      expect(liftKitTheme.responsive).toBeDefined();
    });

    test('has tablet responsive adjustments', () => {
      expect(liftKitTheme.responsive.tablet).toBeDefined();
      expect(liftKitTheme.responsive.tablet.display1).toBeDefined();
    });

    test('has mobile responsive adjustments', () => {
      expect(liftKitTheme.responsive.mobile).toBeDefined();
      expect(liftKitTheme.responsive.mobile.display1).toBeDefined();
      expect(liftKitTheme.responsive.mobile.display2).toBeDefined();
      expect(liftKitTheme.responsive.mobile.title1).toBeDefined();
    });

    test('has desktop small responsive adjustments', () => {
      expect(liftKitTheme.responsive.desktopSmall).toBeDefined();
      expect(liftKitTheme.responsive.desktopSmall.body).toBeDefined();
    });
  });

  describe('golden ratio calculations', () => {
    test('scale factor is golden ratio', () => {
      const goldenRatio = 1.618;
      expect(parseFloat(liftKitTheme.spacing.scaleFactor)).toBe(goldenRatio);
    });

    test('halfstep is square root of golden ratio', () => {
      const expectedHalfstep = Math.sqrt(1.618).toFixed(3);
      expect(parseFloat(liftKitTheme.spacing.halfstep).toFixed(3)).toBe(expectedHalfstep);
    });

    test('quarterstep is square root of halfstep', () => {
      const halfstep = Math.sqrt(1.618);
      const expectedQuarterstep = Math.sqrt(halfstep).toFixed(3);
      expect(parseFloat(liftKitTheme.spacing.quarterstep).toFixed(3)).toBe(expectedQuarterstep);
    });

    test('wholestep-dec is wholestep minus 1', () => {
      const wholestep = 1.618;
      const expectedDec = (wholestep - 1).toFixed(3);
      expect(parseFloat(liftKitTheme.spacing['wholestep-dec']).toFixed(3)).toBe(expectedDec);
    });
  });
});
