// src/services/subjectService.js
import config from "../config";
import httpService from "./httpService";
const API_URL = config.subjectUrl;

const subjectService = {
	getAll: async () => {
		try {
			const response = await httpService.get(`${API_URL}/`);
			// Ensure we're returning an array
			if (!response.data) return [];
			return Array.isArray(response.data) ? response.data : response.data.results || Object.values(response.data) || [];
		} catch (error) {
			console.error("Error fetching subjects:", error);
			return []; // Return empty array on error
		}
	},
	getSubjects: async () => {
		const response = await httpService.get(`${API_URL}/`);
		return response.data.results;
	},
	getById: async (id) => {
		const response = await httpService.get(`${API_URL}/${id}/`);
		return response.data;
	},

	create: async (subject) => {
		const response = await httpService.post(`${API_URL}/`, subject);
		return response.data;
	},

	update: async (id, subject) => {
		const response = await httpService.put(`${API_URL}/${id}/`, subject);
		return response.data;
	},

	delete: async (id) => {
		await httpService.delete(`${API_URL}/${id}/`);
	},

	// Add the new bulk import function
	bulkImport: async (subjects) => {
		const response = await httpService.post(`${API_URL}/bulk-import/`, { subjects });
		return response.data;
	},
};

export default subjectService;
