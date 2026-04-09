import React from 'react';
import {
    Folder,
    ChevronRight,
    Braces,
    List as ListIcon,
    Hash,
    ToggleLeft,
    Type as TypeIcon,
} from 'lucide-react';
import type { VarNode, DataType } from './variableTree';

interface VariableRowProps {
    node: VarNode;
    isSelected: boolean;
    query: string;
    onClick: () => void;
    onMouseEnter?: () => void;
}

const TYPE_ICON: Record<DataType, React.ReactNode> = {
    string: <TypeIcon className="tw:size-4 tw:text-slate-500" />,
    int: <Hash className="tw:size-4 tw:text-slate-500" />,
    float: <Hash className="tw:size-4 tw:text-slate-500" />,
    bool: <ToggleLeft className="tw:size-4 tw:text-slate-500" />,
    object: <Folder className="tw:size-4 tw:text-amber-500" />,
    array: <Braces className="tw:size-4 tw:text-purple-500" />,
};

function isLeaf(node: VarNode): boolean {
    return node.dataType !== 'object' && node.dataType !== 'array';
}

/**
 * Split `text` into segments alternating between plain and marked, given a
 * case-insensitive substring `query`. Returned as an array of React nodes.
 */
function highlight(text: string, query: string): React.ReactNode {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return text;
    return (
        <>
            {text.slice(0, idx)}
            <mark>{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
}

const VariableRow: React.FC<VariableRowProps> = ({
    node,
    isSelected,
    query,
    onClick,
    onMouseEnter,
}) => {
    const leaf = isLeaf(node);
    const icon =
        node.isArrayElement && !leaf
            ? <ListIcon className="tw:size-4 tw:text-purple-500" />
            : TYPE_ICON[node.dataType];

    return (
        <button
            type="button"
            title={node.description || undefined}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            data-testid={`variable-row-${node.path}`}
            aria-selected={isSelected}
            className={[
                'tw:flex tw:w-full tw:items-center tw:gap-2 tw:px-2 tw:py-1.5 tw:text-left tw:text-sm',
                'tw:rounded-sm',
                isSelected
                    ? 'tw:bg-admin-accent tw:text-admin-accent-foreground'
                    : 'hover:tw:bg-admin-muted',
            ].join(' ')}
        >
            <span className="tw:flex tw:shrink-0 tw:items-center">{icon}</span>
            <span className="tw:flex-1 tw:truncate">
                {highlight(node.displayName, query)}
            </span>
            {leaf ? (
                <span className="tw:text-xs tw:text-slate-500 tw:uppercase">
                    {node.dataType}
                </span>
            ) : (
                <>
                    {node.dataType === 'array' && (
                        <span className="tw:text-xs tw:text-purple-600">[ ]</span>
                    )}
                    <ChevronRight className="tw:size-4 tw:text-slate-400" />
                </>
            )}
        </button>
    );
};

export default VariableRow;
export { isLeaf };
