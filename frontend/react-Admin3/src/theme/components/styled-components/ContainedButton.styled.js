/**
 * ContainedButton Styled Component
 *
 * A contained-variant button that wraps its label in a Typography element.
 * Font sizes are provided by the MUI theme via buttons.js size variants.
 * Supports the same `$shape` and `$forcedState` transient props as Button.
 *
 * @module theme/components/styled-components/ContainedButton.styled
 *
 * @example
 * import ContainedButton from '...ContainedButton.styled';
 *
 * <ContainedButton>Round Contained</ContainedButton>
 * <ContainedButton $shape="square">Square Contained</ContainedButton>
 * <ContainedButton size="large">Large</ContainedButton>
 * <ContainedButton $forcedState="hover">Forced Hover</ContainedButton>
 */

import { forwardRef } from 'react';
import { Typography } from '@mui/material';
import { Button } from './Button.styled.js';

const ContainedButton = forwardRef(({ size = 'medium', children, ...props }, ref) => (
  <Button ref={ref} variant="contained" size={size} {...props}>
    <Typography component="span">
      {children}
    </Typography>
  </Button>
));
ContainedButton.displayName = 'ContainedButton';

export { ContainedButton };
export default ContainedButton;
