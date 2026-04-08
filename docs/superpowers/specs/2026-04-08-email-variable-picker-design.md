# Email Template Variable Picker — Design

**Date:** 2026-04-08
**Status:** Approved, pending implementation plan
**Related PR:** #75 (introduced `EmailVariable` model)

## Problem

PR #75 added the `EmailVariable` catalog so staff can register dot-notation template
variables (`user.first_name`, `order.total`). The basic email template editor does
not yet surface these variables to users — there is no way to browse, search, or
insert them without typing the path by hand and risking typos.

The catalog today only stores scalar leaves. Real templates already use
`{% for item in order.items %}{{ item.amount.vat }}{% endfor %}`, so the system must
also represent arrays and their element shapes.

## Goals

- Let staff browse registered variables in a Finder-style column view.
- Filter the tree by substring (case-insensitive) as the user types.
- Insert scalar variables as `{{ path }}` at the cursor.
- Insert array-element variables correctly whether the cursor is already inside a
  matching `{% for %}` loop or not.
- Strict schema: every container in the tree has an explicit DB row.

## Non-goals

- Raw `[]` path escape hatch. Dropped as YAGNI.
- Caching the API response. Low traffic, small payload — direct DB reads are fine.
- Editing variables from inside the picker. Admins still use the Email Variables
  admin page.

---

## Section 1 — Schema

### Model changes — `email_system/models/variable.py`

Add two container types to `DATA_TYPES`:

```python
DATA_TYPES = [
    ('string', 'String'),
    ('int',    'Integer'),
    ('float',  'Float'),
    ('bool',   'Boolean'),
    ('object', 'Object'),   # NEW — container, has children
    ('array',  'Array'),    # NEW — container, children describe element shape
]
```

No new columns. Array element shape is encoded in the `variable_path` string via a
`[]` segment marker (e.g. `order.items[].amount.vat`).

### Validation rules (`Model.clean()`)

- `[]` may appear only as a complete segment (`items[]`), never `items[]x` or bare `[]`.
- Any path containing a `foo[]` segment requires a row at path `foo` with
  `data_type='array'`. Missing-parent error points at the missing row.
- Rows with `data_type` of `object` or `array` must have `default_value == ''`.

Validation runs in `save()` and in the admin form.

### Migration 0031 — backfill containers

Strict mode: every non-leaf path segment must exist as an explicit row.

1. Read all existing `EmailVariable` rows.
2. For each leaf, walk ancestors and `get_or_create` an `object` row for any missing
   ancestor path.
3. Synthesized `display_name`: title-case the segment, underscore → space
   (`first_name` → "First Name"). `description` left blank.
4. Existing rows untouched.
5. Idempotent — re-running is a no-op.

Existing PR #75 data has no arrays, so the migration produces only `object`
containers. Arrays are added by admins as they register order-confirmation variables.

### Admin form — auto-create ancestors

`EmailVariableAdmin.save_model()` walks ancestors on save and auto-creates missing
`object` rows using the same logic as the migration. Without this, strict mode
forces admins to create rows in dependency order — hostile UX.

---

## Section 2 — API and tree shape

### Endpoint — `GET /api/email/variables/tree/`

Returns the flat list. The React client builds the tree. Flat wins: cheaper to
serialize, trivial to filter, no caching required.

```json
{
  "variables": [
    { "path": "user",                     "display_name": "User",       "data_type": "object", "description": "" },
    { "path": "user.first_name",          "display_name": "First Name", "data_type": "string", "description": "..." },
    { "path": "order.items[]",            "display_name": "Items",      "data_type": "array",  "description": "" },
    { "path": "order.items[].amount.vat", "display_name": "VAT",        "data_type": "float",  "description": "" }
  ]
}
```

- `is_active=True` only.
- Ordered by `variable_path` — alphabetical sort puts parents before children for free.
- Permission: staff-only, matching the permission class already used by
  `EmailTemplateViewSet`.
- No caching.

### Client tree module

`frontend/react-Admin3/src/components/admin/email/variables/variableTree.ts`

```ts
type DataType = 'string'|'int'|'float'|'bool'|'object'|'array';

type VarNode = {
  segment: string;          // "first_name" or "items[]"
  path: string;             // "order.items[].amount"
  displayName: string;
  description: string;
  dataType: DataType;
  children: VarNode[];
  isArrayElement: boolean;  // segment ends with "[]"
};

function buildTree(rows: EmailVariableRow[]): VarNode[];
function pruneTree(rows: EmailVariableRow[], query: string): VarNode[];
```

Leaf detection uses `dataType !== 'object' && dataType !== 'array'` — more reliable
than `children.length === 0`, which would misclassify freshly-added arrays whose
element fields are not yet registered.

`pruneTree` filters by `segment.includes(query.toLowerCase())` and pulls in every
ancestor path of any match so the column view can render a coherent tree:

```ts
function pruneTree(rows, query) {
  if (!query) return buildTree(rows);
  const q = query.toLowerCase();
  const keep = new Set<string>();
  for (const r of rows) {
    const segs = r.path.split(/\.|\[\]/).filter(Boolean);
    if (segs.some(s => s.toLowerCase().includes(q))) {
      const parts = r.path.split('.');
      for (let i = 1; i <= parts.length; i++) {
        keep.add(parts.slice(0, i).join('.'));
      }
    }
  }
  return buildTree(rows.filter(r => keep.has(r.path)));
}
```

---

## Section 3 — VariablePicker component

### Files

```
frontend/react-Admin3/src/components/admin/email/variables/
  VariablePicker.tsx         # shadcn Dialog containing column view + filter
  VariableColumn.tsx         # one column (list of nodes)
  VariableRow.tsx            # one row inside a column
  variableTree.ts            # buildTree, pruneTree (pure)
  variableTree.test.ts
  loopContext.ts             # findEnclosingLoop (pure)
  loopContext.test.ts
  useEmailVariables.ts       # RTK Query hook over /api/email/variables/tree/
  VariablePicker.test.tsx
```

Pure logic lives in its own modules. Rendering is thin.

### Component styling

Admin area uses **shadcn/ui + Lucide**, not MUI. The picker uses shadcn `Dialog`,
shadcn list primitives, and Lucide icons.

### Props

```tsx
<VariablePicker
  open={isOpen}
  onOpenChange={setOpen}
  onPick={(result: PickResult) => void}
/>

type PickResult =
  | { kind: 'scalar';        path: string; dataType: DataType }
  | { kind: 'array-element'; arrayPath: string; fieldPath: string };
```

The picker reports *what was picked*, not *how to render it*. The toolbar (Section 4)
decides how to turn a `PickResult` into editor text. This keeps template-syntax
knowledge out of the picker.

### State

```tsx
const [query, setQuery]       = useState('');
const [selected, setSelected] = useState<string[]>([]);  // segment stack
const { data: rows = [] }     = useEmailVariables();
const tree = useMemo(() => pruneTree(rows, query), [rows, query]);
```

### Column rendering

Fold over `selected`. Column `i` shows the children of the node at `selected[0..i-1]`.
Click on a row in column `i`:

- Truncate `selected` to length `i`, then push the clicked segment. This is the
  Finder behavior — clicking a sibling collapses deeper columns.
- If the clicked node is a leaf, also fire `onPick`.

Each column is a fixed-width scrollable list (~220px). Up to five visible; beyond
that the container scrolls horizontally. The rightmost column calls
`scrollIntoView({ inline: 'end' })` after `selected` updates.

### Row visuals

| Node type          | Icon        | Extra                    |
|--------------------|-------------|--------------------------|
| `object` container | `Folder`    | `>` chevron              |
| `array` container  | `DataArray` | `>` chevron + array chip |
| Array-element seg  | `ViewList`  | `[item]` label + chevron |
| Scalar leaf        | type icon   | type chip                |

Description shown on hover. Filter mode wraps matched characters in `<mark>`.

### Filter input

Shadcn `Input` with search icon at the top of the dialog, autofocused on open. No
debounce — the tree is in memory and ~200 rows filter instantly. Typing auto-advances
`selected` to the first match's ancestor chain so the user sees what matched.

### Keyboard navigation (v1)

- `↓` / `↑` — move within the current column
- `→` / `←` — move between columns (→ only if current selection has children)
- `Enter` — leaf fires `onPick`; container advances
- `Esc` — closes dialog

### Empty states

- No filter matches → "No variables match 'xyz'".
- Array with no registered children → "This array has no fields registered. Add
  them in Email Variables admin."

---

## Section 4 — Editor integration and loop-aware insertion

### Toolbar button

`BasicModeToolbar.tsx` gains a `Braces` (Lucide) button in a new `'variables'`
group after the callout dropdown. Clicking opens `<VariablePicker>` in a controlled
shadcn `Dialog`. Always enabled.

### Scalar insertion

```ts
function insertScalarVariable(view: EditorView, path: string): void {
  insertAtCursor(view, `{{ ${path} }}`);
}
```

Reuses the existing `insertAtCursor` helper at
[BasicModeToolbar.tsx:166](../../../frontend/react-Admin3/src/components/admin/email/templates/BasicModeToolbar.tsx#L166).

### Array-element insertion — flow

The picker returns `{ arrayPath: 'order.items', fieldPath: 'amount.vat' }`. Toolbar:

1. Call `findEnclosingLoop(documentText, cursorOffset, arrayPath)`.
2. **If a matching loop is found** → insert `{{ <loopVar>.<fieldPath> }}` at the
   cursor. No prompt. This is the common case inside an order-confirmation template.
3. **If no matching loop is found** → open a shadcn `AlertDialog`:

   > **"order.items" is an array**
   > This variable only makes sense inside a loop.
   >
   > [ Insert as loop ] [ Cancel ]

   - **Insert as loop** → inserts
     ```
     {% for item in order.items %}
       {{ item.amount.vat }}
     {% endfor %}
     ```
     Cursor lands after the inserted `{{ item.amount.vat }}`. Loop variable name is
     the singular of the last array segment, via the `pluralize` library
     (`items` → `item`, `addresses` → `address`, `children` → `child`).
   - **Cancel** → no-op.

### `findEnclosingLoop` — pure function

`frontend/react-Admin3/src/components/admin/email/variables/loopContext.ts`

```ts
export function findEnclosingLoop(
  documentText: string,
  cursorOffset: number,
  arrayPath: string
): { loopVar: string } | null;
```

Scan backward from `cursorOffset` matching `{% for (\w+) in <arrayPath> %}` and
`{% endfor %}`, maintaining a depth counter to handle nesting. Return the `loopVar`
from the first `{% for %}` at depth 0 whose iterable equals `arrayPath`. Tolerant of
whitespace variations.

---

## Section 5 — Testing strategy

Project TDD rules apply: RED → GREEN → REFACTOR, 80% minimum coverage for new code.

### Backend — `email_system/tests/test_email_variable_tree.py`

| Concern | Test |
|---|---|
| Schema | `data_type` accepts `object` and `array`; rejects unknown values |
| Validation | `clean()` rejects malformed `[]` segments |
| Validation | Path with `foo[]` segment fails if `foo` row is missing or not `array` |
| Validation | Container rows reject non-empty `default_value` |
| Migration 0031 | Backfills ancestor `object` rows with title-cased display names |
| Migration 0031 | Idempotent — re-run produces zero new rows |
| Admin auto-create | Saving a leaf with missing ancestors creates them |
| Admin auto-create | Saving a leaf whose ancestors exist creates no extras |
| API | `GET /api/email/variables/tree/` returns ordered flat list, excludes inactive |
| API | Staff-only: anonymous 401, non-staff 403 |

### Frontend — pure logic (`variableTree.test.ts`)

| Function | Tests |
|---|---|
| `buildTree` | Flat rows → nested tree; preserves metadata |
| `buildTree` | `isArrayElement` set for `items[]` segments |
| `buildTree` | Array node's children are element fields (no wrapper node) |
| `pruneTree` | Empty query → full tree |
| `pruneTree` | Query matches leaf segment (`"fir"` → `user.first_name` branch) |
| `pruneTree` | Query matches intermediate segment (`"prof"` → `user.profile.*`) |
| `pruneTree` | Case-insensitive |
| `pruneTree` | Substring match, not prefix |
| `pruneTree` | No matches → empty array |
| `pruneTree` | Ancestors of matches are always included |

### Frontend — loop scanner (`loopContext.test.ts`)

| Scenario | Expected |
|---|---|
| Cursor inside `{% for item in order.items %}HERE{% endfor %}` | `{ loopVar: 'item' }` |
| Nested outer-matching loop | outer loop's var |
| Nested loop over different array, picking outer's array | outer's var |
| Cursor after closed matching loop | `null` |
| Cursor inside loop over different array | `null` |
| Empty document | `null` |
| Malformed `{% for %}` without `{% endfor %}` | `null`, no crash |
| Whitespace variations (`{%for item in order.items%}`, extra spaces) | all match |

### Frontend — component (`VariablePicker.test.tsx`)

| Concern | Test |
|---|---|
| Initial render shows root column |
| Click container advances column |
| Click sibling in earlier column collapses deeper columns |
| Click scalar leaf fires `onPick` with scalar result |
| Click array-element leaf fires `onPick` with array-element result |
| Typing in filter prunes tree, highlights matches with `<mark>` |
| Clearing filter restores full tree |
| Filter with no matches shows empty state |
| `↓` / `↑` / `→` / `←` / `Enter` / `Esc` behave per spec |
| Filter input autofocuses on open |
| Dialog has accessible title |

### Frontend — toolbar integration (extend `BasicModeToolbar.test.tsx`)

| Concern | Test |
|---|---|
| Variable button opens picker |
| Scalar pick inserts `{{ path }}` at cursor |
| Array pick with mocked loop context → inserts `{{ loopVar.fieldPath }}` |
| Array pick without loop context → AlertDialog appears |
| "Insert as loop" inserts full `{% for %}…{% endfor %}` block |
| Loop variable name uses `pluralize.singular` |
| Cancel button closes AlertDialog without inserting |

### End-to-end — Playwright happy path

One spec covering the full flow:

1. Open an email template in the admin.
2. Click the variable button in the basic-mode toolbar.
3. Type `"fir"` in the filter → assert `user.first_name` is visible and matched
   characters are highlighted.
4. Click the leaf → assert `{{ user.first_name }}` is present in the editor.
5. Re-open picker, drill to `order.items[].amount.vat`, pick it.
6. Assert `AlertDialog` appears, click "Insert as loop".
7. Assert the full loop block is present in the editor.

Uses `127.0.0.1` per the project Playwright convention.

### What is deliberately not tested

- Shadcn primitive rendering (upstream-tested).
- CodeMirror internals (`insertAtCursor` already works; we verify only that we call
  it with the right string).
- Per-component snapshot testing.

---

## Open items for the implementation plan

- Confirm whether `pluralize` is already a frontend dependency; add if not.
- Confirm the exact RTK Query slice file to extend for `useEmailVariables`.
- Confirm the permission class used by `EmailTemplateViewSet` and reuse it for
  the new tree endpoint.
