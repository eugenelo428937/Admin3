// src/services/authService.js
import httpService from "./httpService";
const API_URL = "http://localhost:8888/students";

const authService = {
	login: async (credentials) => {
		try {
			const response = await httpService.post(`${API_URL}/login/`, credentials);

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
			const response = await httpService.post(`${API_URL}/register/`, userData);

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
			const response = await httpService.post(`${API_URL}/refresh/`, {
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
			const response = await httpService.get(`${API_URL}/session/`);
			return response.data.user;
		} catch (error) {
			throw error;
		}
	},
};

export default authService;
