// src/services/authService.js
import httpServiceProvider from "./httpService";
const API_URL = "http://localhost:8888/students";

const authService = {
	
	login: async (credentials) => {
		try {			
			const response = await httpServiceProvider.post(`${API_URL}/login/`, credentials);

			if (response.data.user) {
				if (response.data.token) {
					localStorage.setItem("token", response.data.token);
				}
				localStorage.setItem("isAuthenticated", "true");
				localStorage.setItem("user", JSON.stringify(response.data.user));
			}
			
			return response.data.user;
		} catch (error) {
			throw error.response?.data || error;
		}
	},
	register: async (userData) => {
		try {		
			const response = await httpServiceProvider.post(`${API_URL}/register/`, {
				username: userData.username,
				password: userData.password,
				email: userData.email,
				first_name: userData.first_name,
				last_name: userData.last_name,
			});

			if (response.data.status === "success") {
				localStorage.setItem("user", JSON.stringify(response.data.user));
				localStorage.setItem("isAuthenticated", "true");
				if (response.data.token) {
					localStorage.setItem("token", response.data.token);
				}
			}

			return response.data;
		} catch (error) {
			throw error.response?.data || error;
		}
	},
	logout: async () => {
		try {
			await httpServiceProvider.post(`${API_URL}/logout/`);
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			localStorage.removeItem("token");
			localStorage.removeItem("user");
			localStorage.removeItem("isAuthenticated");
		}
	},

	getCurrentUser: () => {
		const userData = localStorage.getItem("user");
		return userData ? JSON.parse(userData) : null;
	},

	isAuthenticated: () => {
		return localStorage.getItem("isAuthenticated") === "true";
	},
	getUserDetails: async () => {
		try {
			const response = await httpServiceProvider.get(`${API_URL}/session/`);
			return response.data.user;
		} catch (error) {
			throw error;
		}
	},
};

export default authService;
