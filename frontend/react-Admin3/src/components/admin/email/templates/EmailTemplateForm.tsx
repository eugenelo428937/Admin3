import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPage, AdminErrorAlert, AdminLoadingState, AdminFormField, AdminSelect } from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { Label } from '@/components/admin/ui/label';
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
];

const PRIORITY_CHOICES: { value: Priority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

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

            <div className="tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-bg tw:px-4">
                <Tabs value={vm.activeTab} onValueChange={(v) => vm.setActiveTab(v)}>
                    <TabsList>
                        <TabsTrigger>General</TabsTrigger>
                        <TabsTrigger>MJML Editor</TabsTrigger>
                        <TabsTrigger>Attachments</TabsTrigger>
                        <TabsTrigger>Content Rules</TabsTrigger>
                    </TabsList>

                    {/* General Tab */}
                    <TabsContent value={vm.activeTab} index={0}>
                        <div className="tw:space-y-5">
                            <AdminFormField label="Name" required>
                                <Input
                                    value={vm.formData.name || ''}
                                    onChange={(e) => vm.handleChange('name', e.target.value)}
                                />
                            </AdminFormField>

                            <AdminFormField label="Display Name">
                                <Input
                                    value={vm.formData.display_name || ''}
                                    onChange={(e) => vm.handleChange('display_name', e.target.value)}
                                />
                            </AdminFormField>

                            <AdminFormField label="Subject Template" description="Supports {{placeholders}} for dynamic content">
                                <Input
                                    value={vm.formData.subject_template || ''}
                                    onChange={(e) => vm.handleChange('subject_template', e.target.value)}
                                />
                            </AdminFormField>

                            <div className="tw:flex tw:gap-4">
                                <div className="tw:flex-1">
                                    <AdminFormField label="Template Type">
                                        <AdminSelect
                                            options={TEMPLATE_TYPE_CHOICES.map(c => ({ value: c.value, label: c.label }))}
                                            value={vm.formData.template_type || 'custom'}
                                            onChange={(v) => vm.handleChange('template_type', v)}
                                        />
                                    </AdminFormField>
                                </div>
                                <div className="tw:flex-1">
                                    <AdminFormField label="Default Priority">
                                        <AdminSelect
                                            options={PRIORITY_CHOICES.map(c => ({ value: c.value, label: c.label }))}
                                            value={vm.formData.default_priority || 'normal'}
                                            onChange={(v) => vm.handleChange('default_priority', v)}
                                        />
                                    </AdminFormField>
                                </div>
                            </div>

                            <AdminFormField label="From Email">
                                <Input
                                    type="email"
                                    value={vm.formData.from_email || ''}
                                    onChange={(e) => vm.handleChange('from_email', e.target.value)}
                                />
                            </AdminFormField>

                            <AdminFormField label="Reply-To Email">
                                <Input
                                    type="email"
                                    value={vm.formData.reply_to_email || ''}
                                    onChange={(e) => vm.handleChange('reply_to_email', e.target.value)}
                                />
                            </AdminFormField>

                            {!vm.formData.is_master && (
                                <AdminFormField label="Closing Salutation">
                                    <AdminSelect
                                        options={[
                                            { value: '__none__', label: 'None' },
                                            ...vm.salutations.map((sal) => ({
                                                value: String(sal.id),
                                                label: `${sal.display_name} — "${sal.sign_off_text}, ${sal.signature_type === 'team' ? sal.team_signature : 'Staff'}"`,
                                            })),
                                        ]}
                                        value={vm.formData.closing_salutation != null ? String(vm.formData.closing_salutation) : '__none__'}
                                        onChange={(v) => vm.handleChange('closing_salutation', v === '__none__' ? null : Number(v))}
                                    />
                                </AdminFormField>
                            )}

                            <div className="tw:flex tw:flex-wrap tw:gap-4">
                                {[
                                    { key: 'use_master_template', label: 'Use Master Template', defaultVal: true },
                                    { key: 'enable_tracking', label: 'Enable Tracking', defaultVal: false },
                                    { key: 'enable_queue', label: 'Enable Queue', defaultVal: true },
                                    { key: 'enhance_outlook_compatibility', label: 'Enhance Outlook Compatibility', defaultVal: false },
                                    { key: 'is_master', label: 'Master Component', defaultVal: false },
                                    { key: 'is_active', label: 'Active', defaultVal: true },
                                ].map(({ key, label, defaultVal }) => (
                                    <div key={key} className="tw:flex tw:items-center tw:gap-2">
                                        <Checkbox
                                            id={`cb-${key}`}
                                            checked={(vm.formData as any)[key] ?? defaultVal}
                                            onCheckedChange={(checked) => vm.handleChange(key as any, Boolean(checked))}
                                        />
                                        <Label htmlFor={`cb-${key}`}>{label}</Label>
                                    </div>
                                ))}
                            </div>

                            <div className="tw:flex tw:gap-4">
                                <div className="tw:w-48">
                                    <AdminFormField label="Max Retry Attempts">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={10}
                                            value={vm.formData.max_retry_attempts ?? 3}
                                            onChange={(e) => vm.handleChange('max_retry_attempts', parseInt(e.target.value, 10) || 0)}
                                        />
                                    </AdminFormField>
                                </div>
                                <div className="tw:w-48">
                                    <AdminFormField label="Retry Delay (minutes)">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={1440}
                                            value={vm.formData.retry_delay_minutes ?? 5}
                                            onChange={(e) => vm.handleChange('retry_delay_minutes', parseInt(e.target.value, 10) || 0)}
                                        />
                                    </AdminFormField>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* MJML Editor Tab */}
                    <TabsContent value={vm.activeTab} index={1}>
                        {vm.isEditMode && vm.formData.id ? (
                            <EmailTemplateMjmlEditor
                                templateId={vm.formData.id}
                                initialContent={vm.formData.mjml_content || ''}
                                initialBasicModeContent={vm.formData.basic_mode_content || ''}
                            />
                        ) : (
                            <div role="alert" className="tw:rounded-md tw:border tw:border-blue-200 tw:bg-blue-50 tw:p-4 tw:text-sm tw:text-blue-800">
                                Save the template first to enable the MJML editor.
                            </div>
                        )}
                    </TabsContent>

                    {/* Attachments Tab */}
                    <TabsContent value={vm.activeTab} index={2}>
                        <h3 className="tw:mb-3 tw:text-base tw:font-semibold tw:text-admin-fg">
                            Template Attachments
                        </h3>
                        <div className="tw:rounded-md tw:border tw:border-admin-border">
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
                                            <TableCell colSpan={4} className="tw:text-center tw:text-admin-fg-muted">
                                                No attachments configured. This feature will be enhanced in a future update.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* Content Rules Tab */}
                    <TabsContent value={vm.activeTab} index={3}>
                        <h3 className="tw:mb-3 tw:text-base tw:font-semibold tw:text-admin-fg">
                            Template Content Rules
                        </h3>
                        <div className="tw:rounded-md tw:border tw:border-admin-border">
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
                                            <TableCell colSpan={4} className="tw:text-center tw:text-admin-fg-muted">
                                                No content rules configured. This feature will be enhanced in a future update.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminPage>
    );
};

export default EmailTemplateForm;
