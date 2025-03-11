// src/services/examSessionService.js
import httpServiceProvider from "./httpService";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8888/exam_sessions";

const examSessionService = {
    getAll: async () => {
			const response = await httpServiceProvider.get(`${API_URL}/exam-sessions/`);
			return response.data.results || response.data; // Return results array if paginated, otherwise the whole response
		},

    getById: async (id) => {
        const response = await httpServiceProvider.get(`${API_URL}/exam-sessions/${id}/`);
        return response.data;
    },

    create: async (examSession) => {
        const response = await httpServiceProvider.post(
            `${API_URL}/exam-sessions/`, 
            examSession
        );
        return response.data;
    },

    update: async (id, examSession) => {
        const response = await httpServiceProvider.put(
            `${API_URL}/exam-sessions/${id}/`, 
            examSession
        );
        return response.data;
    },

    delete: async (id) => {
        await httpServiceProvider.delete(`${API_URL}/exam-sessions/${id}/`);
    }
};

export default examSessionService;
