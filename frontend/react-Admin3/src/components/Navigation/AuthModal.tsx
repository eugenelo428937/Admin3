import React from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Slide
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import {
  Close as CloseIcon
} from '@mui/icons-material';
import LoginFormContent from '../User/LoginFormContent.tsx';
import useAuthModalVM from './useAuthModalVM.ts';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const {
    formData,
    loginError,
    isLoading,
    handleInputChange,
    handleLogin,
    handleClose,
    switchToRegister,
  } = useAuthModalVM(open, onClose);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      maxWidth="sm"
      fullWidth
      sx={{
        zIndex: 10500,
        '& .MuiBackdrop-root': {
          zIndex: 10499
        }
      }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'visible',
          zIndex: 10501,
          position: 'relative'
        }
      }}
      disablePortal={false}
      keepMounted={false}
    >
      <Box sx={{ position: 'relative' }}>
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 10502
          }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent sx={{ p: 0 }}>
          <LoginFormContent
            onHide={handleClose}
            formData={formData}
            handleInputChange={handleInputChange}
            handleLogin={handleLogin}
            loginError={loginError}
            isLoading={isLoading}
            switchToRegister={switchToRegister}
          />
        </DialogContent>
      </Box>
    </Dialog>
  );
};

export default AuthModal;
