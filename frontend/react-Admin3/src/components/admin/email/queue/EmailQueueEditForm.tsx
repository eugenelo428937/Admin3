import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, X, AlertCircle } from 'lucide-react';
import {
    AdminPage,
    AdminErrorAlert,
    AdminLoadingState,
    AdminFormField,
    AdminConfirmDialog,
    AdminSelect,
} from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Separator } from '@/components/admin/ui/separator';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { xml } from '@codemirror/lang-xml';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import MjmlPreviewPane from '../shared/MjmlPreviewPane';
import BasicModeToolbar from '../templates/BasicModeToolbar';
import useQueueContentEditorVM from './useQueueContentEditorVM';
import { useEmailQueueEditFormVM } from './useEmailQueueEditFormVM';

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

const EmailQueueEditForm: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailQueueEditFormVM();
    const editorVM = useQueueContentEditorVM(vm.queueItem?.template ?? null);
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const [isEditorInitialized, setIsEditorInitialized] = useState(false);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    // Fetch queue item on mount
    useEffect(() => {
        vm.fetchItem();
    }, [vm.fetchItem]);

    // Initialize editor content once queue item is loaded
    useEffect(() => {
        if (vm.queueItem && !isEditorInitialized && !vm.loading) {
            editorVM.initContent(
                vm.initialMjml,
                vm.initialBasicContent,
            );
            setIsEditorInitialized(true);
        }
    }, [vm.queueItem, vm.loading]); // eslint-disable-line react-hooks/exhaustive-deps

    // Create/recreate CodeMirror when mode changes
    useEffect(() => {
        if (!editorRef.current || !isEditorInitialized) return;

        if (editorViewRef.current) {
            editorViewRef.current.destroy();
            editorViewRef.current = null;
            setIsEditorReady(false);
        }

        const isBasic = editorVM.editorMode === 'basic';
        const doc = isBasic ? editorVM.basicModeContent : editorVM.mjmlContent;
        const lang = isBasic ? markdown() : xml();
        const changeHandler = isBasic
            ? editorVM.handleBasicContentChange
            : editorVM.handleContentChange;

        const state = EditorState.create({
            doc: doc || '',
            extensions: [
                basicSetup,
                lang,
                oneDark,
                EditorView.lineWrapping,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        changeHandler(update.state.doc.toString());
                    }
                }),
            ],
        });

        const view = new EditorView({ state, parent: editorRef.current });
        editorViewRef.current = view;
        setIsEditorReady(true);

        return () => {
            view.destroy();
            editorViewRef.current = null;
            setIsEditorReady(false);
        };
    }, [editorVM.editorMode, isEditorInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleModeChange = (newMode: string) => {
        if (newMode === editorVM.editorMode) return;
        if (newMode === 'advanced' && editorVM.editorMode === 'basic') {
            setConfirmDialogOpen(true);
        } else {
            editorVM.setEditorMode(newMode as 'basic' | 'advanced');
        }
    };

    const handleSave = () => {
        vm.handleSubmit(editorVM.mjmlContent, editorVM.basicModeContent);
    };

    const isEditable = vm.queueItem?.status === 'pending' || vm.queueItem?.status === 'retry';

    if (vm.loading) {
        return (
            <AdminPage>
                <AdminLoadingState rows={6} columns={3} />
            </AdminPage>
        );
    }

    if (!vm.queueItem && !vm.loading && !vm.error) {
        return (
            <AdminPage>
                <div role="alert" className="tw:rounded-md tw:border tw:border-amber-200 tw:bg-amber-50 tw:p-4 tw:text-sm tw:text-amber-800">
                    Queue item not found.
                </div>
                <Button variant="ghost" onClick={() => navigate('/admin/email/queue')} className="tw:mt-4">
                    <ArrowLeft className="tw:size-4" />
                    Back to Queue
                </Button>
            </AdminPage>
        );
    }

    return (
        <AdminPage>
            <div className="tw:flex tw:items-center tw:gap-3 tw:mb-6">
                <Button variant="ghost" size="icon-xs" onClick={() => navigate('/admin/email/queue')}>
                    <ArrowLeft className="tw:size-4" />
                </Button>
                <h1 className="tw:text-2xl tw:font-semibold tw:tracking-tight tw:text-admin-fg">
                    Edit Queue Item
                </h1>
            </div>

            <AdminErrorAlert message={vm.error} />

            {!isEditable && (
                <div className="tw:mb-4 tw:flex tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-amber-200 tw:bg-amber-50 tw:p-3 tw:text-sm tw:text-amber-800">
                    <AlertCircle className="tw:size-4 tw:shrink-0" />
                    This item has status &ldquo;{vm.queueItem?.status}&rdquo; and cannot be edited. Only pending or retry items can be edited.
                </div>
            )}

            {/* Item summary */}
            {vm.queueItem && (
                <div className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-bg-muted/50 tw:p-5">
                    <h2 className="tw:mb-2 tw:text-lg tw:font-semibold tw:text-admin-fg">Queue Item</h2>
                    <Separator className="tw:mb-4" />
                    <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:md:grid-cols-3">
                        <div>
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Template</p>
                            <p className="tw:mt-1 tw:text-sm">{vm.queueItem.template_name || '-'}</p>
                        </div>
                        <div>
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Priority</p>
                            <Badge variant="outline" className="tw:mt-1">{vm.queueItem.priority}</Badge>
                        </div>
                        <div>
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Status</p>
                            <Badge variant="outline" className="tw:mt-1">{vm.queueItem.status}</Badge>
                        </div>
                    </div>
                </div>
            )}

            {/* Email fields */}
            <div className="tw:rounded-md tw:border tw:border-admin-border tw:p-5 tw:mb-4">
                <h2 className="tw:mb-2 tw:text-lg tw:font-semibold tw:text-admin-fg">Email Details</h2>
                <Separator className="tw:mb-5" />
                <div className="tw:space-y-5">
                    <EmailChipInput
                        label="To"
                        emails={vm.emailFields.to_emails}
                        onEmailsChange={(emails) => vm.handleEmailListChange('to_emails', emails)}
                    />
                    <EmailChipInput
                        label="CC"
                        emails={vm.emailFields.cc_emails}
                        onEmailsChange={(emails) => vm.handleEmailListChange('cc_emails', emails)}
                    />
                    <EmailChipInput
                        label="BCC"
                        emails={vm.emailFields.bcc_emails}
                        onEmailsChange={(emails) => vm.handleEmailListChange('bcc_emails', emails)}
                    />
                    <AdminFormField label="From Email">
                        <Input
                            type="email"
                            value={vm.emailFields.from_email}
                            onChange={(e) => vm.handleFieldChange('from_email', e.target.value)}
                        />
                    </AdminFormField>
                    <AdminFormField label="Reply-To Email">
                        <Input
                            type="email"
                            value={vm.emailFields.reply_to_email}
                            onChange={(e) => vm.handleFieldChange('reply_to_email', e.target.value)}
                        />
                    </AdminFormField>
                    <AdminFormField label="Subject">
                        <Input
                            value={vm.emailFields.subject}
                            onChange={(e) => vm.handleFieldChange('subject', e.target.value)}
                        />
                    </AdminFormField>
                </div>
            </div>

            {/* Content editor */}
            <div className="tw:rounded-md tw:border tw:border-admin-border tw:p-5 tw:mb-4">
                <h2 className="tw:mb-2 tw:text-lg tw:font-semibold tw:text-admin-fg">Email Content</h2>
                <Separator className="tw:mb-5" />

                <div className="tw:flex tw:flex-col tw:gap-4">
                    {/* Editor toolbar */}
                    <div className="tw:flex tw:items-center tw:gap-3">
                        <div className="tw:w-40">
                            <AdminSelect
                                options={[
                                    { value: 'basic', label: 'Basic Mode' },
                                    { value: 'advanced', label: 'Advanced Mode' },
                                ]}
                                value={editorVM.editorMode}
                                onChange={handleModeChange}
                            />
                        </div>
                        {editorVM.shellLoading && (
                            <Badge variant="outline" className="tw:gap-1">
                                <Loader2 className="tw:size-3 tw:animate-spin" />
                                Loading preview shell...
                            </Badge>
                        )}
                        {editorVM.isDirty && (
                            <Badge variant="outline" className="tw:border-amber-300 tw:bg-amber-50 tw:text-amber-700">
                                Unsaved changes
                            </Badge>
                        )}
                    </div>

                    {editorVM.editorMode === 'basic' && (
                        <BasicModeToolbar editorViewRef={editorViewRef} disabled={!isEditorReady} />
                    )}

                    {/* Split pane: Editor + Preview */}
                    <div className="tw:flex tw:gap-4 tw:min-h-[500px]">
                        <div className="tw:flex-1 tw:overflow-hidden tw:rounded-md tw:border tw:border-admin-border">
                            <style>{`
                                .cm-editor { height: 100%; min-height: 500px; text-align: left; }
                                .cm-scroller { overflow: auto; }
                                .cm-content { padding-left: 0; text-align: left; }
                                .cm-line { padding-left: 2px; text-align: left; }
                            `}</style>
                            <div ref={editorRef} className="tw:h-full tw:min-h-[500px]" />
                        </div>
                        <div className="tw:flex-1">
                            <MjmlPreviewPane
                                html={editorVM.htmlPreview}
                                error={editorVM.compileError}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="tw:flex tw:justify-end tw:gap-2">
                <Button
                    variant="outline"
                    onClick={() => navigate('/admin/email/queue')}
                    disabled={vm.isSubmitting}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={vm.isSubmitting || !isEditable}
                >
                    {vm.isSubmitting ? (
                        <Loader2 className="tw:size-4 tw:animate-spin" />
                    ) : (
                        <Save className="tw:size-4" />
                    )}
                    {vm.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <AdminConfirmDialog
                open={confirmDialogOpen}
                title="Switch to Advanced Mode?"
                description="Switching to Advanced Mode will convert your content to MJML. You won't be able to switch back to Basic Mode. Continue?"
                confirmLabel="Switch to Advanced"
                onConfirm={() => { setConfirmDialogOpen(false); editorVM.setEditorMode('advanced'); }}
                onCancel={() => setConfirmDialogOpen(false)}
            />
        </AdminPage>
    );
};

export default EmailQueueEditForm;
