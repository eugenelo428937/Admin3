export type QueueStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'retry';
export type QueuePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface EmailQueue {
  id: number;
  queue_id: string;
  template: number | null;
  template_name?: string;
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  from_email: string;
  reply_to_email: string;
  subject: string;
  email_context: Record<string, any>;
  html_content: string;
  can_view_email?: boolean;
  text_content: string;
  content_override_mjml: string;
  content_override_basic: string;
  template_version_mjml?: string;
  template_version_basic?: string;
  priority: QueuePriority;
  status: QueueStatus;
  scheduled_at: string;
  process_after: string;
  expires_at: string | null;
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  sent_at: string | null;
  error_message: string;
  error_details: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  created_by_name?: string | null;
  edited_at: string | null;
  edited_by: number | null;
  is_edited?: boolean;
  tags: string[];
  duplicated_from: number | null;
}

export interface EmailQueueDuplicateInput {
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  from_email: string;
  reply_to_email: string;
  subject: string;
}

export interface EmailQueueEditInput {
  to_emails?: string[];
  cc_emails?: string[];
  bcc_emails?: string[];
  from_email?: string;
  reply_to_email?: string;
  subject?: string;
  content_override_mjml?: string;
  content_override_basic?: string;
}
