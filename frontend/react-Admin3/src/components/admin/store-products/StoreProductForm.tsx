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
import { Checkbox } from '@/components/admin/ui/checkbox';
import { Label } from '@/components/admin/ui/label';
import useStoreProductFormVM from './useStoreProductFormVM';

const AdminStoreProductForm: React.FC = () => {
    const vm = useStoreProductFormVM();

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
                title={vm.isEditMode ? 'Edit Store Product' : 'Add New Store Product'}
                onSubmit={vm.handleSubmit}
                onCancel={vm.handleCancel}
                error={vm.error}
                submitLabel={
                    vm.isEditMode ? 'Update Store Product' : 'Create Store Product'
                }
            >
                {vm.isEditMode && vm.formData.product_code && (
                    <AdminFormField label="Product Code">
                        <Input
                            name="product_code"
                            value={vm.formData.product_code}
                            disabled
                            readOnly
                        />
                        <p className="tw:mt-1 tw:text-xs tw:text-admin-fg-muted">
                            Product code is auto-generated and cannot be changed
                        </p>
                    </AdminFormField>
                )}

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

                <AdminFormField label="Product Product Variation">
                    <AdminSelect
                        value={String(vm.formData.product_product_variation || '')}
                        onChange={(value) => {
                            const syntheticEvent = {
                                target: {
                                    name: 'product_product_variation',
                                    value,
                                    type: 'select',
                                },
                            } as React.ChangeEvent<HTMLInputElement>;
                            vm.handleChange(syntheticEvent);
                        }}
                        placeholder="Select a product product variation"
                        options={vm.productProductVariations.map((ppv: any) => ({
                            value: String(ppv.id),
                            label: `${ppv.product_code || ppv.product?.code || ''} - ${ppv.variation_code || ppv.product_variation?.code || ''} (ID: ${ppv.id})`,
                        }))}
                    />
                </AdminFormField>

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
                    <Label htmlFor="is_active">Is Active</Label>
                </div>
            </AdminFormLayout>
        </AdminPage>
    );
};

export default AdminStoreProductForm;
