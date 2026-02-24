export type SettingType = 'smtp' | 'queue' | 'tracking' | 'template' | 'security' | 'performance' | 'integration';

export interface EmailSettings {
  id: number;
  key: string;
  setting_type: SettingType;
  display_name: string;
  description: string;
  value: any;
  default_value: any;
  is_required: boolean;
  is_sensitive: boolean;
  validation_rules: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: number | null;
}
