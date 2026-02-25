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
        | 'horizontal_divider';
    display_name: string;
    description: string;
    mjml_template: string;
    is_active: boolean;
    updated_at: string;
}
