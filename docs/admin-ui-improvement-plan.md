# Admin UI Improvement Plan

**Date**: 2026-03-25
**Goal**: Minimalist, clean admin UI with precise information, code reuse, and clean organization
**Scope**: `src/components/admin/` — composed components, page components, styles

---

## Current State Summary

The admin UI has a solid foundation: shadcn/ui primitives, Tailwind v4 with `tw:` prefix, ViewModel pattern for logic separation, and a composed component layer (`AdminDataTable`, `AdminFormLayout`, `AdminFormField`, `AdminPage`, `AdminPageHeader`). Dark mode and oklch color palette are wired.

The issues below are about **consistency, deduplication, and tightening the design system** — not a rewrite.

---

## Issues

### 1. Checkbox Synthetic Event Boilerplate (18+ instances)

**Problem**: Every form with a checkbox repeats the same 5-line block to convert Radix `onCheckedChange` to a synthetic `React.ChangeEvent<HTMLInputElement>` for the ViewModel's `handleChange`:

```tsx
// Repeated in 11+ form files, 18+ checkbox instances
onCheckedChange={(checked) => {
  const syntheticEvent = {
    target: { name: 'active', value: '', type: 'checkbox', checked: !!checked }
  } as React.ChangeEvent<HTMLInputElement>;
  vm.handleChange(syntheticEvent);
}}
```

**Files**: SubjectForm, ProductForm, StoreBundleForm, ExamSessionSubjectForm, ProductBundleForm, StoreProductForm, EmailAttachmentForm, ClosingSalutationForm, EmailPlaceholderForm, EmailContentRuleForm, EmailTemplateForm

**Fix**: Create `AdminCheckboxField` composed component.

```tsx
// composed/AdminCheckboxField.tsx
interface AdminCheckboxFieldProps {
  name: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  description?: string;
}

function AdminCheckboxField({ name, label, checked, onChange, description }: AdminCheckboxFieldProps) {
  return (
    <div className="tw:flex tw:items-center tw:gap-2">
      <Checkbox
        aria-label={label}
        name={name}
        checked={checked}
        onCheckedChange={(val) => {
          const syntheticEvent = {
            target: { name, value: '', type: 'checkbox', checked: !!val }
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }}
      />
      <span className="tw:text-sm tw:text-admin-fg">{label}</span>
      {description && <span className="tw:text-xs tw:text-admin-fg-muted">{description}</span>}
    </div>
  );
}
```

**Usage**: Replaces 5 lines with 1 in every form:
```tsx
<AdminFormField label="Active">
  <AdminCheckboxField name="active" label="Active" checked={vm.formData.active} onChange={vm.handleChange} />
</AdminFormField>
```

---

### 2. Inline Filter Toggle Buttons (5+ pages)

**Problem**: Filter chip buttons are implemented inline with identical 4-line className strings in every page that has filters:

```tsx
// Repeated in EmailTemplateList, EmailQueueList, EmailSettingsList, NewSessionSetup, EmailQueueDuplicateForm
<button
  className={`tw:inline-flex tw:items-center tw:rounded-full tw:border tw:px-2.5 tw:py-0.5 tw:text-xs tw:font-medium tw:transition-colors ${
    isActive ? 'tw:border-primary tw:bg-primary tw:text-primary-foreground'
             : 'tw:border-admin-border tw:bg-transparent tw:text-admin-fg-muted tw:hover:bg-admin-bg-muted'
  }`}
>
```

**Fix**: Create `AdminToggleGroup` composed component.

```tsx
// composed/AdminToggleGroup.tsx
interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface AdminToggleGroupProps<T extends string> {
  label?: string;
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

function AdminToggleGroup<T extends string>({ label, options, value, onChange }: AdminToggleGroupProps<T>) {
  return (
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
      {label && <span className="tw:mr-1 tw:text-sm tw:text-admin-fg-muted">{label}:</span>}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'tw:inline-flex tw:items-center tw:rounded-full tw:border tw:px-2.5 tw:py-0.5 tw:text-xs tw:font-medium tw:transition-colors',
            value === opt.value
              ? 'tw:border-primary tw:bg-primary tw:text-primary-foreground'
              : 'tw:border-admin-border tw:bg-transparent tw:text-admin-fg-muted tw:hover:bg-admin-bg-muted'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

**Usage** (EmailTemplateList before/after):
```tsx
// BEFORE: 15 lines of inline button markup per filter group
// AFTER:
<AdminToggleGroup label="Master" options={MASTER_FILTER_OPTIONS} value={vm.filterMaster} onChange={vm.setFilterMaster} />
<AdminToggleGroup label="Type" options={TEMPLATE_TYPE_OPTIONS} value={vm.filterTemplateType} onChange={vm.setFilterTemplateType} />
```

---

### 3. Inconsistent Border Radius

**Problem**: Three different radius values used interchangeably for the same visual purpose (card/container borders):

| Token | Count | Used in |
|-------|-------|---------|
| `tw:rounded-admin` | ~50 | SubjectDetail, ProductDetail, StoreProductList, NewSessionSetup steps |
| `tw:rounded-md` | ~60 | AdminDataTable, email forms, AdminErrorAlert, dropdown menus |
| `tw:rounded-lg` | ~10 | AdminTopBar user menu, AppSidebar, button.tsx dialog |

**Fix**: Standardize on `tw:rounded-md` for all card/container borders. Reserve `tw:rounded-lg` for elevated elements (dialogs, popovers). Remove `tw:rounded-admin` usage — it maps to `0.375rem` which equals `rounded-md`, so it's redundant.

**Migration**: Find-and-replace `tw:rounded-admin` with `tw:rounded-md` across all admin components.

---

### 4. Non-Semantic Color References in AdminTopBar

**Problem**: AdminTopBar uses raw CSS variable syntax instead of semantic Tailwind classes:

```tsx
// AdminTopBar.tsx:94 — raw CSS variables
tw:border-[var(--border)] tw:bg-[var(--popover)] tw:text-[var(--popover-foreground)]

// AdminTopBar.tsx:99
tw:text-[var(--muted-foreground)]

// AdminTopBar.tsx:109
tw:text-[var(--popover-foreground)] hover:tw:bg-[var(--accent)]
```

**Fix**: Replace with semantic equivalents already defined in `@theme inline`:
```tsx
tw:border-border tw:bg-popover tw:text-popover-foreground
tw:text-muted-foreground
tw:text-popover-foreground hover:tw:bg-accent
```

---

### 5. Hardcoded Background Colors (Not Dark-Mode Aware)

**Problem**: Some components use hardcoded colors that break in dark mode:

| File | Line | Issue |
|------|------|-------|
| StoreProductList.tsx | 132 | `tw:bg-gray-100` for subject row headers |
| StoreProductList.tsx | 172 | `tw:hover:bg-gray-50` for product rows |
| MjmlPreviewPane.tsx | 31 | `tw:bg-white` for preview background |

**Fix**: Replace with theme-aware tokens:
- `tw:bg-gray-100` → `tw:bg-muted`
- `tw:hover:bg-gray-50` → `tw:hover:bg-muted/50`
- `tw:bg-white` → `tw:bg-card`

---

### 6. Manual Pagination Outside AdminDataTable

**Problem**: StoreProductList (lines 245-270) and ProductList implement their own pagination UI with Previous/Next buttons, duplicating what AdminDataTable already provides.

These pages use custom tables because of hierarchical/expandable rows, so AdminDataTable doesn't apply directly.

**Fix**: Extract pagination into a standalone `AdminPagination` composed component, so pages with custom tables can still reuse it:

```tsx
// composed/AdminPagination.tsx
interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onPageSizeChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  pageSizeOptions?: number[];
}

function AdminPagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions }: AdminPaginationProps) {
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  if (total <= pageSize) return null;

  return (
    <div className="tw:flex tw:items-center tw:justify-between tw:px-2 tw:text-sm tw:text-admin-fg-muted">
      <span>Showing {start}&ndash;{end} of {total}</span>
      <div className="tw:flex tw:items-center tw:gap-4">
        {onPageSizeChange && (
          <div className="tw:flex tw:items-center tw:gap-2">
            <span>Rows per page</span>
            <select
              className="tw:h-8 tw:rounded-md tw:border tw:border-admin-border tw:bg-transparent tw:px-2 tw:text-sm"
              value={pageSize}
              onChange={onPageSizeChange}
            >
              {(pageSizeOptions ?? [10, 20, 50]).map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}
        <div className="tw:flex tw:items-center tw:gap-1">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={(e) => onPageChange(e, page - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={end >= total} onClick={(e) => onPageChange(e, page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
```

Then refactor AdminDataTable to use `AdminPagination` internally (DRY).

---

### 7. Detail Pages Have No Shared Structure

**Problem**: SubjectDetail and ProductDetail (and likely others) repeat the same card + definition list + back button pattern:

```tsx
// Pattern repeated in every detail page
<AdminPage>
  <AdminPageHeader title={...} breadcrumbs={...} actions={[Edit, Delete]} />
  <div className="tw:rounded-admin tw:border tw:border-admin-border tw:bg-admin-bg tw:p-6">
    <dl className="tw:space-y-4">
      <div>
        <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">Label</dt>
        <dd className="tw:mt-1 tw:text-admin-fg">{value}</dd>
      </div>
      <Separator />
      {/* repeat for each field */}
    </dl>
  </div>
  <div className="tw:mt-6">
    <Button variant="outline" onClick={handleBack}>
      <ArrowLeft /> Back to {collection}
    </Button>
  </div>
</AdminPage>
```

**Fix**: Create `AdminDetailCard` and `AdminDetailField` composed components:

```tsx
// composed/AdminDetailCard.tsx
function AdminDetailCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="tw:rounded-md tw:border tw:border-admin-border tw:bg-card tw:p-6">
      <dl className="tw:space-y-4">{children}</dl>
    </div>
  );
}

function AdminDetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div>
        <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">{label}</dt>
        <dd className="tw:mt-1 tw:text-admin-fg">{children}</dd>
      </div>
      <Separator />
    </>
  );
}
```

**Usage**:
```tsx
<AdminDetailCard>
  <AdminDetailField label="Description">{vm.subject.description || 'N/A'}</AdminDetailField>
  <AdminDetailField label="Status"><AdminBadge active={vm.subject.active} /></AdminDetailField>
  <AdminDetailField label="Created">{new Date(vm.subject.created_at).toLocaleString()}</AdminDetailField>
</AdminDetailCard>
```

---

### 8. Inline Style Objects in Email Components

**Problem**: 7 instances of `style={{ }}` in email editor/preview components for fixed heights:

| File | Line | Style |
|------|------|-------|
| EmailTemplateMjmlEditor.tsx | 139 | `style={{ minHeight: 500 }}` |
| EmailTemplateMjmlEditor.tsx | 153 | `style={{ height: '100%', minHeight: 500 }}` |
| RuleJsonEditor.tsx | 82 | `style={{ height: 300, minHeight: 300 }}` |
| MjmlPreviewPane.tsx | 32 | `style={{ minHeight: 500 }}` |

**Fix**: Replace with Tailwind arbitrary values:
- `style={{ minHeight: 500 }}` → `className="tw:min-h-[500px]"`
- `style={{ height: 300, minHeight: 300 }}` → `className="tw:h-[300px] tw:min-h-[300px]"`

---

### 9. Missing Composed Component Barrel Export

**Problem**: After creating the new components, the composed barrel export needs updating.

**Fix**: Update `composed/index.ts` to include:
- `AdminCheckboxField`
- `AdminToggleGroup`
- `AdminPagination`
- `AdminDetailCard` / `AdminDetailField`

---

## Implementation Priority

| # | Issue | Impact | Effort | Files Changed |
|---|-------|--------|--------|---------------|
| 1 | AdminCheckboxField | High (18+ instances) | Low | 1 new + 11 forms |
| 2 | AdminToggleGroup | High (5+ pages) | Low | 1 new + 5 pages |
| 3 | Border radius standardization | Medium (visual consistency) | Low | ~50 find-replace |
| 4 | AdminTopBar semantic colors | Medium (consistency) | Low | 1 file |
| 5 | Dark-mode-safe backgrounds | Medium (dark mode broken) | Low | 3 files |
| 6 | AdminPagination extraction | Medium (DRY) | Medium | 1 new + 3 pages + AdminDataTable |
| 7 | AdminDetailCard/Field | Medium (DRY) | Low | 2 new + detail pages |
| 8 | Inline styles to Tailwind | Low (consistency) | Low | 4 files |
| 9 | Barrel export cleanup | Low (DX) | Low | 1 file |

---

## Design Principles Going Forward

1. **One way to do things** — Every visual pattern should have exactly one composed component. If you find yourself writing more than 2 lines of className, extract it.
2. **Semantic tokens only** — Never use `tw:bg-gray-*`, `tw:text-[var(--*)]`, or hardcoded colors. Always use `tw:bg-muted`, `tw:text-admin-fg-muted`, etc.
3. **`rounded-md` everywhere** — Standard border radius for cards, containers, inputs. `rounded-lg` for dialogs/popovers only. `rounded-full` for badges/avatars only.
4. **AdminDataTable or AdminPagination** — All list pages must use one of these. No manual pagination markup.
5. **No synthetic event hacks in page components** — All Radix-to-ViewModel bridges belong in composed components or utility hooks.
