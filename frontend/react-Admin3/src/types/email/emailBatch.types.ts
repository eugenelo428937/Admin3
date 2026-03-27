export type BatchStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'completed_with_errors'
    | 'failed';

export interface EmailBatch {
    batch_id: string;
    template: number;
    template_name: string | null;
    requested_by: string;
    status: BatchStatus;
    total_items: number;
    sent_count: number;
    error_count: number;
    created_at: string;
    completed_at: string | null;
}

export interface EmailBatchEmail {
    id: number;
    queue_id: string;
    to_emails: string[];
    subject: string;
    status: string;
    sent_at: string | null;
    error_message: string;
}
