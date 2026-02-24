export type AttachmentType = 'static' | 'dynamic' | 'template' | 'external';

export interface EmailAttachment {
  id: number;
  name: string;
  display_name: string;
  attachment_type: AttachmentType;
  file_path: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  is_conditional: boolean;
  condition_rules: Record<string, any>;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateAttachment {
  id: number;
  template: number;
  attachment: number;
  is_required: boolean;
  order: number;
  include_condition: Record<string, any>;
  created_at: string;
}
