export type SignatureType = 'team' | 'staff';
export type StaffNameFormat = 'full_name' | 'first_name';

export interface ClosingSalutationStaffEntry {
    id: number;
    staff: number;
    display_name: string;
    display_order: number;
}

export interface ClosingSalutation {
    id: number;
    name: string;
    display_name: string;
    sign_off_text: string;
    signature_type: SignatureType;
    team_signature: string;
    staff_name_format: StaffNameFormat;
    staff_members: ClosingSalutationStaffEntry[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ClosingSalutationList {
    id: number;
    name: string;
    display_name: string;
    sign_off_text: string;
    signature_type: SignatureType;
    team_signature: string;
    staff_name_format: StaffNameFormat;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface SignatureMjmlResponse {
    signature_mjml: string;
}
