import type { ClosingSalutationList } from './closingSalutation.types';

export type TemplateType = 'order_confirmation' | 'password_reset' | 'password_reset_completed' | 'account_activation' | 'newsletter' | 'welcome' | 'reminder' | 'notification' | 'marketing' | 'support' | 'custom';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface EmailTemplate {
  id: number;
  name: string;
  template_type: TemplateType;
  display_name: string;
  description: string;
  subject_template: string;
  use_master_template: boolean;
  from_email: string;
  reply_to_email: string;
  default_priority: Priority;
  enable_tracking: boolean;
  enable_queue: boolean;
  max_retry_attempts: number;
  retry_delay_minutes: number;
  enhance_outlook_compatibility: boolean;
  is_master: boolean;
  mjml_content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  closing_salutation: number | null;
  closing_salutation_detail?: ClosingSalutationList | null;
  attachments?: EmailTemplateAttachmentDetail[];
  template_content_rules?: EmailTemplateContentRuleDetail[];
}

export interface EmailTemplateAttachmentDetail {
  id: number;
  attachment: EmailAttachmentSummary;
  is_required: boolean;
  order: number;
  include_condition: Record<string, any>;
}

export interface EmailAttachmentSummary {
  id: number;
  name: string;
  display_name: string;
  attachment_type: string;
}

export interface EmailTemplateContentRuleDetail {
  id: number;
  content_rule: EmailContentRuleSummary;
  is_enabled: boolean;
  priority_override: number | null;
  content_override: string;
  effective_priority: number;
}

export interface EmailContentRuleSummary {
  id: number;
  name: string;
  rule_type: string;
  placeholder_name: string;
}

export interface MjmlPreviewResponse {
  html: string;
  errors?: string[];
}

export interface MjmlShellResponse {
  shell: string;
}
