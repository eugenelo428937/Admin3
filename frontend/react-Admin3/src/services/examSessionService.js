// src/services/examSessionService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8888/exam_sessions";

const examSessionService = {
    getAll: async () => {
        const response = await axios.get(`${API_URL}/exam-sessions/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    },

    getById: async (id) => {
        const response = await axios.get(`${API_URL}/exam-sessions/${id}/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    },

    create: async (examSession) => {
        const response = await axios.post(`${API_URL}/exam-sessions/`, examSession, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    },

    update: async (id, examSession) => {
        const response = await axios.put(`${API_URL}/exam-sessions/${id}/`, examSession, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    },

    delete: async (id) => {
        await axios.delete(`${API_URL}/exam-sessions/${id}/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    }
};

export default examSessionService;
