import React from 'react';
import { Info } from 'lucide-react';
import {
  AdminPage,
  AdminFormLayout,
  AdminFormField,
  AdminSelect,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { Label } from '@/components/admin/ui/label';
import useClosingSalutationFormVM from './useClosingSalutationFormVM';
import type { SignatureType, StaffNameFormat } from '../../../../types/email';

const SIGNATURE_TYPES: { value: string; label: string }[] = [
    { value: 'team', label: 'Team' },
    { value: 'staff', label: 'Staff' },
];

const STAFF_NAME_FORMATS: { value: string; label: string }[] = [
    { value: 'full_name', label: 'Full Name' },
    { value: 'first_name', label: 'First Name Only' },
];

const ClosingSalutationForm: React.FC = () => {
    const vm = useClosingSalutationFormVM();

    if (vm.loading) return null;

    return (
        <AdminPage className="tw:max-w-3xl">
            <AdminFormLayout
                title={vm.isEditMode ? 'Edit Closing Salutation' : 'New Closing Salutation'}
                onSubmit={(e) => { e.preventDefault(); vm.handleSubmit(); }}
                onCancel={vm.handleCancel}
                loading={vm.isSubmitting}
                error={vm.error}
            >
                <AdminFormField
                    label="Name"
                    required
                    description="Internal identifier (e.g., team_kind_regards)"
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

                <AdminFormField
                    label="Sign-off Text"
                    required
                    description='The closing phrase (e.g., "Kind Regards", "Best Wishes")'
                >
                    <Input
                        value={vm.formData.sign_off_text}
                        onChange={(e) => vm.handleChange('sign_off_text', e.target.value)}
                        disabled={vm.isSubmitting}
                    />
                </AdminFormField>

                <AdminFormField label="Signature Type" required>
                    <AdminSelect
                        options={SIGNATURE_TYPES}
                        value={vm.formData.signature_type}
                        onChange={(val) => vm.handleChange('signature_type', val)}
                        disabled={vm.isSubmitting}
                    />
                </AdminFormField>

                {vm.formData.signature_type === 'team' && (
                    <AdminFormField
                        label="Team Signature"
                        required
                        description='The team name displayed as the signature (e.g., "The ActEd Team")'
                    >
                        <Input
                            value={vm.formData.team_signature}
                            onChange={(e) => vm.handleChange('team_signature', e.target.value)}
                            disabled={vm.isSubmitting}
                        />
                    </AdminFormField>
                )}

                {vm.formData.signature_type === 'staff' && (
                    <>
                        <AdminFormField label="Staff Name Format" required>
                            <AdminSelect
                                options={STAFF_NAME_FORMATS}
                                value={vm.formData.staff_name_format}
                                onChange={(val) => vm.handleChange('staff_name_format', val)}
                                disabled={vm.isSubmitting}
                            />
                        </AdminFormField>

                        <div className="tw:flex tw:items-start tw:gap-3 tw:rounded-md tw:border tw:border-blue-200 tw:bg-blue-50 tw:p-4 tw:text-sm tw:text-blue-700">
                            <Info className="tw:mt-0.5 tw:size-4 tw:shrink-0" />
                            <p>Staff member selection will be available in a future update.</p>
                        </div>
                    </>
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

export default ClosingSalutationForm;
