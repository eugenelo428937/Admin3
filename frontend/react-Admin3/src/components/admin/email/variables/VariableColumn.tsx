import React from 'react';
import VariableRow from './VariableRow';
import type { VarNode } from './variableTree';

interface VariableColumnProps {
    nodes: VarNode[];
    selectedSegment: string | null;
    query: string;
    emptyMessage?: string;
    onPick: (node: VarNode) => void;
}

const VariableColumn: React.FC<VariableColumnProps> = ({
    nodes,
    selectedSegment,
    query,
    emptyMessage,
    onPick,
}) => {
    return (
        <div
            className="tw:flex tw:h-72 tw:w-56 tw:shrink-0 tw:flex-col tw:overflow-y-auto tw:border-r tw:border-admin-border tw:p-1"
            role="listbox"
        >
            {nodes.length === 0 ? (
                <div className="tw:p-3 tw:text-sm tw:text-slate-500">
                    {emptyMessage ?? 'No variables'}
                </div>
            ) : (
                nodes.map((node) => (
                    <VariableRow
                        key={node.path}
                        node={node}
                        isSelected={node.segment === selectedSegment}
                        query={query}
                        onClick={() => onPick(node)}
                    />
                ))
            )}
        </div>
    );
};

export default VariableColumn;
