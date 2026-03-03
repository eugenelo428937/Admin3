import React from 'react';
import { Box, IconButton, Tooltip, Divider } from '@mui/material';
import {
    FormatBold,
    FormatItalic,
    InsertLink,
    HorizontalRule,
    TableChart,
    Title,
} from '@mui/icons-material';
import { EditorView } from 'codemirror';

interface BasicModeToolbarProps {
    editorViewRef: React.RefObject<EditorView | null>;
    disabled?: boolean;
}

type InsertAction = (view: EditorView) => void;

/** Insert text wrapping the current selection, or placeholder text if nothing selected */
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

/** Insert a prefix at the start of the current line */
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

/** Insert text at cursor position */
function insertAtCursor(view: EditorView, text: string): void {
    const { from } = view.state.selection.main;
    view.dispatch({
        changes: { from, insert: text },
        selection: { anchor: from + text.length },
    });
    view.focus();
}

const TOOLBAR_ACTIONS: { label: string; icon: React.ReactNode; action: InsertAction; group: string }[] = [
    {
        label: 'Heading 1',
        icon: <Title fontSize="small" />,
        group: 'headings',
        action: (view) => prefixLine(view, '# '),
    },
    {
        label: 'Heading 2',
        icon: <Title sx={{ fontSize: 18 }} />,
        group: 'headings',
        action: (view) => prefixLine(view, '## '),
    },
    {
        label: 'Heading 3',
        icon: <Title sx={{ fontSize: 14 }} />,
        group: 'headings',
        action: (view) => prefixLine(view, '### '),
    },
    {
        label: 'Bold',
        icon: <FormatBold fontSize="small" />,
        group: 'format',
        action: (view) => wrapSelection(view, '**', '**', 'bold'),
    },
    {
        label: 'Italic',
        icon: <FormatItalic fontSize="small" />,
        group: 'format',
        action: (view) => wrapSelection(view, '*', '*', 'italic'),
    },
    {
        label: 'Link',
        icon: <InsertLink fontSize="small" />,
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
        label: 'Divider',
        icon: <HorizontalRule fontSize="small" />,
        group: 'divider',
        action: (view) => insertAtCursor(view, '\n---\n'),
    },
    {
        label: 'Table',
        icon: <TableChart fontSize="small" />,
        group: 'table',
        action: (view) =>
            insertAtCursor(
                view,
                '\n| Column 1 | Column 2 |\n| --- | --- |\n| data | data |\n'
            ),
    },
];

const BasicModeToolbar: React.FC<BasicModeToolbarProps> = ({ editorViewRef, disabled }) => {
    let lastGroup = '';

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                p: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: 'background.paper',
            }}
        >
            {TOOLBAR_ACTIONS.map((item) => {
                const showDivider = lastGroup !== '' && item.group !== lastGroup;
                lastGroup = item.group;

                return (
                    <React.Fragment key={item.label}>
                        {showDivider && (
                            <Divider
                                orientation="vertical"
                                flexItem
                                sx={{ mx: 0.5 }}
                            />
                        )}
                        <Tooltip title={item.label}>
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={disabled}
                                    onClick={() => {
                                        const view = editorViewRef.current;
                                        if (view) item.action(view);
                                    }}
                                >
                                    {item.icon}
                                </IconButton>
                            </span>
                        </Tooltip>
                    </React.Fragment>
                );
            })}
        </Box>
    );
};

export default BasicModeToolbar;
