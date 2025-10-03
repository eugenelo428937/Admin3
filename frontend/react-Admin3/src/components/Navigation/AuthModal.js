import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Slide
} from '@mui/material';
import {
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import LoginFormContent from '../User/LoginFormContent';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AuthModal = ({ open, onClose }) => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');

  // Ensure body overflow is properly restored when modal closes
  // Material-UI's ModalManager tracks overflow state, but rapid open/close can cause sync issues
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        const currentOverflow = document.body.style.overflow;
        if (currentOverflow === 'hidden') {
          // Restore using combined overflow property (more compatible with MUI's restoration)
          document.body.style.overflow = 'visible auto';
        }
        document.body.classList.remove('mui-fixed');
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const result = await login(formData);
      if (result.status === 'error') {
        setLoginError(result.message);
      } else {
        handleClose();
      }
    } catch (error) {
      setLoginError(error.message || 'Login failed');
    }
  };

  const handleClose = () => {
    setFormData({ email: '', password: '' });
    setLoginError('');
    onClose();
  };

  const switchToRegister = () => {
    handleClose();
    navigate('/register');
  };

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