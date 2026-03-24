import React from 'react';
import {
    Bold,
    Italic,
    Link,
    Minus,
    Table,
    Heading1,
    Heading2,
    Heading3,
} from 'lucide-react';
import { Button } from '@/components/admin/ui/button';
import { Separator } from '@/components/admin/ui/separator';
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

const BasicModeToolbar: React.FC<BasicModeToolbarProps> = ({ editorViewRef, disabled }) => {
    let lastGroup = '';

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
        </div>
    );
};

export default BasicModeToolbar;
