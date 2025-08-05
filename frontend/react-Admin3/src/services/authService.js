// src/services/authService.js
import httpService from "./httpService";
import config from "../config";
import logger from "./loggerService";

const API_AUTH_URL = config.authUrl;
const API_USER_URL = config.userUrl;

const authService = {
	login: async (credentials) => {
		logger.debug("Attempting login", { email: credentials.email });

		// Clear any existing auth data before attempting login
		localStorage.removeItem("token");
		localStorage.removeItem("refreshToken");
		localStorage.removeItem("user");
		localStorage.removeItem("isAuthenticated");

		try {
			// First, get CSRF token
			await httpService.get(`${API_AUTH_URL}/csrf/`);

			// Send login request with email as username
			const response = await httpService.post(`${API_AUTH_URL}/login/`, {
				username: credentials.email, // Use email as username
				password: credentials.password
			});
			
			logger.debug("Login response received", response.data);

			if (response.status === 200 && response.data && response.data.token && response.data.user) {
				// Store tokens
				localStorage.setItem("token", response.data.token);
				if (response.data.refresh) {
					localStorage.setItem("refreshToken", response.data.refresh);
				}
				logger.debug("Tokens stored in localStorage");

				// Store user data
				const userData = response.data.user;
				localStorage.setItem("user", JSON.stringify(userData));
				localStorage.setItem("isAuthenticated", "true");
				logger.info("Login successful", {
					userId: userData.id,
					status: response.status,
				});

				return {
					status: "success",
					user: userData,
					message: "Login successful",
				};
			}

			// If we reach here without returning, the response format was invalid
			return {
				status: "error",
				message: "Invalid response format from server",
				code: 500,
			};
		} catch (error) {
			// Clear any existing auth data on error
			localStorage.removeItem("token");
			localStorage.removeItem("refreshToken");
			localStorage.removeItem("user");
			localStorage.removeItem("isAuthenticated");

			logger.error("Login failed", {
				error: error.response?.data || error,
				status: error.response?.status,
				url: `${API_AUTH_URL}/login/`,
			});

			// Don't throw errors, return error objects instead
			if (error.response?.status === 401) {
				return {
					status: "error",
					message: "Invalid username or password",
					code: 401,
				};
			} else if (error.response?.status === 403) {
				return {
					status: "error",
					message: "Access forbidden",
					code: 403,
				};
			} else if (error.response?.data?.message) {
				return {
					status: "error",
					message: error.response.data.message,
					code: error.response?.status,
				};
			}

			return {
				status: "error",
				message: "Login failed. Please try again later.",
				code: error.response?.status || 500,
			};
		}
	},
	register: async (userData) => {
		try {
			// Defensive: ensure all fields exist to avoid undefined errors
			console.log("Registering user:", userData);
						
			const response = await httpService.post(
				`${API_AUTH_URL}/register/`,
				userData
			);

			if (response.status === 201 || response.status === 200) {
				if (response.data.user) {
					localStorage.setItem("user", JSON.stringify(response.data.user));
					localStorage.setItem("isAuthenticated", "true");
					if (response.data.token) {
						localStorage.setItem("token", response.data.token);
					}

					return {
						status: "success",
						user: response.data.user,
						message: "Registration successful",
					};
				}
			}

			throw new Error("Invalid registration response");
		} catch (error) {
			logger.error("Registration failed", {
				error: error.response?.data || error,
				status: error.response?.status,
			});

			return {
				status: "error",
				message: error.response?.data?.message || "Registration failed",
				code: error.response?.status || 500,
			};
		}
	},

	logout: async () => {
		try {
			// Attempt to call logout endpoint if it exists
			try {
				await httpService.post(`${API_AUTH_URL}/logout/`);
			} catch (error) {
				// Ignore logout endpoint errors
				logger.debug("Logout endpoint error", error);
			}

			// Always clear local storage
			localStorage.removeItem("token");
			localStorage.removeItem("refreshToken");
			localStorage.removeItem("user");
			localStorage.removeItem("isAuthenticated");

			return {
				status: "success",
				message: "Logged out successfully",
			};
		} catch (error) {
			// Even if there's an error, ensure localStorage is cleared
			localStorage.removeItem("token");
			localStorage.removeItem("refreshToken");
			localStorage.removeItem("user");
			localStorage.removeItem("isAuthenticated");

			return {
				status: "error",
				message: "Error during logout",
			};
		}
	},

	getCurrentUser: () => {
		const userData = localStorage.getItem("user");
		return userData ? JSON.parse(userData) : null;
	},

	isAuthenticated: () => {
		return localStorage.getItem("isAuthenticated") === "true" && localStorage.getItem("token") !== null;
	},
	refreshToken: async () => {
		try {
			const refreshToken = localStorage.getItem("refreshToken");
			const response = await httpService.post(`${API_AUTH_URL}/refresh/`, {
				refresh: refreshToken,
			});
			console.log(response.data.token);
			if (response.data.token) {
				localStorage.setItem("token", response.data.token);
			}

			return response.data;
		} catch (error) {
			throw error.response?.data || error;
		}
	},	
	getUserDetails: async () => {
		try {
			// Get the current user ID from localStorage
			const userData = localStorage.getItem("user");
			if (!userData) {
				throw new Error("No user data found");
			}

			const user = JSON.parse(userData);
			const userId = user.id;

			// Make request to get current user's details
			const response = await httpService.get(`${API_USER_URL}/${userId}/`);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	activateAccount: async (uid, token) => {
		try {
			logger.debug("Attempting account activation", { uid });

			// httpService now automatically skips auth headers for activation endpoints
			const response = await httpService.post(`${API_AUTH_URL}/activate/`, {
				uid: uid,
				token: token
			});

			logger.debug("Account activation response received", response.data);

			if (response.status === 200 && response.data) {
				logger.info("Account activation successful", { uid });
				
				// Handle both successful activation and already activated cases
				if (response.data.status === "success" || response.data.status === "info") {
					return {
						status: "success",
						message: response.data.message || "Account activated successfully"
					};
				}
			}

			return {
				status: "error",
				message: "Invalid response format from server"
			};
		} catch (error) {
			logger.error("Account activation failed", {
				error: error.response?.data || error,
				status: error.response?.status,
				uid: uid
			});

			if (error.response?.status === 400) {
				return {
					status: "error",
					message: error.response.data.error || "Invalid or expired activation link"
				};
			} else if (error.response?.data?.error) {
				return {
					status: "error",
					message: error.response.data.error
				};
			}

			return {
				status: "error",
				message: "Account activation failed. Please try again later."
			};
		}
	},

	resendActivationEmail: async (email) => {
		try {
			logger.debug("Attempting to resend activation email", { email });

			// httpService now automatically skips auth headers for activation endpoints
			const response = await httpService.post(`${API_AUTH_URL}/send_activation/`, {
				email: email
			});

			logger.debug("Resend activation response received", response.data);

			if (response.status === 200 && response.data) {
				logger.info("Activation email resent successfully", { email });
				return {
					status: "success",
					message: response.data.message || "Activation email sent successfully"
				};
			}

			return {
				status: "error",
				message: "Invalid response format from server"
			};
		} catch (error) {
			logger.error("Resend activation email failed", {
				error: error.response?.data || error,
				status: error.response?.status,
				email: email
			});

			if (error.response?.data?.error) {
				return {
					status: "error",
					message: error.response.data.error
				};
			}

			return {
				status: "error",
				message: "Failed to send activation email. Please try again later."
			};
		}
	},

	verifyEmailChange: async (verificationData) => {
		try {
			logger.debug("Attempting email change verification", { 
				uid: verificationData.uid,
				newEmail: verificationData.new_email 
			});

			// httpService now automatically skips auth headers for verification endpoints
			const response = await httpService.post(`${API_AUTH_URL}/verify_email/`, verificationData);

			logger.debug("Email verification response received", response.data);

			if (response.status === 200 && response.data) {
				logger.info("Email verification successful", { 
					newEmail: verificationData.new_email 
				});
				return {
					status: "success",
					message: response.data.message || "Email verified and updated successfully"
				};
			}

			return {
				status: "error",
				message: "Invalid response format from server"
			};
		} catch (error) {
			logger.error("Email verification failed", {
				error: error.response?.data || error,
				status: error.response?.status,
				newEmail: verificationData.new_email
			});

			if (error.response?.status === 400) {
				return {
					status: "error",
					message: error.response.data.error || "Invalid or expired verification link"
				};
			} else if (error.response?.data?.error) {
				return {
					status: "error",
					message: error.response.data.error
				};
			}

			return {
				status: "error",
				message: "Email verification failed. Please try again later."
			};
		}
	},
};

export default authService;
