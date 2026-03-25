import React from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import {
    AdminPage,
    AdminErrorAlert,
    AdminLoadingState,
    AdminFormField,
    AdminSelect,
} from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Textarea } from '@/components/admin/ui/textarea';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { Label } from '@/components/admin/ui/label';
import { Separator } from '@/components/admin/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/admin/ui/tabs';
import useEmailContentRuleFormVM from './useEmailContentRuleFormVM';
import RuleConditionBuilder from '../shared/RuleConditionBuilder';
import RuleJsonEditor from '../shared/RuleJsonEditor';
import type { RuleType } from '../../../../types/email';

const RULE_TYPES: { value: RuleType; label: string }[] = [
    { value: 'product_based', label: 'Product Based' },
    { value: 'user_attribute', label: 'User Attribute' },
    { value: 'order_value', label: 'Order Value' },
    { value: 'location_based', label: 'Location Based' },
    { value: 'date_based', label: 'Date Based' },
    { value: 'custom_condition', label: 'Custom Condition' },
];

const EmailContentRuleForm: React.FC = () => {
    const vm = useEmailContentRuleFormVM();

    if (vm.loading) {
        return (
            <AdminPage>
                <AdminLoadingState rows={8} columns={2} />
            </AdminPage>
        );
    }

    // Map conditionMode to tab index
    const conditionTabIndex = vm.conditionMode === 'visual' ? 0 : 1;

    return (
        <AdminPage>
            <h1 className="tw:mb-6 tw:text-2xl tw:font-semibold tw:tracking-tight tw:text-admin-fg">
                {vm.isEditMode ? 'Edit Content Rule' : 'New Content Rule'}
            </h1>

            <AdminErrorAlert message={vm.error} />

            <div className="tw:rounded-md tw:border tw:border-admin-border tw:p-5">
                <div className="tw:space-y-4">
                    <AdminFormField label="Name" required>
                        <Input
                            value={vm.formData.name}
                            onChange={(e) => vm.handleChange('name', e.target.value)}
                        />
                    </AdminFormField>

                    <AdminFormField label="Description">
                        <Textarea
                            value={vm.formData.description}
                            onChange={(e) => vm.handleChange('description', e.target.value)}
                            rows={3}
                        />
                    </AdminFormField>

                    <AdminFormField label="Rule Type" required>
                        <AdminSelect
                            options={RULE_TYPES.map(opt => ({ value: opt.value, label: opt.label }))}
                            value={vm.formData.rule_type}
                            onChange={(v) => vm.handleChange('rule_type', v)}
                        />
                    </AdminFormField>

                    <AdminFormField label="Placeholder" required>
                        <AdminSelect
                            options={[
                                { value: '', label: 'Select a placeholder' },
                                ...vm.placeholders.map(p => ({
                                    value: String(p.id),
                                    label: p.display_name || p.name,
                                })),
                            ]}
                            value={vm.formData.placeholder ? String(vm.formData.placeholder) : ''}
                            onChange={(v) => vm.handleChange('placeholder', v ? Number(v) : '')}
                        />
                    </AdminFormField>

                    <div className="tw:flex tw:items-center tw:gap-6">
                        <div className="tw:w-36">
                            <AdminFormField label="Priority">
                                <Input
                                    type="number"
                                    value={vm.formData.priority}
                                    onChange={(e) => vm.handleChange('priority', parseInt(e.target.value, 10) || 0)}
                                />
                            </AdminFormField>
                        </div>
                        <div className="tw:flex tw:items-center tw:gap-2 tw:pt-5">
                            <Checkbox
                                id="cb-exclusive"
                                checked={vm.formData.is_exclusive}
                                onCheckedChange={(checked) => vm.handleChange('is_exclusive', Boolean(checked))}
                            />
                            <Label htmlFor="cb-exclusive">Exclusive</Label>
                        </div>
                        <div className="tw:flex tw:items-center tw:gap-2 tw:pt-5">
                            <Checkbox
                                id="cb-active"
                                checked={vm.formData.is_active}
                                onCheckedChange={(checked) => vm.handleChange('is_active', Boolean(checked))}
                            />
                            <Label htmlFor="cb-active">Active</Label>
                        </div>
                    </div>

                    <Separator />

                    {/* Condition Section */}
                    <h3 className="tw:text-base tw:font-semibold tw:text-admin-fg">Condition</h3>

                    <Tabs
                        value={conditionTabIndex}
                        onValueChange={(idx) => vm.toggleConditionMode(idx === 0 ? 'visual' : 'json')}
                    >
                        <TabsList>
                            <TabsTrigger>Visual Builder</TabsTrigger>
                            <TabsTrigger>JSON</TabsTrigger>
                        </TabsList>

                        <TabsContent value={conditionTabIndex} index={0}>
                            <RuleConditionBuilder
                                conditionField={vm.formData.condition_field}
                                conditionOperator={vm.formData.condition_operator}
                                conditionValue={vm.formData.condition_value}
                                additionalConditions={vm.formData.additional_conditions}
                                onChange={vm.handleConditionChange}
                            />
                        </TabsContent>

                        <TabsContent value={conditionTabIndex} index={1}>
                            <RuleJsonEditor
                                value={vm.jsonCondition}
                                onChange={vm.handleJsonConditionChange}
                                error={vm.jsonConditionError}
                            />
                        </TabsContent>
                    </Tabs>

                    <Separator />

                    <AdminFormField label="Custom Logic" description="Advanced custom logic expression (optional)">
                        <Textarea
                            value={vm.formData.custom_logic}
                            onChange={(e) => vm.handleChange('custom_logic', e.target.value)}
                            rows={4}
                            className="tw:font-mono tw:text-sm"
                        />
                    </AdminFormField>

                    <div className="tw:flex tw:justify-end tw:gap-2 tw:pt-4">
                        <Button
                            variant="outline"
                            onClick={vm.handleCancel}
                            disabled={vm.isSubmitting}
                        >
                            <X className="tw:size-4" />
                            Cancel
                        </Button>
                        <Button
                            onClick={vm.handleSubmit}
                            disabled={vm.isSubmitting}
                        >
                            {vm.isSubmitting ? (
                                <Loader2 className="tw:size-4 tw:animate-spin" />
                            ) : (
                                <Save className="tw:size-4" />
                            )}
                            {vm.isSubmitting ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            </div>
        </AdminPage>
    );
};

export default EmailContentRuleForm;
