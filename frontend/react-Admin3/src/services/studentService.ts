import config from "../config";
import httpService from "./httpService";
import { parsePaginatedResponse } from "./paginationHelper";

const API_URL = `${config.apiBaseUrl}/api/students/admin-students`;

export interface StudentListItem {
    student_ref: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    student_type: string;
}

export interface StudentSearchParams {
    page?: number;
    page_size?: number;
    search?: string;
    ref?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
}

const studentService = {
    list: async (params: StudentSearchParams = {}): Promise<{ results: StudentListItem[]; count: number }> => {
        // Strip empty string params so they don't get sent as query params
        const cleanParams: Record<string, any> = {};
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== '') {
                cleanParams[key] = value;
            }
        }
        const response = await httpService.get(`${API_URL}/`, { params: cleanParams });
        return parsePaginatedResponse<StudentListItem>(response.data);
    },
};

export default studentService;
