export type RuleType = 'product_based' | 'user_attribute' | 'order_value' | 'location_based' | 'date_based' | 'custom_condition';

export type ConditionOperator = 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'regex_match' | 'exists' | 'not_exists';

export interface AdditionalCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logic?: 'AND' | 'OR';
}

export interface EmailContentRule {
  id: number;
  name: string;
  description: string;
  rule_type: RuleType;
  placeholder: number;
  placeholder_name?: string;
  condition_field: string;
  condition_operator: ConditionOperator;
  condition_value: any;
  additional_conditions: AdditionalCondition[];
  custom_logic: string;
  priority: number;
  is_exclusive: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

export interface EmailTemplateContentRule {
  id: number;
  template: number;
  content_rule: number;
  is_enabled: boolean;
  priority_override: number | null;
  content_override: string;
  created_at: string;
  effective_priority: number;
}
