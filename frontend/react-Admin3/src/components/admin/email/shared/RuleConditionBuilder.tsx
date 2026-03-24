import React, { useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import { AdminSelect } from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import type { ConditionOperator, AdditionalCondition } from '../../../../types/email';

const CONDITION_FIELDS = [
    { value: 'items.product_code', label: 'Product Code' },
    { value: 'user.region', label: 'User Region' },
    { value: 'user.country', label: 'User Country' },
    { value: 'order.total', label: 'Order Total' },
    { value: 'order.items_count', label: 'Order Items Count' },
];

const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'in', label: 'In' },
    { value: 'not_in', label: 'Not In' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_equal', label: 'Greater or Equal' },
    { value: 'less_equal', label: 'Less or Equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Not Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'regex_match', label: 'Regex Match' },
    { value: 'exists', label: 'Exists' },
    { value: 'not_exists', label: 'Not Exists' },
];

export interface RuleConditionBuilderProps {
    conditionField: string;
    conditionOperator: ConditionOperator;
    conditionValue: any;
    additionalConditions: AdditionalCondition[];
    onChange: (data: {
        conditionField: string;
        conditionOperator: ConditionOperator;
        conditionValue: any;
        additionalConditions: AdditionalCondition[];
    }) => void;
}

const RuleConditionBuilder: React.FC<RuleConditionBuilderProps> = ({
    conditionField,
    conditionOperator,
    conditionValue,
    additionalConditions,
    onChange,
}) => {
    const handlePrimaryChange = useCallback(
        (field: string, value: any) => {
            onChange({
                conditionField: field === 'field' ? value : conditionField,
                conditionOperator: field === 'operator' ? value : conditionOperator,
                conditionValue: field === 'value' ? value : conditionValue,
                additionalConditions,
            });
        },
        [conditionField, conditionOperator, conditionValue, additionalConditions, onChange]
    );

    const handleAdditionalChange = useCallback(
        (index: number, field: keyof AdditionalCondition, value: any) => {
            const updated = [...additionalConditions];
            updated[index] = { ...updated[index], [field]: value };
            onChange({ conditionField, conditionOperator, conditionValue, additionalConditions: updated });
        },
        [conditionField, conditionOperator, conditionValue, additionalConditions, onChange]
    );

    const handleAddCondition = useCallback(() => {
        const newCondition: AdditionalCondition = {
            field: '',
            operator: 'equals',
            value: '',
            logic: 'AND',
        };
        onChange({
            conditionField,
            conditionOperator,
            conditionValue,
            additionalConditions: [...additionalConditions, newCondition],
        });
    }, [conditionField, conditionOperator, conditionValue, additionalConditions, onChange]);

    const handleRemoveCondition = useCallback(
        (index: number) => {
            const updated = additionalConditions.filter((_, i) => i !== index);
            onChange({ conditionField, conditionOperator, conditionValue, additionalConditions: updated });
        },
        [conditionField, conditionOperator, conditionValue, additionalConditions, onChange]
    );

    return (
        <div className="tw:space-y-4">
            {/* Primary Condition Row */}
            <Label className="tw:text-xs tw:font-medium">Primary Condition</Label>
            <div className="tw:flex tw:items-start tw:gap-2">
                <div className="tw:min-w-[180px]">
                    <AdminSelect
                        options={CONDITION_FIELDS.map(f => ({ value: f.value, label: f.label }))}
                        value={conditionField}
                        onChange={(v) => handlePrimaryChange('field', v)}
                        placeholder="Field"
                    />
                </div>
                <div className="tw:min-w-[160px]">
                    <AdminSelect
                        options={CONDITION_OPERATORS.map(op => ({ value: op.value, label: op.label }))}
                        value={conditionOperator}
                        onChange={(v) => handlePrimaryChange('operator', v)}
                        placeholder="Operator"
                    />
                </div>
                <Input
                    placeholder="Value"
                    value={conditionValue ?? ''}
                    onChange={(e) => handlePrimaryChange('value', e.target.value)}
                    className="tw:flex-1"
                />
            </div>

            {/* Additional Conditions */}
            {additionalConditions.length > 0 && (
                <div>
                    <Label className="tw:mb-2 tw:text-xs tw:font-medium">Additional Conditions</Label>
                    <div className="tw:space-y-2">
                        {additionalConditions.map((condition, index) => (
                            <div key={index} className="tw:flex tw:items-start tw:gap-2">
                                <div className="tw:flex tw:min-w-[100px]">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={condition.logic === 'AND' ? 'default' : 'outline'}
                                        onClick={() => handleAdditionalChange(index, 'logic', 'AND')}
                                        className="tw:rounded-r-none"
                                    >
                                        AND
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={condition.logic === 'OR' ? 'default' : 'outline'}
                                        onClick={() => handleAdditionalChange(index, 'logic', 'OR')}
                                        className="tw:rounded-l-none"
                                    >
                                        OR
                                    </Button>
                                </div>
                                <div className="tw:min-w-[160px]">
                                    <AdminSelect
                                        options={CONDITION_FIELDS.map(f => ({ value: f.value, label: f.label }))}
                                        value={condition.field}
                                        onChange={(v) => handleAdditionalChange(index, 'field', v)}
                                        placeholder="Field"
                                    />
                                </div>
                                <div className="tw:min-w-[140px]">
                                    <AdminSelect
                                        options={CONDITION_OPERATORS.map(op => ({ value: op.value, label: op.label }))}
                                        value={condition.operator}
                                        onChange={(v) => handleAdditionalChange(index, 'operator', v)}
                                        placeholder="Operator"
                                    />
                                </div>
                                <Input
                                    placeholder="Value"
                                    value={condition.value ?? ''}
                                    onChange={(e) => handleAdditionalChange(index, 'value', e.target.value)}
                                    className="tw:flex-1"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => handleRemoveCondition(index)}
                                    className="tw:text-admin-destructive"
                                >
                                    <Minus className="tw:size-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddCondition}
                >
                    <Plus className="tw:size-4" />
                    Add Condition
                </Button>
            </div>
        </div>
    );
};

export default RuleConditionBuilder;
