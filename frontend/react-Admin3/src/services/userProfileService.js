import httpService from "./httpService";
import config from "../config";
import { parsePaginatedResponse } from "./paginationHelper";

const API_URL = `${config.userUrl}/profiles`;

const userProfileService = {
    list: async (params = {}) => {
        const response = await httpService.get(`${API_URL}/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getAll: async () => {
        try {
            const response = await httpService.get(`${API_URL}/`);
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching user profiles:", error);
            return [];
        }
    },

    getById: async (id) => {
        const response = await httpService.get(`${API_URL}/${id}/`);
        return response.data;
    },

    update: async (id, data) => {
        const response = await httpService.put(`${API_URL}/${id}/`, data);
        return response.data;
    },

    getAddresses: async (id) => {
        try {
            const response = await httpService.get(`${API_URL}/${id}/addresses/`);
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching addresses:", error);
            return [];
        }
    },

    updateAddress: async (profileId, addressId, data) => {
        const response = await httpService.put(
            `${API_URL}/${profileId}/addresses/${addressId}/`, data
        );
        return response.data;
    },

    getContacts: async (id) => {
        try {
            const response = await httpService.get(`${API_URL}/${id}/contacts/`);
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching contacts:", error);
            return [];
        }
    },

    updateContact: async (profileId, contactId, data) => {
        const response = await httpService.put(
            `${API_URL}/${profileId}/contacts/${contactId}/`, data
        );
        return response.data;
    },

    getEmails: async (id) => {
        try {
            const response = await httpService.get(`${API_URL}/${id}/emails/`);
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching emails:", error);
            return [];
        }
    },

    updateEmail: async (profileId, emailId, data) => {
        const response = await httpService.put(
            `${API_URL}/${profileId}/emails/${emailId}/`, data
        );
        return response.data;
    },
};

export default userProfileService;
