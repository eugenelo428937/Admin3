import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PickResult } from '../variables/VariablePicker';
import BasicModeToolbar from './BasicModeToolbar';

// --- Mock VariablePicker so we can drive onPick directly ---
let lastOnPick: ((r: PickResult) => void) | null = null;
let lastOpen = false;
vi.mock('../variables/VariablePicker', () => ({
  __esModule: true,
  default: (props: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    onPick: (r: PickResult) => void;
  }) => {
    lastOnPick = props.onPick;
    lastOpen = props.open;
    return props.open ? (
      <div data-testid="mock-variable-picker">picker open</div>
    ) : null;
  },
}));

// --- Mock loop scanner ---
import * as loopContextModule from '../variables/loopContext';
vi.mock('../variables/loopContext', () => ({
  findEnclosingLoop: vi.fn(),
}));
const findEnclosingLoopMock = loopContextModule.findEnclosingLoop as unknown as ReturnType<typeof vi.fn>;

// --- Mock CodeMirror EditorView with the minimum surface area we use ---
function makeMockView() {
  let docText = '';
  let cursor = 0;
  const dispatched: { from: number; insert: string }[] = [];
  const view = {
    state: {
      doc: {
        toString: () => docText,
        get length() {
          return docText.length;
        },
        lineAt: (_pos: number) => ({
          number: 1,
          from: 0,
          to: docText.length,
          text: docText,
        }),
        get lines() {
          return 1;
        },
        line: (_n: number) => ({
          number: 1,
          from: 0,
          to: docText.length,
          text: docText,
        }),
      },
      selection: { main: { from: cursor, to: cursor } },
      sliceDoc: (from: number, to: number) => docText.slice(from, to),
    },
    dispatch: (tr: { changes?: { from: number; to?: number; insert: string } }) => {
      if (!tr.changes) return;
      const { from, to = from, insert } = tr.changes;
      docText = docText.slice(0, from) + insert + docText.slice(to);
      cursor = from + insert.length;
      view.state.selection.main.from = cursor;
      view.state.selection.main.to = cursor;
      dispatched.push({ from, insert });
    },
    focus: () => {},
    dom: document.createElement('div'),
  };
  return { view, get docText() { return docText; }, dispatched };
}

function renderToolbar() {
  const mock = makeMockView();
  const ref = { current: mock.view as any };
  render(<BasicModeToolbar editorViewRef={ref as any} />);
  return mock;
}

beforeEach(() => {
  lastOnPick = null;
  lastOpen = false;
  findEnclosingLoopMock.mockReset();
});

describe('BasicModeToolbar — variable picker integration', () => {
  it('opens picker when variable button is clicked', async () => {
    const user = userEvent.setup();
    renderToolbar();
    const btn = screen.getByTitle('Insert Variable');
    await user.click(btn);
    expect(screen.getByTestId('mock-variable-picker')).toBeInTheDocument();
    expect(lastOpen).toBe(true);
  });

  it('scalar pick inserts {{ path }} at cursor', async () => {
    const user = userEvent.setup();
    const mock = renderToolbar();
    await user.click(screen.getByTitle('Insert Variable'));
    act(() => {
      lastOnPick!({ kind: 'scalar', path: 'user.first_name', dataType: 'string' });
    });
    expect(mock.docText).toBe('{{ user.first_name }}');
  });

  it('array pick with loop context inserts {{ loopVar.fieldPath }} without AlertDialog', async () => {
    const user = userEvent.setup();
    findEnclosingLoopMock.mockReturnValue({ loopVar: 'x' });
    const mock = renderToolbar();
    await user.click(screen.getByTitle('Insert Variable'));
    act(() => {
      lastOnPick!({ kind: 'array-element', arrayPath: 'order.items', fieldPath: 'amount.vat' });
    });
    expect(mock.docText).toBe('{{ x.amount.vat }}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('array pick without loop context shows AlertDialog', async () => {
    const user = userEvent.setup();
    findEnclosingLoopMock.mockReturnValue(null);
    renderToolbar();
    await user.click(screen.getByTitle('Insert Variable'));
    act(() => {
      lastOnPick!({ kind: 'array-element', arrayPath: 'order.items', fieldPath: 'amount.vat' });
    });
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/"order\.items" is an array/)).toBeInTheDocument();
  });

  it('"Insert as loop" inserts full loop block with pluralized var', async () => {
    const user = userEvent.setup();
    findEnclosingLoopMock.mockReturnValue(null);
    const mock = renderToolbar();
    await user.click(screen.getByTitle('Insert Variable'));
    act(() => {
      lastOnPick!({ kind: 'array-element', arrayPath: 'order.items', fieldPath: 'amount.vat' });
    });
    const insertBtn = await screen.findByRole('button', { name: /Insert as loop/i });
    await user.click(insertBtn);
    expect(mock.docText).toBe(
      '{% for item in order.items %}\n  {{ item.amount.vat }}\n{% endfor %}',
    );
  });

  it('pluralizes addresses → address', async () => {
    const user = userEvent.setup();
    findEnclosingLoopMock.mockReturnValue(null);
    const mock = renderToolbar();
    await user.click(screen.getByTitle('Insert Variable'));
    act(() => {
      lastOnPick!({ kind: 'array-element', arrayPath: 'order.addresses', fieldPath: 'city' });
    });
    await user.click(await screen.findByRole('button', { name: /Insert as loop/i }));
    expect(mock.docText).toContain('{% for address in order.addresses %}');
    expect(mock.docText).toContain('{{ address.city }}');
  });

  it('pluralizes children → child', async () => {
    const user = userEvent.setup();
    findEnclosingLoopMock.mockReturnValue(null);
    const mock = renderToolbar();
    await user.click(screen.getByTitle('Insert Variable'));
    act(() => {
      lastOnPick!({ kind: 'array-element', arrayPath: 'family.children', fieldPath: 'name' });
    });
    await user.click(await screen.findByRole('button', { name: /Insert as loop/i }));
    expect(mock.docText).toContain('{% for child in family.children %}');
  });

  it('Cancel button closes AlertDialog without inserting', async () => {
    const user = userEvent.setup();
    findEnclosingLoopMock.mockReturnValue(null);
    const mock = renderToolbar();
    await user.click(screen.getByTitle('Insert Variable'));
    act(() => {
      lastOnPick!({ kind: 'array-element', arrayPath: 'order.items', fieldPath: 'amount.vat' });
    });
    await user.click(await screen.findByRole('button', { name: /Cancel/i }));
    expect(mock.docText).toBe('');
  });
});
