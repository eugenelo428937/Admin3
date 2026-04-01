import { EmailMjmlElement } from '../../types/email/emailMjmlElement.types';

/**
 * Converts a markdown string to MJML using database-stored element templates.
 *
 * Block elements (heading, paragraph, table, divider, list, callout) produce complete mj-* tags.
 * Inline elements (bold, italic, link) produce HTML fragments within block content.
 */
export function markdownToMjml(
    markdown: string,
    elements: EmailMjmlElement[]
): string {
    if (!markdown.trim()) return '';

    const elementMap = new Map(elements.map((e) => [e.element_type, e]));
    const blocks = splitIntoBlocks(markdown);

    const content = blocks.map((block) => convertBlock(block, elementMap)).join('\n');

    // Wrap in section/column so the output is valid inside <mj-wrapper>
    return `<mj-section><mj-column>\n${content}\n</mj-column></mj-section>`;
}

// --- Alignment ---

type Alignment = 'center' | 'right' | 'left' | null;

const HIGHLIGHT_COLORS: Record<string, string> = {
    info: '#d1ecf1',
    warning: '#fff3cd',
    success: '#d4edda',
    error: '#f8d7da',
};

function extractAlignment(block: string): { content: string; alignment: Alignment } {
    let text = block;

    // Center: >> content <<
    if (/^>>/.test(text) && /<<\s*$/.test(text)) {
        text = text.replace(/^>>\s*/, '').replace(/\s*<<\s*$/, '');
        return { content: text, alignment: 'center' };
    }

    // Right: >>>> content
    if (/^>>>>\s*/.test(text)) {
        text = text.replace(/^>>>>\s*/, '');
        return { content: text, alignment: 'right' };
    }

    // Left explicit: content <<<<
    if (/\s*<<<<\s*$/.test(text)) {
        text = text.replace(/\s*<<<<\s*$/, '');
        return { content: text, alignment: 'left' };
    }

    return { content: text, alignment: null };
}

function injectAlignment(mjml: string, alignment: Alignment): string {
    if (!alignment) return mjml;

    const alignClass =
        alignment === 'center' ? 'text-center' :
        alignment === 'right' ? 'text-right' :
        'text-start';

    // If mj-class exists, append
    if (/mj-class="([^"]*)"/.test(mjml)) {
        return mjml.replace(/mj-class="([^"]*)"/, `mj-class="$1 ${alignClass}"`);
    }

    // If no mj-class, add one to the first mj-text tag
    return mjml.replace(/<mj-text/, `<mj-text mj-class="${alignClass}"`);
}

// --- Block Splitting ---

function splitIntoBlocks(markdown: string): string[] {
    const lines = markdown.split(/\r?\n/);
    const blocks: string[] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
        if (line.trim() === '') {
            if (currentBlock.length > 0) {
                blocks.push(currentBlock.join('\n'));
                currentBlock = [];
            }
        } else {
            currentBlock.push(line);
        }
    }

    if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'));
    }

    return blocks;
}

// --- Block Classification & Conversion ---

function convertBlock(
    block: string,
    elementMap: Map<string, EmailMjmlElement>
): string {
    // Extract alignment markers first
    const { content: alignedBlock, alignment } = extractAlignment(block);
    const firstLine = alignedBlock.split('\n')[0];

    // Heading 3 (must check before heading 2 and 1)
    if (/^### (.+)/.test(firstLine)) {
        const content = firstLine.replace(/^### /, '');
        const mjml = applyBlockTemplate(elementMap, 'heading_3', processInlines(content, elementMap));
        return injectAlignment(mjml, alignment);
    }

    // Heading 2
    if (/^## (.+)/.test(firstLine)) {
        const content = firstLine.replace(/^## /, '');
        const mjml = applyBlockTemplate(elementMap, 'heading_2', processInlines(content, elementMap));
        return injectAlignment(mjml, alignment);
    }

    // Heading 1
    if (/^# (.+)/.test(firstLine)) {
        const content = firstLine.replace(/^# /, '');
        const mjml = applyBlockTemplate(elementMap, 'heading_1', processInlines(content, elementMap));
        return injectAlignment(mjml, alignment);
    }

    // Horizontal divider
    if (/^(-{3,}|\*{3,})$/.test(firstLine.trim())) {
        const element = elementMap.get('horizontal_divider');
        return element ? element.mjml_template : '<mj-divider />';
    }

    // Callout: [!variant] content
    const calloutMatch = firstLine.match(/^\[!(info|warning|success|error)\]\s*(.*)/);
    if (calloutMatch) {
        const variant = calloutMatch[1];
        const lines = alignedBlock.split('\n');
        // First line: strip the [!variant] prefix
        lines[0] = calloutMatch[2];
        const content = processInlines(lines.join('<br/>'), elementMap);
        const mjml = applyBlockTemplate(elementMap, `callout_${variant}`, content);
        return injectAlignment(mjml, alignment);
    }

    // Unordered list: lines starting with "- "
    const lines = alignedBlock.split('\n');
    if (lines.every((l) => /^- /.test(l))) {
        const items = lines
            .map((l) => `<li>${processInlines(l.replace(/^- /, ''), elementMap)}</li>`)
            .join('');
        const mjml = applyListTemplate(elementMap, 'unordered_list', items);
        return injectAlignment(mjml, alignment);
    }

    // Ordered list: lines starting with "N. "
    if (lines.every((l) => /^\d+\. /.test(l))) {
        const items = lines
            .map((l) => `<li>${processInlines(l.replace(/^\d+\. /, ''), elementMap)}</li>`)
            .join('');
        const mjml = applyListTemplate(elementMap, 'ordered_list', items);
        return injectAlignment(mjml, alignment);
    }

    // Table
    if (lines.length >= 2 && /^\|.+\|/.test(firstLine) && /^\|[\s\-:|]*(\{!(?:info|warning|success|error)\})?[\s\-:|]*\|/.test(lines[1])) {
        return convertTable(lines, elementMap);
    }

    // Default: paragraph
    const content = processInlines(alignedBlock, elementMap);
    const mjml = applyBlockTemplate(elementMap, 'paragraph', content);
    return injectAlignment(mjml, alignment);
}

function applyBlockTemplate(
    elementMap: Map<string, EmailMjmlElement>,
    elementType: string,
    content: string
): string {
    const element = elementMap.get(elementType);
    if (!element) return content;
    return element.mjml_template.replace(/\{\{content\}\}/g, content);
}

function applyListTemplate(
    elementMap: Map<string, EmailMjmlElement>,
    elementType: string,
    items: string
): string {
    const element = elementMap.get(elementType);
    if (!element) return items;
    return element.mjml_template.replace(/\{\{items\}\}/g, items);
}

// --- Table Conversion ---

function convertTable(
    lines: string[],
    elementMap: Map<string, EmailMjmlElement>
): string {
    const headerCells = parsePipeRow(lines[0]);
    const separatorCells = parsePipeRow(lines[1]);
    const dataLines = lines.slice(2);

    // Extract column-level highlights and alignment from separator row
    const columnHighlights: (string | null)[] = separatorCells.map((cell) => {
        const match = cell.match(/\{!(info|warning|success|error)\}/);
        return match ? match[1] : null;
    });

    const columnAligns: string[] = separatorCells.map((cell) => {
        // Strip highlight marker for alignment detection
        const clean = cell.replace(/\{!(?:info|warning|success|error)\}/, '').trim();
        const left = clean.startsWith(':');
        const right = clean.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        return 'left';
    });

    // Build header HTML
    const headersHtml = headerCells
        .map((cell, i) => {
            const align = columnAligns[i] || 'center';
            const bg = columnHighlights[i] ? `background-color:${HIGHLIGHT_COLORS[columnHighlights[i]!]};` : '';
            return `<th style="padding:12px;text-align:${align};border:none;${bg}">${cell}</th>`;
        })
        .join('');

    // Build body rows
    const rowsHtml = dataLines
        .map((line) => {
            // Check for row-level highlight
            const rowMatch = line.match(/^\{!(info|warning|success|error)\}/);
            const rowHighlight = rowMatch ? rowMatch[1] : null;
            const cleanLine = rowMatch ? line.replace(/^\{!(info|warning|success|error)\}/, '') : line;

            const cells = parsePipeRow(cleanLine);
            const cellsHtml = cells
                .map((cell, i) => {
                    // Check for cell-level highlight
                    const cellMatch = cell.match(/^\{!(info|warning|success|error)\}/);
                    const cellHighlight = cellMatch ? cellMatch[1] : null;
                    const cleanCell = cellMatch ? cell.replace(/^\{!(info|warning|success|error)\}/, '').trim() : cell;

                    // Priority: cell > row > column > zebra (zebra handled by CSS)
                    const highlight = cellHighlight || rowHighlight || columnHighlights[i];
                    const bg = highlight ? `background-color:${HIGHLIGHT_COLORS[highlight]};` : '';
                    const align = columnAligns[i] || 'left';
                    return `<td style="padding:15px 12px;border:none;text-align:${align};${bg}">${cleanCell}</td>`;
                })
                .join('');

            const rowBg = rowHighlight && !cells.some((c) => /^\{!/.test(c))
                ? ` style="background-color:${HIGHLIGHT_COLORS[rowHighlight]}"`
                : ' style="border-bottom:1px solid #dee2e6"';
            return `<tr${rowBg}>${cellsHtml}</tr>`;
        })
        .join('');

    const element = elementMap.get('table');
    if (!element) return `<table>${headersHtml}${rowsHtml}</table>`;

    return element.mjml_template
        .replace(/\{\{headers\}\}/g, headersHtml)
        .replace(/\{\{rows\}\}/g, rowsHtml);
}

function parsePipeRow(line: string): string[] {
    return line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell !== '');
}

// --- Inline Processing ---

function processInlines(
    text: string,
    elementMap: Map<string, EmailMjmlElement>
): string {
    let result = text;

    // 1. Bold: **text**
    const boldElement = elementMap.get('bold');
    if (boldElement) {
        result = result.replace(
            /\*\*(.+?)\*\*/g,
            (_, content) => boldElement.mjml_template.replace(/\{\{content\}\}/g, content)
        );
    }

    // 2. Italic: *text* (not preceded by *)
    const italicElement = elementMap.get('italic');
    if (italicElement) {
        result = result.replace(
            /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
            (_, content) => italicElement.mjml_template.replace(/\{\{content\}\}/g, content)
        );
    }

    // 3. Link: [text](url)
    const linkElement = elementMap.get('link');
    if (linkElement) {
        result = result.replace(
            /\[(.+?)\]\((.+?)\)/g,
            (_, content, url) =>
                linkElement.mjml_template
                    .replace(/\{\{content\}\}/g, content)
                    .replace(/\{\{url\}\}/g, url)
        );
    }

    return result;
}
