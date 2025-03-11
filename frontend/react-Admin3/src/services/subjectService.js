// src/services/subjectService.js
import httpServiceProvider from "./httpService";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8888/subjects";

const subjectService = {
	getAll: async () => {
		try {
			const response = await httpServiceProvider.get(`${API_URL}/`);
			// Ensure we're returning an array
			if (!response.data) return [];
			return Array.isArray(response.data) ? response.data : response.data.results || Object.values(response.data) || [];
		} catch (error) {
			console.error("Error fetching subjects:", error);
			return []; // Return empty array on error
		}
	},

	getById: async (id) => {
		const response = await httpServiceProvider.get(`${API_URL}/${id}/`);
		return response.data;
	},

	create: async (subject) => {
		const response = await httpServiceProvider.post(`${API_URL}/`, subject);
		return response.data;
	},

	update: async (id, subject) => {
		const response = await httpServiceProvider.put(`${API_URL}/${id}/`, subject);
		return response.data;
	},

	delete: async (id) => {
		await httpServiceProvider.delete(`${API_URL}/${id}/`);
	},

	// Add the new bulk import function
	bulkImport: async (subjects) => {
		const response = await httpServiceProvider.post(`${API_URL}/bulk-import/`, { subjects });
		return response.data;
	},
};

export default subjectService;
