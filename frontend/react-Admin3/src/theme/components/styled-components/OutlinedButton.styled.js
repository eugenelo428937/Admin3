/**
 * OutlinedButton Styled Component
 *
 * An outlined-variant button that wraps its label in a Typography element.
 * Font sizes are provided by the MUI theme via buttons.js size variants.
 * Supports the same `$shape` and `$forcedState` transient props as Button.
 *
 * @module theme/components/styled-components/OutlinedButton.styled
 *
 * @example
 * import OutlinedButton from '...OutlinedButton.styled';
 *
 * <OutlinedButton>Round Outlined</OutlinedButton>
 * <OutlinedButton $shape="square">Square Outlined</OutlinedButton>
 * <OutlinedButton size="large">Large</OutlinedButton>
 * <OutlinedButton $forcedState="hover">Forced Hover</OutlinedButton>
 */

import { forwardRef } from 'react';
import { Typography } from '@mui/material';
import { Button } from './Button.styled.js';

const OutlinedButton = forwardRef(({ size = 'medium', children, ...props }, ref) => (
  <Button ref={ref} variant="outlined" size={size} {...props}>
    <Typography component="span">
      {children}
    </Typography>
  </Button>
));
OutlinedButton.displayName = 'OutlinedButton';

export { OutlinedButton };
export default OutlinedButton;
