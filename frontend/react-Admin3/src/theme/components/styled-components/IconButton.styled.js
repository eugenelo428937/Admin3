/**
 * Styled IconButton Component
 *
 * Wraps MUI IconButton with transient props for forcing visual pseudo-states
 * and applying shape/layout variants.
 *
 * @module theme/components/styled-components/IconButton.styled
 *
 * ## Transient props
 *
 * @prop {string}  [$forcedState]  - Forces a visual pseudo-state: 'hover' | 'active' | 'focus' | 'disabled'
 * @prop {string}  [$shape]        - Shape variant: 'round' (50% radius) | 'square' (small fixed radius)
 * @prop {boolean} [$isNarrow]     - When true, collapses horizontal padding so the button fits its icon tightly
 *
 * @example
 * <IconButton>Normal</IconButton>
 * <IconButton $forcedState="hover">Forced Hover</IconButton>
 * <IconButton $shape="square">Square</IconButton>
 * <IconButton $shape="round" $isNarrow>Narrow circle</IconButton>
 */

import { forwardRef } from 'react';
import { styled } from '@mui/material/styles';
import { IconButton as MuiIconButton } from '@mui/material';
import { shouldForwardProp, squareRadiusBySize } from './Button.styled';
import { getButtonStateStyles } from '../buttons';
import { spacing } from '../../tokens/spacing';

// ---------------------------------------------------------------------------
// Shape styles — square radius follows the same size-aware scale as Button
// ---------------------------------------------------------------------------
const withShape = ({ $shape, size = 'medium' }) => {
  if ($shape === 'square') return squareRadiusBySize[size] || squareRadiusBySize.medium;
  if ($shape === 'round') return { borderRadius: '50%' };
  return {};
};

// ---------------------------------------------------------------------------
// Narrow layout — collapses horizontal padding, lets width follow content
// ---------------------------------------------------------------------------
const withNarrow = ({ $isNarrow }) => {
  if (!$isNarrow) return {};
  return {
    width: 'auto',
    paddingLeft: spacing.xs[2],
    paddingRight: spacing.xs[2],
  };
};

// ---------------------------------------------------------------------------
// Forced state styles for style-guide sandbox
// ---------------------------------------------------------------------------
const withForcedState = ({ $forcedState, color, theme }) => {
  if (!$forcedState || $forcedState === 'default' || $forcedState === 'disabled') return {};
  return getButtonStateStyles('icon', $forcedState, theme, color || 'primary');
};

const StyledIconButton = styled(MuiIconButton, { shouldForwardProp })(
  withShape,
  withNarrow,
  withForcedState,
);

// ---------------------------------------------------------------------------
// Exported wrapper — handles focus className and disabled from $forcedState
// ---------------------------------------------------------------------------
export const IconButton = forwardRef(({ $forcedState, $shape, $isNarrow, className, disabled, ...props }, ref) => {
  const mergedClassName = $forcedState === 'focus'
    ? className ? `${className} Mui-focusVisible` : 'Mui-focusVisible'
    : className;

  return (
    <StyledIconButton
      ref={ref}
      $forcedState={$forcedState}
      $shape={$shape}
      $isNarrow={$isNarrow}
      className={mergedClassName}
      disabled={$forcedState === 'disabled' || disabled}
      {...props}
    />
  );
});
IconButton.displayName = 'IconButton';

export default IconButton;
