import React, { useState, useCallback, useEffect } from 'react';
import {
    Bold,
    Italic,
    Link,
    Minus,
    Table,
    Heading1,
    Heading2,
    Heading3,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    CircleAlert,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Palette,
    Rows3,
    Columns3,
    SquareIcon,
    Info,
} from 'lucide-react';
import { Button } from '@/components/admin/ui/button';
import { Separator } from '@/components/admin/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/admin/ui/dropdown-menu';
import { EditorView } from 'codemirror';

interface BasicModeToolbarProps {
    editorViewRef: React.RefObject<EditorView | null>;
    disabled?: boolean;
}

type InsertAction = (view: EditorView) => void;

// --- Highlight colors matching markdownToMjml ---
const HIGHLIGHT_VARIANTS = [
    { label: 'Info', variant: 'info', color: '#d1ecf1' },
    { label: 'Warning', variant: 'warning', color: '#fff3cd' },
    { label: 'Success', variant: 'success', color: '#d4edda' },
    { label: 'Error', variant: 'error', color: '#f8d7da' },
];

// --- Cursor context detection ---

interface CursorContext {
    inTable: boolean;
    tableStartLine: number;
    tableSeparatorLine: number;
    currentLineIndex: number; // 0-based line within the table
    currentColIndex: number;  // 0-based column the cursor is in
}

function getCursorContext(view: EditorView): CursorContext {
    const { from } = view.state.selection.main;
    const cursorLine = view.state.doc.lineAt(from);
    const cursorLineNum = cursorLine.number; // 1-based
    const doc = view.state.doc;

    // Check if current line looks like a table row
    const cursorText = cursorLine.text.trim();
    const isTableLine = /^\|/.test(cursorText) || /^\{!(?:info|warning|success|error)\}\|/.test(cursorText);

    if (!isTableLine) {
        return { inTable: false, tableStartLine: 0, tableSeparatorLine: 0, currentLineIndex: 0, currentColIndex: 0 };
    }

    // Walk up to find table start
    let tableStart = cursorLineNum;
    for (let i = cursorLineNum - 1; i >= 1; i--) {
        const lineText = doc.line(i).text.trim();
        if (/^\|/.test(lineText) || /^\{!/.test(lineText)) {
            tableStart = i;
        } else {
            break;
        }
    }

    // Walk down to find table end
    let tableEnd = cursorLineNum;
    for (let i = cursorLineNum + 1; i <= doc.lines; i++) {
        const lineText = doc.line(i).text.trim();
        if (/^\|/.test(lineText) || /^\{!/.test(lineText)) {
            tableEnd = i;
        } else {
            break;
        }
    }

    // Find separator line (contains ---)
    let separatorLine = 0;
    for (let i = tableStart; i <= tableEnd; i++) {
        if (/^\|[\s\-:|]*\|/.test(doc.line(i).text.trim())) {
            const cells = doc.line(i).text.split('|').filter(c => c.trim() !== '');
            if (cells.every(c => /^[\s\-:{}!a-z]*$/.test(c.trim()))) {
                separatorLine = i;
                break;
            }
        }
    }

    // Determine which column the cursor is in
    const beforeCursor = view.state.sliceDoc(cursorLine.from, from);
    const pipeCount = (beforeCursor.match(/\|/g) || []).length;
    const currentColIndex = Math.max(0, pipeCount - 1);

    return {
        inTable: true,
        tableStartLine: tableStart,
        tableSeparatorLine: separatorLine,
        currentLineIndex: cursorLineNum - tableStart,
        currentColIndex,
    };
}

// --- Editor helpers ---

function wrapSelection(
    view: EditorView,
    before: string,
    after: string,
    placeholder: string
): void {
    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);
    const text = selected || placeholder;
    const insert = `${before}${text}${after}`;

    view.dispatch({
        changes: { from, to, insert },
        selection: {
            anchor: from + before.length,
            head: from + before.length + text.length,
        },
    });
    view.focus();
}

function prefixLine(view: EditorView, prefix: string): void {
    const { from, to } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    const selected = view.state.sliceDoc(from, to);
    const text = selected || 'Heading';
    const insert = `${prefix}${text}`;

    view.dispatch({
        changes: { from: line.from, to: Math.max(to, line.from), insert },
        selection: {
            anchor: line.from + prefix.length,
            head: line.from + prefix.length + text.length,
        },
    });
    view.focus();
}

function insertAtCursor(view: EditorView, text: string): void {
    const { from } = view.state.selection.main;
    view.dispatch({
        changes: { from, insert: text },
        selection: { anchor: from + text.length },
    });
    view.focus();
}

function wrapLineAlignment(view: EditorView, before: string, after: string): void {
    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    const lineText = view.state.sliceDoc(line.from, line.to);
    let clean = lineText
        .replace(/^>>>>\s*/, '')
        .replace(/^>>\s*/, '')
        .replace(/\s*<<<<\s*$/, '')
        .replace(/\s*<<\s*$/, '')
        .trim();
    const insert = `${before}${clean}${after}`;
    view.dispatch({ changes: { from: line.from, to: line.to, insert } });
    view.focus();
}

// --- Table-aware alignment ---

function applyTableColumnAlignment(view: EditorView, alignment: 'left' | 'center' | 'right'): void {
    const ctx = getCursorContext(view);
    if (!ctx.inTable || !ctx.tableSeparatorLine) return;

    const sepLine = view.state.doc.line(ctx.tableSeparatorLine);
    const cells = sepLine.text.split('|').filter(c => c !== '');
    const colIndex = ctx.currentColIndex;
    if (colIndex >= cells.length) return;

    // Strip highlight marker for manipulation, preserve it
    const cell = cells[colIndex].trim();
    const highlightMatch = cell.match(/(\{!(?:info|warning|success|error)\})/);
    const highlight = highlightMatch ? highlightMatch[1] : '';

    // Build new separator cell
    let newCell: string;
    switch (alignment) {
        case 'center': newCell = ` :---:${highlight} `; break;
        case 'right': newCell = ` ---:${highlight} `; break;
        default: newCell = ` :---${highlight} `; break;
    }

    cells[colIndex] = newCell;
    const newLine = `|${cells.join('|')}|`;
    view.dispatch({ changes: { from: sepLine.from, to: sepLine.to, insert: newLine } });
    view.focus();
}

// --- Table palette: apply highlight ---

function applyTableHighlight(
    view: EditorView,
    variant: string,
    target: 'cell' | 'row' | 'column'
): void {
    const ctx = getCursorContext(view);
    if (!ctx.inTable) return;

    const marker = `{!${variant}}`;
    const { from } = view.state.selection.main;
    const doc = view.state.doc;

    if (target === 'cell') {
        // Insert marker at the start of the current cell content
        const line = doc.lineAt(from);
        const lineText = line.text;
        const pipes: { index: number }[] = [];
        const pipeRe = /\|/g;
        let m: RegExpExecArray | null;
        while ((m = pipeRe.exec(lineText)) !== null) pipes.push({ index: m.index });
        const colIndex = ctx.currentColIndex;

        if (colIndex < 0 || colIndex >= pipes.length - 1) return;
        // Content starts after the pipe at colIndex
        const cellStart = line.from + (pipes[colIndex]?.index ?? 0) + 1;

        // Strip existing marker at cell start
        const afterPipe = view.state.sliceDoc(cellStart, cellStart + 30);
        const existingMarker = afterPipe.match(/^\s*\{!(?:info|warning|success|error)\}/);
        if (existingMarker) {
            view.dispatch({ changes: { from: cellStart, to: cellStart + existingMarker[0].length, insert: ` ${marker}` } });
        } else {
            view.dispatch({ changes: { from: cellStart, insert: `${marker}` } });
        }
    } else if (target === 'row') {
        // Insert marker before the row's leading |
        const line = doc.lineAt(from);
        const lineText = line.text;
        // Strip existing row marker
        const existingRowMarker = lineText.match(/^\{!(?:info|warning|success|error)\}/);
        if (existingRowMarker) {
            view.dispatch({
                changes: { from: line.from, to: line.from + existingRowMarker[0].length, insert: marker },
            });
        } else {
            view.dispatch({ changes: { from: line.from, insert: marker } });
        }
    } else if (target === 'column') {
        // Add marker to the separator row for this column
        if (!ctx.tableSeparatorLine) return;
        const sepLine = doc.line(ctx.tableSeparatorLine);
        const cells = sepLine.text.split('|').filter(c => c !== '');
        const colIndex = ctx.currentColIndex;
        if (colIndex >= cells.length) return;

        const cell = cells[colIndex];
        // Strip existing highlight
        const cleaned = cell.replace(/\{!(?:info|warning|success|error)\}/, '').trim();
        cells[colIndex] = ` ${cleaned}${marker} `;
        const newLine = `|${cells.join('|')}|`;
        view.dispatch({ changes: { from: sepLine.from, to: sepLine.to, insert: newLine } });
    }

    view.focus();
}

// --- Toolbar actions ---

const TOOLBAR_ACTIONS: { label: string; icon: React.ReactNode; action: InsertAction; group: string }[] = [
    {
        label: 'Heading 1',
        icon: <Heading1 className="tw:size-4" />,
        group: 'headings',
        action: (view) => prefixLine(view, '# '),
    },
    {
        label: 'Heading 2',
        icon: <Heading2 className="tw:size-3.5" />,
        group: 'headings',
        action: (view) => prefixLine(view, '## '),
    },
    {
        label: 'Heading 3',
        icon: <Heading3 className="tw:size-3" />,
        group: 'headings',
        action: (view) => prefixLine(view, '### '),
    },
    {
        label: 'Bold',
        icon: <Bold className="tw:size-4" />,
        group: 'format',
        action: (view) => wrapSelection(view, '**', '**', 'bold'),
    },
    {
        label: 'Italic',
        icon: <Italic className="tw:size-4" />,
        group: 'format',
        action: (view) => wrapSelection(view, '*', '*', 'italic'),
    },
    {
        label: 'Link',
        icon: <Link className="tw:size-4" />,
        group: 'link',
        action: (view) => {
            const { from, to } = view.state.selection.main;
            const selected = view.state.sliceDoc(from, to);
            if (selected) {
                const insert = `[${selected}](url)`;
                view.dispatch({
                    changes: { from, to, insert },
                    selection: { anchor: from + selected.length + 3, head: from + selected.length + 6 },
                });
            } else {
                const insert = '[link text](url)';
                view.dispatch({
                    changes: { from, insert },
                    selection: { anchor: from + 1, head: from + 10 },
                });
            }
            view.focus();
        },
    },
    {
        label: 'Bullet List',
        icon: <List className="tw:size-4" />,
        group: 'lists',
        action: (view) => insertAtCursor(view, '\n- Item\n- Item\n'),
    },
    {
        label: 'Numbered List',
        icon: <ListOrdered className="tw:size-4" />,
        group: 'lists',
        action: (view) => insertAtCursor(view, '\n1. Item\n2. Item\n'),
    },
    {
        label: 'Divider',
        icon: <Minus className="tw:size-4" />,
        group: 'divider',
        action: (view) => insertAtCursor(view, '\n---\n'),
    },
    {
        label: 'Table',
        icon: <Table className="tw:size-4" />,
        group: 'table',
        action: (view) =>
            insertAtCursor(
                view,
                '\n| Column 1 | Column 2 |\n| --- | --- |\n| data | data |\n'
            ),
    },
];

const CALLOUT_VARIANTS = [
    { label: 'Info', variant: 'info', icon: <Info className="tw:size-4 tw:text-blue-500" /> },
    { label: 'Warning', variant: 'warning', icon: <AlertTriangle className="tw:size-4 tw:text-amber-500" /> },
    { label: 'Success', variant: 'success', icon: <CheckCircle className="tw:size-4 tw:text-green-500" /> },
    { label: 'Error', variant: 'error', icon: <XCircle className="tw:size-4 tw:text-red-500" /> },
];

const BasicModeToolbar: React.FC<BasicModeToolbarProps> = ({ editorViewRef, disabled }) => {
    const [inTable, setInTable] = useState(false);
    let lastGroup = '';

    // Track cursor position to enable/disable table-aware controls
    useEffect(() => {
        const view = editorViewRef.current;
        if (!view) return;

        const listener = EditorView.updateListener.of((update) => {
            if (update.selectionSet || update.docChanged) {
                const ctx = getCursorContext(update.view);
                setInTable(ctx.inTable);
            }
        });

        // Add listener to existing view
        view.dispatch({ effects: [] }); // trigger initial check
        const ctx = getCursorContext(view);
        setInTable(ctx.inTable);

        // We can't dynamically add extensions easily, so poll on focus
        const checkContext = () => {
            if (editorViewRef.current) {
                const ctx = getCursorContext(editorViewRef.current);
                setInTable(ctx.inTable);
            }
        };

        // Listen to clicks and keystrokes on the editor
        const el = view.dom;
        el.addEventListener('click', checkContext);
        el.addEventListener('keyup', checkContext);

        return () => {
            el.removeEventListener('click', checkContext);
            el.removeEventListener('keyup', checkContext);
        };
    }, [editorViewRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

    // Context-aware alignment handler
    const handleAlignment = useCallback((alignment: 'left' | 'center' | 'right') => {
        const view = editorViewRef.current;
        if (!view) return;

        const ctx = getCursorContext(view);
        if (ctx.inTable && ctx.tableSeparatorLine) {
            // Inside table: update column alignment in separator row
            applyTableColumnAlignment(view, alignment);
        } else {
            // Outside table: use block alignment markers
            switch (alignment) {
                case 'left': wrapLineAlignment(view, '', ' <<<<'); break;
                case 'center': wrapLineAlignment(view, '>> ', ' <<'); break;
                case 'right': wrapLineAlignment(view, '>>>> ', ''); break;
            }
        }
    }, [editorViewRef]);

    return (
        <div className="tw:flex tw:items-center tw:gap-1 tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-bg tw:p-1">
            {TOOLBAR_ACTIONS.map((item) => {
                const showDivider = lastGroup !== '' && item.group !== lastGroup;
                lastGroup = item.group;

                return (
                    <React.Fragment key={item.label}>
                        {showDivider && (
                            <Separator orientation="vertical" className="tw:mx-1 tw:h-5" />
                        )}
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            disabled={disabled}
                            title={item.label}
                            onClick={() => {
                                const view = editorViewRef.current;
                                if (view) item.action(view);
                            }}
                        >
                            {item.icon}
                        </Button>
                    </React.Fragment>
                );
            })}

            {/* Alignment buttons */}
            <Separator orientation="vertical" className="tw:mx-1 tw:h-5" />
            <Button variant="ghost" size="icon-xs" disabled={disabled} title={inTable ? 'Align Column Left' : 'Align Left'} onClick={() => handleAlignment('left')}>
                <AlignLeft className="tw:size-4" />
            </Button>
            <Button variant="ghost" size="icon-xs" disabled={disabled} title={inTable ? 'Align Column Center' : 'Align Center'} onClick={() => handleAlignment('center')}>
                <AlignCenter className="tw:size-4" />
            </Button>
            <Button variant="ghost" size="icon-xs" disabled={disabled} title={inTable ? 'Align Column Right' : 'Align Right'} onClick={() => handleAlignment('right')}>
                <AlignRight className="tw:size-4" />
            </Button>

            {/* Table Palette — only enabled when cursor is in a table */}
            <Separator orientation="vertical" className="tw:mx-1 tw:h-5" />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={disabled || !inTable}
                        title="Table Highlight"
                    >
                        <Palette className={`tw:size-4 ${inTable ? 'tw:text-purple-500' : ''}`} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="tw:w-48">
                    {/* Sub-menus for cell, row, column */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <SquareIcon className="tw:size-4 tw:mr-2" />
                            Cell
                        </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent style={{ backgroundColor: 'white' }}>
                                {HIGHLIGHT_VARIANTS.map((h) => (
                                    <DropdownMenuItem key={h.variant} onClick={() => {
                                        const view = editorViewRef.current;
                                        if (view) applyTableHighlight(view, h.variant, 'cell');
                                    }}>
                                        <span className="tw:inline-block tw:size-4 tw:rounded-sm tw:mr-2 tw:border tw:border-gray-300" style={{ backgroundColor: h.color }} />
                                        {h.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Rows3 className="tw:size-4 tw:mr-2" />
                            Row
                        </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent style={{ backgroundColor: 'white' }}>
                                {HIGHLIGHT_VARIANTS.map((h) => (
                                    <DropdownMenuItem key={h.variant} onClick={() => {
                                        const view = editorViewRef.current;
                                        if (view) applyTableHighlight(view, h.variant, 'row');
                                    }}>
                                        <span className="tw:inline-block tw:size-4 tw:rounded-sm tw:mr-2 tw:border tw:border-gray-300" style={{ backgroundColor: h.color }} />
                                        {h.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Columns3 className="tw:size-4 tw:mr-2" />
                            Column
                        </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent style={{ backgroundColor: 'white' }}>
                                {HIGHLIGHT_VARIANTS.map((h) => (
                                    <DropdownMenuItem key={h.variant} onClick={() => {
                                        const view = editorViewRef.current;
                                        if (view) applyTableHighlight(view, h.variant, 'column');
                                    }}>
                                        <span className="tw:inline-block tw:size-4 tw:rounded-sm tw:mr-2 tw:border tw:border-gray-300" style={{ backgroundColor: h.color }} />
                                        {h.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Callout dropdown */}
            <Separator orientation="vertical" className="tw:mx-1 tw:h-5" />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={disabled}
                        title="Callout"
                    >
                        <CircleAlert className="tw:size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    {CALLOUT_VARIANTS.map((c) => (
                        <DropdownMenuItem
                            key={c.variant}
                            onClick={() => {
                                const view = editorViewRef.current;
                                if (view) {
                                    insertAtCursor(view, `\n[!${c.variant}] Message here.\n`);
                                }
                            }}
                        >
                            {c.icon}
                            <span className="tw:ml-2">{c.label}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default BasicModeToolbar;
