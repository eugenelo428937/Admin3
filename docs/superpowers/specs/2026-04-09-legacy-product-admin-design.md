# Legacy Product Admin Component — Design

**Status:** Approved
**Date:** 2026-04-09
**Author:** Brainstorming session (Claude + eugenelo428937)
**Scope:** Read-only admin page for searching and browsing the 36,513 historical legacy products imported into `legacy.products`.

---

## 1. Goal

Add a Legacy Products page to the admin panel that lets staff search and browse the historical product archive (1995–2026) by product name, subject, exam session, and delivery format. This supports order history investigation — when a user queries about a past purchase, staff can look up what products existed in that session.

### Non-goals

- Create/edit/delete legacy products (read-only archive)
- Detail page per product (the table IS the detail)
- Export/download functionality
- Redux state management (local ViewModel state is sufficient)
- Linking legacy products to orders (separate future work)

---

## 2. Layout

Stacked filter controls in a contained card above a data table, with server-side pagination. Follows the existing admin panel visual language (shadcn/ui + Tailwind, AdminDataTable pattern).

```
┌─────────────────────────────────────────────────────────────┐
│  Legacy Products                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Filters ──────────────────────────────── [Clear All] ─┐ │
│  │  SEARCH          SUBJECT        SESSION      FORMAT    │ │
│  │  [🔍 text...]   [combobox ▾]   [combobox ▾] [select ▾]│ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  36,513 results                            Page 1 of 1,826 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ CODE        PRODUCT NAME           SUBJ  SESS  FORMAT │ │
│  │ CM2/PN/20   Course Notes           CM2   20    Printed│ │
│  │ CM2/CN/20   Course Notes eBook     CM2   20    eBook  │ │
│  │ CB1/PC/25   Combined Materials..   CB1   25    Printed│ │
│  │ ...                                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  Showing 1-20 of 36,513              [← Prev] 1 2 3 [Next→]│
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Filter controls

| Control | Component | Data source | API query param | Behavior |
|---------|-----------|-------------|-----------------|----------|
| Search | shadcn `Input` with lucide `Search` icon | User typed text | `?q=` | Debounced 300ms, searches `normalized_name`, `legacy_product_name`, and `full_code` on the backend |
| Subject | **shadcn Combobox** (searchable dropdown) | `/api/catalog/subjects/` via existing `subjectService` | `?subject=` | Autocomplete with type-ahead filtering. Shows `code` as value. |
| Exam Session | **shadcn Combobox** (searchable dropdown) | `/api/catalog/exam-sessions/` via existing `examSessionService` | `?session=` | Autocomplete with type-ahead filtering. Shows `session_code` as value. |
| Format | shadcn `Select` (plain dropdown) | Hardcoded 4 items | `?delivery=` | Options: All / Printed (P) / eBook (C) / Marking (M) / Tutorial (T) |
| Clear All | shadcn `Button` variant ghost | — | — | Resets all filters to empty, triggers fresh unfiltered fetch |

### Combobox component

A new shadcn Combobox (`src/components/admin/ui/combobox.tsx`) is required — the project currently has `Select` but not a searchable combobox. This follows the [shadcn Combobox pattern](https://ui.shadcn.com/docs/components/combobox) built on `cmdk` (Command) + `Popover`.

Props:
```typescript
interface ComboboxProps {
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
}
```

---

## 4. Table columns

| Column header | Field | Rendering |
|---------------|-------|-----------|
| Code | `full_code` | Monospace font (`font-mono`) |
| Product Name | `legacy_product_name` | Default text — raw CSV name for maximum specificity |
| Subject | `subject_code` | Plain text, `font-medium` |
| Session | `session_code` | Plain text |
| Format | `delivery_format` | Color-coded badge: `P`=blue, `C`=purple, `M`=amber, `T`=green. Label: Printed/eBook/Marking/Tutorial |

Table uses `AdminDataTable` (TanStack React Table v8) from `src/components/admin/composed/`. Sorting is NOT needed (server returns results in a fixed order: `subject_code, session_code, normalized_name`).

---

## 5. Data flow

```
User interaction → ViewModel state update → API call → Table re-render
                                                ↓
                               GET /api/legacy/products/
                               ?q=...&subject=...&session=...&delivery=...&page=...
                                                ↓
                               DRF PageNumberPagination response:
                               { count: 36513, next: "...?page=2",
                                 previous: null, results: [...] }
```

1. User types in search box → ViewModel debounces (300ms) → API call
2. User selects from combobox/select → ViewModel calls API immediately (no debounce)
3. User changes page → ViewModel updates page param → API call
4. Any filter change resets page to 1

### API endpoint (already exists)

```
GET /api/legacy/products/?q=<text>&subject=<code>&session=<code>&delivery=<P|C|M|T>&page=<n>
```

Backend: `legacy.views.LegacyProductSearchView` (DRF `ListAPIView` with `icontains` text search). Returns paginated JSON with 20 results per page (DRF global default is 50, but we'll use `page_size=20` from the frontend).

---

## 6. File structure

### New files

```
frontend/react-Admin3/src/
├── components/admin/
│   ├── legacy-products/
│   │   ├── LegacyProductList.tsx          # Page component
│   │   ├── useLegacyProductListVM.ts      # ViewModel hook
│   │   └── legacyProductColumns.tsx       # Column definitions
│   └── ui/
│       └── combobox.tsx                   # New shadcn Combobox component
├── services/
│   └── legacyProductService.ts            # API service for legacy endpoint
└── types/
    └── legacy-product.types.ts            # TypeScript interface
```

### Modified files

```
frontend/react-Admin3/src/
├── App.js                                 # Add route: /admin/legacy-products
└── components/admin/layout/
    └── AdminShell.tsx (or sidebar config)  # Add nav link
```

---

## 7. Component details

### `LegacyProductList.tsx`

- Uses `AdminPage` + `AdminPageHeader` wrappers (existing composed components)
- Filter card: a `div` with background/border styling containing the 4 filter controls
- Table: `AdminDataTable` with columns from `legacyProductColumns.tsx`
- Pagination: `AdminPagination` component
- Loading: `AdminLoadingState` skeleton
- Empty: `AdminEmptyState` with "No legacy products found" message

### `useLegacyProductListVM.ts`

Local state (no Redux):
```typescript
interface LegacyProductFilters {
  q: string           // search text
  subject: string     // subject_code or ''
  session: string     // session_code or ''
  delivery: string    // P/C/M/T or ''
  page: number        // current page (1-indexed)
}
```

Returns:
```typescript
{
  // Data
  products: LegacyProduct[]
  totalCount: number
  isLoading: boolean
  error: string | null

  // Filter state
  filters: LegacyProductFilters
  setSearchQuery: (q: string) => void
  setSubject: (code: string) => void
  setSession: (code: string) => void
  setDelivery: (format: string) => void
  setPage: (page: number) => void
  clearFilters: () => void

  // Option lists for comboboxes
  subjectOptions: { value: string; label: string }[]
  sessionOptions: { value: string; label: string }[]
}
```

### `legacyProductService.ts`

```typescript
const legacyProductService = {
  search(params: {
    q?: string; subject?: string; session?: string;
    delivery?: string; page?: number; page_size?: number;
  }): Promise<PaginatedResponse<LegacyProduct>>
}
```

Uses `httpService` (existing Axios instance) to call `GET /api/legacy/products/`.

### `combobox.tsx`

Follows the [shadcn Combobox recipe](https://ui.shadcn.com/docs/components/combobox):
- Built on `Popover` + `Command` (from `cmdk` library)
- **Prerequisites:** `npm install cmdk` (not yet installed), plus shadcn `Command` and `Popover` UI primitives (`npx shadcn@latest add command popover`)
- Searchable: user types to filter the option list client-side
- Clearable: selecting the already-selected value deselects it

---

## 8. Route and navigation

**Route** (in `App.js`):
```jsx
<Route path="legacy-products" element={<LegacyProductList />} />
```
Nested under the existing `/admin` parent route.

**Sidebar link** (in `AdminShell.tsx` or its nav config):
- Label: "Legacy Products"
- Icon: `Archive` from lucide-react
- Position: after "Store Bundles" in the sidebar, in a new "Archive" section
