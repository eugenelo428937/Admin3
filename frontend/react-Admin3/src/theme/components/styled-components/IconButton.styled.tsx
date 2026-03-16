/**
 * Styled IconButton Component
 *
 * Wraps MUI IconButton with `$forcedState` transient prop for forcing
 * visual pseudo-states (hover | active | focus | disabled).
 *
 * @module theme/components/styled-components/IconButton.styled
 *
 * @example
 * import { IconButton } from '...IconButton.styled';
 *
 * <IconButton>Normal</IconButton>
 * <IconButton $forcedState="hover">Forced Hover</IconButton>
 */

import React, { forwardRef } from 'react';
import { styled } from '@mui/material/styles';
import { IconButton as MuiIconButton } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { IconButtonProps } from '@mui/material';
import { getButtonStateStyles } from '../buttons';

// ---------------------------------------------------------------------------
// Transient prop filter
// ---------------------------------------------------------------------------
const shouldForwardProp = (prop: PropertyKey): boolean => {
  if (!prop || typeof prop !== 'string') return false;
  return !prop.trim().startsWith('$');
};

// ---------------------------------------------------------------------------
// Forced state styles for icon buttons
// ---------------------------------------------------------------------------
const withForcedState = (props: { $forcedState?: string; color?: string; theme: Theme }): Record<string, any> => {
  if (!props.$forcedState || props.$forcedState === 'default' || props.$forcedState === 'disabled') return {};
  return getButtonStateStyles('icon', props.$forcedState as any, props.theme, props.color || 'primary');
};

const StyledIconButton = styled(MuiIconButton, { shouldForwardProp })(withForcedState) as React.ComponentType<any>;

// ---------------------------------------------------------------------------
// Props interface for the exported IconButton
// ---------------------------------------------------------------------------
interface StyledIconButtonProps extends Omit<IconButtonProps, 'color'> {
  $forcedState?: string;
  color?: IconButtonProps['color'];
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Exported wrapper — handles focus className and disabled from $forcedState
// ---------------------------------------------------------------------------
export const IconButton = forwardRef<HTMLButtonElement, StyledIconButtonProps>(({ $forcedState, className, disabled, ...props }, ref) => {
  const mergedClassName = $forcedState === 'focus'
    ? className ? `${className} Mui-focusVisible` : 'Mui-focusVisible'
    : className;

  return (
    <StyledIconButton
      ref={ref}
      $forcedState={$forcedState}
      className={mergedClassName}
      disabled={$forcedState === 'disabled' || disabled}
      {...props}
    />
  );
});
IconButton.displayName = 'IconButton';

export default IconButton;
