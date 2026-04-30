import config from "../config";
import httpService from "./httpService";
import { parsePaginatedResponse } from "./paginationHelper";

const API_URL = `${config.apiBaseUrl}/api/markings/admin-submission-list`;

export type MarkingSubmissionStatus =
    | 'new'
    | 'allocated'
    | 'marked'
    | 'feedback_received';

export interface MarkingSubmissionMarker {
    id: number;
    initial: string;
    legacy_id: number | null;
    name: string;
}

export interface MarkingSubmissionRow {
    id: number;
    student_ref: number;
    student_name: string;
    subject_code: string | null;
    product_code: string | null;
    paper_name: string;
    sequences: number | null;
    is_voucher: boolean;
    marker: MarkingSubmissionMarker | null;
    submission_date: string;
    allocate_date: string | null;
    graded_date: string | null;
    feedback_date: string | null;
    status: MarkingSubmissionStatus;
    status_label: string;
}

export interface MarkingSubmissionFilters {
    student_ref?: string;
    student_name?: string;
    subject?: string[];        // sent as repeated ?subject=CM2&subject=SA1
    product_code?: string;
    sequence?: string;
    marker?: string;           // marker id
    marker_legacy_id?: string;
    marker_name?: string;
    voucher?: boolean;
    submission_date_gte?: string;
    submission_date_lte?: string;
    allocate_date_gte?: string;
    allocate_date_lte?: string;
    graded_date_gte?: string;
    graded_date_lte?: string;
    feedback_date_gte?: string;
    feedback_date_lte?: string;
}

export interface MarkingSubmissionListParams extends MarkingSubmissionFilters {
    page?: number;
    page_size?: number;
}

export interface MarkingSubmissionFilterOptions {
    subjects: { code: string; description: string }[];
    markers: MarkingSubmissionMarker[];
    sequences: number[];
}

const buildQueryParams = (params: MarkingSubmissionListParams): Record<string, any> => {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        if (Array.isArray(value)) {
            if (value.length === 0) continue;
            out[key] = value;       // axios serialises arrays as repeated keys
        } else if (typeof value === 'boolean') {
            if (value) out[key] = '1';
        } else {
            out[key] = value;
        }
    }
    return out;
};

const adminMarkingSubmissionService = {
    list: async (
        params: MarkingSubmissionListParams = {},
    ): Promise<{ results: MarkingSubmissionRow[]; count: number }> => {
        const response = await httpService.get(`${API_URL}/`, {
            params: buildQueryParams(params),
            paramsSerializer: { indexes: null },
        });
        return parsePaginatedResponse<MarkingSubmissionRow>(response.data);
    },

    filterOptions: async (): Promise<MarkingSubmissionFilterOptions> => {
        const response = await httpService.get(`${API_URL}/filter-options/`);
        return response.data;
    },
};

export default adminMarkingSubmissionService;
