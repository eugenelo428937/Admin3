import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
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
import useEmailAttachmentFormVM from './useEmailAttachmentFormVM';
import type { AttachmentType } from '../../../../types/email';

const ATTACHMENT_TYPES: { value: string; label: string }[] = [
    { value: 'static', label: 'Static' },
    { value: 'dynamic', label: 'Dynamic' },
    { value: 'template', label: 'Template' },
    { value: 'external', label: 'External' },
];

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const EmailAttachmentForm: React.FC = () => {
    const vm = useEmailAttachmentFormVM();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0] || null;
        vm.handleFileSelect(file);
    }, [vm]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        vm.handleFileSelect(file);
    }, [vm]);

    if (vm.loading) return null;

    return (
        <AdminPage className="tw:max-w-3xl">
            <AdminFormLayout
                title={vm.isEditMode ? 'Edit Attachment' : 'New Attachment'}
                onSubmit={(e) => { e.preventDefault(); vm.handleSubmit(); }}
                onCancel={vm.handleCancel}
                loading={vm.isSubmitting}
                error={vm.error}
            >
                <AdminFormField label="Name" required>
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

                <AdminFormField label="Attachment Type" required>
                    <AdminSelect
                        options={ATTACHMENT_TYPES}
                        value={vm.formData.attachment_type}
                        onChange={(val) => vm.handleChange('attachment_type', val)}
                        disabled={vm.isSubmitting}
                    />
                </AdminFormField>

                <AdminFormField label="Description">
                    <Textarea
                        value={vm.formData.description}
                        onChange={(e) => vm.handleChange('description', e.target.value)}
                        rows={3}
                        disabled={vm.isSubmitting}
                    />
                </AdminFormField>

                {/* File Upload Dropzone */}
                <AdminFormField label="File">
                    {vm.currentFileInfo && !vm.selectedFile && (
                        <div className="tw:mb-2 tw:flex tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-bg-muted tw:p-3">
                            <FileText className="tw:size-5 tw:text-admin-fg-muted" />
                            <div>
                                <p className="tw:text-sm">{vm.currentFileInfo.name}</p>
                                <p className="tw:text-xs tw:text-admin-fg-muted">
                                    {formatFileSize(vm.currentFileInfo.size)}
                                </p>
                            </div>
                        </div>
                    )}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`tw:cursor-pointer tw:rounded-md tw:border-2 tw:border-dashed tw:p-6 tw:text-center tw:transition-colors ${
                            isDragOver
                                ? 'tw:border-primary tw:bg-primary/5'
                                : 'tw:border-admin-border tw:hover:border-primary/50 tw:hover:bg-admin-bg-muted'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            hidden
                            onChange={handleFileInputChange}
                        />
                        <Upload className="tw:mx-auto tw:mb-2 tw:size-8 tw:text-admin-fg-muted" />
                        {vm.selectedFile ? (
                            <div>
                                <p className="tw:text-sm">{vm.selectedFile.name}</p>
                                <p className="tw:text-xs tw:text-admin-fg-muted">
                                    {formatFileSize(vm.selectedFile.size)}
                                </p>
                            </div>
                        ) : (
                            <p className="tw:text-sm tw:text-admin-fg-muted">
                                Drag and drop a file here, or click to select
                            </p>
                        )}
                    </div>
                </AdminFormField>

                <div className="tw:flex tw:items-center tw:gap-2">
                    <Checkbox
                        id="is_conditional"
                        checked={vm.formData.is_conditional}
                        onCheckedChange={(checked) => vm.handleChange('is_conditional', !!checked)}
                        disabled={vm.isSubmitting}
                    />
                    <Label htmlFor="is_conditional">Conditional attachment</Label>
                </div>

                {vm.formData.is_conditional && (
                    <AdminFormField
                        label="Condition Rules (JSON)"
                        description="Enter condition rules as valid JSON"
                    >
                        <Textarea
                            value={vm.formData.condition_rules}
                            onChange={(e) => vm.handleChange('condition_rules', e.target.value)}
                            rows={4}
                            className="tw:font-mono tw:text-sm"
                            disabled={vm.isSubmitting}
                        />
                    </AdminFormField>
                )}

                <div className="tw:flex tw:items-center tw:gap-2">
                    <Checkbox
                        id="is_active"
                        checked={vm.formData.is_active}
                        onCheckedChange={(checked) => vm.handleChange('is_active', !!checked)}
                        disabled={vm.isSubmitting}
                    />
                    <Label htmlFor="is_active">Active</Label>
                </div>
            </AdminFormLayout>
        </AdminPage>
    );
};

export default EmailAttachmentForm;
