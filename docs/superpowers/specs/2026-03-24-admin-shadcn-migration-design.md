# Admin Panel shadcn/ui Migration — Design Spec

**Date**: 2026-03-24
**Status**: Draft
**Scope**: All admin panel routes (`/admin/*`)
**Out of scope**: Public-facing storefront (remains on Material-UI v7)

---

## 1. Problem Statement

The admin panel (151 files, 15+ CRUD modules) is built with Material-UI v7 using inline `sx` props for styling. This approach tightly couples component structure to styling, making the UI verbose and difficult to maintain at scale. The goal is to migrate the admin panel to shadcn/ui with a theming strategy that avoids crowding component code with styling and CSS classes.

## 2. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Scope boundary** | Hard — admin uses shadcn/Tailwind, storefront uses MUI. No shared components. | Eliminates style leakage risk. Clean ownership boundary. |
| **Visual identity** | Minimal/functional (Linear/Vercel dashboard style) | Data-dense, utilitarian. Aligns with shadcn/ui's default aesthetic. |
| **Abstraction level** | High — compound components encapsulate Tailwind. Primitives as fallback for edge cases. | Keeps module code free of CSS class clutter. |
| **Style isolation** | Tailwind `tw-` prefix + `content` scoped to `admin/**` + CSS `@layer` | Three layers of protection against storefront leakage. |
| **Migration strategy** | Module-by-module, simplest first. Each module is a self-contained PR. | Low risk, shippable at each step, builds learning incrementally. |
| **ViewModel hooks** | Untouched — migration is View-layer only. | MVVM separation means business logic doesn't change. |

## 3. File Structure

```
frontend/react-Admin3/src/
├── components/
│   ├── admin/                          # ALL admin code lives here
│   │   ├── ui/                         # shadcn/ui primitives (copied in via CLI)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── sheet.tsx              # Mobile sidebar drawer
│   │   │   ├── command.tsx            # Command palette
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── ...                    # ~20-25 primitives total
│   │   │
│   │   ├── composed/                   # Compound components (the abstraction layer)
│   │   │   ├── AdminPage.tsx           # Page wrapper with padding/max-width
│   │   │   ├── AdminPageHeader.tsx     # Title + action buttons
│   │   │   ├── AdminDataTable.tsx      # Sortable, paginated table with actions
│   │   │   ├── AdminFormLayout.tsx     # Form container with save/cancel footer
│   │   │   ├── AdminFormField.tsx      # Label + input + error message
│   │   │   ├── AdminSelect.tsx         # Dropdown select with options
│   │   │   ├── AdminConfirmDialog.tsx  # Destructive action confirmation
│   │   │   ├── AdminBadge.tsx          # Status indicator (active/inactive)
│   │   │   ├── AdminEmptyState.tsx     # No-data placeholder with action
│   │   │   ├── AdminLoadingState.tsx   # Skeleton loading rows
│   │   │   ├── AdminErrorAlert.tsx     # Error display with retry
│   │   │   ├── AdminFilterBar.tsx      # Table filter controls
│   │   │   └── AdminBreadcrumbs.tsx    # Navigation breadcrumbs
│   │   │
│   │   ├── layout/                     # Admin shell
│   │   │   ├── AdminLayout.tsx         # Sidebar + main area wrapper
│   │   │   ├── AdminSidebar.tsx        # Navigation sidebar
│   │   │   └── AdminTopBar.tsx         # Optional top bar
│   │   │
│   │   ├── styles/                     # Theme & style isolation
│   │   │   ├── admin.css               # CSS variables + Tailwind base
│   │   │   └── cn.ts                   # clsx + tailwind-merge utility
│   │   │
│   │   ├── subjects/                   # Module (MVVM structure preserved)
│   │   │   ├── SubjectList.tsx         # Migrated view
│   │   │   ├── SubjectForm.tsx         # Migrated view
│   │   │   ├── SubjectDetail.tsx       # Migrated view
│   │   │   ├── SubjectImport.tsx       # Migrated view
│   │   │   ├── useSubjectListVM.ts     # UNCHANGED
│   │   │   ├── useSubjectFormVM.ts     # UNCHANGED
│   │   │   └── __tests__/
│   │   ├── exam-sessions/
│   │   ├── products/
│   │   └── ...                         # All other modules
│   │
│   ├── Common/                         # Storefront (MUI, untouched)
│   ├── Products/                       # Storefront (MUI, untouched)
│   └── ...
```

### Key Principles

1. **`admin/ui/`** — shadcn primitives copied via `npx shadcn@latest add`. Never imported outside `admin/`.
2. **`admin/composed/`** — compound components that encapsulate all Tailwind classes. Module code imports from here and sees no CSS.
3. **`admin/styles/`** — CSS variables and `cn()` utility. Single source of truth for admin theming.
4. **ViewModel hooks unchanged** — migration touches only View-layer `.tsx` files.

## 4. Theming Architecture

### 4.1 CSS Variables (Single Source of Truth)

All admin visual tokens live in `admin/styles/admin.css`:

```css
@layer admin-base {
  .admin-root {
    /* ── Surface & Background ── */
    --admin-bg:              hsl(0 0% 100%);
    --admin-bg-muted:        hsl(240 5% 96%);
    --admin-bg-subtle:       hsl(240 5% 92%);

    /* ── Foreground & Text ── */
    --admin-fg:              hsl(240 10% 4%);
    --admin-fg-muted:        hsl(240 4% 46%);
    --admin-fg-subtle:       hsl(240 4% 65%);

    /* ── Border ── */
    --admin-border:          hsl(240 6% 90%);
    --admin-border-strong:   hsl(240 6% 80%);

    /* ── Primary (actions, links) ── */
    --admin-primary:         hsl(240 5% 15%);
    --admin-primary-fg:      hsl(0 0% 100%);

    /* ── Destructive (delete, errors) ── */
    --admin-destructive:     hsl(0 72% 51%);
    --admin-destructive-fg:  hsl(0 0% 100%);

    /* ── Success (save confirmations) ── */
    --admin-success:         hsl(142 71% 45%);
    --admin-success-fg:      hsl(0 0% 100%);

    /* ── Warning ── */
    --admin-warning:         hsl(38 92% 50%);
    --admin-warning-fg:      hsl(0 0% 100%);

    /* ── Focus Ring ── */
    --admin-ring:            hsl(240 5% 65%);

    /* ── Radius ── */
    --admin-radius:          0.375rem;

    /* ── Sidebar ── */
    --admin-sidebar-bg:      hsl(240 5% 98%);
    --admin-sidebar-fg:      hsl(240 4% 46%);
    --admin-sidebar-active:  hsl(240 5% 15%);
    --admin-sidebar-active-fg: hsl(0 0% 100%);
    --admin-sidebar-width:   240px;

    /* ── Typography ── */
    --admin-font-sans:       'Inter', system-ui, sans-serif;
    --admin-font-mono:       'JetBrains Mono', monospace;
  }

  /* ── Dark mode (future-ready) ── */
  .admin-root.dark {
    --admin-bg:              hsl(240 10% 4%);
    --admin-bg-muted:        hsl(240 6% 10%);
    --admin-fg:              hsl(0 0% 98%);
    --admin-fg-muted:        hsl(240 5% 65%);
    --admin-border:          hsl(240 4% 20%);
    --admin-primary:         hsl(0 0% 98%);
    --admin-primary-fg:      hsl(240 10% 4%);
    --admin-sidebar-bg:      hsl(240 6% 7%);
    /* ... remaining overrides ... */
  }
}
```

### 4.2 Tailwind Config

```js
// tailwind.config.js
module.exports = {
  prefix: 'tw-',
  content: ['./src/components/admin/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        admin: {
          bg:            'var(--admin-bg)',
          'bg-muted':    'var(--admin-bg-muted)',
          'bg-subtle':   'var(--admin-bg-subtle)',
          fg:            'var(--admin-fg)',
          'fg-muted':    'var(--admin-fg-muted)',
          'fg-subtle':   'var(--admin-fg-subtle)',
          primary:       'var(--admin-primary)',
          'primary-fg':  'var(--admin-primary-fg)',
          destructive:   'var(--admin-destructive)',
          success:       'var(--admin-success)',
          warning:       'var(--admin-warning)',
          border:        'var(--admin-border)',
          'border-strong': 'var(--admin-border-strong)',
          ring:          'var(--admin-ring)',
          sidebar: {
            bg:          'var(--admin-sidebar-bg)',
            fg:          'var(--admin-sidebar-fg)',
            active:      'var(--admin-sidebar-active)',
            'active-fg': 'var(--admin-sidebar-active-fg)',
          }
        }
      },
      fontFamily: {
        sans: ['var(--admin-font-sans)'],
        mono: ['var(--admin-font-mono)'],
      },
      borderRadius: {
        admin: 'var(--admin-radius)',
      }
    }
  }
};
```

### 4.3 Style Isolation (Three Layers)

| Layer | Mechanism | What It Prevents |
|-------|-----------|-----------------|
| **CSS scope** | Variables live inside `.admin-root` class | Variables don't exist outside admin layout |
| **Tailwind content** | `content: ['./src/components/admin/**']` | No utility classes generated for storefront files |
| **Tailwind prefix** | `prefix: 'tw-'` | Even if a class leaks, `tw-flex` won't collide with MUI's class names |

### 4.4 Theme Change Workflow

To change the admin's visual identity, edit **one file** (`admin.css`). Example — switching to a dark sidebar:

```css
/* Change these two lines: */
--admin-sidebar-bg:      hsl(240 10% 8%);
--admin-sidebar-fg:      hsl(240 5% 80%);
```

Every component referencing `tw-bg-admin-sidebar-bg` updates automatically. No component files touched.

### 4.5 The `cn()` Utility

```ts
// admin/styles/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Used inside compound components and shadcn primitives for conditional class merging. Module code rarely needs this directly.

## 5. Compound Component API

### 5.1 AdminPage

Root wrapper for every admin page.

```tsx
<AdminPage>
  {children}
</AdminPage>
```

Renders: max-width container, consistent padding, `admin-root` class scope.

### 5.2 AdminPageHeader

```tsx
<AdminPageHeader
  title="Subjects"
  description="Manage subject codes and descriptions"     // optional
  breadcrumbs={[{ label: "Catalog", href: "/admin" }]}    // optional
  actions={[
    { label: "Import", icon: Upload, variant: "outline", onClick: handleImport },
    { label: "Add New", icon: Plus, onClick: () => navigate('new') },
  ]}
/>
```

### 5.3 AdminDataTable

Wraps shadcn `<Table>` with TanStack Table for sorting/pagination.

```tsx
<AdminDataTable
  columns={[
    { key: "code", header: "Code", sortable: true },
    { key: "description", header: "Description" },
    { key: "active", header: "Status", render: (val) => <AdminBadge active={val} /> },
  ]}
  data={subjects}
  loading={loading}
  emptyMessage="No subjects found"
  pagination={{
    page,
    pageSize: rowsPerPage,
    total: totalCount,
    onPageChange: handleChangePage,
    onPageSizeChange: handleChangeRowsPerPage,
  }}
  actions={(row) => [
    { label: "Edit", icon: Pencil, onClick: () => navigate(`${row.id}/edit`) },
    { label: "Delete", icon: Trash2, variant: "destructive", onClick: () => handleDelete(row.id) },
  ]}
/>
```

### 5.4 AdminFormLayout

```tsx
<AdminFormLayout
  title={isEdit ? "Edit Subject" : "New Subject"}
  onSubmit={handleSubmit}
  onCancel={() => navigate('/admin/subjects')}
  loading={submitting}
  error={error}
>
  {/* AdminFormField children */}
</AdminFormLayout>
```

### 5.5 AdminFormField

```tsx
<AdminFormField label="Subject Code" required error={errors.code}>
  <Input value={formData.code} onChange={handleChange('code')} />
</AdminFormField>

<AdminFormField label="Active">
  <Switch checked={formData.active} onCheckedChange={handleChange('active')} />
</AdminFormField>

<AdminFormField label="Variation Type" required error={errors.variation_type}>
  <AdminSelect
    options={variationTypes}
    value={formData.variation_type}
    onChange={handleChange('variation_type')}
    placeholder="Select a type..."
  />
</AdminFormField>
```

### 5.6 AdminConfirmDialog

```tsx
<AdminConfirmDialog
  open={deleteDialogOpen}
  title="Delete Subject"
  description="This will permanently delete CB1. This action cannot be undone."
  confirmLabel="Delete"
  variant="destructive"
  onConfirm={confirmDelete}
  onCancel={() => setDeleteDialogOpen(false)}
/>
```

### 5.7 AdminEmptyState

```tsx
<AdminEmptyState
  icon={Inbox}
  title="No recommendations yet"
  description="Create your first recommendation to get started."
  action={{ label: "Add Recommendation", onClick: () => navigate('new') }}
/>
```

### 5.8 AdminLoadingState / AdminErrorAlert

```tsx
<AdminLoadingState rows={5} />
<AdminErrorAlert message={error} onRetry={fetchData} />
```

### 5.9 Component → MUI Replacement Map

| Compound Component | Replaces (MUI) | Used In |
|---|---|---|
| `AdminPage` | `Container` | Every page |
| `AdminPageHeader` | `Box` + `Typography` + `Button` combo | Every list/detail page |
| `AdminDataTable` | `Table` + `TablePagination` + `TableSortLabel` | Every list page |
| `AdminFormLayout` | Manual `form` + `Box` + submit buttons | Every form page |
| `AdminFormField` | `TextField` / `FormControl` + label/error | Every form field |
| `AdminSelect` | `Select` + `MenuItem` | Dropdowns in forms |
| `AdminConfirmDialog` | `Dialog` + confirm logic | Delete actions |
| `AdminBadge` | `Chip` with conditional color | Status indicators |
| `AdminEmptyState` | Conditional `Alert` or `Typography` | Empty tables |
| `AdminLoadingState` | `CircularProgress` or custom skeleton | Loading states |
| `AdminErrorAlert` | `Alert severity="error"` | Error display |
| `AdminFilterBar` | Manual filter `Box` layouts | Filtered tables |
| `AdminBreadcrumbs` | Manual `Link` chains | Nested pages |

## 6. Migration Strategy

### 6.1 Phase 0: Foundation

Must be completed before any module migration begins.

1. Install dependencies: `tailwindcss`, `@tailwindcss/vite`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/*` (per shadcn component needs)
2. Configure `tailwind.config.js` with `prefix: 'tw-'`, scoped `content`
3. Create `admin/styles/admin.css` with CSS variables
4. Create `admin/styles/cn.ts` utility
5. Copy shadcn primitives into `admin/ui/` via CLI
6. Build all compound components in `admin/composed/`
7. Migrate `AdminLayout` + `AdminSidebar` to shadcn (the admin shell)
8. Verify storefront is unaffected (visual regression check)

### 6.2 Phases 1–14: Module Migrations

| Phase | Module | Pages | Complexity |
|-------|--------|-------|------------|
| **1** | Subjects | List, Form, Detail, Import | Low |
| **2** | Exam Sessions | List, Form | Low |
| **3** | Product Variations | List, Form | Low |
| **4** | Exam Session Subjects | List, Form | Medium |
| **5** | Product Bundles | List, Form, BundleProductsPanel | Medium |
| **6** | Products | List, Form, Detail, Import, Table, VariationsPanel | Medium-High |
| **7** | Prices | List, Form | Low |
| **8** | Store Products | List, Form, VariationsPanel | Medium |
| **9** | Store Bundles | List, Form, ProductsPanel | Medium |
| **10** | Recommendations | List, Form | Low |
| **11** | User Profiles | List, Form | Low |
| **12** | Staff | List, Form | Low |
| **13** | New Session Setup | Wizard (7 steps) | High |
| **14** | Email System | 7 sub-modules, MJML editor, rule builder | High |

**Order rationale**: Simplest modules first to validate the compound component library. Complex modules (wizard, email system) last, when the pattern is proven and refined.

### 6.3 Per-Module Migration Checklist

Each module migration is a self-contained PR:

```
□ Create branch: migrate/admin-{module}-shadcn
□ Swap List page → compound components
□ Swap Form page → compound components
□ Swap any special pages (Detail, Import, Wizard steps)
□ Update tests (query by role/text, not MUI class names)
□ Manual smoke test in browser
□ Verify VM hooks are unchanged (no modifications)
□ Verify no MUI imports remain in migrated files
□ PR review + merge
```

### 6.4 Coexistence During Migration

Both systems run side by side. Migrated modules use shadcn, un-migrated modules keep MUI. This works because:

- `AdminLayout` shell is migrated in Phase 0 (always shadcn)
- Individual module pages are self-contained — a MUI page inside a shadcn shell works since they don't share styling
- Routes don't change, so nothing breaks for users

### 6.5 Cleanup Phase (Post-Migration)

After all 14 phases complete:

- Remove all MUI imports from `admin/` directory
- Verify no admin file references `@mui/*`
- Optionally remove `@chakra-ui/react` if unused elsewhere
- Consider removing `tw-` prefix if MUI is dropped from the entire app (future)

## 7. Dependencies

### New Dependencies (Admin Only)

| Package | Purpose |
|---------|---------|
| `tailwindcss` | Utility-first CSS framework |
| `@tailwindcss/vite` | Vite integration for Tailwind |
| `clsx` | Conditional class joining |
| `tailwind-merge` | Intelligent Tailwind class deduplication |
| `class-variance-authority` | Variant-based component styling (used by shadcn) |
| `@radix-ui/*` | Accessible UI primitives (underlying shadcn components) |
| `@tanstack/react-table` | Headless table for AdminDataTable |

### Existing Dependencies (Retained)

| Package | Used By |
|---------|---------|
| `lucide-react` | Already installed — icon library for shadcn |
| `react-router-dom` | Routing (unchanged) |
| `axios` / `httpService` | API calls (unchanged) |
| `@reduxjs/toolkit` | Filter state (unchanged) |

### Dependencies to Remove (After Full Migration)

| Package | Reason |
|---------|--------|
| `@mui/material` | Replaced by shadcn/ui in admin (keep for storefront) |
| `@mui/icons-material` | Replaced by lucide-react in admin (keep for storefront) |

Note: MUI packages remain installed until the storefront is also migrated (out of scope).

## 8. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tailwind classes leak to storefront | Low | Medium | Three isolation layers: `.admin-root` scope, `content` scan path, `tw-` prefix |
| MUI/Tailwind CSS reset conflict | Medium | Medium | `@layer admin-base` isolates Tailwind base styles from MUI |
| Compound component doesn't cover edge case | Medium | Low | Fall back to shadcn primitives + `cn()` for one-offs |
| Email system CodeMirror/MJML hard to migrate | Medium | Low | Keep those specific sub-components on MUI if needed, wrap in boundary |
| Test breakage from DOM changes | High | Low | Tests should query by accessible role/text, not MUI class names |
| Bundle size increase during coexistence | Low | Low | Tailwind purges unused classes; shadcn primitives are small. Temporary cost during migration. |

## 9. Example: Migrated SubjectList

### Before (MUI)

```tsx
const AdminSubjectList: React.FC = () => {
  const vm = useSubjectListVM();
  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <Container sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h2">Subjects</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<UploadIcon />}
            onClick={() => navigate('/admin/subjects/import')}>Import</Button>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => navigate('/admin/subjects/new')}>Add New Subject</Button>
        </Box>
      </Box>
      {vm.error && <Alert severity="error" sx={{ mb: 2 }}>{vm.error}</Alert>}
      {vm.loading ? (
        <CircularProgress />
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vm.subjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.code}</TableCell>
                    <TableCell>{s.description}</TableCell>
                    <TableCell>
                      <Chip label={s.active ? 'Active' : 'Inactive'}
                        color={s.active ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => navigate(`${s.id}/edit`)}><EditIcon /></IconButton>
                      <IconButton onClick={() => vm.handleDelete(s.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div" count={vm.totalCount}
            page={vm.page} rowsPerPage={vm.rowsPerPage}
            onPageChange={vm.handleChangePage}
            onRowsPerPageChange={vm.handleChangeRowsPerPage}
          />
        </>
      )}
    </Container>
  );
};
```

### After (shadcn compound components)

```tsx
const AdminSubjectList: React.FC = () => {
  const vm = useSubjectListVM();     // ← UNCHANGED

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Subjects"
        actions={[
          { label: "Import", icon: Upload, variant: "outline",
            onClick: () => navigate('/admin/subjects/import') },
          { label: "Add New Subject", icon: Plus,
            onClick: () => navigate('/admin/subjects/new') },
        ]}
      />
      <AdminErrorAlert message={vm.error} />
      <AdminDataTable
        columns={[
          { key: "code", header: "Code", sortable: true },
          { key: "description", header: "Description" },
          { key: "active", header: "Status",
            render: (val) => <AdminBadge active={val} /> },
        ]}
        data={vm.subjects}
        loading={vm.loading}
        emptyMessage="No subjects found"
        pagination={{
          page: vm.page,
          pageSize: vm.rowsPerPage,
          total: vm.totalCount,
          onPageChange: vm.handleChangePage,
          onPageSizeChange: vm.handleChangeRowsPerPage,
        }}
        actions={(row) => [
          { label: "Edit", icon: Pencil,
            onClick: () => navigate(`${row.id}/edit`) },
          { label: "Delete", icon: Trash2, variant: "destructive",
            onClick: () => vm.handleDelete(row.id) },
        ]}
      />
    </AdminPage>
  );
};
```

**Result**: ~60% fewer lines. Zero Tailwind classes visible. VM hook untouched.

## 10. Success Criteria

- [ ] All 15 admin modules render correctly with shadcn/ui components
- [ ] No MUI imports in any `admin/` file after full migration
- [ ] Storefront pages visually unchanged (no style leakage)
- [ ] All existing admin tests pass (updated for new DOM structure)
- [ ] Theme changes require editing only `admin.css`
- [ ] Module code contains no raw Tailwind classes (compound components only, with rare `cn()` exceptions)
- [ ] Bundle size does not regress more than 10% during coexistence period
- [ ] Dark mode achievable by adding `.dark` class to `admin-root` (future)
