/**
 * Pretty-prints MJML/XML/HTML with indentation.
 *
 * - Every tag (MJML and HTML) on its own line
 * - Each attribute on its own indented line (when 2+ attributes)
 * - Text content on its own indented line
 * - Closing tags on their own line
 */
export function formatMjml(mjml: string, indent: string = '\t'): string {
    if (!mjml.trim()) return '';

    const tokens = tokenize(mjml);
    const lines: string[] = [];
    let depth = 0;

    for (const token of tokens) {
        const pad = indent.repeat(depth);
        const pad1 = indent.repeat(depth + 1);

        if (token.type === 'close') {
            depth = Math.max(0, depth - 1);
            lines.push(`${indent.repeat(depth)}</${token.tagName}>`);
        } else if (token.type === 'self-close') {
            lines.push(...formatTag(token.raw, pad, pad1, true));
        } else if (token.type === 'open') {
            lines.push(...formatTag(token.raw, pad, pad1, false));
            depth++;
        } else if (token.type === 'text') {
            const trimmed = token.raw.trim();
            if (trimmed) {
                lines.push(`${pad}${trimmed}`);
            }
        }
    }

    return lines.join('\n');
}

// --- Tag Formatting ---

const ATTR_REGEX = /([\w-]+)="([^"]*)"/g;

function formatTag(
    raw: string,
    pad: string,
    attrPad: string,
    selfClosing: boolean,
): string[] {
    const tagName = extractTagName(raw);
    const attrs = parseAttributes(raw);
    const closing = selfClosing ? ' />' : '>';

    if (attrs.length === 0) {
        return [`${pad}<${tagName}${closing}`];
    }

    if (attrs.length === 1) {
        return [`${pad}<${tagName} ${attrs[0]}${closing}`];
    }

    // Multiple attributes: each on its own line
    const result: string[] = [`${pad}<${tagName}`];
    for (let i = 0; i < attrs.length; i++) {
        const isLast = i === attrs.length - 1;
        result.push(`${attrPad}${attrs[i]}${isLast ? closing : ''}`);
    }
    return result;
}

function parseAttributes(tag: string): string[] {
    const attrs: string[] = [];
    let match;
    ATTR_REGEX.lastIndex = 0;
    while ((match = ATTR_REGEX.exec(tag)) !== null) {
        attrs.push(`${match[1]}="${match[2]}"`);
    }
    return attrs;
}

// --- Tokenizer ---

interface Token {
    type: 'open' | 'close' | 'self-close' | 'text';
    raw: string;
    tagName?: string;
}

const TAG_REGEX = /<\/?[\w-]+(?:\s[^>]*)?\/?>/g;

function tokenize(mjml: string): Token[] {
    const tokens: Token[] = [];
    let lastIndex = 0;

    let match;
    TAG_REGEX.lastIndex = 0;

    while ((match = TAG_REGEX.exec(mjml)) !== null) {
        const before = mjml.slice(lastIndex, match.index);
        const tag = match[0];
        lastIndex = match.index + tag.length;

        const tagName = extractTagName(tag);
        const isSelfClosing = tag.endsWith('/>');
        const isClosing = tag.startsWith('</');

        if (before.trim()) {
            tokens.push({ type: 'text', raw: before });
        }

        if (isSelfClosing) {
            tokens.push({ type: 'self-close', raw: tag, tagName });
        } else if (isClosing) {
            tokens.push({ type: 'close', raw: tag, tagName });
        } else {
            tokens.push({ type: 'open', raw: tag, tagName });
        }
    }

    const trailing = mjml.slice(lastIndex);
    if (trailing.trim()) {
        tokens.push({ type: 'text', raw: trailing });
    }

    return tokens;
}

function extractTagName(tag: string): string {
    const match = tag.match(/<\/?(\w[\w-]*)/);
    return match ? match[1] : '';
}
