import { describe, it, expect } from 'vitest';
import { buildTree, pruneTree, type EmailVariableRow } from './variableTree';

const rows: EmailVariableRow[] = [
    { path: 'user', display_name: 'User', data_type: 'object', description: '' },
    { path: 'user.first_name', display_name: 'First Name', data_type: 'string', description: 'Given name' },
    { path: 'user.profile', display_name: 'Profile', data_type: 'object', description: '' },
    { path: 'user.profile.avatar', display_name: 'Avatar', data_type: 'string', description: '' },
    { path: 'order', display_name: 'Order', data_type: 'object', description: '' },
    { path: 'order.items[]', display_name: 'Items', data_type: 'array', description: '' },
    { path: 'order.items[].amount', display_name: 'Amount', data_type: 'object', description: '' },
    { path: 'order.items[].amount.vat', display_name: 'VAT', data_type: 'float', description: '' },
];

describe('buildTree', () => {
    it('builds a nested tree from flat rows', () => {
        const tree = buildTree(rows);
        expect(tree.map((n) => n.segment).sort()).toEqual(['order', 'user']);
        const user = tree.find((n) => n.segment === 'user')!;
        expect(user.children.map((c) => c.segment).sort()).toEqual(['first_name', 'profile']);
    });

    it('preserves metadata on nodes', () => {
        const tree = buildTree(rows);
        const user = tree.find((n) => n.segment === 'user')!;
        const first = user.children.find((c) => c.segment === 'first_name')!;
        expect(first.displayName).toBe('First Name');
        expect(first.description).toBe('Given name');
        expect(first.dataType).toBe('string');
    });

    it('marks isArrayElement for items[] segments', () => {
        const tree = buildTree(rows);
        const order = tree.find((n) => n.segment === 'order')!;
        const items = order.children.find((c) => c.segment === 'items[]')!;
        expect(items.isArrayElement).toBe(true);
        expect(items.dataType).toBe('array');
    });

    it('nests array element fields directly under the array node', () => {
        const tree = buildTree(rows);
        const items = tree
            .find((n) => n.segment === 'order')!
            .children.find((c) => c.segment === 'items[]')!;
        expect(items.children.map((c) => c.segment)).toEqual(['amount']);
        expect(items.children[0].children.map((c) => c.segment)).toEqual(['vat']);
    });
});

describe('pruneTree', () => {
    it('returns full tree when query is empty', () => {
        const tree = pruneTree(rows, '');
        expect(tree.length).toBe(2);
    });

    it('matches leaf segment', () => {
        const tree = pruneTree(rows, 'fir');
        const user = tree.find((n) => n.segment === 'user')!;
        expect(user.children.map((c) => c.segment)).toEqual(['first_name']);
    });

    it('matches intermediate segment and keeps descendants visible via ancestors', () => {
        const tree = pruneTree(rows, 'prof');
        const user = tree.find((n) => n.segment === 'user')!;
        expect(user.children.map((c) => c.segment)).toEqual(['profile']);
    });

    it('is case-insensitive', () => {
        const tree = pruneTree(rows, 'FIR');
        const user = tree.find((n) => n.segment === 'user')!;
        expect(user.children.some((c) => c.segment === 'first_name')).toBe(true);
    });

    it('does substring matching, not prefix', () => {
        const tree = pruneTree(rows, 'name');
        const user = tree.find((n) => n.segment === 'user')!;
        expect(user.children.some((c) => c.segment === 'first_name')).toBe(true);
    });

    it('returns an empty array when nothing matches', () => {
        const tree = pruneTree(rows, 'zzznope');
        expect(tree).toEqual([]);
    });

    it('always includes ancestors of matches', () => {
        const tree = pruneTree(rows, 'vat');
        const order = tree.find((n) => n.segment === 'order')!;
        const items = order.children.find((c) => c.segment === 'items[]')!;
        const amount = items.children.find((c) => c.segment === 'amount')!;
        expect(amount.children.map((c) => c.segment)).toEqual(['vat']);
    });
});
