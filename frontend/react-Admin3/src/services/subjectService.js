// src/services/subjectService.js
import httpServiceProvider from "./httpService";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8888/subjects";

const subjectService = {
    getAll: async () => {
        const response = await httpServiceProvider.get(`${API_URL}/subjects/`);
        return response.data;
    },

    getById: async (id) => {
        const response = await httpServiceProvider.get(`${API_URL}/subjects/${id}/`);
        return response.data;
    },

    create: async (subject) => {
        const response = await httpServiceProvider.post(
            `${API_URL}/subjects/`, 
            subject
        );
        return response.data;
    },

    update: async (id, subject) => {
        const response = await httpServiceProvider.put(
            `${API_URL}/subjects/${id}/`, 
            subject
        );
        return response.data;
    },

    delete: async (id) => {
        await httpServiceProvider.delete(`${API_URL}/subjects/${id}/`);
    }
};

export default subjectService;
