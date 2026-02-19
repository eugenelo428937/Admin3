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

import { forwardRef } from 'react';
import { styled } from '@mui/material/styles';
import { IconButton as MuiIconButton } from '@mui/material';
import { getButtonStateStyles } from '../buttons';

// ---------------------------------------------------------------------------
// Transient prop filter
// ---------------------------------------------------------------------------
const shouldForwardProp = (prop) => {
  if (!prop || typeof prop !== 'string') return false;
  return !prop.trim().startsWith('$');
};

// ---------------------------------------------------------------------------
// Forced state styles for icon buttons
// ---------------------------------------------------------------------------
const withForcedState = ({ $forcedState, color, theme }) => {
  if (!$forcedState || $forcedState === 'default' || $forcedState === 'disabled') return {};
  return getButtonStateStyles('icon', $forcedState, theme, color || 'primary');
};

const StyledIconButton = styled(MuiIconButton, { shouldForwardProp })(withForcedState);

// ---------------------------------------------------------------------------
// Exported wrapper — handles focus className and disabled from $forcedState
// ---------------------------------------------------------------------------
export const IconButton = forwardRef(({ $forcedState, className, disabled, ...props }, ref) => {
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
