import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type {
    EmailContentRule,
    EmailContentPlaceholder,
    RuleType,
    ConditionOperator,
    AdditionalCondition,
} from '../../../../types/email';

interface ContentRuleFormData {
    name: string;
    description: string;
    rule_type: RuleType;
    placeholder: number | '';
    condition_field: string;
    condition_operator: ConditionOperator;
    condition_value: any;
    additional_conditions: AdditionalCondition[];
    custom_logic: string;
    priority: number;
    is_exclusive: boolean;
    is_active: boolean;
}

const initialFormData: ContentRuleFormData = {
    name: '',
    description: '',
    rule_type: 'product_based',
    placeholder: '',
    condition_field: '',
    condition_operator: 'equals',
    condition_value: '',
    additional_conditions: [],
    custom_logic: '',
    priority: 0,
    is_exclusive: false,
    is_active: true,
};

export type ConditionMode = 'visual' | 'json';

export interface EmailContentRuleFormVM {
    formData: ContentRuleFormData;
    conditionMode: ConditionMode;
    placeholders: EmailContentPlaceholder[];
    loading: boolean;
    error: string | null;
    isSubmitting: boolean;
    isEditMode: boolean;
    jsonCondition: string;
    jsonConditionError: string | null;
    handleChange: (field: keyof ContentRuleFormData, value: any) => void;
    handleConditionChange: (data: {
        conditionField: string;
        conditionOperator: ConditionOperator;
        conditionValue: any;
        additionalConditions: AdditionalCondition[];
    }) => void;
    handleJsonConditionChange: (value: string) => void;
    toggleConditionMode: (mode: ConditionMode) => void;
    handleSubmit: () => Promise<void>;
    handleCancel: () => void;
}

/**
 * Convert visual condition fields to a JSON object representation.
 */
const visualToJson = (formData: ContentRuleFormData): string => {
    const obj: Record<string, any> = {
        field: formData.condition_field,
        operator: formData.condition_operator,
        value: formData.condition_value,
    };
    if (formData.additional_conditions.length > 0) {
        obj.additional_conditions = formData.additional_conditions;
    }
    return JSON.stringify(obj, null, 2);
};

/**
 * Convert a JSON condition string back to visual condition fields.
 */
const jsonToVisual = (jsonStr: string): Partial<ContentRuleFormData> | null => {
    try {
        const obj = JSON.parse(jsonStr);
        return {
            condition_field: obj.field || '',
            condition_operator: obj.operator || 'equals',
            condition_value: obj.value ?? '',
            additional_conditions: Array.isArray(obj.additional_conditions)
                ? obj.additional_conditions
                : [],
        };
    } catch {
        return null;
    }
};

const useEmailContentRuleFormVM = (): EmailContentRuleFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id && id !== 'new');

    const [formData, setFormData] = useState<ContentRuleFormData>(initialFormData);
    const [conditionMode, setConditionMode] = useState<ConditionMode>('visual');
    const [placeholders, setPlaceholders] = useState<EmailContentPlaceholder[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [jsonCondition, setJsonCondition] = useState<string>('{}');
    const [jsonConditionError, setJsonConditionError] = useState<string | null>(null);

    const fetchPlaceholders = useCallback(async () => {
        try {
            const { results } = await emailService.getPlaceholders({ page_size: 100 });
            setPlaceholders(results as EmailContentPlaceholder[]);
        } catch (err: any) {
            console.error('Error fetching placeholders:', err);
        }
    }, []);

    const fetchRule = useCallback(async () => {
        if (!id || id === 'new') return;
        try {
            setLoading(true);
            const rule: EmailContentRule = await emailService.getContentRuleById(Number(id));
            setFormData({
                name: rule.name,
                description: rule.description,
                rule_type: rule.rule_type,
                placeholder: rule.placeholder,
                condition_field: rule.condition_field,
                condition_operator: rule.condition_operator,
                condition_value: rule.condition_value,
                additional_conditions: rule.additional_conditions || [],
                custom_logic: rule.custom_logic,
                priority: rule.priority,
                is_exclusive: rule.is_exclusive,
                is_active: rule.is_active,
            });
            // Initialize JSON representation
            setJsonCondition(visualToJson({
                ...initialFormData,
                condition_field: rule.condition_field,
                condition_operator: rule.condition_operator,
                condition_value: rule.condition_value,
                additional_conditions: rule.additional_conditions || [],
            }));
            setError(null);
        } catch (err: any) {
            console.error('Error fetching content rule:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to load content rule.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPlaceholders();
        if (isEditMode) {
            fetchRule();
        }
    }, [isEditMode, fetchRule, fetchPlaceholders]);

    const handleChange = useCallback((field: keyof ContentRuleFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleConditionChange = useCallback((data: {
        conditionField: string;
        conditionOperator: ConditionOperator;
        conditionValue: any;
        additionalConditions: AdditionalCondition[];
    }) => {
        setFormData(prev => ({
            ...prev,
            condition_field: data.conditionField,
            condition_operator: data.conditionOperator,
            condition_value: data.conditionValue,
            additional_conditions: data.additionalConditions,
        }));
        // Keep JSON in sync
        setJsonCondition(visualToJson({
            ...formData,
            condition_field: data.conditionField,
            condition_operator: data.conditionOperator,
            condition_value: data.conditionValue,
            additional_conditions: data.additionalConditions,
        }));
    }, [formData]);

    const handleJsonConditionChange = useCallback((value: string) => {
        setJsonCondition(value);
        try {
            JSON.parse(value);
            setJsonConditionError(null);
        } catch {
            setJsonConditionError('Invalid JSON');
        }
    }, []);

    const toggleConditionMode = useCallback((mode: ConditionMode) => {
        if (mode === 'json' && conditionMode === 'visual') {
            // Visual -> JSON: serialize current visual state
            setJsonCondition(visualToJson(formData));
            setJsonConditionError(null);
        } else if (mode === 'visual' && conditionMode === 'json') {
            // JSON -> Visual: parse JSON back into visual fields
            const parsed = jsonToVisual(jsonCondition);
            if (parsed) {
                setFormData(prev => ({ ...prev, ...parsed }));
                setJsonConditionError(null);
            } else {
                setJsonConditionError('Cannot convert to visual mode: invalid JSON structure');
                return; // Don't switch mode if conversion fails
            }
        }
        setConditionMode(mode);
    }, [conditionMode, formData, jsonCondition]);

    const handleSubmit = useCallback(async () => {
        try {
            setIsSubmitting(true);
            setError(null);

            // If in JSON mode, sync JSON back to form fields before submit
            if (conditionMode === 'json') {
                const parsed = jsonToVisual(jsonCondition);
                if (parsed) {
                    Object.assign(formData, parsed);
                }
            }

            const submitData: Partial<EmailContentRule> = {
                name: formData.name,
                description: formData.description,
                rule_type: formData.rule_type,
                placeholder: formData.placeholder as number,
                condition_field: formData.condition_field,
                condition_operator: formData.condition_operator,
                condition_value: formData.condition_value,
                additional_conditions: formData.additional_conditions,
                custom_logic: formData.custom_logic,
                priority: formData.priority,
                is_exclusive: formData.is_exclusive,
                is_active: formData.is_active,
            };

            if (isEditMode && id) {
                await emailService.updateContentRule(Number(id), submitData);
            } else {
                await emailService.createContentRule(submitData);
            }

            navigate('/admin/email/content-rules');
        } catch (err: any) {
            console.error('Error saving content rule:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to save content rule.');
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, conditionMode, jsonCondition, isEditMode, id, navigate]);

    const handleCancel = useCallback(() => {
        navigate('/admin/email/content-rules');
    }, [navigate]);

    return {
        formData,
        conditionMode,
        placeholders,
        loading,
        error,
        isSubmitting,
        isEditMode,
        jsonCondition,
        jsonConditionError,
        handleChange,
        handleConditionChange,
        handleJsonConditionChange,
        toggleConditionMode,
        handleSubmit,
        handleCancel,
    };
};

export default useEmailContentRuleFormVM;
