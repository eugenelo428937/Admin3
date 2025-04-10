import httpService from "./httpService";
import config from "../config";
const API_URL = config.examSessionUrl;
console.log("API Base examSessionUrl:", API_URL);
const examSessionService = {
	getAll: async () => {
		try {			
			const response = await httpService.get(`${API_URL}/`);
			console.log(response.data)
			// Ensure we're returning an array
			if (!response.data) return [];
			return Array.isArray(response.data) ? response.data : response.data.results || Object.values(response.data) || [];
		} catch (error) {
			console.error("Error fetching Exam Sessions:", error);
			return [];
		}
	},

	getById: async (id) => {
		const response = await httpService.get(`${API_URL}/${id}/`);
		return response.data;
	},

	create: async (examSession) => {
		const response = await httpService.post(`${API_URL}/`, examSession);
		const response2 = await httpService.post(`${config.examSessionSubjectUrl}/insert-subjects/`, examSession);
		return response.data;
	},

	update: async (id, examSession) => {
		const response = await httpService.put(`${API_URL}/${id}/`, examSession);
		return response.data;
	},

	delete: async (id) => {
		await httpService.delete(`${API_URL}${id}/`);
	},
};

export default examSessionService;
