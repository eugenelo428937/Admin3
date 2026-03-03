/**
 * Reverse-translates MJML content back to the markdown-like syntax
 * used by the Basic Mode editor.
 *
 * This is a best-effort conversion: it recognises MJML blocks produced
 * by markdownToMjml (headings, paragraphs, tables, dividers) and extracts
 * the text content back into markdown form.
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

    // Classify by css-class attribute
    const cssClass = extractAttr(block, 'css-class');

    if (cssClass === 'email-title') {
        return `# ${extractTextContent(block)}`;
    }
    if (cssClass === 'email-subtitle') {
        return `## ${extractTextContent(block)}`;
    }
    if (cssClass === 'email-heading3') {
        return `### ${extractTextContent(block)}`;
    }
    if (cssClass === 'order-items') {
        return extractTable(block);
    }
    if (cssClass === 'content-text') {
        return extractTextContent(block);
    }

    // Fallback: try to extract any text content from unknown mj-text blocks
    const text = extractTextContent(block);
    return text || null;
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
