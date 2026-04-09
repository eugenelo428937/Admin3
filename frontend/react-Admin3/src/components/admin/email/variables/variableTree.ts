/**
 * Pure helpers to turn the flat `/api/email/variables/tree/` payload into
 * a nested Finder-style column tree, and to prune that tree by a filter query.
 *
 * No React, no network, no side effects — safe to unit test in isolation.
 */

export type DataType =
    | 'string'
    | 'int'
    | 'float'
    | 'bool'
    | 'object'
    | 'array';

export interface EmailVariableRow {
    path: string;
    display_name: string;
    data_type: DataType;
    description: string;
}

export interface VarNode {
    segment: string;          // "first_name" or "items[]"
    path: string;             // "order.items[].amount"
    displayName: string;
    description: string;
    dataType: DataType;
    children: VarNode[];
    isArrayElement: boolean;  // segment ends with "[]"
}

/**
 * Split a dot-path into its segments, keeping any trailing `[]` on the
 * segment that owns it. "order.items[].amount.vat" -> ["order","items[]","amount","vat"].
 */
function splitPath(path: string): string[] {
    return path.split('.').filter((s) => s.length > 0);
}

function makeNode(
    segment: string,
    path: string,
    row: EmailVariableRow | undefined,
): VarNode {
    const isArrayElement = segment.endsWith('[]');
    return {
        segment,
        path,
        displayName: row?.display_name ?? segment.replace(/\[\]$/, ''),
        description: row?.description ?? '',
        // If we don't have a row for this path (shouldn't happen in strict
        // mode, but tolerate it), default to object so it renders as a folder.
        dataType: row?.data_type ?? 'object',
        children: [],
        isArrayElement,
    };
}

/**
 * Build a nested tree from the flat row list. Rows are expected to be
 * ordered parents-before-children (the API sorts by variable_path which
 * achieves this alphabetically), but this function does not rely on that.
 */
export function buildTree(rows: EmailVariableRow[]): VarNode[] {
    const byPath = new Map<string, EmailVariableRow>();
    for (const r of rows) byPath.set(r.path, r);

    const roots: VarNode[] = [];
    const nodeByPath = new Map<string, VarNode>();

    // Sort by depth so parents always exist before children are attached.
    const sorted = [...rows].sort((a, b) => {
        const da = splitPath(a.path).length;
        const db = splitPath(b.path).length;
        if (da !== db) return da - db;
        return a.path.localeCompare(b.path);
    });

    for (const row of sorted) {
        const segments = splitPath(row.path);
        const segment = segments[segments.length - 1];
        const node = makeNode(segment, row.path, row);
        nodeByPath.set(row.path, node);

        if (segments.length === 1) {
            roots.push(node);
            continue;
        }

        const parentPath = segments.slice(0, -1).join('.');
        const parent = nodeByPath.get(parentPath);
        if (parent) {
            parent.children.push(node);
        } else {
            // Orphan — parent row missing. Surface at root so it's visible.
            roots.push(node);
        }
    }

    return roots;
}

/**
 * Filter the tree by substring (case-insensitive) against each path segment.
 * Ancestors of every match are always retained so the column view can render
 * a coherent tree down to the matched node.
 */
export function pruneTree(
    rows: EmailVariableRow[],
    query: string,
): VarNode[] {
    if (!query) return buildTree(rows);
    const q = query.toLowerCase();
    const keep = new Set<string>();

    for (const r of rows) {
        const segs = r.path.split(/\.|\[\]/).filter(Boolean);
        if (segs.some((s) => s.toLowerCase().includes(q))) {
            // Add this row and every ancestor dot-path.
            const parts = r.path.split('.');
            for (let i = 1; i <= parts.length; i++) {
                keep.add(parts.slice(0, i).join('.'));
            }
        }
    }

    return buildTree(rows.filter((r) => keep.has(r.path)));
}
