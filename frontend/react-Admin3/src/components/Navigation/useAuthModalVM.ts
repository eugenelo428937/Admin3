import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth.tsx';
import { useNavigate } from 'react-router-dom';
import React from 'react';

export interface AuthModalVM {
  formData: { email: string; password: string };
  loginError: string;
  isLoading: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  handleClose: () => void;
  switchToRegister: () => void;
}

const useAuthModalVM = (open: boolean, onClose: () => void): AuthModalVM => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<{ email: string; password: string }>({
    email: '',
    password: ''
  });
  const [loginError, setLoginError] = useState<string>('');

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

  const handleClose = useCallback(() => {
    setFormData({ email: '', password: '' });
    setLoginError('');
    onClose();
  }, [onClose]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const result = await login(formData);
      if (result.status === 'error') {
        setLoginError(result.message);
      } else {
        handleClose();
      }
    } catch (error: any) {
      setLoginError(error.message || 'Login failed');
    }
  }, [formData, login, handleClose]);

  const switchToRegister = useCallback(() => {
    handleClose();
    navigate('/register');
  }, [handleClose, navigate]);

  return {
    formData,
    loginError,
    isLoading,
    handleInputChange,
    handleLogin,
    handleClose,
    switchToRegister,
  };
};

export default useAuthModalVM;
