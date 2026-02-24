import { Box, Typography } from '@mui/material';
import { Button } from './Button.styled';

const underlineThickness = { small: '1px', medium: '1.5px', large: '2px' };

// startIcon / endIcon are pulled out so they render inside the content span
// (which owns the underline) rather than as MUI's separate sibling spans.
const TextButton = ({ size = 'medium', startIcon, endIcon, children, ...props }) => (
  <Button variant="text" size={size} {...props} disableFocusRipple={true}>
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'end',
        gap: 0.5,
        borderBottomColor: `color-mix(in srgb, currentColor 38%, transparent)`,
        borderBottomWidth: `${underlineThickness[size] ?? '1.5px'}`,
        borderBlockEndStyle: "solid",
      }}
    >
      {startIcon}
      <Typography component="span">{children}</Typography>
      {endIcon}
    </Box>
  </Button>
);

export { TextButton };
export default TextButton;
