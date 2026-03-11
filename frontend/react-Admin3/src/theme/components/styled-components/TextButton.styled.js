import { Typography } from '@mui/material';
import { Button } from './Button.styled.js';

const TextButton = ({ size = 'medium', children, ...props }) => (
  <Button variant="text" size={size} {...props} disableFocusRipple={true}>
    <Typography component="span">
      {children}
    </Typography>
  </Button>
);

export { TextButton };
export default TextButton;
