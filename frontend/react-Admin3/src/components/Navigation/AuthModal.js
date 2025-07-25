import React, { useState } from 'react';
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
import LoginForm from '../../LoginForm';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AuthModal = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (loginError) {
      setLoginError('');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    try {
      // Login logic is handled by the LoginForm component
      // This is just a wrapper to maintain consistency with the original navbar
    } catch (error) {
      setLoginError('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchToRegister = () => {
    // Navigate to registration page
    window.location.href = '/register';
    onClose();
  };

  const handleClose = () => {
    // Clear form data when closing
    setFormData({ email: '', password: '' });
    setLoginError('');
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          position: 'relative'
        }
      }}
    >
      {/* Close Button */}
      <Box sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}>
        <IconButton 
          onClick={handleClose} 
          size="small"
          sx={{ 
            backgroundColor: 'background.paper',
            boxShadow: 1,
            '&:hover': {
              backgroundColor: 'grey.100'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <LoginForm
          show={open}
          onHide={handleClose}
          formData={formData}
          handleInputChange={handleInputChange}
          handleLogin={handleLogin}
          loginError={loginError}
          isLoading={isLoading}
          switchToRegister={switchToRegister}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;