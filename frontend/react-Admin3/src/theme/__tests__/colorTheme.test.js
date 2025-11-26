/**
 * Tests for Color Theme Configuration
 * T006: Test color values, palette structure
 */

import colorTheme from '../colorTheme';

describe('colorTheme', () => {
  describe('exports', () => {
    test('exports default colorTheme object', () => {
      expect(colorTheme).toBeDefined();
      expect(typeof colorTheme).toBe('object');
    });
  });

  describe('offwhite palette', () => {
    test('has offwhite color values', () => {
      expect(colorTheme.offwhite).toBeDefined();
      expect(colorTheme.offwhite['000']).toBe('#fdfdfd');
      expect(colorTheme.offwhite['001']).toBeDefined();
      expect(colorTheme.offwhite['009']).toBeDefined();
    });
  });

  describe('core Material-UI palette', () => {
    describe('primary', () => {
      test('has correct primary colors', () => {
        expect(colorTheme.primary).toBeDefined();
        expect(colorTheme.primary.main).toBe('#4658ac');
        expect(colorTheme.primary.light).toBe('#b9c3ff');
        expect(colorTheme.primary.dark).toBe('#2d3f93');
        expect(colorTheme.primary.contrastText).toBe('#fefbff');
      });
    });

    describe('secondary', () => {
      test('has correct secondary colors', () => {
        expect(colorTheme.secondary).toBeDefined();
        expect(colorTheme.secondary.main).toBe('#5a5d72');
        expect(colorTheme.secondary.light).toBe('#c3c5dd');
        expect(colorTheme.secondary.dark).toBe('#434659');
        expect(colorTheme.secondary.contrastText).toBe('#fff');
      });
    });

    describe('tertiary', () => {
      test('has correct tertiary colors', () => {
        expect(colorTheme.tertiary).toBeDefined();
        expect(colorTheme.tertiary.main).toBe('#76546e');
        expect(colorTheme.tertiary.light).toBe('#e5bad8');
        expect(colorTheme.tertiary.dark).toBe('#5c3c55');
      });
    });

    describe('error', () => {
      test('has correct error colors', () => {
        expect(colorTheme.error).toBeDefined();
        expect(colorTheme.error.main).toBe('#ba1a1a');
        expect(colorTheme.error.light).toBe('#ffb4ab');
        expect(colorTheme.error.dark).toBe('#93000a');
      });
    });

    describe('warning', () => {
      test('has correct warning colors', () => {
        expect(colorTheme.warning).toBeDefined();
        expect(colorTheme.warning.main).toBe('#7c5800');
        expect(colorTheme.warning.light).toBe('#f7bd48');
        expect(colorTheme.warning.dark).toBe('#5e4200');
      });
    });

    describe('info', () => {
      test('has correct info colors', () => {
        expect(colorTheme.info).toBeDefined();
        expect(colorTheme.info.main).toBe('#1758c7');
        expect(colorTheme.info.light).toBe('#b1c5ff');
        expect(colorTheme.info.dark).toBe('#00419e');
      });
    });

    describe('success', () => {
      test('has correct success colors', () => {
        expect(colorTheme.success).toBeDefined();
        expect(colorTheme.success.main).toBe('#006d3d');
        expect(colorTheme.success.light).toBe('#76db9a');
        expect(colorTheme.success.dark).toBe('#00522c');
      });
    });
  });

  describe('background colors', () => {
    test('has correct background colors', () => {
      expect(colorTheme.background).toBeDefined();
      expect(colorTheme.background.default).toBe('#fefbff');
      expect(colorTheme.background.paper).toBe('#fdfdfd');
    });
  });

  describe('surface colors', () => {
    test('has correct surface colors', () => {
      expect(colorTheme.surface).toBeDefined();
      expect(colorTheme.surface.main).toBe('#e8eced');
      expect(colorTheme.surface.variant).toBe('#e3e1ec');
      expect(colorTheme.surface.containerLowest).toBe('#fff');
      expect(colorTheme.surface.containerLow).toBe('#cbdadd');
      expect(colorTheme.surface.container).toBe('#f0edf1');
      expect(colorTheme.surface.containerHigh).toBe('#eae7ec');
      expect(colorTheme.surface.containerHighest).toBe('#e4e1e6');
    });
  });

  describe('text colors', () => {
    test('has correct text colors', () => {
      expect(colorTheme.text).toBeDefined();
      expect(colorTheme.text.primary).toBe('#1b1b1f');
      expect(colorTheme.text.secondary).toBe('#45464f');
    });
  });

  describe('BPP Color System', () => {
    test('has granite palette', () => {
      expect(colorTheme.bpp.granite).toBeDefined();
      expect(colorTheme.bpp.granite['000']).toBe('#ffffff');
      expect(colorTheme.bpp.granite['100']).toBe('#111110');
    });

    test('has purple palette', () => {
      expect(colorTheme.bpp.purple).toBeDefined();
      expect(colorTheme.bpp.purple['010']).toBe('#f1eefc');
      expect(colorTheme.bpp.purple['100']).toBe('#140043');
    });

    test('has sky palette', () => {
      expect(colorTheme.bpp.sky).toBeDefined();
      expect(colorTheme.bpp.sky['010']).toBe('#e5f9ff');
      expect(colorTheme.bpp.sky['100']).toBe('#00141a');
    });

    test('has mint palette', () => {
      expect(colorTheme.bpp.mint).toBeDefined();
      expect(colorTheme.bpp.mint['010']).toBe('#dcfefb');
    });

    test('has orange palette', () => {
      expect(colorTheme.bpp.orange).toBeDefined();
      expect(colorTheme.bpp.orange['010']).toBe('#fff2eb');
    });

    test('has pink palette', () => {
      expect(colorTheme.bpp.pink).toBeDefined();
      expect(colorTheme.bpp.pink['010']).toBe('#fff0f7');
    });

    test('has yellow palette', () => {
      expect(colorTheme.bpp.yellow).toBeDefined();
      expect(colorTheme.bpp.yellow['010']).toBe('#fff8db');
    });

    test('has cobalt palette', () => {
      expect(colorTheme.bpp.cobalt).toBeDefined();
      expect(colorTheme.bpp.cobalt['010']).toBe('#e9f1ff');
    });

    test('has green palette', () => {
      expect(colorTheme.bpp.green).toBeDefined();
      expect(colorTheme.bpp.green['010']).toBe('#dbfaed');
    });

    test('has red palette', () => {
      expect(colorTheme.bpp.red).toBeDefined();
      expect(colorTheme.bpp.red['010']).toBe('#ffedf3');
    });
  });

  describe('Material Design 3 System Colors', () => {
    test('has MD3 colors', () => {
      expect(colorTheme.md3).toBeDefined();
    });

    test('has MD3 primary colors', () => {
      expect(colorTheme.md3.primary).toBe('#006874');
      expect(colorTheme.md3.onPrimary).toBe('#ffffff');
      expect(colorTheme.md3.primaryContainer).toBe('#9eeffd');
      expect(colorTheme.md3.onPrimaryContainer).toBe('#004f58');
    });

    test('has MD3 secondary colors', () => {
      expect(colorTheme.md3.secondary).toBe('#296379');
      expect(colorTheme.md3.onSecondary).toBe('#ffffff');
    });

    test('has MD3 error colors', () => {
      expect(colorTheme.md3.error).toBe('#ba1a1a');
      expect(colorTheme.md3.onError).toBe('#ffffff');
      expect(colorTheme.md3.errorContainer).toBe('#ffdad6');
    });

    test('has MD3 surface colors', () => {
      expect(colorTheme.md3.surface).toBe('#f5fafb');
      expect(colorTheme.md3.onSurface).toBe('#171d1e');
      expect(colorTheme.md3.surfaceVariant).toBe('#dbe4e6');
    });

    test('has MD3 outline colors', () => {
      expect(colorTheme.md3.outline).toBe('#6f797a');
      expect(colorTheme.md3.outlineVariant).toBe('#bfc8ca');
    });
  });

  describe('Liftkit Theme Colors', () => {
    describe('light theme', () => {
      test('has light theme colors', () => {
        expect(colorTheme.liftkit.light).toBeDefined();
      });

      test('has light background', () => {
        expect(colorTheme.liftkit.light.background).toBe('#fefbff');
      });

      test('has light surface colors', () => {
        expect(colorTheme.liftkit.light.onSurface).toBe('#1b1b1f');
        expect(colorTheme.liftkit.light.surface).toBe('#e8eced');
        expect(colorTheme.liftkit.light.surfaceVariant).toBe('#e3e1ec');
      });

      test('has light primary colors', () => {
        expect(colorTheme.liftkit.light.primary).toBe('#4658ac');
        expect(colorTheme.liftkit.light.onPrimary).toBe('#fefbff');
      });

      test('has light semantic colors', () => {
        expect(colorTheme.liftkit.light.error).toBe('#ba1a1a');
        expect(colorTheme.liftkit.light.success).toBe('#006d3d');
        expect(colorTheme.liftkit.light.warning).toBe('#7c5800');
        expect(colorTheme.liftkit.light.info).toBe('#1758c7');
      });
    });

    describe('dark theme', () => {
      test('has dark theme colors', () => {
        expect(colorTheme.liftkit.dark).toBeDefined();
      });

      test('has dark background', () => {
        expect(colorTheme.liftkit.dark.background).toBe('#1b1b1f');
      });

      test('has dark surface colors', () => {
        expect(colorTheme.liftkit.dark.onSurface).toBe('#e4e1e6');
        expect(colorTheme.liftkit.dark.surface).toBe('#131316');
      });

      test('has dark primary colors', () => {
        expect(colorTheme.liftkit.dark.primary).toBe('#b9c3ff');
        expect(colorTheme.liftkit.dark.onPrimary).toBe('#11277c');
      });

      test('has dark semantic colors', () => {
        expect(colorTheme.liftkit.dark.error).toBe('#ffb4ab');
        expect(colorTheme.liftkit.dark.success).toBe('#76db9a');
        expect(colorTheme.liftkit.dark.warning).toBe('#f7bd48');
        expect(colorTheme.liftkit.dark.info).toBe('#b1c5ff');
      });
    });
  });

  describe('color value format', () => {
    test('all primary colors are valid hex values', () => {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      expect(colorTheme.primary.main).toMatch(hexRegex);
      expect(colorTheme.primary.light).toMatch(hexRegex);
      expect(colorTheme.primary.dark).toMatch(hexRegex);
    });

    test('BPP colors follow hex format', () => {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      expect(colorTheme.bpp.granite['000']).toMatch(hexRegex);
      expect(colorTheme.bpp.purple['050']).toMatch(hexRegex);
      expect(colorTheme.bpp.sky['060']).toMatch(hexRegex);
    });
  });
});
