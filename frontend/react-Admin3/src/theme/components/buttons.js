/**
 * Button Component Overrides
 *
 * Defines MUI Button component size-based style overrides.
 * Font sizes are driven by typography tokens for consistency.
 *
 * @module theme/components/buttons
 *
 * ## Size Overrides
 *
 * @size small - Uses typographyConfig.buttonSmall font size
 * @size medium - Uses typographyConfig.buttonMedium font size, enlarged icons (28-29px)
 * @size large - Uses typographyConfig.buttonLarge font size
 *
 * @example
 * // Standard MUI button sizes - no variant prop needed
 * <Button size="small">Small</Button>
 * <Button size="medium">Medium</Button>
 * <Button size="large">Large</Button>
 *
 * @note For navigation-specific button variants, see navigation.js
 */

import { alpha, darken } from '@mui/material/styles';
import { spacing } from '../tokens/spacing';
import { iconSizes } from '../tokens/icons'
import { md3, staticColors } from '../tokens/colors';
import { shadows } from '../tokens/shadows';
import { borderRadius } from '../tokens/borderRadius';
import { fontSizes, lineHeights, fontWeights, letterSpacings } from '../tokens/typography';
import { color } from '@mui/system';

const important = (value) => `${value} !important`;
/**
 * Shared shadow tokens per button variant and state.
 * Used both by the MUI overrides below and by getButtonStateStyles()
 * so the style guide Sandbox stays in sync automatically.
 */
const buttonShadows = {
  textButton: {
    default: shadows.shades[1],
    hover: shadows.shades[2],
    active: shadows.shades[0],
    disabled: shadows.shades[0],

  },
  containedButton: {
    default: shadows.shades[1],
    hover: shadows.shades[2],
    active: shadows.shades[3],
    disabled: shadows.shades[0],
  },
  outlinedButton: {
    default: shadows.shades[1],
    hover: shadows.shades[2],
    active: shadows.shades[3],
    disabled: shadows.shades[0],
  },
  iconButton: {
    default: shadows.shades[1],
    hover: shadows.shades[2],
    active: shadows.shades[3],
    disabled: shadows.shades[0],
  }
};

export const buttonOverrides = {
  MuiButton: {
    styleOverrides: {
      root: {
        fontSize: fontSizes.body.small,
        textTransform: 'capitalize',
        minWidth:0,
        "& .MuiTypography-root": {
          fontSize: fontSizes.body.small,
          textTransform: important('capitalize'),
        },
        borderRadius: borderRadius[9],
        
        "& .MuiTouchRipple-child": {
          animation: "cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: 0.3,
        },
        '&:active': {
          boxShadow: 'none',
          transition: 'all 0.28s',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '&:disabled': {
          backgroundColor: `color-mix(in srgb, ${md3.onSurface} 10%, transparent)`,
          color: `color-mix(in srgb, ${md3.onSurface} 38%, transparent)`,
        },
        '&:focus': {
          outlineOffset: '2px',
          outlineColor: 'color-mix(in srgb, currentColor 30%, transparent)',
          outlineWidth: '2px',
          outlineStyle: 'solid',
        },
      },
    },
    variants: [
      {
        props: { size: 'small' },
        style: {
          height: spacing.lg,
          paddingLeft: spacing.xs[4],
          paddingRight: spacing.xs[4],

          // Default MUI button text
          fontSize: fontSizes.body.small,
          // Styled button text
          "& .MuiTypography-root": {
            fontSize: fontSizes.body.small,
            lineHeight: important(lineHeights.shortest),
            fontWeight: fontWeights.medium,
            letterSpacing: letterSpacings.scale[100],
          },
          '&:active': {
            borderRadius: borderRadius[2],
          },
          "& .MuiButton-startIcon": {
            margin: 0,
            marginRight: spacing.xs[5],
            '& .MuiSvgIcon-root': {
              fontSize: iconSizes.xs,
            },
          },
          "& .MuiButton-endIcon": {
            margin: 0,
            marginLeft: spacing.xs[5],
            '& .MuiSvgIcon-root': {
              fontSize: iconSizes.xs,
            },
          },
          '& .MuiSvgIcon-root': {
            fontSize: iconSizes.xs,
          },
        },
      },
      {
        props: { size: 'medium' },
        style: {
          height: spacing.xl[1],
          paddingLeft: spacing.md,
          paddingRight: spacing.md,

          // Default MUI button text
          fontSize: fontSizes.body.medium,

          // Styled button text
          "& .MuiTypography-root": {
            fontSize: fontSizes.body.medium,
            lineHeight: lineHeights.short,
            fontWeight: fontWeights.medium,
            letterSpacing: letterSpacings.scale[90],
          },
          '&:active': {
            borderRadius: borderRadius[3],
          },
        },
      },
      {
        props: { size: 'large' },
        style: {
          height: spacing.xl[2],
          padding: `${spacing.sm} ${spacing.lg}`,

          // Default MUI button text          
          fontSize: fontSizes.heading[60],

          // Styled button text
          "& .MuiTypography-root": {
            fontSize: fontSizes.heading[60],
            lineHeight: lineHeights.shorter,
            fontWeight: fontWeights.regular,
            letterSpacing: letterSpacings.scale[70],
          },
          '&:active': {
            borderRadius: borderRadius[4],
          },
        },
      },
      {
        props: { variant: 'text' },
        style: {
          '&:hover': {
            boxShadow: buttonShadows.textButton.hover,
          },
          '&:active': {
            boxShadow: buttonShadows.textButton.active,
          },
          '&:focused': {
            outlineOffset: '2px',
          },
        },
      },
      {
        props: { variant: 'text', size: 'small' },
        style: {
          height: spacing.md,
        },
      },
      {
        props: { variant: 'contained' },
        style: {
          boxShadow: buttonShadows.containedButton.default,

          // border radius override in .\styled-components\ContainedButton.styled.js
          //borderRadius: borderRadius[9],

          '&:hover': {
            boxShadow: buttonShadows.containedButton.hover,
          },
          "& .MuiTouchRipple-child": {
            animation: "cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: 0.06,
          },

          "& .MuiSvgIcon-root": {
            color: staticColors.white,
          },
        },
      },
      {
        props: { variant: 'outlined' },
        style: {
          // border radius override in .\styled-components\IconButton.styled.js
          //borderRadius: borderRadius[9],
        },
      },
      {
        props: { color: 'onDark' },
        style: {
          color: md3.inverseOnSurface,
        }
      }
    ]
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        fontSize: fontSizes.body.small,
        borderRadius: borderRadius[9],
        backgroundColor: md3.primaryContainer,
        color: md3.onPrimaryContainer,
        '&:disabled': {
          backgroundColor: `color-mix(in srgb, ${md3.onSurface} 10%, transparent)`,
          color: `color-mix(in srgb, ${md3.onSurface} 38%, transparent)`,
        },
        "& .MuiTouchRipple-child": {
          animation: "cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: 0.3,
        },
        '&:active': {
          boxShadow: 'none',
          transition: 'all 0.18s',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '&:focus': {
          outlineOffset: '2px',
          outlineColor: 'color-mix(in srgb, currentColor 30%, transparent)',
          outlineWidth: '2px',
          outlineStyle: 'solid',

        },
      },
    },
    variants: [
      {
        props: { size: 'small' },
        style: {
          height: fontSizes.heading[30],
          width: fontSizes.heading[30],
          "& .MuiSvgIcon-root": {
            fontSize: fontSizes.heading[80],
          },
        },
      },
      {
        props: { size: 'medium' },
        style: {
          height: fontSizes.heading[20],
          width: fontSizes.heading[20],
          "& .MuiSvgIcon-root": {
            fontSize: fontSizes.heading[60],
          },
        },
      },
      {
        props: { size: 'large' },
        style: {
          height: fontSizes.display.medium,
          width: fontSizes.display.medium,
          "& .MuiSvgIcon-root": {
            fontSize: fontSizes.heading[30],
          },
        },
      },
    ],
  }
};

/**
 * Returns sx styles that force a button's visual pseudo-state as its
 * resting appearance. Uses the same shadow tokens as the overrides above
 * so the style guide Sandbox stays in sync with any theme changes.
 *
 * @param {'text'|'contained'|'outlined'|'icon'} variant - Button variant
 * @param {'hover'|'active'|'focus'} state - Visual state to force
 * @param {object} theme - MUI theme (from useTheme or sx callback)
 * @param {string} [color='primary'] - Palette color key
 * @returns {object} sx-compatible style object
 */
export const getButtonStateStyles = (variant, state, theme, color = 'primary') =>
{
  const p = theme.palette;
  const c = p[color] || p.primary;

  const focusRing = {
    outline: `1px solid ${alpha(c.main, p.action.focused.ringOpacity)}`,
    outlineOffset: '2px',
  };

  const styles = {
    contained: {
      hover: {
        backgroundColor: c.dark,
        boxShadow: buttonShadows.containedButton.default,
        '&:hover': { backgroundColor: c.dark, boxShadow: buttonShadows.containedButton.hover },
      },
      active: {
        backgroundColor: darken(c.dark, 0.15),
        boxShadow: buttonShadows.containedButton.active,
        '&:hover': { backgroundColor: darken(c.dark, 0.15), boxShadow: buttonShadows.containedButton.activeHover },
      },
      focus: {
        ...focusRing,
        '&.Mui-focusVisible': focusRing,
      },
    },
    text: {
      hover: {
        boxShadow: buttonShadows.textButton.hover,
        backgroundColor: alpha(c.main, p.action.hoverOpacity),
        '&:hover': {
          boxShadow: buttonShadows.textButton.hover,
          backgroundColor: alpha(c.main, p.action.hoverOpacity),
        },
      },
      active: {
        position: 'relative',
        overflow: 'hidden',
        boxShadow: buttonShadows.textButton.active,
        backgroundColor: alpha(c.main, p.action.hoverOpacity),
        borderRadius: borderRadius[2],
        transition: 'border-radius 0.25s',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        '@keyframes cssRipple': {
          '0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: 0.35 },
          '100%': { transform: 'translate(-50%, -50%) scale(4)', opacity: 0 },
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '171%',
          left: '70%',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          pointerEvents: 'none',
          // Freeze the animation ~33% in so the sandbox shows a mid-ripple snapshot
          animation: 'cssRipple 0.45s ease-out forwards',
          animationPlayState: 'paused',
          animationDelay: '-0.09s',
        },
        '&:active': {
          boxShadow: buttonShadows.textButton.active,
          borderRadius: borderRadius[2],
          transition: 'border-radius 0.25s',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          '&::after': {
            animationPlayState: 'running',
            animationDelay: '0s',
          },
        },
      },
      focus: {
        ...focusRing,
        '&.Mui-focusVisible': focusRing,
        backgroundColor: alpha(c.main, p.action.activeOpacity),
      },
    },
    outlined: {
      hover: {
        backgroundColor: alpha(c.main, p.action.hoverOpacity),
        borderColor: c.main,
        '&:hover': {
          backgroundColor: alpha(c.main, p.action.hoverOpacity),
          borderColor: c.main,
        },
      },
      active: {
        backgroundColor: alpha(c.main, p.action.selectedOpacity),
        borderColor: c.main,
        '&:hover': {
          backgroundColor: alpha(c.main, p.action.selectedOpacity),
          borderColor: c.main,
        },
      },
      focus: {
        ...focusRing,
        borderColor: c.main,
        '&.Mui-focusVisible': {
          ...focusRing,
          borderColor: c.main,
        },
      },
    },
    icon: {
      hover: {
        backgroundColor: alpha(c.main, p.action.hoverOpacity),
        '&:hover': { backgroundColor: alpha(c.main, p.action.hoverOpacity) },
      },
      active: {
        backgroundColor: alpha(c.main, p.action.selectedOpacity),
        '&:hover': { backgroundColor: alpha(c.main, p.action.selectedOpacity) },
      },
      focus: {
        ...focusRing,
        '&.Mui-focusVisible': focusRing,
      },
    },
  };

  return styles[variant]?.[state] || {};
};

export default buttonOverrides;