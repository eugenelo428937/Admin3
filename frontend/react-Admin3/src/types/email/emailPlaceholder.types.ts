export type InsertPosition = 'replace' | 'before' | 'after' | 'append' | 'prepend';

export interface EmailContentPlaceholder {
  id: number;
  name: string;
  display_name: string;
  description: string;
  default_content_template: string;
  content_variables: Record<string, any>;
  insert_position: InsertPosition;
  templates: number[];
  is_required: boolean;
  allow_multiple_rules: boolean;
  content_separator: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
