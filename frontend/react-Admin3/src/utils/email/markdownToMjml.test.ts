import { markdownToMjml } from './markdownToMjml';
import { EmailMjmlElement } from '../../types/email/emailMjmlElement.types';

// Default test elements matching the seed data
const testElements: EmailMjmlElement[] = [
    {
        id: 1,
        element_type: 'heading_1',
        display_name: 'Heading 1',
        description: '',
        mjml_template:
            '<mj-text padding-top="32px" padding-bottom="16px" align="center" css-class="email-title" font-size="21px"><span style="color:#2c3e50;margin:0;font-size:21px;font-weight:600">{{content}}</span></mj-text>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 2,
        element_type: 'heading_2',
        display_name: 'Heading 2',
        description: '',
        mjml_template:
            '<mj-text padding-top="24px" padding-bottom="12px" align="center" css-class="email-subtitle" font-size="18px"><span style="color:#2c3e50;margin:0;font-size:18px;font-weight:600">{{content}}</span></mj-text>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 3,
        element_type: 'heading_3',
        display_name: 'Heading 3',
        description: '',
        mjml_template:
            '<mj-text padding-top="16px" padding-bottom="8px" align="left" css-class="email-heading3" font-size="16px"><span style="color:#2c3e50;margin:0;font-size:16px;font-weight:600">{{content}}</span></mj-text>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 4,
        element_type: 'paragraph',
        display_name: 'Paragraph',
        description: '',
        mjml_template:
            '<mj-text padding-bottom="24px" align="left" css-class="content-text"><span>{{content}}</span></mj-text>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 5,
        element_type: 'table',
        display_name: 'Table',
        description: '',
        mjml_template:
            '<mj-text padding="0 24px 24px 24px" align="left" css-class="order-items"><table style="width:100%;border-collapse:collapse;margin:0"><thead><tr style="background-color:#ececee;color:#2c3e50">{{headers}}</tr></thead><tbody>{{rows}}</tbody></table></mj-text>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 6,
        element_type: 'bold',
        display_name: 'Bold',
        description: '',
        mjml_template: '<strong>{{content}}</strong>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 7,
        element_type: 'italic',
        display_name: 'Italic',
        description: '',
        mjml_template: '<em>{{content}}</em>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 8,
        element_type: 'link',
        display_name: 'Link',
        description: '',
        mjml_template: '<a href="{{url}}" style="color:#3498db">{{content}}</a>',
        is_active: true,
        updated_at: '',
    },
    {
        id: 9,
        element_type: 'horizontal_divider',
        display_name: 'Horizontal Divider',
        description: '',
        mjml_template: '<mj-divider border-color="#dee2e6" padding="16px 0" />',
        is_active: true,
        updated_at: '',
    },
];

describe('markdownToMjml', () => {
    // --- Block elements ---

    test('converts heading 1', () => {
        const result = markdownToMjml('# Hello World', testElements);
        expect(result).toContain('font-size:21px');
        expect(result).toContain('Hello World');
        expect(result).not.toContain('# Hello');
    });

    test('converts heading 2', () => {
        const result = markdownToMjml('## Sub Heading', testElements);
        expect(result).toContain('font-size:18px');
        expect(result).toContain('Sub Heading');
    });

    test('converts heading 3', () => {
        const result = markdownToMjml('### Small Heading', testElements);
        expect(result).toContain('font-size:16px');
        expect(result).toContain('Small Heading');
    });

    test('converts paragraph text', () => {
        const result = markdownToMjml('Hello this is a paragraph.', testElements);
        expect(result).toContain('content-text');
        expect(result).toContain('Hello this is a paragraph.');
    });

    test('converts horizontal divider', () => {
        const result = markdownToMjml('---', testElements);
        expect(result).toContain('mj-divider');
        expect(result).toContain('border-color="#dee2e6"');
    });

    test('converts table with headers and rows', () => {
        const md = '| Name | Price |\n| --- | --- |\n| Widget | £10 |';
        const result = markdownToMjml(md, testElements);
        expect(result).toContain('<thead>');
        expect(result).toContain('Name');
        expect(result).toContain('Price');
        expect(result).toContain('Widget');
        expect(result).toContain('£10');
    });

    // --- Inline elements ---

    test('converts bold text within paragraph', () => {
        const result = markdownToMjml('This is **bold** text.', testElements);
        expect(result).toContain('<strong>bold</strong>');
        expect(result).toContain('content-text');
    });

    test('converts italic text within paragraph', () => {
        const result = markdownToMjml('This is *italic* text.', testElements);
        expect(result).toContain('<em>italic</em>');
    });

    test('converts link within paragraph', () => {
        const result = markdownToMjml(
            'Visit [our site](https://example.com) today.',
            testElements
        );
        expect(result).toContain('href="https://example.com"');
        expect(result).toContain('>our site</a>');
    });

    // --- Multiple blocks ---

    test('converts multiple blocks separated by blank lines', () => {
        const md = '# Title\n\nSome paragraph text.\n\n---\n\nAnother paragraph.';
        const result = markdownToMjml(md, testElements);
        expect(result).toContain('email-title');
        expect(result).toContain('Some paragraph text.');
        expect(result).toContain('mj-divider');
        expect(result).toContain('Another paragraph.');
    });

    // --- Edge cases ---

    test('returns empty string for empty input', () => {
        const result = markdownToMjml('', testElements);
        expect(result).toBe('');
    });

    test('returns empty string for whitespace-only input', () => {
        const result = markdownToMjml('   \n\n   ', testElements);
        expect(result).toBe('');
    });

    test('passes through template placeholders untouched', () => {
        const result = markdownToMjml(
            'Your total is {{ order.total }}.',
            testElements
        );
        expect(result).toContain('{{ order.total }}');
    });

    test('handles bold and italic in same paragraph', () => {
        const result = markdownToMjml(
            'This is **bold** and *italic* text.',
            testElements
        );
        expect(result).toContain('<strong>bold</strong>');
        expect(result).toContain('<em>italic</em>');
    });

    test('handles table with multiple rows', () => {
        const md =
            '| Item | Qty | Price |\n| --- | --- | --- |\n| Widget | 2 | £10 |\n| Gadget | 1 | £25 |';
        const result = markdownToMjml(md, testElements);
        expect(result).toContain('Widget');
        expect(result).toContain('Gadget');
        // Should have 2 data rows
        const rowMatches = result.match(/<tr style="border-bottom/g);
        expect(rowMatches).toHaveLength(2);
    });
});
