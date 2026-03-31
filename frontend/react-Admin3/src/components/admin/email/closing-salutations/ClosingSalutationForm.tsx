import React from 'react';
import {
  AdminPage,
  AdminFormLayout,
  AdminFormField,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { Label } from '@/components/admin/ui/label';
import useClosingSalutationFormVM from './useClosingSalutationFormVM';

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

                <AdminFormField
                    label="Display Name"
                    required
                    description='The signature name shown in the email (e.g., "Eugene", "The ActEd Team")'
                >
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

                <AdminFormField
                    label="Job Title"
                    description='Optional job title shown below the signature (e.g., "IT", "Senior Tutor")'
                >
                    <Input
                        value={vm.formData.job_title}
                        onChange={(e) => vm.handleChange('job_title', e.target.value)}
                        disabled={vm.isSubmitting}
                    />
                </AdminFormField>

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
