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

import React, { forwardRef } from 'react';
import { styled } from '@mui/material/styles';
import { Button as MuiButton } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { ButtonProps } from '@mui/material';
import { borderRadius } from '../../tokens/borderRadius';
import { getButtonStateStyles } from '../buttons';

// ---------------------------------------------------------------------------
// Transient prop filter
// Props prefixed with '$' are consumed by styled() and NOT passed to the DOM.
// ---------------------------------------------------------------------------
const shouldForwardProp = (prop: PropertyKey): boolean => {
  if (!prop || typeof prop !== 'string') return false;
  return !prop.trim().startsWith('$');
};

// ---------------------------------------------------------------------------
// Shape styles
// ---------------------------------------------------------------------------
const shapeStyles: Record<string, Record<string, any>> = {
  round: { borderRadius: borderRadius[9] },
  square: { borderRadius: borderRadius[2]},
};

/** Style function shared by all button variants */
const withShape = (props: { $shape?: 'round' | 'square' }): Record<string, any> =>
  shapeStyles[props.$shape || 'round'] || {};

// ---------------------------------------------------------------------------
// Forced state styles
// Applies visual pseudo-state (hover/active/focus) as resting appearance.
// Used by the Sandbox style guide to display buttons in each state.
// ---------------------------------------------------------------------------
const withForcedState = (props: { $forcedState?: string; variant?: string; color?: string; theme: Theme }): Record<string, any> => {
  if (!props.$forcedState || props.$forcedState === 'default' || props.$forcedState === 'disabled') return {};
  return getButtonStateStyles((props.variant || 'contained') as any, props.$forcedState as any, props.theme, props.color || 'primary');
};

// ---------------------------------------------------------------------------
// Internal styled component (not exported directly)
// ---------------------------------------------------------------------------
const StyledButton = styled(MuiButton, { shouldForwardProp })(withShape, withForcedState) as React.ComponentType<any>;

// ---------------------------------------------------------------------------
// Props interface for the exported Button
// ---------------------------------------------------------------------------
interface StyledButtonProps extends Omit<ButtonProps, 'color'> {
  $forcedState?: string;
  $shape?: 'round' | 'square';
  color?: ButtonProps['color'];
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Base Button — wraps StyledButton to handle focus className and disabled state
// from $forcedState prop (Emotion styled callbacks cannot modify DOM attributes).
// ---------------------------------------------------------------------------
export const Button = forwardRef<HTMLButtonElement, StyledButtonProps>(({ $forcedState, className, disabled, ...props }, ref) => {
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
