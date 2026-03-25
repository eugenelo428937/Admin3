import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, X } from 'lucide-react';
import {
    AdminPage,
    AdminErrorAlert,
    AdminLoadingState,
    AdminFormField,
} from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Separator } from '@/components/admin/ui/separator';
import { useEmailQueueDuplicateFormVM } from './useEmailQueueDuplicateFormVM';

interface EmailChipInputProps {
    label: string;
    emails: string[];
    onEmailsChange: (emails: string[]) => void;
}

const EmailChipInput: React.FC<EmailChipInputProps> = ({ label, emails, onEmailsChange }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            onEmailsChange([...emails, inputValue.trim()]);
            setInputValue('');
        }
    };

    const handleDelete = (index: number) => {
        const updated = emails.filter((_, i) => i !== index);
        onEmailsChange(updated);
    };

    return (
        <div>
            <p className="tw:mb-1 tw:text-xs tw:font-medium tw:text-admin-fg-muted">{label}</p>
            {emails.length > 0 && (
                <div className="tw:mb-2 tw:flex tw:flex-wrap tw:gap-1">
                    {emails.map((email, index) => (
                        <span
                            key={index}
                            className="tw:inline-flex tw:items-center tw:gap-1 tw:rounded-full tw:border tw:border-admin-border tw:px-2 tw:py-0.5 tw:text-xs"
                        >
                            {email}
                            <button
                                type="button"
                                onClick={() => handleDelete(index)}
                                className="tw:ml-0.5 tw:rounded-full tw:p-0.5 tw:hover:bg-admin-bg-muted"
                            >
                                <X className="tw:size-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <Input
                placeholder="Type an email and press Enter to add"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                type="email"
            />
        </div>
    );
};

const EmailQueueDuplicateForm: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailQueueDuplicateFormVM();

    useEffect(() => {
        vm.fetchOriginal();
    }, [vm.fetchOriginal]);

    if (vm.loading) {
        return (
            <AdminPage>
                <AdminLoadingState rows={6} columns={3} />
            </AdminPage>
        );
    }

    if (!vm.originalItem && !vm.loading && !vm.error) {
        return (
            <AdminPage>
                <div role="alert" className="tw:rounded-md tw:border tw:border-amber-200 tw:bg-amber-50 tw:p-4 tw:text-sm tw:text-amber-800">
                    Original queue item not found.
                </div>
                <Button
                    variant="ghost"
                    onClick={() => navigate('/admin/email/queue')}
                    className="tw:mt-4"
                >
                    <ArrowLeft className="tw:size-4" />
                    Back to Queue
                </Button>
            </AdminPage>
        );
    }

    return (
        <AdminPage>
            <h1 className="tw:mb-6 tw:text-2xl tw:font-semibold tw:tracking-tight tw:text-admin-fg">
                Duplicate Queue Item
            </h1>

            <AdminErrorAlert message={vm.error} />

            {/* Original Item Info (read-only) */}
            {vm.originalItem && (
                <div className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-bg-muted/50 tw:p-5">
                    <h2 className="tw:mb-2 tw:text-lg tw:font-semibold tw:text-admin-fg">Original Item</h2>
                    <Separator className="tw:mb-4" />
                    <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:md:grid-cols-3">
                        <div>
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Template</p>
                            <p className="tw:mt-1 tw:text-sm">{vm.originalItem.template_name || '-'}</p>
                        </div>
                        <div>
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Priority</p>
                            <Badge variant="outline" className="tw:mt-1">{vm.originalItem.priority}</Badge>
                        </div>
                        <div>
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Original Subject</p>
                            <p className="tw:mt-1 tw:truncate tw:text-sm">{vm.originalItem.subject || '-'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Editable Form */}
            <div className="tw:rounded-md tw:border tw:border-admin-border tw:p-5">
                <h2 className="tw:mb-2 tw:text-lg tw:font-semibold tw:text-admin-fg">Email Details</h2>
                <Separator className="tw:mb-5" />

                <div className="tw:space-y-5">
                    <EmailChipInput
                        label="To"
                        emails={vm.formData.to_emails}
                        onEmailsChange={(emails) => vm.handleEmailListChange('to_emails', emails)}
                    />

                    <EmailChipInput
                        label="CC"
                        emails={vm.formData.cc_emails}
                        onEmailsChange={(emails) => vm.handleEmailListChange('cc_emails', emails)}
                    />

                    <EmailChipInput
                        label="BCC"
                        emails={vm.formData.bcc_emails}
                        onEmailsChange={(emails) => vm.handleEmailListChange('bcc_emails', emails)}
                    />

                    <AdminFormField label="From Email">
                        <Input
                            type="email"
                            value={vm.formData.from_email}
                            onChange={(e) => vm.handleChange('from_email', e.target.value)}
                        />
                    </AdminFormField>

                    <AdminFormField label="Reply-To Email">
                        <Input
                            type="email"
                            value={vm.formData.reply_to_email}
                            onChange={(e) => vm.handleChange('reply_to_email', e.target.value)}
                        />
                    </AdminFormField>

                    <AdminFormField label="Subject">
                        <Input
                            value={vm.formData.subject}
                            onChange={(e) => vm.handleChange('subject', e.target.value)}
                        />
                    </AdminFormField>
                </div>

                {/* Actions */}
                <div className="tw:mt-6 tw:flex tw:justify-end tw:gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/admin/email/queue')}
                        disabled={vm.isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={vm.handleSubmit}
                        disabled={vm.isSubmitting}
                    >
                        {vm.isSubmitting ? (
                            <Loader2 className="tw:size-4 tw:animate-spin" />
                        ) : (
                            <Save className="tw:size-4" />
                        )}
                        {vm.isSubmitting ? 'Saving...' : 'Save Duplicate'}
                    </Button>
                </div>
            </div>
        </AdminPage>
    );
};

export default EmailQueueDuplicateForm;
