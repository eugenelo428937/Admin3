// src/services/authService.js
import httpService from "./httpService";
import config from "../config";
import logger from "./loggerService";

const API_AUTH_URL = config.authUrl;
const API_USER_URL = config.userUrl;

const authService = {
	login: async (credentials) => {
		logger.debug("Attempting login", { email: credentials.email });

		try {
			// Clear any existing auth data before attempting login
			localStorage.removeItem("token");
			localStorage.removeItem("refreshToken");
			localStorage.removeItem("user");
			localStorage.removeItem("isAuthenticated");

			// First, get CSRF token if needed
			await httpService.get(`${API_AUTH_URL}csrf/`);

			const response = await httpService.post(`${API_AUTH_URL}login/`, credentials);
			logger.debug("Login response received", response.data);

			if (response.status === 200 && response.data && response.data.token && response.data.user) {
				// Store tokens
				localStorage.setItem("token", response.data.token);
				localStorage.setItem("refreshToken", response.data.refresh);
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
			// Clear any existing auth data before attempting login
			localStorage.removeItem("token");
			localStorage.removeItem("refreshToken");
			localStorage.removeItem("user");
			localStorage.removeItem("isAuthenticated");
			
			logger.error("Login failed", {
				error: error.response?.data || error,
				status: error.response?.status,
				url: `${API_AUTH_URL}login/`,
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
			const response = await httpService.post(`${API_AUTH_URL}register/`, {
				username: userData.email,
				password: userData.password,
				email: userData.email,
				first_name: userData.first_name,
				last_name: userData.last_name,
			});

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
				await httpService.post(`${API_AUTH_URL}logout/`);
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
			const response = await httpService.post(`${API_AUTH_URL}refresh/`, {
				refresh: refreshToken,
			});

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
			const response = await httpService.get(`${API_USER_URL}`);
			return response.data.user;
		} catch (error) {
			throw error;
		}
	},
};

export default authService;
