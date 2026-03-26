import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import emailService from '../services/emailService';
import type { EmailBatch, BatchStatus } from '../types/email';

const STATUS_BADGE: Record<BatchStatus, { bg: string; text: string; label: string }> = {
    pending: { bg: 'tw:bg-gray-100', text: 'tw:text-gray-600', label: 'Queued' },
    processing: { bg: 'tw:bg-blue-50', text: 'tw:text-blue-700', label: 'Processing' },
    completed: { bg: 'tw:bg-green-50', text: 'tw:text-green-700', label: 'Completed' },
    completed_with_errors: { bg: 'tw:bg-amber-50', text: 'tw:text-amber-700', label: 'With Errors' },
    failed: { bg: 'tw:bg-red-50', text: 'tw:text-red-700', label: 'Failed' },
};

const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
};

export default function Dashboard() {
    const { user } = useAuth() as any;
    const firstName = user?.first_name || 'Admin';
    const [batches, setBatches] = useState<EmailBatch[]>([]);

    useEffect(() => {
        emailService.getBatches({ limit: 5 }).then((res) => {
            setBatches(res.results);
        }).catch(() => {});
    }, []);

    return (
        <div>
            <h1 className="tw:text-2xl tw:font-bold tw:tracking-tight tw:text-[var(--foreground)]">
                Dashboard
            </h1>
            <p className="tw:text-[var(--muted-foreground)] tw:mt-1">
                Welcome back, {firstName}.
            </p>

            <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:mt-6 md:tw:grid-cols-3">
                {['Total Orders', 'Active Sessions', 'Pending Items'].map((title) => (
                    <div
                        key={title}
                        className="tw:rounded-lg tw:border tw:border-[var(--border)] tw:bg-[var(--card)] tw:p-6"
                    >
                        <p className="tw:text-sm tw:text-[var(--muted-foreground)]">{title}</p>
                        <p className="tw:text-2xl tw:font-bold tw:text-[var(--foreground)] tw:mt-1">—</p>
                    </div>
                ))}
            </div>

            {/* Email Batches Card */}
            <div className="tw:mt-6 tw:rounded-lg tw:border tw:border-[var(--border)] tw:bg-[var(--card)]">
                <div className="tw:flex tw:items-center tw:justify-between tw:px-4 tw:py-2.5 tw:border-b tw:border-[var(--border)]">
                    <span className="tw:text-sm tw:font-semibold tw:text-[var(--foreground)]">Email Batches</span>
                    <Link
                        to="/admin/email/batches"
                        className="tw:text-xs tw:text-blue-600 hover:tw:underline tw:no-underline"
                    >
                        View all →
                    </Link>
                </div>
                {batches.length === 0 ? (
                    <div className="tw:px-4 tw:py-3 tw:text-xs tw:text-[var(--muted-foreground)]">
                        No recent batches.
                    </div>
                ) : (
                    batches.map((batch, idx) => {
                        const style = STATUS_BADGE[batch.status];
                        return (
                            <div
                                key={batch.batch_id}
                                className={`tw:flex tw:items-center tw:gap-2 tw:px-4 tw:py-2 ${idx < batches.length - 1 ? 'tw:border-b tw:border-[var(--border)]/50' : ''}`}
                            >
                                <div className="tw:flex-1 tw:min-w-0">
                                    <div className="tw:flex tw:items-center tw:gap-1.5">
                                        <span className="tw:text-xs tw:text-[var(--foreground)] tw:font-medium tw:truncate">
                                            {batch.template_name || 'Unknown'}
                                        </span>
                                        <span className="tw:text-[10px] tw:text-[var(--muted-foreground)]">
                                            {batch.sent_count}/{batch.total_items}
                                        </span>
                                    </div>
                                    <div className="tw:text-[10px] tw:text-[var(--muted-foreground)] tw:mt-0.5">
                                        {batch.requested_by} · {formatRelativeTime(batch.created_at)}
                                    </div>
                                </div>
                                <span
                                    className={`tw:text-[10px] tw:px-1.5 tw:py-0.5 tw:rounded-full tw:font-medium tw:whitespace-nowrap ${style.bg} ${style.text}`}
                                >
                                    {style.label}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
