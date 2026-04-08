import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/admin/ui/dialog';
import { Input } from '@/components/admin/ui/input';
import VariableColumn from './VariableColumn';
import { isLeaf } from './VariableRow';
import { pruneTree, type VarNode, type DataType } from './variableTree';
import { useEmailVariables } from './useEmailVariables';

export type PickResult =
    | { kind: 'scalar'; path: string; dataType: DataType }
    | { kind: 'array-element'; arrayPath: string; fieldPath: string };

export interface VariablePickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPick: (result: PickResult) => void;
}

/**
 * Split a node's canonical path around its `[]` array-element marker, so
 * a click on `order.items[].amount.vat` becomes
 *   { arrayPath: 'order.items', fieldPath: 'amount.vat' }.
 * Returns null if the path does not contain a `[]` segment.
 */
function splitArrayElementPath(
    path: string,
): { arrayPath: string; fieldPath: string } | null {
    const idx = path.indexOf('[]');
    if (idx < 0) return null;
    const arrayPath = path.slice(0, idx);
    // Everything after `[].` is the field path inside the element.
    const after = path.slice(idx + 2);
    const fieldPath = after.startsWith('.') ? after.slice(1) : after;
    return { arrayPath, fieldPath };
}

/**
 * Walk the tree following the given segment stack. Returns the list of
 * columns (arrays of sibling VarNodes), one per level the user has drilled
 * into, plus the root column.
 */
function foldColumns(tree: VarNode[], selected: string[]): VarNode[][] {
    const cols: VarNode[][] = [tree];
    let current: VarNode[] = tree;
    for (const seg of selected) {
        const node = current.find((n) => n.segment === seg);
        if (!node || node.children.length === 0) break;
        cols.push(node.children);
        current = node.children;
    }
    return cols;
}

const VariablePicker: React.FC<VariablePickerProps> = ({
    open,
    onOpenChange,
    onPick,
}) => {
    const { data: rows } = useEmailVariables();
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);

    const tree = useMemo(() => pruneTree(rows, query), [rows, query]);
    const columns = useMemo(() => foldColumns(tree, selected), [tree, selected]);

    // Reset internal state when the dialog opens.
    useEffect(() => {
        if (open) {
            setQuery('');
            setSelected([]);
            // Autofocus the filter input next tick so the dialog is mounted.
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    // When filtering, auto-advance selection to the first matching chain so
    // the user sees what matched without extra clicks.
    useEffect(() => {
        if (!query) return;
        const chain: string[] = [];
        let cursor: VarNode[] = tree;
        while (cursor.length > 0) {
            const first = cursor[0];
            chain.push(first.segment);
            if (first.children.length === 0) break;
            cursor = first.children;
        }
        setSelected(chain);
    }, [query, tree]);

    // Scroll rightmost column into view after a drill-in.
    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        if (typeof el.scrollTo === 'function') {
            el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
        } else {
            el.scrollLeft = el.scrollWidth;
        }
    }, [selected]);

    const handleRowPick = useCallback(
        (columnIndex: number, node: VarNode) => {
            // Finder behavior: truncate then push.
            setSelected((prev) => {
                const next = prev.slice(0, columnIndex);
                next.push(node.segment);
                return next;
            });

            if (isLeaf(node)) {
                const split = splitArrayElementPath(node.path);
                if (split) {
                    onPick({
                        kind: 'array-element',
                        arrayPath: split.arrayPath,
                        fieldPath: split.fieldPath,
                    });
                } else {
                    onPick({
                        kind: 'scalar',
                        path: node.path,
                        dataType: node.dataType,
                    });
                }
                onOpenChange(false);
            }
        },
        [onPick, onOpenChange],
    );

    // Keyboard navigation: column index = selected.length (deepest open column)
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            const deepestIndex = Math.min(selected.length, columns.length - 1);
            const deepestCol = columns[deepestIndex] ?? [];
            if (deepestCol.length === 0) return;

            const currentSeg = selected[deepestIndex] ?? deepestCol[0]?.segment;
            const currentIdx = deepestCol.findIndex((n) => n.segment === currentSeg);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = deepestCol[Math.min(currentIdx + 1, deepestCol.length - 1)];
                if (next) {
                    const nextStack = selected.slice(0, deepestIndex);
                    nextStack.push(next.segment);
                    setSelected(nextStack);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = deepestCol[Math.max(currentIdx - 1, 0)];
                if (prev) {
                    const nextStack = selected.slice(0, deepestIndex);
                    nextStack.push(prev.segment);
                    setSelected(nextStack);
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const node = deepestCol[currentIdx];
                if (node && node.children.length > 0) {
                    setSelected([...selected.slice(0, deepestIndex + 1), node.children[0].segment]);
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (selected.length > 1) setSelected(selected.slice(0, -1));
            } else if (e.key === 'Enter') {
                const node = deepestCol[currentIdx];
                if (!node) return;
                e.preventDefault();
                handleRowPick(deepestIndex, node);
            }
        },
        [columns, selected, handleRowPick],
    );

    const noMatches = query && tree.length === 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="tw:max-w-3xl" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle>Insert Variable</DialogTitle>
                    <DialogDescription>
                        Browse and insert a registered email template variable.
                    </DialogDescription>
                </DialogHeader>

                <div className="tw:mb-3 tw:flex tw:items-center tw:gap-2">
                    <Search className="tw:size-4 tw:text-slate-400" />
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filter variables..."
                        aria-label="Filter variables"
                    />
                </div>

                {noMatches ? (
                    <div className="tw:p-6 tw:text-sm tw:text-slate-500">
                        No variables match "{query}"
                    </div>
                ) : (
                    <div
                        ref={scrollerRef}
                        className="tw:flex tw:overflow-x-auto tw:rounded-md tw:border tw:border-admin-border"
                    >
                        {columns.map((col, i) => {
                            // Array-with-no-children empty state
                            let emptyMsg: string | undefined;
                            if (col.length === 0 && i > 0) {
                                const parentSeg = selected[i - 1];
                                const parentCol = columns[i - 1];
                                const parentNode = parentCol?.find((n) => n.segment === parentSeg);
                                if (parentNode?.dataType === 'array') {
                                    emptyMsg =
                                        'This array has no fields registered. Add them in Email Variables admin.';
                                }
                            }
                            return (
                                <VariableColumn
                                    key={i}
                                    nodes={col}
                                    selectedSegment={selected[i] ?? null}
                                    query={query}
                                    emptyMessage={emptyMsg}
                                    onPick={(node) => handleRowPick(i, node)}
                                />
                            );
                        })}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default VariablePicker;
