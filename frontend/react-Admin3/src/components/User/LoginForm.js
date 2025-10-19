import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Alert,
  Box,
  FormControl,
  FormLabel,
  IconButton
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const LoginForm = ({
  show,
  onHide,
  formData,
  handleInputChange,
  handleLogin,
  loginError,
  isLoading,
  switchToRegister,
}) => {
  const navigate = useNavigate();

  return (
    <Dialog open={show} onClose={onHide} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Login
        <IconButton onClick={onHide} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loginError && <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>}
        <Box component="form" onSubmit={handleLogin} noValidate>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <FormLabel>Email</FormLabel>
            <TextField
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              fullWidth
            />
          </FormControl>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <FormLabel>Password</FormLabel>
            <TextField
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              fullWidth
            />
          </FormControl>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Button variant="contained" type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            <Button variant="text" type="button" onClick={() => { onHide(); navigate('/register'); }}>
              Need an account? Register
            </Button>
            <Button variant="text" type="button" onClick={() => { onHide(); navigate('/register2'); }}>
              Need an account? Register2
            </Button>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="text"
              size="small"
              onClick={() => { onHide(); navigate('/auth/forgot-password'); }}
            >
              Forgot Password?
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LoginForm;
