/**
 * Reverse-translates MJML content back to the markdown-like syntax
 * used by the Basic Mode editor.
 *
 * This is a best-effort conversion: it recognises MJML blocks produced
 * by markdownToMjml (headings, paragraphs, lists, callouts, tables,
 * dividers) and extracts the text content back into markdown form.
 *
 * Classification priority: mj-class → css-class → fallback text extraction.
 */
export function mjmlToMarkdown(mjml: string): string {
    if (!mjml.trim()) return '';

    const blocks: string[] = [];
    const remaining = mjml.trim();

    // Split into top-level mj-* blocks
    const mjBlocks = splitMjBlocks(remaining);

    for (const block of mjBlocks) {
        const md = convertMjBlockToMarkdown(block);
        if (md !== null) {
            blocks.push(md);
        }
    }

    return blocks.join('\n\n');
}

// --- Block Splitting ---

function splitMjBlocks(mjml: string): string[] {
    const blocks: string[] = [];
    // Match <mj-text ...>...</mj-text> and <mj-divider ... /> blocks
    const blockRegex = /<mj-(?:text|divider)\b[^>]*(?:\/>|>[\s\S]*?<\/mj-(?:text|divider)>)/gi;
    let match;
    while ((match = blockRegex.exec(mjml)) !== null) {
        blocks.push(match[0]);
    }
    return blocks;
}

// --- Block Classification & Conversion ---

function convertMjBlockToMarkdown(block: string): string | null {
    // Divider
    if (/^<mj-divider\b/i.test(block)) {
        return '---';
    }

    // Classify by mj-class first, then fall back to css-class
    const mjClass = extractAttr(block, 'mj-class');
    const cssClass = extractAttr(block, 'css-class');
    const cls = mjClass || cssClass || '';

    // Detect alignment from classes
    const alignment = extractAlignment(cls);

    // Callout: callout-(info|warning|success|error)
    const calloutMatch = cls.match(/\bcallout-(info|warning|success|error)\b/);
    if (calloutMatch) {
        const variant = calloutMatch[1];
        const text = extractTextContent(block);
        return `[!${variant}] ${text}`;
    }

    // Unordered list
    if (/\bul\b/.test(cls) && !calloutMatch) {
        const items = extractListItems(block);
        return items.map((item) => `- ${item}`).join('\n');
    }

    // Ordered list
    if (/\bol\b/.test(cls) && !calloutMatch) {
        const items = extractListItems(block);
        return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
    }

    // Table / order-items
    if (/\btable\b/.test(cls) || /\border-items\b/.test(cls) || cssClass === 'order-items') {
        return extractTable(block);
    }

    // Headings
    let md: string | null = null;

    if (/\bemail-title\b/.test(cls)) {
        md = `# ${extractTextContent(block)}`;
    } else if (/\bh2\b/.test(cls)) {
        md = `## ${extractTextContent(block)}`;
    } else if (/\bh3\b/.test(cls)) {
        md = `### ${extractTextContent(block)}`;
    } else if (cssClass === 'email-subtitle') {
        // Legacy css-class fallback
        md = `## ${extractTextContent(block)}`;
    } else if (cssClass === 'email-heading3') {
        // Legacy css-class fallback
        md = `### ${extractTextContent(block)}`;
    } else if (cssClass === 'content-text') {
        md = extractTextContent(block);
    } else {
        // Fallback: try to extract any text content
        const text = extractTextContent(block);
        md = text || null;
    }

    if (md !== null && alignment) {
        md = applyAlignmentMarkers(md, alignment);
    }

    return md;
}

// --- Alignment ---

function extractAlignment(cls: string): 'center' | 'right' | 'left' | null {
    if (/\btext-center\b/.test(cls)) return 'center';
    if (/\btext-right\b/.test(cls)) return 'right';
    if (/\btext-start\b/.test(cls)) return 'left';
    return null;
}

function applyAlignmentMarkers(md: string, alignment: 'center' | 'right' | 'left'): string {
    switch (alignment) {
        case 'center':
            return `>> ${md} <<`;
        case 'right':
            return `>>>> ${md}`;
        case 'left':
            return `${md} <<<<`;
        default:
            return md;
    }
}

// --- List Item Extraction ---

function extractListItems(mjBlock: string): string[] {
    const items: string[] = [];
    const liRegex = /<li>([\s\S]*?)<\/li>/gi;
    let match;
    while ((match = liRegex.exec(mjBlock)) !== null) {
        const text = reverseInlines(match[1].trim());
        items.push(text);
    }
    return items;
}

// --- Attribute extraction ---

function extractAttr(tag: string, attrName: string): string | null {
    const regex = new RegExp(`${attrName}="([^"]*)"`, 'i');
    const match = tag.match(regex);
    return match ? match[1] : null;
}

// --- Text Content Extraction ---

function extractTextContent(mjBlock: string): string {
    // Get inner content of <mj-text ...>INNER</mj-text>
    const innerMatch = mjBlock.match(/<mj-text[^>]*>([\s\S]*?)<\/mj-text>/i);
    if (!innerMatch) return '';

    let inner = innerMatch[1].trim();

    // Strip wrapping <span ...>...</span> if present
    inner = stripOuterSpan(inner);

    // Reverse inline elements back to markdown
    inner = reverseInlines(inner);

    return inner.trim();
}

function stripOuterSpan(html: string): string {
    // Match a single wrapping <span ...>content</span>
    const match = html.match(/^<span[^>]*>([\s\S]*)<\/span>$/i);
    return match ? match[1].trim() : html;
}

// --- Inline Reversal ---

function reverseInlines(html: string): string {
    let result = html;

    // Reverse links: <a href="url" ...>text</a> → [text](url)
    result = result.replace(
        /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
        (_, url, text) => `[${text}](${url})`
    );

    // Reverse bold: <strong>text</strong> → **text**
    result = result.replace(
        /<strong>([\s\S]*?)<\/strong>/gi,
        (_, text) => `**${text}**`
    );

    // Reverse italic: <em>text</em> → *text*
    result = result.replace(
        /<em>([\s\S]*?)<\/em>/gi,
        (_, text) => `*${text}*`
    );

    return result;
}

// --- Table Extraction ---

function extractTable(mjBlock: string): string | null {
    const innerMatch = mjBlock.match(/<mj-text[^>]*>([\s\S]*?)<\/mj-text>/i);
    if (!innerMatch) return null;

    const tableHtml = innerMatch[1];

    // Extract header cells
    const headers: string[] = [];
    const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    let thMatch;
    while ((thMatch = thRegex.exec(tableHtml)) !== null) {
        headers.push(thMatch[1].trim());
    }

    // Extract body rows from <tbody>
    const rows: string[][] = [];
    const tbodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    if (tbodyMatch) {
        const bodyTrRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let bodyTrMatch;
        while ((bodyTrMatch = bodyTrRegex.exec(tbodyMatch[1])) !== null) {
            const cells: string[] = [];
            const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            let tdMatch;
            while ((tdMatch = tdRegex.exec(bodyTrMatch[1])) !== null) {
                cells.push(extractCellText(tdMatch[1]));
            }
            if (cells.length > 0) {
                rows.push(cells);
            }
        }
    }

    if (headers.length === 0) return null;

    // Build markdown table
    const headerLine = `| ${headers.join(' | ')} |`;
    const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
    const bodyLines = rows.map((row) => `| ${row.join(' | ')} |`);

    return [headerLine, separatorLine, ...bodyLines].join('\n');
}

function extractCellText(cellHtml: string): string {
    let text = cellHtml;
    // Strip <div>, <span>, and other inline wrappers
    text = text.replace(/<\/?(?:div|span|p)[^>]*>/gi, '');
    // Reverse inline formatting
    text = reverseInlines(text);
    return text.trim();
}
