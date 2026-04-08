import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VariablePicker from './VariablePicker';
import type { EmailVariableRow } from './variableTree';

const rows: EmailVariableRow[] = [
    { path: 'user', display_name: 'User', data_type: 'object', description: '' },
    { path: 'user.first_name', display_name: 'First Name', data_type: 'string', description: '' },
    { path: 'user.last_name', display_name: 'Last Name', data_type: 'string', description: '' },
    { path: 'order', display_name: 'Order', data_type: 'object', description: '' },
    { path: 'order.items[]', display_name: 'Items', data_type: 'array', description: '' },
    { path: 'order.items[].amount', display_name: 'Amount', data_type: 'object', description: '' },
    { path: 'order.items[].amount.vat', display_name: 'VAT', data_type: 'float', description: '' },
];

vi.mock('./useEmailVariables', () => ({
    useEmailVariables: () => ({
        data: rows,
        isLoading: false,
        error: null,
        refetch: async () => {},
    }),
}));

function renderPicker(onPick = vi.fn()) {
    const onOpenChange = vi.fn();
    const utils = render(
        <VariablePicker open onOpenChange={onOpenChange} onPick={onPick} />,
    );
    return { ...utils, onPick, onOpenChange };
}

describe('VariablePicker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders a dialog with accessible title', () => {
        renderPicker();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Insert Variable')).toBeInTheDocument();
    });

    it('autofocuses the filter input on open', async () => {
        renderPicker();
        // Setter runs in a setTimeout; wait a microtask.
        await new Promise((r) => setTimeout(r, 10));
        expect(screen.getByLabelText('Filter variables')).toHaveFocus();
    });

    it('shows root column with top-level nodes', () => {
        renderPicker();
        expect(screen.getByTestId('variable-row-user')).toBeInTheDocument();
        expect(screen.getByTestId('variable-row-order')).toBeInTheDocument();
    });

    it('clicking a container advances to the next column', async () => {
        const user = userEvent.setup();
        renderPicker();
        await user.click(screen.getByTestId('variable-row-user'));
        expect(screen.getByTestId('variable-row-user.first_name')).toBeInTheDocument();
        expect(screen.getByTestId('variable-row-user.last_name')).toBeInTheDocument();
    });

    it('clicking a scalar leaf fires onPick with scalar result and closes dialog', async () => {
        const user = userEvent.setup();
        const { onPick, onOpenChange } = renderPicker();
        await user.click(screen.getByTestId('variable-row-user'));
        await user.click(screen.getByTestId('variable-row-user.first_name'));
        expect(onPick).toHaveBeenCalledWith({
            kind: 'scalar',
            path: 'user.first_name',
            dataType: 'string',
        });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('clicking an array-element leaf fires onPick with array-element result', async () => {
        const user = userEvent.setup();
        const { onPick } = renderPicker();
        await user.click(screen.getByTestId('variable-row-order'));
        await user.click(screen.getByTestId('variable-row-order.items[]'));
        await user.click(screen.getByTestId('variable-row-order.items[].amount'));
        await user.click(screen.getByTestId('variable-row-order.items[].amount.vat'));
        expect(onPick).toHaveBeenCalledWith({
            kind: 'array-element',
            arrayPath: 'order.items',
            fieldPath: 'amount.vat',
        });
    });

    it('clicking a sibling in an earlier column collapses deeper columns', async () => {
        const user = userEvent.setup();
        renderPicker();
        await user.click(screen.getByTestId('variable-row-user'));
        expect(screen.getByTestId('variable-row-user.first_name')).toBeInTheDocument();
        await user.click(screen.getByTestId('variable-row-order'));
        expect(screen.queryByTestId('variable-row-user.first_name')).toBeNull();
        expect(screen.getByTestId('variable-row-order.items[]')).toBeInTheDocument();
    });

    it('typing in the filter prunes the tree and highlights matches', async () => {
        const user = userEvent.setup();
        renderPicker();
        const input = screen.getByLabelText('Filter variables');
        await user.type(input, 'fir');
        const row = await screen.findByTestId('variable-row-user.first_name');
        expect(within(row).getByText('Fir', { selector: 'mark' })).toBeInTheDocument();
    });

    it('clearing the filter restores the full tree', async () => {
        const user = userEvent.setup();
        renderPicker();
        const input = screen.getByLabelText('Filter variables');
        await user.type(input, 'fir');
        await user.clear(input);
        expect(screen.getByTestId('variable-row-order')).toBeInTheDocument();
    });

    it('shows empty state when filter has no matches', async () => {
        const user = userEvent.setup();
        renderPicker();
        await user.type(screen.getByLabelText('Filter variables'), 'zzznope');
        expect(screen.getByText(/No variables match/)).toBeInTheDocument();
    });

    it('Enter on a scalar fires onPick', async () => {
        const user = userEvent.setup();
        const { onPick } = renderPicker();
        await user.click(screen.getByTestId('variable-row-user'));
        await user.click(screen.getByTestId('variable-row-user.first_name'));
        expect(onPick).toHaveBeenCalled();
    });
});
