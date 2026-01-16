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
      expect(colorTheme.palette.offwhite).toBeDefined();
      expect(colorTheme.palette.offwhite['000']).toBe('#fdfdfd');
      expect(colorTheme.palette.offwhite['001']).toBeDefined();
      expect(colorTheme.palette.offwhite['009']).toBeDefined();
    });
  });

  describe('core Material-UI palette', () => {
    describe('primary', () => {
      test('has correct primary colors', () => {
        expect(colorTheme.palette.primary).toBeDefined();
        expect(colorTheme.palette.primary.main).toBe('#4658ac');
        expect(colorTheme.palette.primary.light).toBe('#b9c3ff');
        expect(colorTheme.palette.primary.dark).toBe('#2d3f93');
        expect(colorTheme.palette.primary.contrastText).toBe('#fefbff');
      });
    });

    describe('secondary', () => {
      test('has correct secondary colors', () => {
        expect(colorTheme.palette.secondary).toBeDefined();
        expect(colorTheme.palette.secondary.main).toBe('#5a5d72');
        expect(colorTheme.palette.secondary.light).toBe('#c3c5dd');
        expect(colorTheme.palette.secondary.dark).toBe('#434659');
        expect(colorTheme.palette.secondary.contrastText).toBe('#fff');
      });
    });

    describe('tertiary', () => {
      test('has correct tertiary colors', () => {
        expect(colorTheme.palette.tertiary).toBeDefined();
        expect(colorTheme.palette.tertiary.main).toBe('#76546e');
        expect(colorTheme.palette.tertiary.light).toBe('#e5bad8');
        expect(colorTheme.palette.tertiary.dark).toBe('#5c3c55');
      });
    });

    describe('error', () => {
      test('has correct error colors', () => {
        expect(colorTheme.palette.error).toBeDefined();
        expect(colorTheme.palette.error.main).toBe('#ba1a1a');
        expect(colorTheme.palette.error.light).toBe('#ffb4ab');
        expect(colorTheme.palette.error.dark).toBe('#93000a');
      });
    });

    describe('warning', () => {
      test('has correct warning colors', () => {
        expect(colorTheme.palette.warning).toBeDefined();
        expect(colorTheme.palette.warning.main).toBe('#7c5800');
        expect(colorTheme.palette.warning.light).toBe('#f7bd48');
        expect(colorTheme.palette.warning.dark).toBe('#5e4200');
      });
    });

    describe('info', () => {
      test('has correct info colors', () => {
        expect(colorTheme.palette.info).toBeDefined();
        expect(colorTheme.palette.info.main).toBe('#1758c7');
        expect(colorTheme.palette.info.light).toBe('#b1c5ff');
        expect(colorTheme.palette.info.dark).toBe('#00419e');
      });
    });

    describe('success', () => {
      test('has correct success colors', () => {
        expect(colorTheme.palette.success).toBeDefined();
        expect(colorTheme.palette.success.main).toBe('#006d3d');
        expect(colorTheme.palette.success.light).toBe('#76db9a');
        expect(colorTheme.palette.success.dark).toBe('#00522c');
      });
    });
  });

  describe('background colors', () => {
    test('has correct background colors', () => {
      expect(colorTheme.palette.background).toBeDefined();
      expect(colorTheme.palette.background.default).toBe('#fefbff');
      expect(colorTheme.palette.background.paper).toBe('#fdfdfd');
    });
  });

  describe('surface colors', () => {
    test('has correct surface colors', () => {
      expect(colorTheme.palette.surface).toBeDefined();
      expect(colorTheme.palette.surface.main).toBe('#e8eced');
      expect(colorTheme.palette.surface.variant).toBe('#e3e1ec');
      expect(colorTheme.palette.surface.containerLowest).toBe('#fff');
      expect(colorTheme.palette.surface.containerLow).toBe('#cbdadd');
      expect(colorTheme.palette.surface.container).toBe('#f0edf1');
      expect(colorTheme.palette.surface.containerHigh).toBe('#eae7ec');
      expect(colorTheme.palette.surface.containerHighest).toBe('#e4e1e6');
    });
  });

  describe('text colors', () => {
    test('has correct text colors', () => {
      expect(colorTheme.palette.text).toBeDefined();
      expect(colorTheme.palette.text.primary).toBe('#1b1b1f');
      expect(colorTheme.palette.text.secondary).toBe('#45464f');
    });
  });

  describe('BPP Color System', () => {
    test('has granite palette', () => {
      expect(colorTheme.palette.granite).toBeDefined();
      expect(colorTheme.palette.granite['000']).toBe('#ffffff');
      expect(colorTheme.palette.granite['100']).toBe('#111110');
    });

    test('has purple palette', () => {
      expect(colorTheme.palette.purple).toBeDefined();
      expect(colorTheme.palette.purple['010']).toBe('#f1eefc');
      expect(colorTheme.palette.purple['100']).toBe('#140043');
    });

    test('has sky palette', () => {
      expect(colorTheme.palette.sky).toBeDefined();
      expect(colorTheme.palette.sky['010']).toBe('#e5f9ff');
      expect(colorTheme.palette.sky['100']).toBe('#00141a');
    });

    test('has mint palette', () => {
      expect(colorTheme.palette.mint).toBeDefined();
      expect(colorTheme.palette.mint['010']).toBe('#dcfefb');
    });

    test('has orange palette', () => {
      expect(colorTheme.palette.orange).toBeDefined();
      expect(colorTheme.palette.orange['010']).toBe('#fff2eb');
    });

    test('has pink palette', () => {
      expect(colorTheme.palette.pink).toBeDefined();
      expect(colorTheme.palette.pink['010']).toBe('#fff0f7');
    });

    test('has yellow palette', () => {
      expect(colorTheme.palette.yellow).toBeDefined();
      expect(colorTheme.palette.yellow['010']).toBe('#fff8db');
    });

    test('has cobalt palette', () => {
      expect(colorTheme.palette.cobalt).toBeDefined();
      expect(colorTheme.palette.cobalt['010']).toBe('#e9f1ff');
    });

    test('has green palette', () => {
      expect(colorTheme.palette.green).toBeDefined();
      expect(colorTheme.palette.green['010']).toBe('#dbfaed');
    });

    test('has red palette', () => {
      expect(colorTheme.palette.red).toBeDefined();
      expect(colorTheme.palette.red['010']).toBe('#ffedf3');
    });
  });

  describe('Material Design 3 System Colors', () => {
    test('has MD3 colors', () => {
      expect(colorTheme.palette.md3).toBeDefined();
    });

    test('has MD3 primary colors', () => {
      expect(colorTheme.palette.md3.primary).toBe('#006874');
      expect(colorTheme.palette.md3.onPrimary).toBe('#ffffff');
      expect(colorTheme.palette.md3.primaryContainer).toBe('#9eeffd');
      expect(colorTheme.palette.md3.onPrimaryContainer).toBe('#004f58');
    });

    test('has MD3 secondary colors', () => {
      expect(colorTheme.palette.md3.secondary).toBe('#296379');
      expect(colorTheme.palette.md3.onSecondary).toBe('#ffffff');
    });

    test('has MD3 error colors', () => {
      expect(colorTheme.palette.md3.error).toBe('#ba1a1a');
      expect(colorTheme.palette.md3.onError).toBe('#ffffff');
      expect(colorTheme.palette.md3.errorContainer).toBe('#ffdad6');
    });

    test('has MD3 surface colors', () => {
      expect(colorTheme.palette.md3.surface).toBe('#f5fafb');
      expect(colorTheme.palette.md3.onSurface).toBe('#171d1e');
      expect(colorTheme.palette.md3.surfaceVariant).toBe('#dbe4e6');
    });

    test('has MD3 outline colors', () => {
      expect(colorTheme.palette.md3.outline).toBe('#6f797a');
      expect(colorTheme.palette.md3.outlineVariant).toBe('#bfc8ca');
    });
  });

  describe('Liftkit Theme Colors', () => {
    describe('light theme', () => {
      test('has light theme colors', () => {
        expect(colorTheme.palette.liftkit.light).toBeDefined();
      });

      test('has light background', () => {
        expect(colorTheme.palette.liftkit.light.background).toBe('#fefbff');
      });

      test('has light surface colors', () => {
        expect(colorTheme.palette.liftkit.light.onSurface).toBe('#1b1b1f');
        expect(colorTheme.palette.liftkit.light.surface).toBe('#e8eced');
        expect(colorTheme.palette.liftkit.light.surfaceVariant).toBe('#e3e1ec');
      });

      test('has light primary colors', () => {
        expect(colorTheme.palette.liftkit.light.primary).toBe('#4658ac');
        expect(colorTheme.palette.liftkit.light.onPrimary).toBe('#fefbff');
      });

      test('has light semantic colors', () => {
        expect(colorTheme.palette.liftkit.light.error).toBe('#ba1a1a');
        expect(colorTheme.palette.liftkit.light.success).toBe('#006d3d');
        expect(colorTheme.palette.liftkit.light.warning).toBe('#7c5800');
        expect(colorTheme.palette.liftkit.light.info).toBe('#1758c7');
      });
    });

    describe('dark theme', () => {
      test('has dark theme colors', () => {
        expect(colorTheme.palette.liftkit.dark).toBeDefined();
      });

      test('has dark background', () => {
        expect(colorTheme.palette.liftkit.dark.background).toBe('#1b1b1f');
      });

      test('has dark surface colors', () => {
        expect(colorTheme.palette.liftkit.dark.onSurface).toBe('#e4e1e6');
        expect(colorTheme.palette.liftkit.dark.surface).toBe('#131316');
      });

      test('has dark primary colors', () => {
        expect(colorTheme.palette.liftkit.dark.primary).toBe('#b9c3ff');
        expect(colorTheme.palette.liftkit.dark.onPrimary).toBe('#11277c');
      });

      test('has dark semantic colors', () => {
        expect(colorTheme.palette.liftkit.dark.error).toBe('#ffb4ab');
        expect(colorTheme.palette.liftkit.dark.success).toBe('#76db9a');
        expect(colorTheme.palette.liftkit.dark.warning).toBe('#f7bd48');
        expect(colorTheme.palette.liftkit.dark.info).toBe('#b1c5ff');
      });
    });
  });

  describe('color value format', () => {
    test('all primary colors are valid hex values', () => {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      expect(colorTheme.palette.primary.main).toMatch(hexRegex);
      expect(colorTheme.palette.primary.light).toMatch(hexRegex);
      expect(colorTheme.palette.primary.dark).toMatch(hexRegex);
    });

    test('BPP colors follow hex format', () => {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      expect(colorTheme.palette.granite['000']).toMatch(hexRegex);
      expect(colorTheme.palette.purple['050']).toMatch(hexRegex);
      expect(colorTheme.palette.sky['060']).toMatch(hexRegex);
    });
  });
});
