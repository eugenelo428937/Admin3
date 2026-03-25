import React from 'react';
import { Navigate } from 'react-router-dom';
import {
    AdminPage,
    AdminFormLayout,
    AdminFormField,
    AdminSelect,
    AdminLoadingState,
    AdminCheckboxField,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Textarea } from '@/components/admin/ui/textarea';
import useStoreBundleFormVM from './useStoreBundleFormVM';

const AdminStoreBundleForm: React.FC = () => {
    const vm = useStoreBundleFormVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;

    if (vm.loading) {
        return (
            <AdminPage>
                <AdminLoadingState rows={4} columns={1} />
            </AdminPage>
        );
    }

    return (
        <AdminPage>
            <AdminFormLayout
                title={vm.isEditMode ? 'Edit Store Bundle' : 'Add New Store Bundle'}
                onSubmit={vm.handleSubmit}
                onCancel={vm.handleCancel}
                error={vm.error}
                submitLabel={vm.isEditMode ? 'Update Store Bundle' : 'Create Store Bundle'}
            >
                <AdminFormField label="Bundle Template">
                    <AdminSelect
                        value={String(vm.formData.bundle_template || '')}
                        onChange={(value) => {
                            const syntheticEvent = {
                                target: {
                                    name: 'bundle_template',
                                    value,
                                    type: 'select',
                                },
                            } as React.ChangeEvent<HTMLInputElement>;
                            vm.handleChange(syntheticEvent);
                        }}
                        placeholder="Select a bundle template"
                        options={vm.bundleTemplates.map((template: any) => ({
                            value: String(template.id),
                            label:
                                template.name ||
                                template.code ||
                                `Bundle Template ID: ${template.id}`,
                        }))}
                    />
                </AdminFormField>

                <AdminFormField label="Exam Session Subject">
                    <AdminSelect
                        value={String(vm.formData.exam_session_subject || '')}
                        onChange={(value) => {
                            const syntheticEvent = {
                                target: {
                                    name: 'exam_session_subject',
                                    value,
                                    type: 'select',
                                },
                            } as React.ChangeEvent<HTMLInputElement>;
                            vm.handleChange(syntheticEvent);
                        }}
                        placeholder="Select an exam session subject"
                        options={vm.examSessionSubjects.map((ess: any) => ({
                            value: String(ess.id),
                            label: `${ess.subject_code || ess.subject?.code || ''} - ${ess.session_code || ess.exam_session?.session_code || ''} (ID: ${ess.id})`,
                        }))}
                    />
                </AdminFormField>

                <AdminFormField label="Override Name">
                    <Input
                        name="override_name"
                        value={vm.formData.override_name}
                        onChange={vm.handleChange}
                    />
                    <p className="tw:mt-1 tw:text-xs tw:text-admin-fg-muted">
                        Leave blank to use the default bundle template name
                    </p>
                </AdminFormField>

                <AdminFormField label="Override Description">
                    <Textarea
                        name="override_description"
                        value={vm.formData.override_description}
                        onChange={vm.handleChange}
                        rows={3}
                    />
                    <p className="tw:mt-1 tw:text-xs tw:text-admin-fg-muted">
                        Leave blank to use the default bundle template description
                    </p>
                </AdminFormField>

                <AdminCheckboxField
                    name="is_active"
                    label="Is Active"
                    checked={vm.formData.is_active}
                    onChange={vm.handleChange}
                />
            </AdminFormLayout>
        </AdminPage>
    );
};

export default AdminStoreBundleForm;
