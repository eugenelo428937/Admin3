// src/services/authService.js
import httpService from "./httpService";
import config from "../config";

const API_AUTH_URL = config.authUrl;  
const API_USER_URL = config.userUrl;  

const authService = {
	login: async (credentials) => {
		try {
			
			// First, get CSRF token if needed

			await httpService.get(`${API_AUTH_URL}/csrf/`);

			const response = await httpService.post(`${API_AUTH_URL}/login/`, credentials);

			if (response.data.user) {
				localStorage.setItem("token", response.data.token);
				localStorage.setItem("refreshToken", response.data.refresh);
				localStorage.setItem("user", JSON.stringify(response.data.user));
				localStorage.setItem("isAuthenticated", "true");
			}

			return response.data.user;
		} catch (error) {
			throw error.response?.data || error;
		}
	},
	register: async (userData) => {
		try {
			const response = await httpService.post(`${API_AUTH_URL}/register/`, userData);

			if (response.data.status === "success") {
				localStorage.setItem("token", response.data.token);
				localStorage.setItem("refreshToken", response.data.refresh);
				localStorage.setItem("user", JSON.stringify(response.data.user));
				localStorage.setItem("isAuthenticated", "true");
			}

			return response.data;
		} catch (error) {
			throw error.response?.data || error;
		}
	},
	logout: async () => {
		localStorage.removeItem("token");
		localStorage.removeItem("refreshToken");
		localStorage.removeItem("user");
		localStorage.removeItem("isAuthenticated");
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
			const response = await httpService.get(`${API_USER_URL}/`);
			return response.data.user;
		} catch (error) {
			throw error;
		}
	},
};

export default authService;
