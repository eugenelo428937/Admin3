import httpService from "./httpService";
import config from "../config";
import { parsePaginatedResponse } from "./paginationHelper";
import type {
    EmailSettings,
    EmailTemplate,
    EmailAttachment,
    EmailTemplateAttachment,
    EmailQueue,
    EmailQueueDuplicateInput,
    EmailContentPlaceholder,
    EmailContentRule,
    EmailTemplateContentRule,
    MjmlPreviewResponse,
    MjmlShellResponse,
    ClosingSalutation,
    SignatureMjmlResponse,
    EmailMjmlElement,
} from "../types/email";

const BASE_URL = `${(config as any).emailUrl}`;

const emailService = {
    // ─── Settings ─────────────────────────────────────────────
    getSettings: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/settings/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getSettingById: async (id: number): Promise<EmailSettings> => {
        const response = await httpService.get(`${BASE_URL}/settings/${id}/`);
        return response.data;
    },

    createSetting: async (data: Partial<EmailSettings>): Promise<EmailSettings> => {
        const response = await httpService.post(`${BASE_URL}/settings/`, data);
        return response.data;
    },

    updateSetting: async (id: number, data: Partial<EmailSettings>): Promise<EmailSettings> => {
        const response = await httpService.put(`${BASE_URL}/settings/${id}/`, data);
        return response.data;
    },

    patchSetting: async (id: number, data: Partial<EmailSettings>): Promise<EmailSettings> => {
        const response = await httpService.patch(`${BASE_URL}/settings/${id}/`, data);
        return response.data;
    },

    deleteSetting: async (id: number): Promise<void> => {
        await httpService.delete(`${BASE_URL}/settings/${id}/`);
    },

    // ─── Templates ────────────────────────────────────────────
    getTemplates: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/templates/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getTemplateById: async (id: number): Promise<EmailTemplate> => {
        const response = await httpService.get(`${BASE_URL}/templates/${id}/`);
        return response.data;
    },

    createTemplate: async (data: Partial<EmailTemplate>): Promise<EmailTemplate> => {
        const response = await httpService.post(`${BASE_URL}/templates/`, data);
        return response.data;
    },

    updateTemplate: async (id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate> => {
        const response = await httpService.put(`${BASE_URL}/templates/${id}/`, data);
        return response.data;
    },

    patchTemplate: async (id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate> => {
        const response = await httpService.patch(`${BASE_URL}/templates/${id}/`, data);
        return response.data;
    },

    deleteTemplate: async (id: number): Promise<void> => {
        await httpService.delete(`${BASE_URL}/templates/${id}/`);
    },

    previewMjml: async (id: number, mjmlContent: string): Promise<MjmlPreviewResponse> => {
        const response = await httpService.post(`${BASE_URL}/templates/${id}/preview/`, {
            mjml_content: mjmlContent,
        });
        return response.data;
    },

    getMjmlShell: async (): Promise<MjmlShellResponse> => {
        const response = await httpService.get(`${BASE_URL}/templates/mjml-shell/`);
        return response.data;
    },

    // ─── Attachments ──────────────────────────────────────────
    getAttachments: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/attachments/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getAttachmentById: async (id: number): Promise<EmailAttachment> => {
        const response = await httpService.get(`${BASE_URL}/attachments/${id}/`);
        return response.data;
    },

    createAttachment: async (formData: FormData): Promise<EmailAttachment> => {
        const response = await httpService.post(`${BASE_URL}/attachments/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    updateAttachment: async (id: number, data: Partial<EmailAttachment> | FormData): Promise<EmailAttachment> => {
        const isFormData = data instanceof FormData;
        const response = await httpService.put(`${BASE_URL}/attachments/${id}/`, data, {
            ...(isFormData && { headers: { "Content-Type": "multipart/form-data" } }),
        });
        return response.data;
    },

    deleteAttachment: async (id: number): Promise<void> => {
        await httpService.delete(`${BASE_URL}/attachments/${id}/`);
    },

    // ─── Template Attachments ─────────────────────────────────
    getTemplateAttachments: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/template-attachments/`, { params });
        return parsePaginatedResponse(response.data);
    },

    createTemplateAttachment: async (data: Partial<EmailTemplateAttachment>): Promise<EmailTemplateAttachment> => {
        const response = await httpService.post(`${BASE_URL}/template-attachments/`, data);
        return response.data;
    },

    updateTemplateAttachment: async (id: number, data: Partial<EmailTemplateAttachment>): Promise<EmailTemplateAttachment> => {
        const response = await httpService.put(`${BASE_URL}/template-attachments/${id}/`, data);
        return response.data;
    },

    deleteTemplateAttachment: async (id: number): Promise<void> => {
        await httpService.delete(`${BASE_URL}/template-attachments/${id}/`);
    },

    // ─── Queue ────────────────────────────────────────────────
    getQueue: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/queue/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getQueueItemById: async (id: number): Promise<EmailQueue> => {
        const response = await httpService.get(`${BASE_URL}/queue/${id}/`);
        return response.data;
    },

    duplicateQueueItem: async (id: number, data: EmailQueueDuplicateInput): Promise<EmailQueue> => {
        const response = await httpService.post(`${BASE_URL}/queue/${id}/duplicate/`, data);
        return response.data;
    },

    resendQueueItem: async (id: number): Promise<EmailQueue> => {
        const response = await httpService.post(`${BASE_URL}/queue/${id}/resend/`);
        return response.data;
    },

    // ─── Placeholders ─────────────────────────────────────────
    getPlaceholders: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/placeholders/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getPlaceholderById: async (id: number): Promise<EmailContentPlaceholder> => {
        const response = await httpService.get(`${BASE_URL}/placeholders/${id}/`);
        return response.data;
    },

    createPlaceholder: async (data: Partial<EmailContentPlaceholder>): Promise<EmailContentPlaceholder> => {
        const response = await httpService.post(`${BASE_URL}/placeholders/`, data);
        return response.data;
    },

    updatePlaceholder: async (id: number, data: Partial<EmailContentPlaceholder>): Promise<EmailContentPlaceholder> => {
        const response = await httpService.put(`${BASE_URL}/placeholders/${id}/`, data);
        return response.data;
    },

    deletePlaceholder: async (id: number): Promise<void> => {
        await httpService.delete(`${BASE_URL}/placeholders/${id}/`);
    },

    // ─── Content Rules ────────────────────────────────────────
    getContentRules: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/content-rules/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getContentRuleById: async (id: number): Promise<EmailContentRule> => {
        const response = await httpService.get(`${BASE_URL}/content-rules/${id}/`);
        return response.data;
    },

    createContentRule: async (data: Partial<EmailContentRule>): Promise<EmailContentRule> => {
        const response = await httpService.post(`${BASE_URL}/content-rules/`, data);
        return response.data;
    },

    updateContentRule: async (id: number, data: Partial<EmailContentRule>): Promise<EmailContentRule> => {
        const response = await httpService.put(`${BASE_URL}/content-rules/${id}/`, data);
        return response.data;
    },

    deleteContentRule: async (id: number): Promise<void> => {
        await httpService.delete(`${BASE_URL}/content-rules/${id}/`);
    },

    // ─── Template Content Rules ───────────────────────────────
    getTemplateContentRules: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/template-content-rules/`, { params });
        return parsePaginatedResponse(response.data);
    },

    createTemplateContentRule: async (data: Partial<EmailTemplateContentRule>): Promise<EmailTemplateContentRule> => {
        const response = await httpService.post(`${BASE_URL}/template-content-rules/`, data);
        return response.data;
    },

    updateTemplateContentRule: async (id: number, data: Partial<EmailTemplateContentRule>): Promise<EmailTemplateContentRule> => {
        const response = await httpService.put(`${BASE_URL}/template-content-rules/${id}/`, data);
        return response.data;
    },

    deleteTemplateContentRule: async (id: number): Promise<void> => {
        await httpService.delete(`${BASE_URL}/template-content-rules/${id}/`);
    },

    // ─── Closing Salutations ──────────────────────────────────
    getClosingSalutations: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/closing-salutations/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getClosingSalutationById: async (id: number): Promise<ClosingSalutation> => {
        const response = await httpService.get(`${BASE_URL}/closing-salutations/${id}/`);
        return response.data;
    },

    createClosingSalutation: async (data: Partial<ClosingSalutation>): Promise<ClosingSalutation> => {
        const response = await httpService.post(`${BASE_URL}/closing-salutations/`, data);
        return response.data;
    },

    updateClosingSalutation: async (id: number, data: Partial<ClosingSalutation>): Promise<ClosingSalutation> => {
        const response = await httpService.put(`${BASE_URL}/closing-salutations/${id}/`, data);
        return response.data;
    },

    patchClosingSalutation: async (id: number, data: Partial<ClosingSalutation>): Promise<ClosingSalutation> => {
        const response = await httpService.patch(`${BASE_URL}/closing-salutations/${id}/`, data);
        return response.data;
    },

    deleteClosingSalutation: async (id: number): Promise<void> => {
        await httpService.delete(`${BASE_URL}/closing-salutations/${id}/`);
    },

    getSignatureMjml: async (templateId: number): Promise<SignatureMjmlResponse> => {
        const response = await httpService.get(`${BASE_URL}/templates/${templateId}/signature-mjml/`);
        return response.data;
    },

    // ─── MJML Elements ──────────────────────────────────────────
    getMjmlElements: async (): Promise<EmailMjmlElement[]> => {
        const response = await httpService.get(`${BASE_URL}/mjml-elements/`);
        return response.data;
    },

    updateMjmlElement: async (id: number, data: Partial<EmailMjmlElement>): Promise<EmailMjmlElement> => {
        const response = await httpService.put(`${BASE_URL}/mjml-elements/${id}/`, data);
        return response.data;
    },

    // ─── Batches (Admin) ───────────────────────────────────────
    getBatches: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/batches/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getBatchById: async (batchId: string) => {
        const response = await httpService.get(`${BASE_URL}/batches/${batchId}/`);
        return response.data;
    },

    getBatchEmails: async (batchId: string, params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/batches/${batchId}/emails/`, { params });
        return parsePaginatedResponse(response.data);
    },

    retryBatchFailed: async (batchId: string) => {
        const response = await httpService.post(`${BASE_URL}/batches/${batchId}/retry-failed/`);
        return response.data;
    },
};

export default emailService;
