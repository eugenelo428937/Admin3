import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AdminPage,
    AdminErrorAlert,
    AdminLoadingState,
    AdminFormSection,
    AdminOutlinedField,
    AdminSelect,
    AdminToggleField,
} from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/admin/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/admin/ui/table';
import type { TemplateType, Priority } from '../../../../types/email';
import useEmailTemplateFormVM from './useEmailTemplateFormVM';
import EmailTemplateMjmlEditor from './EmailTemplateMjmlEditor';

const TEMPLATE_TYPE_CHOICES: { value: TemplateType; label: string }[] = [
    { value: 'order_confirmation', label: 'Order Confirmation' },
    { value: 'password_reset', label: 'Password Reset' },
    { value: 'password_reset_completed', label: 'Password Reset Completed' },
    { value: 'account_activation', label: 'Account Activation' },
    { value: 'email_verification', label: 'Email Verification' },
    { value: 'materials', label: 'Materials' },
    { value: 'marking', label: 'Marking' },
    { value: 'tutorials', label: 'Tutorials' },
    { value: 'apprentice', label: 'Apprentice' },
];

const PRIORITY_CHOICES: { value: Priority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

/** Floating label positioned over a child component's own border (e.g. SelectTrigger) */
function OutlinedLabel({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="tw:relative tw:mb-[18px] last:tw:mb-0">
            {children}
            <label className="tw:absolute tw:left-[11px] tw:-top-[7px] tw:bg-[var(--card)] tw:px-1 tw:text-[10.5px] tw:font-medium tw:text-muted-foreground tw:z-[1] tw:pointer-events-none">
                {label}
            </label>
        </div>
    );
}

const EmailTemplateForm: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailTemplateFormVM();

    if (vm.loading) {
        return (
            <AdminPage>
                <AdminLoadingState rows={8} columns={2} />
            </AdminPage>
        );
    }

    return (
        <AdminPage>
            <div className="tw:mb-6 tw:flex tw:items-center tw:justify-between">
                <h1 className="tw:text-2xl tw:font-semibold tw:tracking-tight tw:text-admin-fg">
                    {vm.isEditMode ? 'Edit Email Template' : 'New Email Template'}
                </h1>
                <div className="tw:flex tw:gap-2">
                    <Button onClick={vm.handleSubmit} disabled={vm.isSubmitting}>
                        {vm.isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/admin/email/templates')}>
                        Cancel
                    </Button>
                </div>
            </div>

            <AdminErrorAlert message={vm.error} />

            <Tabs value={vm.activeTab} onValueChange={(v) => vm.setActiveTab(v as any)}>
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="editor">MJML Editor</TabsTrigger>
                    <TabsTrigger value="attachments">Attachments</TabsTrigger>
                    <TabsTrigger value="content-rules">Content Rules</TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general">
                    <AdminFormSection label="General" description="Template metadata and delivery settings">
                        <div className="tw:space-y-1">
                            {/* Row 1: Display Name (half width) + Active */}
                            <div className="tw:flex tw:items-start tw:gap-4">
                                <div className="tw:w-1/2">
                                    <AdminOutlinedField label="Display Name" required>
                                        <Input
                                            value={vm.formData.display_name || ''}
                                            onChange={(e) => {
                                                vm.handleChange('display_name', e.target.value);
                                                vm.handleChange('name', e.target.value.replace(/\s+/g, '_').toLowerCase());
                                            }}
                                        />
                                    </AdminOutlinedField>
                                </div>
                                <div className="tw:pt-1">
                                    <AdminToggleField
                                        label="Active"
                                        checked={vm.formData.is_active ?? true}
                                        onCheckedChange={(checked) => vm.handleChange('is_active', checked)}
                                    />
                                </div>
                            </div>

                            {/* Row 2: Template Type + Default Priority */}
                            <div className="tw:flex tw:gap-4">
                                <div className="tw:flex-1">
                                    <OutlinedLabel label="Template Type">
                                        <AdminSelect
                                            options={TEMPLATE_TYPE_CHOICES.map(c => ({ value: c.value, label: c.label }))}
                                            value={vm.formData.template_type || 'custom'}
                                            onChange={(v) => vm.handleChange('template_type', v)}
                                        />
                                    </OutlinedLabel>
                                </div>
                                <div className="tw:flex-1">
                                    <OutlinedLabel label="Default Priority">
                                        <AdminSelect
                                            options={PRIORITY_CHOICES.map(c => ({ value: c.value, label: c.label }))}
                                            value={vm.formData.default_priority || 'normal'}
                                            onChange={(v) => vm.handleChange('default_priority', v)}
                                        />
                                    </OutlinedLabel>
                                </div>
                            </div>

                            {/* Row 3: Subject Template */}
                            <AdminOutlinedField label="Subject Template">
                                <Input
                                    value={vm.formData.subject_template || ''}
                                    onChange={(e) => vm.handleChange('subject_template', e.target.value)}
                                    placeholder="Supports {{placeholders}} for dynamic content"
                                />
                            </AdminOutlinedField>

                            {/* Row 4: From + Reply-To */}
                            <div className="tw:flex tw:gap-4">
                                <div className="tw:flex-1">
                                    <AdminOutlinedField label="From">
                                        <Input
                                            type="email"
                                            value={vm.formData.from_email || ''}
                                            onChange={(e) => vm.handleChange('from_email', e.target.value)}
                                        />
                                    </AdminOutlinedField>
                                </div>
                                <div className="tw:flex-1">
                                    <AdminOutlinedField label="Reply-To">
                                        <Input
                                            type="email"
                                            value={vm.formData.reply_to_email || ''}
                                            onChange={(e) => vm.handleChange('reply_to_email', e.target.value)}
                                        />
                                    </AdminOutlinedField>
                                </div>
                            </div>

                            {/* Row 4: Closing Salutation */}
                            <OutlinedLabel label="Closing Salutation">
                                <AdminSelect
                                    options={[
                                        { value: '__none__', label: 'None' },
                                        ...vm.salutations.map((sal) => ({
                                            value: String(sal.id),
                                            label: `${sal.display_name}${sal.job_title ? ` (${sal.job_title})` : ''} — "${sal.sign_off_text}"`,
                                        })),
                                    ]}
                                    value={vm.formData.closing_salutation != null ? String(vm.formData.closing_salutation) : '__none__'}
                                    onChange={(v) => vm.handleChange('closing_salutation', v === '__none__' ? null : Number(v))}
                                />
                            </OutlinedLabel>

                            {/* Row 5: Change note — applied to the version created on save */}
                            <AdminOutlinedField label="Change Note (for this save)">
                                <Input
                                    value={vm.formData.change_note || ''}
                                    onChange={(e) => vm.handleChange('change_note', e.target.value)}
                                    placeholder="Describe what changed in this version (optional)"
                                />
                            </AdminOutlinedField>
                        </div>
                    </AdminFormSection>

                    {/* Version History panel */}
                    {vm.isEditMode && (
                        <AdminFormSection
                            label="Version History"
                            description="Every save creates a new immutable snapshot. Queue items rendered before the latest save continue to use their pinned version."
                        >
                            {vm.versions.length === 0 ? (
                                <p className="tw:text-sm tw:text-muted-foreground">No versions yet.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Version</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead>Author</TableHead>
                                            <TableHead>Change Note</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {vm.versions.map((v) => (
                                            <TableRow key={v.id}>
                                                <TableCell>v{v.version_number}</TableCell>
                                                <TableCell>{new Date(v.created_at).toLocaleString()}</TableCell>
                                                <TableCell>{v.created_by || '—'}</TableCell>
                                                <TableCell>{v.change_note || '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </AdminFormSection>
                    )}
                </TabsContent>

                {/* MJML Editor Tab */}
                <TabsContent value="editor">
                    {vm.isEditMode && vm.formData.id ? (
                        <EmailTemplateMjmlEditor
                            templateId={vm.formData.id}
                            initialContent={vm.formData.mjml_content || ''}
                            initialBasicModeContent={vm.formData.basic_mode_content || ''}
                            onContentChange={(mjml, basic) => {
                                vm.handleChange('mjml_content', mjml);
                                vm.handleChange('basic_mode_content', basic);
                            }}
                        />
                    ) : (
                        <div className="tw:rounded-lg tw:bg-[var(--muted)] tw:p-4 tw:text-sm tw:text-muted-foreground">
                            Save the template first to enable the MJML editor.
                        </div>
                    )}
                </TabsContent>

                {/* Attachments Tab */}
                <TabsContent value="attachments">
                    <AdminFormSection label="Attachments" description="Files attached to emails sent with this template">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Attachment</TableHead>
                                    <TableHead>Required</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vm.formData.attachments && vm.formData.attachments.length > 0 ? (
                                    vm.formData.attachments.map((ta: any) => (
                                        <TableRow key={ta.id}>
                                            <TableCell>{ta.attachment.display_name}</TableCell>
                                            <TableCell>{ta.is_required ? 'Yes' : 'No'}</TableCell>
                                            <TableCell>{ta.order}</TableCell>
                                            <TableCell>-</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="tw:text-center tw:text-muted-foreground">
                                            No attachments configured.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </AdminFormSection>
                </TabsContent>

                {/* Content Rules Tab */}
                <TabsContent value="content-rules">
                    <AdminFormSection label="Content Rules" description="Dynamic content rules applied to this template">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Content Rule</TableHead>
                                    <TableHead>Enabled</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vm.formData.template_content_rules && vm.formData.template_content_rules.length > 0 ? (
                                    vm.formData.template_content_rules.map((tcr: any) => (
                                        <TableRow key={tcr.id}>
                                            <TableCell>{tcr.content_rule.name}</TableCell>
                                            <TableCell>{tcr.is_enabled ? 'Yes' : 'No'}</TableCell>
                                            <TableCell>{tcr.effective_priority}</TableCell>
                                            <TableCell>-</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="tw:text-center tw:text-muted-foreground">
                                            No content rules configured.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </AdminFormSection>
                </TabsContent>
            </Tabs>
        </AdminPage>
    );
};

export default EmailTemplateForm;
