/**
 * Styled Button Components
 *
 * Provides styled MUI Button variants with a transient `$shape` prop
 * for controlling border-radius. Custom props prefixed with `$` are
 * NOT forwarded to the DOM (prevents "Invalid attribute" warnings).
 *
 * IMPORTANT:
 * - Use `styled` from '@mui/material/styles', NOT '@emotion/styled'
 * - Always prefix custom props with `$` (e.g., `$shape`)
 * - Import these styled buttons instead of MUI's default `<Button>`
 *
 * @module theme/components/styled-components/Button.styled
 *
 * @example
 * import { ContainedButton, OutlinedButton, Button } from '...Button.styled';
 *
 * <ContainedButton>Round Contained</ContainedButton>
 * <ContainedButton $shape="square">Square Contained</ContainedButton>
 * <OutlinedButton>Round Outlined</OutlinedButton>
 * <Button variant="text" $shape="round">Round Text</Button>
 */

import { forwardRef } from 'react';
import { styled } from '@mui/material/styles';
import { Button as MuiButton } from '@mui/material';
import { borderRadius } from '../../tokens/borderRadius';

// ---------------------------------------------------------------------------
// Transient prop filter
// Props prefixed with '$' are consumed by styled() and NOT passed to the DOM.
// ---------------------------------------------------------------------------
const shouldForwardProp = (prop) => {
  if (!prop || typeof prop !== 'string') return false;
  return !prop.trim().startsWith('$');
};

// ---------------------------------------------------------------------------
// Shape styles
// ---------------------------------------------------------------------------
const shapeStyles = {
  round: { borderRadius: borderRadius[9] },
  square: { borderRadius: borderRadius[2]},
};

/** Style function shared by all button variants */
const withShape = ({ $shape = 'round' }) => shapeStyles[$shape] || {};

// ---------------------------------------------------------------------------
// Base Button — no default variant, caller decides
// ---------------------------------------------------------------------------
export const Button = styled(MuiButton, { shouldForwardProp })(withShape);

// ---------------------------------------------------------------------------
// Contained Button — always renders as variant="contained", $shape="round"
// Note: React 19 removed defaultProps for function components, so we use
// forwardRef wrappers instead.
// ---------------------------------------------------------------------------
export const ContainedButton = forwardRef((props, ref) => (
  <Button ref={ref} variant="contained" {...props} />
));
ContainedButton.displayName = 'ContainedButton';

// ---------------------------------------------------------------------------
// Outlined Button — always renders as variant="outlined", $shape="round"
// ---------------------------------------------------------------------------
export const OutlinedButton = forwardRef((props, ref) => (
  <Button ref={ref} variant="outlined" {...props} />
));
OutlinedButton.displayName = 'OutlinedButton';

export default Button;
