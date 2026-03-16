// src/services/userProfileService.ts
import httpService from "./httpService.js";
import config from "../config.js";
import { parsePaginatedResponse } from "./paginationHelper.js";
import type { UserProfile, Address, ContactNumber } from "../types/auth";

const API_URL = `${(config as any).userUrl}/profiles`;

const userProfileService = {
  // ─── List (paginated) ──────────────────────────────────────────
  list: async (params: Record<string, any> = {}) => {
    const response = await httpService.get(`${API_URL}/`, { params });
    return parsePaginatedResponse(response.data);
  },

  // ─── Get All ───────────────────────────────────────────────────
  getAll: async (): Promise<UserProfile[]> => {
    try {
      const response = await httpService.get(`${API_URL}/`);
      if (!response.data) return [];
      return Array.isArray(response.data)
        ? response.data
        : response.data.results || Object.values(response.data) || [];
    } catch (error) {
      console.error("Error fetching user profiles:", error);
      return [];
    }
  },

  // ─── Get by ID ─────────────────────────────────────────────────
  getById: async (id: number | string): Promise<UserProfile> => {
    const response = await httpService.get(`${API_URL}/${id}/`);
    return response.data;
  },

  // ─── Update ────────────────────────────────────────────────────
  update: async (
    id: number | string,
    data: Partial<UserProfile>,
  ): Promise<UserProfile> => {
    const response = await httpService.put(`${API_URL}/${id}/`, data);
    return response.data;
  },

  // ─── Get Addresses ─────────────────────────────────────────────
  getAddresses: async (id: number | string): Promise<Address[]> => {
    try {
      const response = await httpService.get(
        `${API_URL}/${id}/addresses/`,
      );
      if (!response.data) return [];
      return Array.isArray(response.data)
        ? response.data
        : response.data.results || Object.values(response.data) || [];
    } catch (error) {
      console.error("Error fetching addresses:", error);
      return [];
    }
  },

  // ─── Update Address ────────────────────────────────────────────
  updateAddress: async (
    profileId: number | string,
    addressId: number | string,
    data: Partial<Address>,
  ): Promise<Address> => {
    const response = await httpService.put(
      `${API_URL}/${profileId}/addresses/${addressId}/`,
      data,
    );
    return response.data;
  },

  // ─── Get Contacts ──────────────────────────────────────────────
  getContacts: async (
    id: number | string,
  ): Promise<ContactNumber[]> => {
    try {
      const response = await httpService.get(
        `${API_URL}/${id}/contacts/`,
      );
      if (!response.data) return [];
      return Array.isArray(response.data)
        ? response.data
        : response.data.results || Object.values(response.data) || [];
    } catch (error) {
      console.error("Error fetching contacts:", error);
      return [];
    }
  },

  // ─── Update Contact ────────────────────────────────────────────
  updateContact: async (
    profileId: number | string,
    contactId: number | string,
    data: Partial<ContactNumber>,
  ): Promise<ContactNumber> => {
    const response = await httpService.put(
      `${API_URL}/${profileId}/contacts/${contactId}/`,
      data,
    );
    return response.data;
  },

  // ─── Get Emails ────────────────────────────────────────────────
  getEmails: async (id: number | string): Promise<any[]> => {
    try {
      const response = await httpService.get(
        `${API_URL}/${id}/emails/`,
      );
      if (!response.data) return [];
      return Array.isArray(response.data)
        ? response.data
        : response.data.results || Object.values(response.data) || [];
    } catch (error) {
      console.error("Error fetching emails:", error);
      return [];
    }
  },

  // ─── Update Email ──────────────────────────────────────────────
  updateEmail: async (
    profileId: number | string,
    emailId: number | string,
    data: Record<string, any>,
  ): Promise<any> => {
    const response = await httpService.put(
      `${API_URL}/${profileId}/emails/${emailId}/`,
      data,
    );
    return response.data;
  },
};

export default userProfileService;
