import React, { useCallback } from 'react';
import {
    Box, TextField, MenuItem, IconButton, Button, ButtonGroup, Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
} from '@mui/icons-material';
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Primary Condition Row */}
            <Typography variant="subtitle2">Primary Condition</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                    label="Field"
                    value={conditionField}
                    onChange={(e) => handlePrimaryChange('field', e.target.value)}
                    select
                    size="small"
                    sx={{ minWidth: 180 }}
                >
                    {CONDITION_FIELDS.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                    ))}
                </TextField>
                <TextField
                    label="Operator"
                    value={conditionOperator}
                    onChange={(e) => handlePrimaryChange('operator', e.target.value)}
                    select
                    size="small"
                    sx={{ minWidth: 160 }}
                >
                    {CONDITION_OPERATORS.map(op => (
                        <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                    ))}
                </TextField>
                <TextField
                    label="Value"
                    value={conditionValue ?? ''}
                    onChange={(e) => handlePrimaryChange('value', e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                />
            </Box>

            {/* Additional Conditions */}
            {additionalConditions.length > 0 && (
                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Additional Conditions</Typography>
                    {additionalConditions.map((condition, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
                            <ButtonGroup size="small" sx={{ minWidth: 100 }}>
                                <Button
                                    variant={condition.logic === 'AND' ? 'contained' : 'outlined'}
                                    onClick={() => handleAdditionalChange(index, 'logic', 'AND')}
                                >
                                    AND
                                </Button>
                                <Button
                                    variant={condition.logic === 'OR' ? 'contained' : 'outlined'}
                                    onClick={() => handleAdditionalChange(index, 'logic', 'OR')}
                                >
                                    OR
                                </Button>
                            </ButtonGroup>
                            <TextField
                                label="Field"
                                value={condition.field}
                                onChange={(e) => handleAdditionalChange(index, 'field', e.target.value)}
                                select
                                size="small"
                                sx={{ minWidth: 160 }}
                            >
                                {CONDITION_FIELDS.map(f => (
                                    <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Operator"
                                value={condition.operator}
                                onChange={(e) => handleAdditionalChange(index, 'operator', e.target.value)}
                                select
                                size="small"
                                sx={{ minWidth: 140 }}
                            >
                                {CONDITION_OPERATORS.map(op => (
                                    <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Value"
                                value={condition.value ?? ''}
                                onChange={(e) => handleAdditionalChange(index, 'value', e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                            />
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveCondition(index)}
                            >
                                <RemoveIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            )}

            <Box>
                <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddCondition}
                >
                    Add Condition
                </Button>
            </Box>
        </Box>
    );
};

export default RuleConditionBuilder;
