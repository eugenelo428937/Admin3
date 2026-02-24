/**
 * Styled Button Components
 *
 * Provides styled MUI Button variants with transient props:
 * - `$shape`       — controls border-radius (round | square)
 * - `$forcedState` — forces a visual pseudo-state (hover | active | focus | disabled)
 *
 * Custom props prefixed with `$` are NOT forwarded to the DOM
 * (prevents "Invalid attribute" warnings).
 *
 * IMPORTANT:
 * - Use `styled` from '@mui/material/styles', NOT '@emotion/styled'
 * - Always prefix custom props with `$` (e.g., `$shape`)
 * - Import these styled buttons instead of MUI's default `<Button>`
 *
 * @module theme/components/styled-components/Button.styled
 *
 * @example
 * import { Button } from '...Button.styled';
 * import ContainedButton from '...ContainedButton.styled';
 * import OutlinedButton from '...OutlinedButton.styled';
 *
 * <Button variant="text" $shape="round">Round Text</Button>
 * <ContainedButton>Round Contained</ContainedButton>
 * <OutlinedButton $shape="square">Square Outlined</OutlinedButton>
 */

import { forwardRef } from 'react';
import { styled } from '@mui/material/styles';
import { Button as MuiButton } from '@mui/material';
import { formulatedSpacing } from '../../tokens/spacing';
import { getButtonStateStyles } from '../buttons';

// ---------------------------------------------------------------------------
// Transient prop filter
// Props prefixed with '$' are consumed by styled() and NOT passed to the DOM.
// Exported so sibling styled components can share the same guard.
// ---------------------------------------------------------------------------
export const shouldForwardProp = (prop) => {
  if (!prop || typeof prop !== 'string') return false;
  return !prop.trim().startsWith('$');
};

// ---------------------------------------------------------------------------
// Shape styles
// round  → inherits theme border-radius (no override needed)
// square → size-dependent radius that compresses on :active
// ---------------------------------------------------------------------------
// Border-radius must stay below height÷2 or the corners merge into a pill shape.
// Button heights (approx): small ≈ 26px, medium ≈ 33px, large ≈ 42px
//   → safe limits:         small < 13px,  medium < 16.5px,  large < 21px
// formulatedSpacing: (2)≈6px  (3)≈10px  (4)≈17px
export const squareRadiusBySize = {
  small:  { borderRadius: formulatedSpacing(3), '&:active': { borderRadius: formulatedSpacing(2) } },
  medium: { borderRadius: formulatedSpacing(3), '&:active': { borderRadius: formulatedSpacing(2) } },
  large:  { borderRadius: formulatedSpacing(4), '&:active': { borderRadius: formulatedSpacing(3) } },
};

const withShape = ({ $shape = 'round', size = 'medium' }) => {
  if ($shape === 'square') return squareRadiusBySize[size] || squareRadiusBySize.medium;
  return {};
};

// ---------------------------------------------------------------------------
// Forced state styles
// Applies visual pseudo-state (hover/active/focus) as resting appearance.
// Used by the Sandbox style guide to display buttons in each state.
// ---------------------------------------------------------------------------
const withForcedState = ({ $forcedState, variant, color, theme }) => {
  if (!$forcedState || $forcedState === 'default' || $forcedState === 'disabled') return {};
  return getButtonStateStyles(variant || 'contained', $forcedState, theme, color || 'primary');
};

// ---------------------------------------------------------------------------
// Internal styled component (not exported directly)
// ---------------------------------------------------------------------------
const StyledButton = styled(MuiButton, { shouldForwardProp })(withShape, withForcedState);

// ---------------------------------------------------------------------------
// Base Button — wraps StyledButton to handle focus className and disabled state
// from $forcedState prop (Emotion styled callbacks cannot modify DOM attributes).
// ---------------------------------------------------------------------------
export const Button = forwardRef(({ $forcedState, className, disabled, ...props }, ref) => {
  const mergedClassName = $forcedState === 'focus'
    ? className ? `${className} Mui-focusVisible` : 'Mui-focusVisible'
    : className;

  return (
    <StyledButton
      ref={ref}
      $forcedState={$forcedState}
      className={mergedClassName}
      disabled={$forcedState === 'disabled' || disabled}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export default Button;
