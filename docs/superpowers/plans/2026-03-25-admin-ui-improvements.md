# Admin UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deduplicate repeated UI patterns across the admin interface by extracting composed components, standardizing design tokens, and replacing hardcoded colors with theme-aware tokens.

**Architecture:** Create 4 new composed components (AdminCheckboxField, AdminToggleGroup, AdminPagination, AdminDetailCard/AdminDetailField) in the existing `composed/` layer, then migrate all consumers. Remaining tasks are find-and-replace operations for border radius, color tokens, and inline styles.

**Tech Stack:** React 19.2, TypeScript, Tailwind CSS v4 (`tw:` prefix), shadcn/ui primitives, Radix UI

**Spec:** `docs/admin-ui-improvement-plan.md`

---

## File Structure

### New Files
```
src/components/admin/composed/AdminCheckboxField.tsx    # Checkbox + synthetic event bridge
src/components/admin/composed/AdminToggleGroup.tsx      # Filter chip toggle group
src/components/admin/composed/AdminPagination.tsx       # Standalone pagination controls
src/components/admin/composed/AdminDetailCard.tsx       # Detail page card + field components
```

All paths below are relative to `frontend/react-Admin3/`.

### Modified Files (by task)
```
# Task 1: AdminCheckboxField consumers
src/components/admin/subjects/SubjectForm.tsx
src/components/admin/products/ProductForm.tsx
src/components/admin/store-products/StoreProductForm.tsx
src/components/admin/store-bundles/StoreBundleForm.tsx
src/components/admin/product-bundles/ProductBundleForm.tsx
src/components/admin/exam-session-subjects/ExamSessionSubjectForm.tsx
src/components/admin/staff/StaffForm.tsx

# Task 2: AdminToggleGroup consumers
src/components/admin/email/templates/EmailTemplateList.tsx
src/components/admin/email/queue/EmailQueueList.tsx
src/components/admin/email/settings/EmailSettingsList.tsx

# Task 3: Border radius standardization (16 files with tw:rounded-admin)
# Task 4: AdminTopBar semantic colors
src/components/admin/layout/AdminTopBar.tsx

# Task 5: Dark-mode-safe backgrounds
src/components/admin/store-products/StoreProductList.tsx
src/components/admin/store-bundles/StoreBundleList.tsx
src/components/admin/email/shared/MjmlPreviewPane.tsx

# Task 6: AdminPagination consumers
src/components/admin/composed/AdminDataTable.tsx
src/components/admin/store-products/StoreProductList.tsx
src/components/admin/products/ProductList.tsx

# Task 7: AdminDetailCard/Field consumers
src/components/admin/subjects/SubjectDetail.tsx
src/components/admin/products/ProductDetail.tsx

# Task 8: Inline styles to Tailwind
src/components/admin/email/templates/EmailTemplateMjmlEditor.tsx
src/components/admin/email/shared/RuleJsonEditor.tsx
src/components/admin/email/shared/MjmlPreviewPane.tsx

# Task 9: Barrel export
src/components/admin/composed/index.ts
```

---

## Context for All Tasks

### Project conventions
- All Tailwind classes use the `tw:` prefix (e.g., `tw:flex`, `tw:rounded-md`)
- Composed components live in `src/components/admin/composed/`
- UI primitives live in `src/components/admin/ui/`
- The `cn()` utility at `src/components/admin/styles/cn.ts` combines `clsx` + `twMerge`
- Every composed component exports both the component and its Props type from the barrel at `src/components/admin/composed/index.ts`
- ViewModels use `handleChange(e: React.ChangeEvent<HTMLInputElement>)` pattern in catalog/store forms, and `handleChange(field: string, value: any)` pattern in email forms
- shadcn `Checkbox` uses `onCheckedChange(checked: boolean | 'indeterminate')` from Radix

### Test infrastructure
- Frontend tests: `npm test -- --watchAll=false` from `frontend/react-Admin3/`
- Test files at `src/components/admin/{feature}/__tests__/{Component}.test.{js,tsx}`
- 39 existing test files across admin modules
- Known: ~280 pre-existing frontend test failures on main (not introduced by this work)

### Design tokens
- `tw:rounded-admin` maps to `--admin-radius: 0.375rem` which equals `tw:rounded-md` (they are identical)
- Semantic background colors: `tw:bg-muted`, `tw:bg-card`, `tw:bg-background`
- Semantic text colors: `tw:bg-popover`, `tw:text-popover-foreground`, `tw:text-muted-foreground`

---

## Task 1: Create AdminCheckboxField Composed Component

**Files:**
- Create: `src/components/admin/composed/AdminCheckboxField.tsx`
- Modify: `src/components/admin/subjects/SubjectForm.tsx:49-62`
- Modify: `src/components/admin/products/ProductForm.tsx:71-83`
- Modify: `src/components/admin/store-products/StoreProductForm.tsx:95-110`
- Modify: `src/components/admin/store-bundles/StoreBundleForm.tsx:106-122`
- Modify: `src/components/admin/product-bundles/ProductBundleForm.tsx:87-123`
- Modify: `src/components/admin/exam-session-subjects/ExamSessionSubjectForm.tsx:52-63`
- Modify: `src/components/admin/staff/StaffForm.tsx:43-54`

### Important context

There are **two distinct ViewModel patterns** for checkbox handling:

**Pattern A — Synthetic event** (catalog/store forms, 7 files, 9 instances):
```tsx
onCheckedChange={(checked) => {
  const syntheticEvent = {
    target: { name: 'active', value: '', type: 'checkbox', checked: !!checked }
  } as React.ChangeEvent<HTMLInputElement>;
  vm.handleChange(syntheticEvent);
}}
```

**Pattern B — Direct value** (email forms, 6 files, 9 instances):
```tsx
onCheckedChange={(checked) => vm.handleChange('is_active', !!checked)}
```

AdminCheckboxField should support **Pattern A only** — it encapsulates the synthetic event boilerplate. Pattern B is already clean (1 line) and uses a different `handleChange(field, value)` signature that doesn't need a bridge component.

### Steps

- [ ] **Step 1: Create AdminCheckboxField component**

Create `src/components/admin/composed/AdminCheckboxField.tsx`:

```tsx
import * as React from 'react';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { cn } from '@/components/admin/styles/cn';

interface AdminCheckboxFieldProps {
  name: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  description?: string;
  disabled?: boolean;
  className?: string;
}

function AdminCheckboxField({
  name,
  label,
  checked,
  onChange,
  description,
  disabled,
  className,
}: AdminCheckboxFieldProps) {
  return (
    <div className={cn('tw:flex tw:items-center tw:gap-2', className)}>
      <Checkbox
        aria-label={label}
        name={name}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(val) => {
          const syntheticEvent = {
            target: { name, value: '', type: 'checkbox', checked: !!val },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }}
      />
      <span className="tw:text-sm tw:text-admin-fg">{label}</span>
      {description && (
        <span className="tw:text-xs tw:text-admin-fg-muted">{description}</span>
      )}
    </div>
  );
}

export { AdminCheckboxField };
export type { AdminCheckboxFieldProps };
```

- [ ] **Step 2: Migrate SubjectForm.tsx**

Replace the checkbox block (the `<Checkbox>` with its `onCheckedChange` handler inside the `<AdminFormField label="Active">` block) with:

```tsx
<AdminFormField label="Active">
  <AdminCheckboxField
    name="active"
    label="Active"
    checked={vm.formData.active}
    onChange={vm.handleChange}
  />
</AdminFormField>
```

Remove the direct `Checkbox` import if no longer used.
Add `AdminCheckboxField` to the composed import.

- [ ] **Step 3: Migrate ProductForm.tsx**

Same pattern. Field name: `active`. Checked: `vm.formData.active`.

- [ ] **Step 4: Migrate StoreProductForm.tsx**

Field name: `is_active`. Checked: `vm.formData.is_active`.

- [ ] **Step 5: Migrate StoreBundleForm.tsx**

Field name: `is_active`. Checked: `vm.formData.is_active`.

- [ ] **Step 6: Migrate ProductBundleForm.tsx**

This file has **two** checkbox instances:
1. Field name: `is_featured`, Checked: `vm.formData.is_featured`
2. Field name: `is_active`, Checked: `vm.formData.is_active`

Replace both.

- [ ] **Step 7: Migrate ExamSessionSubjectForm.tsx**

Field name: `is_active`. Checked: `vm.formData.is_active`.
Note: This form calls `vm.handleCheckboxChange` instead of `vm.handleChange` — the AdminCheckboxField produces the same synthetic event shape, so pass `vm.handleCheckboxChange` as the `onChange` prop.

- [ ] **Step 8: Migrate StaffForm.tsx**

Field name: `is_active`. Checked: `vm.formData.is_active`.

- [ ] **Step 9: Add to barrel export**

Append to `src/components/admin/composed/index.ts`:

```tsx
export { AdminCheckboxField } from './AdminCheckboxField';
export type { AdminCheckboxFieldProps } from './AdminCheckboxField';
```

- [ ] **Step 10: Run tests and commit**

```bash
cd frontend/react-Admin3 && npm test -- --watchAll=false --testPathPattern="admin/(subjects|products|store-products|store-bundles|product-bundles|exam-session-subjects|staff)" 2>&1 | tail -20
```

```bash
git add src/components/admin/composed/AdminCheckboxField.tsx src/components/admin/composed/index.ts src/components/admin/subjects/SubjectForm.tsx src/components/admin/products/ProductForm.tsx src/components/admin/store-products/StoreProductForm.tsx src/components/admin/store-bundles/StoreBundleForm.tsx src/components/admin/product-bundles/ProductBundleForm.tsx src/components/admin/exam-session-subjects/ExamSessionSubjectForm.tsx src/components/admin/staff/StaffForm.tsx
git commit -m "feat(admin): extract AdminCheckboxField composed component

Replaces 9 instances of checkbox synthetic event boilerplate across 7 form
files with a single composed component that bridges Radix onCheckedChange
to the ViewModel handleChange interface."
```

---

## Task 2: Create AdminToggleGroup Composed Component

**Files:**
- Create: `src/components/admin/composed/AdminToggleGroup.tsx`
- Modify: `src/components/admin/email/templates/EmailTemplateList.tsx:89-125`
- Modify: `src/components/admin/email/queue/EmailQueueList.tsx:74-90`
- Modify: `src/components/admin/email/settings/EmailSettingsList.tsx:50-66`

### Steps

- [ ] **Step 1: Create AdminToggleGroup component**

Create `src/components/admin/composed/AdminToggleGroup.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/components/admin/styles/cn';

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface AdminToggleGroupProps<T extends string> {
  label?: string;
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

function AdminToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: AdminToggleGroupProps<T>) {
  return (
    <div className={cn('tw:flex tw:flex-wrap tw:items-center tw:gap-2', className)}>
      {label && (
        <span className="tw:mr-1 tw:text-sm tw:text-admin-fg-muted">{label}:</span>
      )}
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

export { AdminToggleGroup };
export type { AdminToggleGroupProps, ToggleOption };
```

- [ ] **Step 2: Migrate EmailTemplateList.tsx**

Replace both filter chip sections (Master filter: lines ~89-106, Type filter: lines ~108-125) with:

```tsx
<AdminToggleGroup
  label="Master"
  options={MASTER_FILTER_OPTIONS}
  value={vm.filterMaster}
  onChange={vm.setFilterMaster}
  className="tw:mb-2"
/>
<AdminToggleGroup
  label="Type"
  options={TEMPLATE_TYPE_OPTIONS}
  value={vm.filterTemplateType}
  onChange={vm.setFilterTemplateType}
  className="tw:mb-4"
/>
```

Remove the wrapper `<div>` elements that only existed to hold `tw:mb-2 tw:flex tw:flex-wrap tw:items-center tw:gap-2`.

- [ ] **Step 3: Migrate EmailQueueList.tsx**

Replace status filter section (lines ~74-90) with:

```tsx
<AdminToggleGroup
  options={STATUS_OPTIONS.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
  value={vm.statusFilter}
  onChange={vm.handleStatusFilter}
  className="tw:mb-4"
/>
```

Note: STATUS_OPTIONS may be an array of strings, not objects. Check the constant definition — if it's `string[]`, map to `ToggleOption[]` as shown.

- [ ] **Step 4: Migrate EmailSettingsList.tsx**

Note: EmailSettingsList uses `tw:px-3 tw:py-1` (slightly larger) instead of `tw:px-2.5 tw:py-0.5`. AdminToggleGroup normalizes all toggle chips to the same size — this is an intentional visual consistency improvement.

Replace filter chip section (lines ~50-66) with:

```tsx
<AdminToggleGroup
  options={SETTING_TYPE_OPTIONS}
  value={vm.filterType}
  onChange={vm.filterByType}
  className="tw:mb-6"
/>
```

- [ ] **Step 5: Add to barrel export**

Append to `src/components/admin/composed/index.ts`:

```tsx
export { AdminToggleGroup } from './AdminToggleGroup';
export type { AdminToggleGroupProps, ToggleOption } from './AdminToggleGroup';
```

- [ ] **Step 6: Run tests and commit**

```bash
cd frontend/react-Admin3 && npm test -- --watchAll=false --testPathPattern="admin/email" 2>&1 | tail -20
```

```bash
git add src/components/admin/composed/AdminToggleGroup.tsx src/components/admin/composed/index.ts src/components/admin/email/templates/EmailTemplateList.tsx src/components/admin/email/queue/EmailQueueList.tsx src/components/admin/email/settings/EmailSettingsList.tsx
git commit -m "feat(admin): extract AdminToggleGroup composed component

Replaces inline filter chip toggle markup across 3 email list pages
with a reusable composed component."
```

---

## Task 3: Standardize Border Radius (rounded-admin -> rounded-md)

**Files:**
- Modify: ~30 files containing `tw:rounded-admin`
- Modify: `src/components/admin/styles/admin.css` (remove `--radius-admin` theme token)

### Important context

`tw:rounded-admin` maps to `--admin-radius: 0.375rem` which is identical to `tw:rounded-md`. This is a safe 1:1 replacement with zero visual change.

### Steps

- [ ] **Step 1: Find-and-replace tw:rounded-admin with tw:rounded-md across all admin components**

Use a global find-and-replace in all `.tsx` and `.ts` files under `src/components/admin/`:

Replace `tw:rounded-admin` with `tw:rounded-md` in every occurrence.

**Files affected** (26 occurrences across 16 files):
- `user-profiles/UserProfileForm.tsx`
- `store-products/StoreProductList.tsx`
- `store-bundles/StoreBundleList.tsx`
- `new-session-setup/StepExamSession.tsx`
- `new-session-setup/StepSubjects.tsx`
- `new-session-setup/StepMaterials.tsx`
- `new-session-setup/StepTutorials.tsx`
- `new-session-setup/NewSessionSetup.tsx`
- `new-session-setup/SessionBundlesSummary.tsx`
- `new-session-setup/SessionProductsSummary.tsx`
- `products/ProductDetail.tsx`
- `products/ProductTable.tsx`
- `products/ProductImport.tsx`
- `product-bundles/ProductBundleList.tsx`
- `subjects/SubjectDetail.tsx`
- `subjects/SubjectImport.tsx`
- And others found by searching

- [ ] **Step 2: Remove the --radius-admin token from admin.css**

In `src/components/admin/styles/admin.css`, remove from the `@theme` block:
```css
--radius-admin: var(--admin-radius);
```

And remove from `.admin-root`:
```css
--admin-radius: var(--radius);
```

And from `.admin-root.dark` (if present — check).

- [ ] **Step 3: Run tests and commit**

```bash
cd frontend/react-Admin3 && npm test -- --watchAll=false --testPathPattern="admin/" 2>&1 | tail -20
```

```bash
git add -u src/components/admin/
git commit -m "refactor(admin): standardize border radius to tw:rounded-md

Replace tw:rounded-admin (69 occurrences) with tw:rounded-md. Both map
to 0.375rem so this is a zero-visual-change cleanup. Remove the now-unused
--radius-admin CSS custom property."
```

---

## Task 4: Replace Non-Semantic Color References in AdminTopBar

**Files:**
- Modify: `src/components/admin/layout/AdminTopBar.tsx:94,99,109`

### Steps

- [ ] **Step 1: Replace raw CSS variable references with semantic Tailwind classes**

In `AdminTopBar.tsx`, make these replacements:

**Line 94** (dropdown container):
```
BEFORE: tw:border-[var(--border)] tw:bg-[var(--popover)] tw:text-[var(--popover-foreground)]
AFTER:  tw:border-border tw:bg-popover tw:text-popover-foreground
```

**Line 99** (user email):
```
BEFORE: tw:text-[var(--muted-foreground)]
AFTER:  tw:text-muted-foreground
```

**Line 109** (logout button):
```
BEFORE: tw:text-[var(--popover-foreground)] hover:tw:bg-[var(--accent)]
AFTER:  tw:text-popover-foreground hover:tw:bg-accent
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/layout/AdminTopBar.tsx
git commit -m "refactor(admin): replace raw CSS vars with semantic Tailwind classes in AdminTopBar

tw:bg-[var(--popover)] -> tw:bg-popover, etc. Functionally identical
since @theme inline maps these variables."
```

---

## Task 5: Replace Hardcoded Background Colors with Theme-Aware Tokens

**Files:**
- Modify: `src/components/admin/store-products/StoreProductList.tsx:132,172`
- Modify: `src/components/admin/store-bundles/StoreBundleList.tsx:69`
- Modify: `src/components/admin/email/shared/MjmlPreviewPane.tsx:31`

### Steps

- [ ] **Step 1: Fix StoreProductList.tsx**

**Line 132**: Replace `tw:bg-gray-100` with `tw:bg-muted`
**Line 172**: Replace `tw:hover:bg-gray-50` with `tw:hover:bg-muted/50`

- [ ] **Step 2: Fix StoreBundleList.tsx**

**Line 69**: Replace `tw:hover:bg-gray-50` with `tw:hover:bg-muted/50`

- [ ] **Step 3: Fix MjmlPreviewPane.tsx**

**Line 31**: Replace `tw:bg-white` with `tw:bg-card`

Note: The email preview iframe inside MjmlPreviewPane has inline styles for width/height/border — leave those as-is since iframes need explicit sizing.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/store-products/StoreProductList.tsx src/components/admin/store-bundles/StoreBundleList.tsx src/components/admin/email/shared/MjmlPreviewPane.tsx
git commit -m "fix(admin): replace hardcoded bg colors with dark-mode-aware tokens

bg-gray-100 -> bg-muted, hover:bg-gray-50 -> hover:bg-muted/50,
bg-white -> bg-card. Fixes broken dark mode contrast."
```

---

## Task 6: Extract AdminPagination Composed Component

**Files:**
- Create: `src/components/admin/composed/AdminPagination.tsx`
- Modify: `src/components/admin/composed/AdminDataTable.tsx:217-257`
- Modify: `src/components/admin/store-products/StoreProductList.tsx:245-270`
- Modify: `src/components/admin/products/ProductList.tsx:42-68`

### Important context

AdminDataTable already has a `PaginationConfig` interface. The new AdminPagination must be compatible with it. StoreProductList and ProductList use a simpler pagination (no page size selector, just Previous/Next with showing count).

### Steps

- [ ] **Step 1: Create AdminPagination component**

Create `src/components/admin/composed/AdminPagination.tsx`:

```tsx
import * as React from 'react';
import { Button } from '@/components/admin/ui/button';
import { cn } from '@/components/admin/styles/cn';

interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onPageSizeChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  pageSizeOptions?: number[];
  className?: string;
}

function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  className,
}: AdminPaginationProps) {
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);

  if (total <= pageSize) return null;

  return (
    <div
      className={cn(
        'tw:flex tw:items-center tw:justify-between tw:px-2 tw:text-sm tw:text-admin-fg-muted',
        className
      )}
    >
      <span>
        Showing {start}&ndash;{end} of {total}
      </span>
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
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="tw:flex tw:items-center tw:gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={(e) => onPageChange(e, page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={end >= total}
            onClick={(e) => onPageChange(e, page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export { AdminPagination };
export type { AdminPaginationProps };
```

- [ ] **Step 2: Refactor AdminDataTable to use AdminPagination internally**

In `AdminDataTable.tsx`, replace the pagination JSX block (the `{pagination && ( ... )}` section, approximately lines 217-257) with:

```tsx
{pagination && (
  <AdminPagination
    page={pagination.page}
    pageSize={pagination.pageSize}
    total={pagination.total}
    onPageChange={pagination.onPageChange}
    onPageSizeChange={(e) =>
      pagination.onPageSizeChange(e as unknown as React.ChangeEvent<HTMLInputElement>)
    }
    pageSizeOptions={pagination.pageSizeOptions}
  />
)}
```

Add import: `import { AdminPagination } from './AdminPagination';`

Note: AdminDataTable's `PaginationConfig.onPageSizeChange` expects `React.ChangeEvent<HTMLInputElement>` but AdminPagination uses `React.ChangeEvent<HTMLSelectElement>`. The cast bridges this safely since both have `target.value`.

- [ ] **Step 3: Migrate StoreProductList.tsx pagination**

Replace the pagination block (lines ~245-270) with:

```tsx
<AdminPagination
  page={vm.page}
  pageSize={vm.rowsPerPage}
  total={vm.totalCount}
  onPageChange={vm.handleChangePage}
  className="tw:mt-4"
/>
```

Add `AdminPagination` to the composed import.

- [ ] **Step 4: Migrate ProductList.tsx pagination**

Replace the pagination block (lines ~42-68) with:

```tsx
<AdminPagination
  page={vm.page}
  pageSize={vm.rowsPerPage}
  total={vm.totalCount}
  onPageChange={vm.handleChangePage}
  className="tw:mt-4"
/>
```

Add `AdminPagination` to the composed import.

- [ ] **Step 5: Add to barrel export**

Append to `src/components/admin/composed/index.ts`:

```tsx
export { AdminPagination } from './AdminPagination';
export type { AdminPaginationProps } from './AdminPagination';
```

- [ ] **Step 6: Run tests and commit**

```bash
cd frontend/react-Admin3 && npm test -- --watchAll=false --testPathPattern="admin/(composed|store-products|products)" 2>&1 | tail -20
```

```bash
git add src/components/admin/composed/AdminPagination.tsx src/components/admin/composed/index.ts src/components/admin/composed/AdminDataTable.tsx src/components/admin/store-products/StoreProductList.tsx src/components/admin/products/ProductList.tsx
git commit -m "feat(admin): extract AdminPagination composed component

Deduplicates pagination UI from AdminDataTable, StoreProductList, and
ProductList into a single reusable component."
```

---

## Task 7: Create AdminDetailCard and AdminDetailField Composed Components

**Files:**
- Create: `src/components/admin/composed/AdminDetailCard.tsx`
- Modify: `src/components/admin/subjects/SubjectDetail.tsx:31-55`
- Modify: `src/components/admin/products/ProductDetail.tsx:33-69`

### Steps

- [ ] **Step 1: Create AdminDetailCard and AdminDetailField components**

Create `src/components/admin/composed/AdminDetailCard.tsx`:

```tsx
import * as React from 'react';
import { Separator } from '@/components/admin/ui/separator';
import { cn } from '@/components/admin/styles/cn';

interface AdminDetailCardProps {
  children: React.ReactNode;
  className?: string;
}

function AdminDetailCard({ children, className }: AdminDetailCardProps) {
  return (
    <div
      className={cn(
        'tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-bg tw:p-6',
        className
      )}
    >
      <dl className="tw:space-y-4">{children}</dl>
    </div>
  );
}

interface AdminDetailFieldProps {
  label: string;
  children: React.ReactNode;
}

function AdminDetailField({ label, children }: AdminDetailFieldProps) {
  return (
    <>
      <div>
        <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">
          {label}
        </dt>
        <dd className="tw:mt-1 tw:text-admin-fg">{children}</dd>
      </div>
      <Separator />
    </>
  );
}

export { AdminDetailCard, AdminDetailField };
export type { AdminDetailCardProps, AdminDetailFieldProps };
```

- [ ] **Step 2: Migrate SubjectDetail.tsx**

Replace the card + `<dl>` block with:

```tsx
<AdminDetailCard>
  <AdminDetailField label="Description">
    {vm.subject.description || 'N/A'}
  </AdminDetailField>
  <AdminDetailField label="Status">
    <AdminBadge active={vm.subject.active} />
  </AdminDetailField>
  <AdminDetailField label="Created">
    {new Date(vm.subject.created_at).toLocaleString()}
  </AdminDetailField>
  <AdminDetailField label="Last Updated">
    {new Date(vm.subject.updated_at).toLocaleString()}
  </AdminDetailField>
</AdminDetailCard>
```

Remove the `Separator` import if no longer used directly.
Add `AdminDetailCard, AdminDetailField` to the composed import.

- [ ] **Step 3: Migrate ProductDetail.tsx**

Same pattern. Read the file to identify all fields displayed (Code, Short Name, Description, Status, Created, Last Updated) and replace the `<dl>` block with `<AdminDetailCard>` / `<AdminDetailField>` pairs.

- [ ] **Step 4: Add to barrel export**

Append to `src/components/admin/composed/index.ts`:

```tsx
export { AdminDetailCard, AdminDetailField } from './AdminDetailCard';
export type { AdminDetailCardProps, AdminDetailFieldProps } from './AdminDetailCard';
```

- [ ] **Step 5: Run tests and commit**

```bash
cd frontend/react-Admin3 && npm test -- --watchAll=false --testPathPattern="admin/(subjects|products)" 2>&1 | tail -20
```

```bash
git add src/components/admin/composed/AdminDetailCard.tsx src/components/admin/composed/index.ts src/components/admin/subjects/SubjectDetail.tsx src/components/admin/products/ProductDetail.tsx
git commit -m "feat(admin): extract AdminDetailCard/AdminDetailField composed components

Deduplicates detail page card + definition list pattern from SubjectDetail
and ProductDetail into reusable components."
```

---

## Task 8: Replace Inline Styles with Tailwind Arbitrary Values

**Files:**
- Modify: `src/components/admin/email/templates/EmailTemplateMjmlEditor.tsx:139,153`
- Modify: `src/components/admin/email/shared/RuleJsonEditor.tsx:82`
- Modify: `src/components/admin/email/shared/MjmlPreviewPane.tsx:32`

### Important context

Only replace inline styles on `<div>` elements where Tailwind classes work. **Do NOT replace** `style={{...}}` on `<iframe>` elements — iframes need inline styles for cross-origin sizing.

### Steps

- [ ] **Step 1: Fix EmailTemplateMjmlEditor.tsx**

**Line 139** (split pane container div):
```
BEFORE: style={{ minHeight: 500 }}
AFTER:  className="... tw:min-h-[500px]"  (merge into existing className)
```

**Line 153** (CodeMirror container div):
```
BEFORE: style={{ height: '100%', minHeight: 500 }}
AFTER:  className="... tw:h-full tw:min-h-[500px]"  (merge into existing className)
```

Read the file first to check exact line numbers and existing classNames before editing.

- [ ] **Step 2: Fix RuleJsonEditor.tsx**

**Line 82** (editor container div):
```
BEFORE: style={{ height: 300, minHeight: 300 }}
AFTER:  className="... tw:h-[300px] tw:min-h-[300px]"  (merge into existing className)
```

- [ ] **Step 3: Fix MjmlPreviewPane.tsx**

**Line 32** (preview wrapper div):
```
BEFORE: style={{ minHeight: 500 }}
AFTER:  className="... tw:min-h-[500px]"  (merge into existing className)
```

Leave the iframe's `style={{...}}` on line ~38-43 untouched.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/email/templates/EmailTemplateMjmlEditor.tsx src/components/admin/email/shared/RuleJsonEditor.tsx src/components/admin/email/shared/MjmlPreviewPane.tsx
git commit -m "refactor(admin): replace inline style objects with Tailwind arbitrary values

Convert style={{ minHeight: 500 }} to tw:min-h-[500px] etc. in email
editor components. Keeps iframe inline styles which need them."
```

---

## Task 9: (Merged into Tasks 1, 2, 6, 7)

Barrel export updates are done within each component creation task to avoid broken imports in intermediate commits. No standalone task needed.
