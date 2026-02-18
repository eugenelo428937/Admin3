import { styled } from '@mui/material/styles';
import { Button, Typography } from '@mui/material';
import { fontSizes } from '../../tokens/typography';

const SIZE_FONT_MAP = {
  small: fontSizes.body.small,
  medium: fontSizes.body.large,
  large: fontSizes.heading[80],
};

const StyledButton = styled(Button)({});

const ButtonText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'buttonSize',
})(({ buttonSize }) => ({
  fontSize: SIZE_FONT_MAP[buttonSize] || SIZE_FONT_MAP.medium,
}));

const TextButton = ({ size = 'medium', children, ...props }) => (
  <StyledButton size={size} {...props}>
    <ButtonText component="span" buttonSize={size}>
      {children}
    </ButtonText>
  </StyledButton>
);

export { TextButton, ButtonText, SIZE_FONT_MAP };
export default TextButton;
