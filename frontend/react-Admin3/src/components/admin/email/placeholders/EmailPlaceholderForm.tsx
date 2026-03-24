import React from 'react';
import { X } from 'lucide-react';
import {
  AdminPage,
  AdminFormLayout,
  AdminFormField,
  AdminSelect,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Textarea } from '@/components/admin/ui/textarea';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { Label } from '@/components/admin/ui/label';
import { Badge } from '@/components/admin/ui/badge';
import useEmailPlaceholderFormVM from './useEmailPlaceholderFormVM';
import type { InsertPosition } from '../../../../types/email';

const INSERT_POSITIONS: { value: string; label: string }[] = [
    { value: 'replace', label: 'Replace' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'append', label: 'Append' },
    { value: 'prepend', label: 'Prepend' },
];

const EmailPlaceholderForm: React.FC = () => {
    const vm = useEmailPlaceholderFormVM();

    if (vm.loading) return null;

    // Build selected template objects for display
    const selectedTemplates = vm.templates.filter(t => vm.formData.templates.includes(t.id));
    const availableTemplates = vm.templates.filter(t => !vm.formData.templates.includes(t.id));

    return (
        <AdminPage className="tw:max-w-3xl">
            <AdminFormLayout
                title={vm.isEditMode ? 'Edit Placeholder' : 'New Placeholder'}
                onSubmit={(e) => { e.preventDefault(); vm.handleSubmit(); }}
                onCancel={vm.handleCancel}
                loading={vm.isSubmitting}
                error={vm.error}
            >
                <AdminFormField
                    label="Name"
                    required
                    description="Internal identifier (e.g., order_details_block)"
                >
                    <Input
                        value={vm.formData.name}
                        onChange={(e) => vm.handleChange('name', e.target.value)}
                        disabled={vm.isSubmitting}
                    />
                </AdminFormField>

                <AdminFormField label="Display Name" required>
                    <Input
                        value={vm.formData.display_name}
                        onChange={(e) => vm.handleChange('display_name', e.target.value)}
                        disabled={vm.isSubmitting}
                    />
                </AdminFormField>

                <AdminFormField label="Description">
                    <Textarea
                        value={vm.formData.description}
                        onChange={(e) => vm.handleChange('description', e.target.value)}
                        rows={2}
                        disabled={vm.isSubmitting}
                    />
                </AdminFormField>

                <AdminFormField
                    label="Default Content Template"
                    description="Default content when no rule matches. Supports {{variable}} placeholders."
                >
                    <Textarea
                        value={vm.formData.default_content_template}
                        onChange={(e) => vm.handleChange('default_content_template', e.target.value)}
                        rows={4}
                        className="tw:font-mono tw:text-sm"
                        disabled={vm.isSubmitting}
                    />
                </AdminFormField>

                <AdminFormField
                    label="Content Variables (JSON)"
                    description={'Define available variables as JSON (e.g., {"order_id": "string", "total": "number"})'}
                >
                    <Textarea
                        value={vm.formData.content_variables}
                        onChange={(e) => vm.handleChange('content_variables', e.target.value)}
                        rows={3}
                        className="tw:font-mono tw:text-sm"
                        disabled={vm.isSubmitting}
                    />
                </AdminFormField>

                <AdminFormField label="Insert Position" required>
                    <AdminSelect
                        options={INSERT_POSITIONS}
                        value={vm.formData.insert_position}
                        onChange={(val) => vm.handleChange('insert_position', val)}
                        disabled={vm.isSubmitting}
                    />
                </AdminFormField>

                <AdminFormField
                    label="Templates"
                    description="Select which email templates use this placeholder"
                >
                    {/* Selected templates as badges */}
                    {selectedTemplates.length > 0 && (
                        <div className="tw:mb-2 tw:flex tw:flex-wrap tw:gap-1">
                            {selectedTemplates.map((t) => (
                                <Badge key={t.id} variant="secondary" className="tw:gap-1">
                                    {t.display_name || t.name}
                                    <button
                                        type="button"
                                        onClick={() => vm.handleTemplatesChange(
                                            vm.formData.templates.filter(id => id !== t.id)
                                        )}
                                        className="tw:ml-0.5 tw:rounded-full tw:p-0.5 tw:hover:bg-foreground/10"
                                    >
                                        <X className="tw:size-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                    {/* Template selector */}
                    {availableTemplates.length > 0 && (
                        <AdminSelect
                            options={availableTemplates.map(t => ({
                                value: String(t.id),
                                label: t.display_name || t.name,
                            }))}
                            value=""
                            onChange={(val) => {
                                if (val) {
                                    vm.handleTemplatesChange([...vm.formData.templates, Number(val)]);
                                }
                            }}
                            placeholder="Add a template..."
                            disabled={vm.isSubmitting}
                        />
                    )}
                </AdminFormField>

                <div className="tw:flex tw:flex-wrap tw:gap-6">
                    <div className="tw:flex tw:items-center tw:gap-2">
                        <Checkbox
                            id="is_required"
                            checked={vm.formData.is_required}
                            onCheckedChange={(checked) => vm.handleChange('is_required', !!checked)}
                            disabled={vm.isSubmitting}
                        />
                        <Label htmlFor="is_required">Required</Label>
                    </div>
                    <div className="tw:flex tw:items-center tw:gap-2">
                        <Checkbox
                            id="allow_multiple_rules"
                            checked={vm.formData.allow_multiple_rules}
                            onCheckedChange={(checked) => vm.handleChange('allow_multiple_rules', !!checked)}
                            disabled={vm.isSubmitting}
                        />
                        <Label htmlFor="allow_multiple_rules">Allow Multiple Rules</Label>
                    </div>
                    <div className="tw:flex tw:items-center tw:gap-2">
                        <Checkbox
                            id="is_active"
                            checked={vm.formData.is_active}
                            onCheckedChange={(checked) => vm.handleChange('is_active', !!checked)}
                            disabled={vm.isSubmitting}
                        />
                        <Label htmlFor="is_active">Active</Label>
                    </div>
                </div>

                {vm.formData.allow_multiple_rules && (
                    <AdminFormField
                        label="Content Separator"
                        description="Separator between multiple rule contents (e.g., <br/> or newline)"
                    >
                        <Input
                            value={vm.formData.content_separator}
                            onChange={(e) => vm.handleChange('content_separator', e.target.value)}
                            disabled={vm.isSubmitting}
                        />
                    </AdminFormField>
                )}
            </AdminFormLayout>
        </AdminPage>
    );
};

export default EmailPlaceholderForm;
