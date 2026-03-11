import httpService from "./httpService.js";
import config from "../config.js";
import { parsePaginatedResponse } from "./paginationHelper.js";
// Use catalog API endpoint (legacy /api/exam-sessions/ was removed during catalog consolidation)
const API_URL = `${config.catalogUrl}/exam-sessions`;
const examSessionService = {
	getAll: async () => {
		try {
			const response = await httpService.get(`${API_URL}/`);

			// Ensure we're returning an array
			if (!response.data) return [];
			return Array.isArray(response.data) ? response.data : response.data.results || Object.values(response.data) || [];
		} catch (error) {
			console.error("Error fetching Exam Sessions:", error);
			return [];
		}
	},

	list: async (params = {}) => {
		const response = await httpService.get(`${API_URL}/`, { params });
		return parsePaginatedResponse(response.data);
	},

	getById: async (id) => {
		const response = await httpService.get(`${API_URL}/${id}/`);
		return response.data;
	},

	create: async (examSession) => {
		const response = await httpService.post(`${API_URL}/`, examSession);
		return response.data;
	},

	update: async (id, examSession) => {
		const response = await httpService.put(`${API_URL}/${id}/`, examSession);
		return response.data;
	},

	delete: async (id) => {
		await httpService.delete(`${API_URL}/${id}/`);
	},
};

export default examSessionService;
