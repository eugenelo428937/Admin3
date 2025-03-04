// src/services/authService.js
import axios from "axios";

const API_URL = "http://localhost:8888/students";

// Create axios instance with default config
const axiosInstance = axios.create({
	baseURL: API_URL,
	withCredentials: true, // Important for CORS with credentials
	headers: {
		"Content-Type": "application/json",
	},
});

// Add request interceptor to include CSRF token
axiosInstance.interceptors.request.use(
	(config) => {
		const csrfToken = getCookie("csrftoken");
		const token = localStorage.getItem("token");
		if (csrfToken) {
			config.headers["X-CSRFToken"] = csrfToken;
		}
		// Add Authorization header if token exists
		if (token) {
			config.headers["Authorization"] = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

const authService = {
	getCsrfToken: async () => {
		try {
			const response = await axiosInstance.get("/csrf/", {
				withCredentials: true,
			});
			return response.data;
		} catch (error) {
			console.error("Error fetching CSRF token:", error);
			throw error;
		}
	},

	login: async (credentials) => {
		try {
			await authService.getCsrfToken();
			const response = await axiosInstance.post("/login/", credentials);

			if (response.data.user) {
				if (response.data.token) {
					localStorage.setItem("token", response.data.token);
				}
				localStorage.setItem("isAuthenticated", "true");
				localStorage.setItem("user", JSON.stringify(response.data.user));
			}

			return response.data;
		} catch (error) {
			throw error.response?.data || error;
		}
	},
	register: async (userData) => {
		try {
			// Get CSRF token first
			await authService.getCsrfToken();

			const response = await axiosInstance.post("/register/", userData);

			if (response.data.user) {
				localStorage.setItem("isAuthenticated", "true");
				localStorage.setItem("user", JSON.stringify(response.data.user));
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
			await axiosInstance.post("/logout/");
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			localStorage.removeItem("token");
			localStorage.removeItem("user");
			localStorage.removeItem("isAuthenticated");
		}
	},

	getCurrentUser: () => {
		const user = localStorage.getItem("user");				
		return user ? JSON.parse(user) : null;
	},

	isAuthenticated: () => {
		return localStorage.getItem("isAuthenticated") === "true";
	},
	getUserDetails: async () => {
		try {
			await authService.getCsrfToken();
			const response = await axiosInstance.get("/session/");
			return response.data;
		} catch (error) {
			throw error;
		}
	},
};
// Helper function to get cookie value
function getCookie(name) {
	let cookieValue = null;
	if (document.cookie && document.cookie !== "") {
		const cookies = document.cookie.split(";");
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.substring(0, name.length + 1) === name + "=") {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
				break;
			}
		}
	}
	return cookieValue;
}
export default authService;
