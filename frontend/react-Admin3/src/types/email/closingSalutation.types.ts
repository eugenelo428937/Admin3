export interface ClosingSalutation {
    id: number;
    name: string;
    display_name: string;
    sign_off_text: string;
    job_title: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ClosingSalutationList {
    id: number;
    name: string;
    display_name: string;
    sign_off_text: string;
    job_title: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface SignatureMjmlResponse {
    signature_mjml: string;
    sign_off_text: string;
    display_name: string;
    job_title: string;
}
