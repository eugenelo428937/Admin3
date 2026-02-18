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

import { spacing, formulatedSpacing } from '../tokens/spacing';
import { staticColors } from '../tokens/colors';
import { shadows } from '../tokens/shadows';
import { borderRadius } from '../tokens/borderRadius';
import { fontSizes, fontWeights, letterSpacing, lineHeights } from '../tokens/typography';
import { borderColor, fontSize } from '@mui/system';
import { background } from '../semantic/navigation';
import { LuUnderline } from 'react-icons/lu';

export const buttonOverrides = {
  MuiButton: {
    styleOverrides: {
      root: {
        fontSize: fontSizes.body.small,
        variants: [
          {
            props: { size: 'small' },
            style: {
              height : spacing.lg,
              paddingLeft : spacing.sm,
              paddingRight : spacing.sm,
              fontSize: fontSizes.body.label,
            },
          },
          {
            props: { size: 'medium' },
            style: {
              height : spacing.lg,
              paddingLeft : spacing.sm,
              paddingRight : spacing.sm,
              fontSize: fontSizes.body.medium,              
            },
          },
          {
            props: { size: 'large' },
            style: {
              fontSize: fontSizes.heading[80],
              padding: `${spacing.xs[2]} ${spacing.lg}`,
            },
          },
          {
            props: { variant: 'text' },
            style: {
              borderRadius: borderRadius[9],
              '&:hover':{
                boxShadow: shadows.shades[1],
              },
              "& .MuiTypography-root": {
                borderBottomStyle: 'solid',
                borderBottomColor: 'currentColor',
                borderBottomWidth: '1.5px',
                lineHeight: lineHeights.normal,                
              },
            },
          },
          {
            props: { variant: 'text', size: 'small' },
            style: {
              
              "& .MuiTypography-root": { borderBottomWidth: '1px' },
            },
          },
          {
            props: { variant: 'text', size: 'medium' },
            style: {
              "& .MuiTypography-root": { borderBottomWidth: '1.5px' },
            },
          },
          {
            props: { variant: 'text', size: 'large' },
            style: {
              "& .MuiTypography-root": { borderBottomWidth: '2px' },
            },
          },
          {
            props: { variant: 'contained' },
            style: {
              boxShadow: shadows.shades[1],
              '&:hover':{
                boxShadow: shadows.shades[2],
              },
              "& .MuiSvgIcon-root": {
                color: staticColors.white,
              },
            },
          },          
          {
            props: { variant: 'outlined' },
            style: {
              borderRadius: '2rem',
            },
          },
        ]
      }
    },
  },
};

export default buttonOverrides;