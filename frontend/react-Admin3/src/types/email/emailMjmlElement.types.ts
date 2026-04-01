export interface EmailMjmlElement {
    id: number;
    element_type:
        | 'heading_1'
        | 'heading_2'
        | 'heading_3'
        | 'paragraph'
        | 'table'
        | 'bold'
        | 'italic'
        | 'link'
        | 'horizontal_divider'
        | 'unordered_list'
        | 'ordered_list'
        | 'callout_info'
        | 'callout_warning'
        | 'callout_success'
        | 'callout_error';
    display_name: string;
    description: string;
    mjml_template: string;
    is_active: boolean;
    updated_at: string;
}
