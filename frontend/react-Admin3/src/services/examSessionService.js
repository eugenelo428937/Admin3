// src/services/examSessionService.js
import httpServiceProvider from "./httpService";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8888/exam_sessions";

const examSessionService = {
	getCsrfToken: async () => {
		try {
			const response = await httpServiceProvider.get("/csrf/", {
				withCredentials: true,
			});
			return response.data;
		} catch (error) {
			console.error("Error fetching CSRF token:", error);
			throw error;
		}
	},
	getAll: async () => {
        await examSessionService.getCsrfToken();
		const token = localStorage.getItem("token");
		console.log("Token:", token); // Debug line
		const response = await httpServiceProvider.get(`${API_URL}/exam-sessions/`, {
			headers: {
				Authorization: token ? `Bearer ${localStorage.getItem("token")}` : "",
			},
		});
		return response.data;
	},

	getById: async (id) => {
        await examSessionService.getCsrfToken();
		const token = localStorage.getItem("token");
		const response = await httpServiceProvider.get(`${API_URL}/exam-sessions/${id}/`, {
			headers: {
				Authorization: token ? `Bearer ${localStorage.getItem("token")}` : "",
			},
		});
		return response.data;
	},

	create: async (examSession) => {
        await examSessionService.getCsrfToken();
		const token = localStorage.getItem("token");
		const response = await httpServiceProvider.post(`${API_URL}/exam-sessions/`, examSession, {
			headers: {
				Authorization: token ? `Bearer ${localStorage.getItem("token")}` : "",
				"Content-Type": "application/json",
			},
		});
		return response.data;
	},

	update: async (id, examSession) => {
        await examSessionService.getCsrfToken();
		const token = localStorage.getItem("token");
		const response = await httpServiceProvider.put(`${API_URL}/exam-sessions/${id}/`, examSession, {
			headers: {
				Authorization: token ? `Bearer ${localStorage.getItem("token")}` : "",
				"Content-Type": "application/json",
			},
		});
		return response.data;
	},

	delete: async (id) => {
        await examSessionService.getCsrfToken();
		const token = localStorage.getItem("token");
		await httpServiceProvider.delete(`${API_URL}/exam-sessions/${id}/`, {
			headers: {
				Authorization: token ? `Bearer ${localStorage.getItem("token")}` : "",
			},
		});
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


export default examSessionService;
