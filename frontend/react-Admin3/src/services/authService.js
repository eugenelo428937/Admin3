// src/services/authService.js
import axios from 'axios';

const API_URL = 'http://localhost:8888/students';

const authService = {
	getCsrfToken: async () => {
	try {
		await fetch(`${API_URL}/csrf/`, {
			credentials: "include",
		});
	} catch (error) {
		console.error("Error fetching CSRF token:", error);
	}
	},
		login: async (credentials) => {
		try {
			await authService.getCsrfToken();

			const response = await fetch(`${API_URL}/login/`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRFToken": getCookie("csrftoken"),
				},
				body: JSON.stringify(credentials),
				credentials: "include",
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Login failed");
			}

			if (data.token) {
				localStorage.setItem("token", data.token);
				localStorage.setItem("isAuthenticated", "true");
				localStorage.setItem("user", JSON.stringify(data.user));
			}

			return data;
		} catch (error) {
			throw error;
		}
	},

	register: async (userData) => {
		try {
			const response = await axios.post(`${API_URL}/register`, userData);

			if (response.data && response.data.token) {
				localStorage.setItem("token", response.data.token);
				localStorage.setItem("isAuthenticated", "true");
				localStorage.setItem("user", JSON.stringify(response.data.user));
			}

			return response.data;
		} catch (error) {
			throw error;
		}
	},

	logout: async () => {
		try {
			const token = localStorage.getItem("token");
			if (token) {
				await axios.post(
					`${API_URL}/logout`,
					{},
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					}
				);
			}
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
			const response = await axios.get(`${API_URL}/session`, {
				credentials: "include",
				headers: {
					"X-CSRFToken": getCookie("csrftoken"),
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			return await response.json();
		} catch (error) {
			throw error;
		}
	},
};
// Helper function to get cookie value
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
export default authService;
