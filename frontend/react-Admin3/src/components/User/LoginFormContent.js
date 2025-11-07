import React from "react";
import { 
  Box, 
  TextField, 
  Button, 
  Alert, 
  Typography, 
  Link,
  Stack,
  Divider
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

const LoginFormContent = ({
  onHide,
  formData,
  handleInputChange,
  handleLogin,
  loginError,
  isLoading,
  switchToRegister,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  return (
		<Box sx={{ p: 3 }}>
			<Typography variant="h4" gutterBottom align="center">
				Login
			</Typography>

			{loginError && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{loginError}
				</Alert>
			)}

			<Box component="form" onSubmit={handleLogin} noValidate>
				<TextField
					fullWidth
					margin="normal"
					label="Email"
					name="email"
					type="email"
					value={formData.email}
					onChange={handleInputChange}
					required
					autoComplete="email"
					autoFocus
					variant="standard"
					disabled={isLoading}
				/>

				<TextField
					fullWidth
					margin="normal"
					label="Password"
					name="password"
					type="password"
					value={formData.password}
					onChange={handleInputChange}
					required
					autoComplete="current-password"
					variant="standard"
					disabled={isLoading}
          sx={{
            mb: 0,
          }}
				/>
				<Link
					component="button"
					variant="subtitle2"
					onClick={(e) => {
						e.preventDefault();
						onHide();
						navigate("/auth/forgot-password");
					}}>
					Forgot Password?
				</Link>
				<Stack
					spacing={1}
					alignItems="center"
					direction="row"
					justifyContent="space-between"
          sx={{
            mt: theme.liftkit.spacing.md,            
          }}>
					<Button
						variant="contained"
						onClick={() => {
							onHide();
							navigate("/register");
						}}
						sx={{
							px: theme.liftkit.spacing.md,
							py: theme.liftkit.spacing.xs2,
							width: "auto",
							backgroundColor: theme.palette.secondary.main,
						}}>
						Create account
					</Button>
					<Button
						type="submit"
						variant="contained"
						disabled={isLoading}
						sx={{
							px: theme.liftkit.spacing.md,
							py: theme.liftkit.spacing.xs2,
							width: "auto",
						}}>
						{isLoading ? "Logging in..." : "Login"}
					</Button>

					
				</Stack>
			</Box>
		</Box>
  );
};

export default LoginFormContent;