import httpService from "./httpService";
import config from "../config";
const API_URL = config.examSessionUrl;

const examSessionService = {
    getAll: async () => {
        const response = await httpService.get(`${API_URL}`);
        return response.data;
    },

    getById: async (id) => {
        const response = await httpService.get(`${API_URL}${id}/`);
        return response.data;
    },

    create: async (examSession) => {
        const response = await httpService.post(
            `${API_URL}`, 
            examSession
        );
        return response.data;
    },

    update: async (id, examSession) => {
        const response = await httpService.put(
            `${API_URL}${id}/`, 
            examSession
        );
        return response.data;
    },

    delete: async (id) => {
        await httpService.delete(`${API_URL}${id}/`);
    }
};

export default examSessionService;
