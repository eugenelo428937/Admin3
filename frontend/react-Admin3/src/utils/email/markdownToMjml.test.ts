import { markdownToMjml } from './markdownToMjml';
import { EmailMjmlElement } from '../../types/email/emailMjmlElement.types';

// Default test elements matching the updated mj-class templates
const testElements: EmailMjmlElement[] = [
    {
        id: 1, element_type: 'heading_1', display_name: 'Heading 1', description: '',
        mjml_template: '<mj-text mj-class="email-title">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 2, element_type: 'heading_2', display_name: 'Heading 2', description: '',
        mjml_template: '<mj-text mj-class="h2">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 3, element_type: 'heading_3', display_name: 'Heading 3', description: '',
        mjml_template: '<mj-text mj-class="h3">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 4, element_type: 'paragraph', display_name: 'Paragraph', description: '',
        mjml_template: '<mj-text>{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 5, element_type: 'table', display_name: 'Table', description: '',
        mjml_template:
            '<mj-text mj-class="table"><table style="width:100%;border-collapse:collapse;margin:0"><thead><tr>{{headers}}</tr></thead><tbody>{{rows}}</tbody></table></mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 6, element_type: 'bold', display_name: 'Bold', description: '',
        mjml_template: '<strong>{{content}}</strong>',
        is_active: true, updated_at: '',
    },
    {
        id: 7, element_type: 'italic', display_name: 'Italic', description: '',
        mjml_template: '<em>{{content}}</em>',
        is_active: true, updated_at: '',
    },
    {
        id: 8, element_type: 'link', display_name: 'Link', description: '',
        mjml_template: '<a href="{{url}}" style="color:#3498db">{{content}}</a>',
        is_active: true, updated_at: '',
    },
    {
        id: 9, element_type: 'horizontal_divider', display_name: 'Horizontal Divider', description: '',
        mjml_template: '<mj-divider border-color="#dee2e6" padding="16px 0" />',
        is_active: true, updated_at: '',
    },
    {
        id: 10, element_type: 'unordered_list', display_name: 'Unordered List', description: '',
        mjml_template: '<mj-text mj-class="ul"><ul>{{items}}</ul></mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 11, element_type: 'ordered_list', display_name: 'Ordered List', description: '',
        mjml_template: '<mj-text mj-class="ol"><ol>{{items}}</ol></mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 12, element_type: 'callout_info', display_name: 'Callout (Info)', description: '',
        mjml_template: '<mj-text mj-class="callout-info">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 13, element_type: 'callout_warning', display_name: 'Callout (Warning)', description: '',
        mjml_template: '<mj-text mj-class="callout-warning">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 14, element_type: 'callout_success', display_name: 'Callout (Success)', description: '',
        mjml_template: '<mj-text mj-class="callout-success">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
    {
        id: 15, element_type: 'callout_error', display_name: 'Callout (Error)', description: '',
        mjml_template: '<mj-text mj-class="callout-error">{{content}}</mj-text>',
        is_active: true, updated_at: '',
    },
];

describe('markdownToMjml', () => {
    // --- Block elements ---

    test('converts heading 1', () => {
        const result = markdownToMjml('# Hello World', testElements);
        expect(result).toContain('mj-class="email-title"');
        expect(result).toContain('Hello World');
        expect(result).not.toContain('# Hello');
    });

    test('converts heading 2', () => {
        const result = markdownToMjml('## Sub Heading', testElements);
        expect(result).toContain('mj-class="h2"');
        expect(result).toContain('Sub Heading');
    });

    test('converts heading 3', () => {
        const result = markdownToMjml('### Small Heading', testElements);
        expect(result).toContain('mj-class="h3"');
        expect(result).toContain('Small Heading');
    });

    test('converts paragraph text', () => {
        const result = markdownToMjml('Hello this is a paragraph.', testElements);
        expect(result).toContain('<mj-text>');
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
        expect(result).toContain('mj-class="email-title"');
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
    });

    // --- Alignment ---

    test('center alignment with >> <<', () => {
        const result = markdownToMjml('>> # Title <<', testElements);
        expect(result).toContain('mj-class="email-title text-center"');
        expect(result).toContain('Title');
        expect(result).not.toContain('>>');
        expect(result).not.toContain('<<');
    });

    test('right alignment with >>>>', () => {
        const result = markdownToMjml('>>>> # Title', testElements);
        expect(result).toContain('mj-class="email-title text-right"');
        expect(result).toContain('Title');
    });

    test('explicit left alignment with <<<<', () => {
        const result = markdownToMjml('# Title <<<<', testElements);
        expect(result).toContain('mj-class="email-title text-start"');
        expect(result).toContain('Title');
    });

    test('alignment on paragraph', () => {
        const result = markdownToMjml('>> Hello world <<', testElements);
        expect(result).toContain('mj-class="text-center"');
        expect(result).toContain('Hello world');
    });

    test('no alignment markers keeps default', () => {
        const result = markdownToMjml('# Plain Title', testElements);
        expect(result).toContain('mj-class="email-title"');
        expect(result).not.toContain('text-center');
        expect(result).not.toContain('text-right');
        expect(result).not.toContain('text-start');
    });

    // --- Lists ---

    test('converts unordered list', () => {
        const result = markdownToMjml('- Item one\n- Item two\n- Item three', testElements);
        expect(result).toContain('mj-class="ul"');
        expect(result).toContain('<ul>');
        expect(result).toContain('<li>Item one</li>');
        expect(result).toContain('<li>Item two</li>');
        expect(result).toContain('<li>Item three</li>');
        expect(result).toContain('</ul>');
    });

    test('converts ordered list', () => {
        const result = markdownToMjml('1. First\n2. Second\n3. Third', testElements);
        expect(result).toContain('mj-class="ol"');
        expect(result).toContain('<ol>');
        expect(result).toContain('<li>First</li>');
        expect(result).toContain('<li>Second</li>');
        expect(result).toContain('</ol>');
    });

    test('list with inline formatting', () => {
        const result = markdownToMjml('- **Bold item**\n- *Italic item*', testElements);
        expect(result).toContain('<li><strong>Bold item</strong></li>');
        expect(result).toContain('<li><em>Italic item</em></li>');
    });

    // --- Callouts ---

    test('converts info callout', () => {
        const result = markdownToMjml('[!info] Important notice here.', testElements);
        expect(result).toContain('mj-class="callout-info"');
        expect(result).toContain('Important notice here.');
    });

    test('converts warning callout', () => {
        const result = markdownToMjml('[!warning] Check your details.', testElements);
        expect(result).toContain('mj-class="callout-warning"');
        expect(result).toContain('Check your details.');
    });

    test('converts success callout', () => {
        const result = markdownToMjml('[!success] Submission received.', testElements);
        expect(result).toContain('mj-class="callout-success"');
    });

    test('converts error callout', () => {
        const result = markdownToMjml('[!error] Payment failed.', testElements);
        expect(result).toContain('mj-class="callout-error"');
    });

    test('multiline callout', () => {
        const result = markdownToMjml('[!info] Line one\ncontinues here.', testElements);
        expect(result).toContain('mj-class="callout-info"');
        expect(result).toContain('Line one');
        expect(result).toContain('continues here.');
    });

    // --- Table highlighting ---

    test('column-level highlighting', () => {
        const md = '| Subject | Date |\n| ---{!info} | --- |\n| CB2 | 15.04 |';
        const result = markdownToMjml(md, testElements);
        expect(result).toContain('background-color:#d1ecf1');
    });

    test('row-level highlighting', () => {
        const md = '| Subject | Date |\n| --- | --- |\n{!warning}| CB2 | 15.04 |';
        const result = markdownToMjml(md, testElements);
        expect(result).toContain('background-color:#fff3cd');
    });

    test('cell-level highlighting', () => {
        const md = '| Subject | Date |\n| --- | --- |\n| CB2 | {!error}15.04 |';
        const result = markdownToMjml(md, testElements);
        expect(result).toContain('background-color:#f8d7da');
    });

    // --- Table column alignment ---

    test('default alignment is left for body, left for header', () => {
        const md = '| Name | Price |\n| --- | --- |\n| Widget | £10 |';
        const result = markdownToMjml(md, testElements);
        expect(result).toContain('<th style="padding:12px;text-align:left;border:none;">Name</th>');
        expect(result).toContain('<td style="padding:15px 12px;border:none;text-align:left;">Widget</td>');
    });

    test('center alignment with :---:', () => {
        const md = '| Name | Price |\n| :---: | :---: |\n| Widget | £10 |';
        const result = markdownToMjml(md, testElements);
        expect(result).toContain('text-align:center');
    });

    test('right alignment with ---:', () => {
        const md = '| Name | Price |\n| --- | ---: |\n| Widget | £10 |';
        const result = markdownToMjml(md, testElements);
        // First column left, second column right
        expect(result).toMatch(/<th[^>]*text-align:left[^>]*>Name/);
        expect(result).toMatch(/<th[^>]*text-align:right[^>]*>Price/);
    });

    test('mixed alignment per column', () => {
        const md = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |';
        const result = markdownToMjml(md, testElements);
        expect(result).toMatch(/<td[^>]*text-align:left[^>]*>a/);
        expect(result).toMatch(/<td[^>]*text-align:center[^>]*>b/);
        expect(result).toMatch(/<td[^>]*text-align:right[^>]*>c/);
    });

    test('alignment combined with highlighting', () => {
        const md = '| Subject | Date |\n| :---:{!info} | ---: |\n| CB2 | 15.04 |';
        const result = markdownToMjml(md, testElements);
        // First column: centered + info highlight
        expect(result).toMatch(/<th[^>]*text-align:center[^>]*background-color:#d1ecf1/);
        // Second column: right-aligned
        expect(result).toMatch(/<td[^>]*text-align:right/);
    });
});
