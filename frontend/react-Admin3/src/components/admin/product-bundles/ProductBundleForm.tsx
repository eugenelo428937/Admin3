import React from 'react';
import { Navigate } from 'react-router-dom';
import {
    AdminPage,
    AdminFormLayout,
    AdminFormField,
    AdminSelect,
    AdminLoadingState,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Textarea } from '@/components/admin/ui/textarea';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { Label } from '@/components/admin/ui/label';
import useProductBundleFormVM from './useProductBundleFormVM';

const AdminProductBundleForm: React.FC = () => {
    const vm = useProductBundleFormVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;

    if (vm.loading) {
        return (
            <AdminPage>
                <AdminLoadingState rows={6} columns={1} />
            </AdminPage>
        );
    }

    return (
        <AdminPage>
            <AdminFormLayout
                title={
                    vm.isEditMode
                        ? 'Edit Product Bundle'
                        : 'Create Product Bundle'
                }
                onSubmit={vm.handleSubmit}
                onCancel={vm.handleCancel}
                error={vm.error}
                submitLabel={
                    vm.isEditMode
                        ? 'Update Product Bundle'
                        : 'Create Product Bundle'
                }
            >
                <AdminFormField label="Bundle Name" required>
                    <Input
                        name="bundle_name"
                        value={vm.formData.bundle_name}
                        onChange={vm.handleChange}
                        placeholder="Enter bundle name"
                        required
                    />
                </AdminFormField>

                <AdminFormField label="Subject">
                    <AdminSelect
                        value={String(vm.formData.subject || '')}
                        onChange={(value) => {
                            const syntheticEvent = {
                                target: {
                                    name: 'subject',
                                    value,
                                    type: 'select',
                                },
                            } as React.ChangeEvent<HTMLInputElement>;
                            vm.handleChange(syntheticEvent);
                        }}
                        placeholder="Select a subject"
                        options={vm.subjects.map((subject) => ({
                            value: String(subject.id),
                            label: subject.code,
                        }))}
                    />
                </AdminFormField>

                <AdminFormField label="Description">
                    <Textarea
                        name="description"
                        value={vm.formData.description}
                        onChange={vm.handleChange}
                        rows={3}
                        placeholder="Enter bundle description"
                    />
                </AdminFormField>

                <div className="tw:flex tw:items-center tw:gap-2">
                    <Checkbox
                        id="is_featured"
                        checked={vm.formData.is_featured}
                        onCheckedChange={(checked) => {
                            const syntheticEvent = {
                                target: {
                                    name: 'is_featured',
                                    type: 'checkbox',
                                    checked: Boolean(checked),
                                    value: '',
                                },
                            } as React.ChangeEvent<HTMLInputElement>;
                            vm.handleChange(syntheticEvent);
                        }}
                    />
                    <Label htmlFor="is_featured">Featured</Label>
                </div>

                <div className="tw:flex tw:items-center tw:gap-2">
                    <Checkbox
                        id="is_active"
                        checked={vm.formData.is_active}
                        onCheckedChange={(checked) => {
                            const syntheticEvent = {
                                target: {
                                    name: 'is_active',
                                    type: 'checkbox',
                                    checked: Boolean(checked),
                                    value: '',
                                },
                            } as React.ChangeEvent<HTMLInputElement>;
                            vm.handleChange(syntheticEvent);
                        }}
                    />
                    <Label htmlFor="is_active">Active</Label>
                </div>

                <AdminFormField label="Display Order">
                    <Input
                        name="display_order"
                        type="number"
                        value={vm.formData.display_order}
                        onChange={vm.handleChange}
                        placeholder="Enter display order"
                        min={0}
                    />
                </AdminFormField>
            </AdminFormLayout>
        </AdminPage>
    );
};

export default AdminProductBundleForm;
