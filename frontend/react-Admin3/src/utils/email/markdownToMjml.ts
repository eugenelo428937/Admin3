import { EmailMjmlElement } from '../../types/email/emailMjmlElement.types';

/**
 * Converts a markdown string to MJML using database-stored element templates.
 *
 * Block elements (heading, paragraph, table, divider) produce complete mj-* tags.
 * Inline elements (bold, italic, link) produce HTML fragments within block content.
 */
export function markdownToMjml(
    markdown: string,
    elements: EmailMjmlElement[]
): string {
    if (!markdown.trim()) return '';

    const elementMap = new Map(elements.map((e) => [e.element_type, e]));
    const blocks = splitIntoBlocks(markdown);

    return blocks.map((block) => convertBlock(block, elementMap)).join('\n');
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
    const firstLine = block.split('\n')[0];

    // Heading 3 (must check before heading 2 and 1)
    if (/^### (.+)/.test(firstLine)) {
        const content = firstLine.replace(/^### /, '');
        return applyBlockTemplate(elementMap, 'heading_3', processInlines(content, elementMap));
    }

    // Heading 2
    if (/^## (.+)/.test(firstLine)) {
        const content = firstLine.replace(/^## /, '');
        return applyBlockTemplate(elementMap, 'heading_2', processInlines(content, elementMap));
    }

    // Heading 1
    if (/^# (.+)/.test(firstLine)) {
        const content = firstLine.replace(/^# /, '');
        return applyBlockTemplate(elementMap, 'heading_1', processInlines(content, elementMap));
    }

    // Horizontal divider
    if (/^(-{3,}|\*{3,})$/.test(firstLine.trim())) {
        const element = elementMap.get('horizontal_divider');
        return element ? element.mjml_template : '<mj-divider />';
    }

    // Table
    const lines = block.split('\n');
    if (lines.length >= 2 && /^\|.+\|/.test(firstLine) && /^\|[\s\-:|]+\|/.test(lines[1])) {
        return convertTable(lines, elementMap);
    }

    // Default: paragraph
    const content = processInlines(block, elementMap);
    return applyBlockTemplate(elementMap, 'paragraph', content);
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

// --- Table Conversion ---

function convertTable(
    lines: string[],
    elementMap: Map<string, EmailMjmlElement>
): string {
    const headerCells = parsePipeRow(lines[0]);
    const dataRows = lines.slice(2).map(parsePipeRow);

    const headersHtml = headerCells
        .map(
            (cell) =>
                `<th style="padding:12px;text-align:center;border:none">${cell}</th>`
        )
        .join('');

    const rowsHtml = dataRows
        .map((row) => {
            const cells = row
                .map(
                    (cell) =>
                        `<td style="padding:15px 12px;border:none;text-align:left">${cell}</td>`
                )
                .join('');
            return `<tr style="border-bottom:1px solid #dee2e6">${cells}</tr>`;
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
