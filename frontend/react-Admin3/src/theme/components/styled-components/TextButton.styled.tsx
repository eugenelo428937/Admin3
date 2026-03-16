import React from 'react';
import { Typography } from '@mui/material';
import { Button } from './Button.styled';

interface TextButtonProps {
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  [key: string]: any;
}

const TextButton: React.FC<TextButtonProps> = ({ size = 'medium', children, ...props }) => (
  <Button variant="text" size={size} {...props} disableFocusRipple={true}>
    <Typography component="span">
      {children}
    </Typography>
  </Button>
);

export { TextButton };
export default TextButton;
