import { mjmlToMarkdown } from './mjmlToMarkdown';

describe('mjmlToMarkdown', () => {
    test('converts mj-class heading to # markdown', () => {
        const mjml = '<mj-section><mj-column><mj-text mj-class="email-title">Hello</mj-text></mj-column></mj-section>';
        expect(mjmlToMarkdown(mjml)).toBe('# Hello');
    });

    test('converts mj-class h2 to ## markdown', () => {
        const mjml = '<mj-text mj-class="h2">Sub</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('## Sub');
    });

    test('converts mj-class h3 to ### markdown', () => {
        const mjml = '<mj-text mj-class="h3">Small</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('### Small');
    });

    test('converts centered heading', () => {
        const mjml = '<mj-text mj-class="email-title text-center">Title</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('>> # Title <<');
    });

    test('converts right-aligned heading', () => {
        const mjml = '<mj-text mj-class="h2 text-right">Title</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('>>>> ## Title');
    });

    test('converts left-explicit heading', () => {
        const mjml = '<mj-text mj-class="h3 text-start">Title</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('### Title <<<<');
    });

    test('converts unordered list', () => {
        const mjml = '<mj-text mj-class="ul"><ul><li>One</li><li>Two</li></ul></mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('- One\n- Two');
    });

    test('converts ordered list', () => {
        const mjml = '<mj-text mj-class="ol"><ol><li>First</li><li>Second</li></ol></mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('1. First\n2. Second');
    });

    test('converts callout info', () => {
        const mjml = '<mj-text mj-class="callout-info">Important notice.</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('[!info] Important notice.');
    });

    test('converts callout warning', () => {
        const mjml = '<mj-text mj-class="callout-warning">Be careful.</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('[!warning] Be careful.');
    });

    test('converts plain paragraph', () => {
        const mjml = '<mj-text>Hello world.</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('Hello world.');
    });

    test('converts divider', () => {
        const mjml = '<mj-divider border-color="#dee2e6" />';
        expect(mjmlToMarkdown(mjml)).toBe('---');
    });

    test('reverses bold inline', () => {
        const mjml = '<mj-text>This is <strong>bold</strong> text.</mj-text>';
        expect(mjmlToMarkdown(mjml)).toBe('This is **bold** text.');
    });

    test('returns empty for empty input', () => {
        expect(mjmlToMarkdown('')).toBe('');
    });
});
