# Admin Panel shadcn/ui Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the admin panel (151 files, 14 CRUD modules) from Material-UI to shadcn/ui with Tailwind CSS, using compound components to keep module code free of CSS classes.

**Architecture:** Tailwind CSS with `tw-` prefix scoped to `admin/**` files only. CSS variables in a single `admin.css` for theming. Compound components (`AdminPage`, `AdminDataTable`, `AdminFormLayout`, etc.) encapsulate all Tailwind classes — module code only imports these. ViewModel hooks are unchanged.

**Tech Stack:** shadcn/ui (New York style), Tailwind CSS, Radix UI primitives, TanStack Table, class-variance-authority, Vite, TypeScript, React 19

**Note on Tailwind version:** Verify which Tailwind version is installed (`npm ls tailwindcss`). If v4, use CSS-first config (`@config` in CSS) and the `@tailwindcss/vite` plugin (no separate `postcss.config.js` needed). If v3, use the `tailwind.config.ts` + `postcss.config.js` approach shown in the tasks below. The `admin.css` file uses `@import "tailwindcss"` (v4 pattern).

**Spec:** `docs/superpowers/specs/2026-03-24-admin-shadcn-migration-design.md`

---

## File Structure Overview

### New Files to Create

```
frontend/react-Admin3/
├── tailwind.config.ts                          # Tailwind config with tw- prefix
├── postcss.config.js                           # PostCSS config for Tailwind
├── src/
│   ├── components/admin/
│   │   ├── styles/
│   │   │   ├── admin.css                       # CSS variables (single theme file)
│   │   │   └── cn.ts                           # clsx + tailwind-merge utility
│   │   ├── ui/                                 # shadcn primitives (copied via CLI)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── label.tsx
│   │   │   ├── separator.tsx
│   │   │   └── scroll-area.tsx
│   │   ├── composed/                           # Compound components
│   │   │   ├── AdminPage.tsx
│   │   │   ├── AdminPageHeader.tsx
│   │   │   ├── AdminDataTable.tsx
│   │   │   ├── AdminFormLayout.tsx
│   │   │   ├── AdminFormField.tsx
│   │   │   ├── AdminSelect.tsx
│   │   │   ├── AdminConfirmDialog.tsx
│   │   │   ├── AdminBadge.tsx
│   │   │   ├── AdminEmptyState.tsx
│   │   │   ├── AdminLoadingState.tsx
│   │   │   ├── AdminErrorAlert.tsx
│   │   │   ├── AdminFilterBar.tsx
│   │   │   ├── AdminBreadcrumbs.tsx
│   │   │   └── index.ts                       # Barrel export
│   │   └── layout/                            # Admin shell (migrated)
│   │       ├── AdminLayout.tsx                # Replaces current AdminLayout.tsx
│   │       ├── AdminSidebar.tsx               # Replaces current AdminSidebar.tsx
│   │       └── AdminTopBar.tsx                # Optional future use
```

### Files to Modify

```
frontend/react-Admin3/
├── components.json                             # Update shadcn config for admin paths
├── tsconfig.json                               # Add @/ path alias
├── vite.config.js                              # Add @/ alias + tailwindcss plugin
├── src/index.css                               # Import admin.css (conditional on route)
```

### Files to Migrate (View layer only — VMs untouched)

Each module's `.tsx` view files get rewritten to use compound components. The `useXxxVM.ts` hooks and `__tests__/` files are updated but not rewritten.

---

## Phase 0: Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `frontend/react-Admin3/package.json`

- [ ] **Step 1: Install Tailwind CSS and build tooling**

```bash
cd frontend/react-Admin3
npm install -D tailwindcss @tailwindcss/vite postcss autoprefixer
```

- [ ] **Step 2: Install shadcn/ui utilities**

```bash
npm install clsx tailwind-merge class-variance-authority
```

- [ ] **Step 3: Install Radix UI primitives needed by shadcn components**

```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-switch @radix-ui/react-separator @radix-ui/react-scroll-area @radix-ui/react-slot
```

- [ ] **Step 4: Install TanStack Table for AdminDataTable**

```bash
npm install @tanstack/react-table
```

- [ ] **Step 5: Verify installation**

Run: `cd frontend/react-Admin3 && npm ls tailwindcss clsx tailwind-merge class-variance-authority @tanstack/react-table`
Expected: All packages listed without errors

- [ ] **Step 6: Commit**

```bash
git add frontend/react-Admin3/package.json frontend/react-Admin3/package-lock.json
git commit -m "chore: install shadcn/ui, Tailwind, Radix UI, and TanStack Table dependencies"
```

---

### Task 2: Configure Tailwind CSS with Prefix and Scoping

**Files:**
- Create: `frontend/react-Admin3/tailwind.config.ts`
- Create: `frontend/react-Admin3/postcss.config.js`
- Modify: `frontend/react-Admin3/vite.config.js`

- [ ] **Step 1: Create Tailwind config with `tw-` prefix**

Create `frontend/react-Admin3/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  prefix: 'tw-',
  content: ['./src/components/admin/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        admin: {
          bg:              'var(--admin-bg)',
          'bg-muted':      'var(--admin-bg-muted)',
          'bg-subtle':     'var(--admin-bg-subtle)',
          fg:              'var(--admin-fg)',
          'fg-muted':      'var(--admin-fg-muted)',
          'fg-subtle':     'var(--admin-fg-subtle)',
          primary:         'var(--admin-primary)',
          'primary-fg':    'var(--admin-primary-fg)',
          destructive:     'var(--admin-destructive)',
          'destructive-fg':'var(--admin-destructive-fg)',
          success:         'var(--admin-success)',
          'success-fg':    'var(--admin-success-fg)',
          warning:         'var(--admin-warning)',
          'warning-fg':    'var(--admin-warning-fg)',
          border:          'var(--admin-border)',
          'border-strong': 'var(--admin-border-strong)',
          ring:            'var(--admin-ring)',
          sidebar: {
            bg:            'var(--admin-sidebar-bg)',
            fg:            'var(--admin-sidebar-fg)',
            active:        'var(--admin-sidebar-active)',
            'active-fg':   'var(--admin-sidebar-active-fg)',
          },
        },
      },
      fontFamily: {
        sans: ['var(--admin-font-sans)'],
        mono: ['var(--admin-font-mono)'],
      },
      borderRadius: {
        admin: 'var(--admin-radius)',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Create PostCSS config**

Create `frontend/react-Admin3/postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 3: Add Tailwind Vite plugin and `@/` alias to vite.config.js**

In `frontend/react-Admin3/vite.config.js`, add the tailwindcss import and plugin, plus the `@/` path alias:

```js
// Add at top:
import tailwindcss from '@tailwindcss/vite';

// In plugins array, add after react():
tailwindcss(),

// In resolve.alias, add:
'@': path.resolve(__dirname, 'src'),
```

The `plugins` array becomes:
```js
plugins: [
  jsxInJsPlugin(),
  react(),
  tailwindcss(),
],
```

The `resolve.alias` becomes:
```js
resolve: {
  alias: {
    src: path.resolve(__dirname, 'src'),
    '@': path.resolve(__dirname, 'src'),
  },
},
```

- [ ] **Step 4: Add `@/` path alias to tsconfig.json**

Add `paths` to the `compilerOptions` in `frontend/react-Admin3/tsconfig.json`:

```json
"baseUrl": "src",
"paths": {
  "@/*": ["./*"]
}
```

- [ ] **Step 5: Update components.json for admin-scoped shadcn**

Replace contents of `frontend/react-Admin3/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/components/admin/styles/admin.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": "tw-"
  },
  "aliases": {
    "components": "@/components/admin",
    "utils": "@/components/admin/styles/cn",
    "ui": "@/components/admin/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

Key changes from the existing file:
- `rsc: false` (not using React Server Components)
- `prefix: "tw-"` (matches Tailwind config)
- `ui` points to `@/components/admin/ui`
- `utils` points to `@/components/admin/styles/cn`
- `css` points to `admin.css`

- [ ] **Step 6: Verify Vite builds without errors**

Run: `cd frontend/react-Admin3 && npx vite build 2>&1 | tail -5`
Expected: Build succeeds (no Tailwind output yet since no files use it)

- [ ] **Step 7: Verify storefront is unaffected**

Run: `cd frontend/react-Admin3 && npm run dev` (manual check — open `http://127.0.0.1:3000` and verify storefront pages render identically)

- [ ] **Step 8: Commit**

```bash
git add frontend/react-Admin3/tailwind.config.ts frontend/react-Admin3/postcss.config.js frontend/react-Admin3/vite.config.js frontend/react-Admin3/tsconfig.json frontend/react-Admin3/components.json
git commit -m "chore: configure Tailwind CSS with tw- prefix scoped to admin components"
```

---

### Task 3: Create Admin Theme CSS Variables and `cn()` Utility

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/styles/admin.css`
- Create: `frontend/react-Admin3/src/components/admin/styles/cn.ts`

- [ ] **Step 1: Create the admin CSS variables file**

Create `frontend/react-Admin3/src/components/admin/styles/admin.css`:

```css
@import "tailwindcss";

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
    --admin-bg-subtle:       hsl(240 6% 15%);
    --admin-fg:              hsl(0 0% 98%);
    --admin-fg-muted:        hsl(240 5% 65%);
    --admin-fg-subtle:       hsl(240 5% 50%);
    --admin-border:          hsl(240 4% 20%);
    --admin-border-strong:   hsl(240 4% 30%);
    --admin-primary:         hsl(0 0% 98%);
    --admin-primary-fg:      hsl(240 10% 4%);
    --admin-destructive:     hsl(0 62% 55%);
    --admin-destructive-fg:  hsl(0 0% 100%);
    --admin-success:         hsl(142 60% 50%);
    --admin-success-fg:      hsl(0 0% 100%);
    --admin-warning:         hsl(38 80% 55%);
    --admin-warning-fg:      hsl(0 0% 100%);
    --admin-ring:            hsl(240 5% 50%);
    --admin-sidebar-bg:      hsl(240 6% 7%);
    --admin-sidebar-fg:      hsl(240 5% 65%);
    --admin-sidebar-active:  hsl(0 0% 98%);
    --admin-sidebar-active-fg: hsl(240 10% 4%);
  }
}
```

- [ ] **Step 2: Create the `cn()` utility**

Create `frontend/react-Admin3/src/components/admin/styles/cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Import admin.css in the admin layout entry point**

This will be done in Task 6 (AdminLayout migration). For now, just verify the files exist.

Run: `ls -la frontend/react-Admin3/src/components/admin/styles/`
Expected: `admin.css` and `cn.ts` listed

- [ ] **Step 4: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/styles/
git commit -m "feat: add admin theme CSS variables and cn() utility"
```

---

### Task 4: Copy shadcn/ui Primitives into `admin/ui/`

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/ui/` (multiple files)

The shadcn CLI generates primitives that reference `@/components/admin/styles/cn` for the `cn()` utility and use the `tw-` prefix.

- [ ] **Step 1: Create the admin/ui directory**

```bash
mkdir -p frontend/react-Admin3/src/components/admin/ui
```

- [ ] **Step 2: Add shadcn primitives via CLI**

Run each command from `frontend/react-Admin3/`:

```bash
cd frontend/react-Admin3
npx shadcn@latest add button -y
npx shadcn@latest add input -y
npx shadcn@latest add table -y
npx shadcn@latest add dialog -y
npx shadcn@latest add select -y
npx shadcn@latest add checkbox -y
npx shadcn@latest add badge -y
npx shadcn@latest add sheet -y
npx shadcn@latest add dropdown-menu -y
npx shadcn@latest add textarea -y
npx shadcn@latest add switch -y
npx shadcn@latest add skeleton -y
npx shadcn@latest add label -y
npx shadcn@latest add separator -y
npx shadcn@latest add scroll-area -y
```

Note: The CLI reads `components.json` and places files in `src/components/admin/ui/` with `tw-` prefix classes.

- [ ] **Step 3: Verify all primitives were generated**

Run: `ls frontend/react-Admin3/src/components/admin/ui/`
Expected: `button.tsx`, `input.tsx`, `table.tsx`, `dialog.tsx`, `select.tsx`, `checkbox.tsx`, `badge.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `textarea.tsx`, `switch.tsx`, `skeleton.tsx`, `label.tsx`, `separator.tsx`, `scroll-area.tsx`

- [ ] **Step 4: Verify primitives use `tw-` prefix**

Run: `grep -l "tw-" frontend/react-Admin3/src/components/admin/ui/*.tsx | wc -l`
Expected: All files should contain `tw-` prefixed classes

- [ ] **Step 5: Fix any import paths if needed**

If the CLI generated `import { cn } from "@/lib/utils"`, update to `import { cn } from "@/components/admin/styles/cn"`. Check:

```bash
grep -r "@/lib/utils" frontend/react-Admin3/src/components/admin/ui/
```

If matches found, replace all occurrences:
```bash
sed -i '' 's|@/lib/utils|@/components/admin/styles/cn|g' frontend/react-Admin3/src/components/admin/ui/*.tsx
```

- [ ] **Step 6: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/ui/
git commit -m "feat: add shadcn/ui primitives scoped to admin panel"
```

---

### Task 5: Build Compound Components

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminPage.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminPageHeader.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminDataTable.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminFormLayout.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminFormField.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminSelect.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminConfirmDialog.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminBadge.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminEmptyState.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminLoadingState.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminErrorAlert.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminFilterBar.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/AdminBreadcrumbs.tsx`
- Create: `frontend/react-Admin3/src/components/admin/composed/index.ts`
- Test: `frontend/react-Admin3/src/components/admin/composed/__tests__/`

This is the largest task in Phase 0. Each compound component encapsulates Tailwind classes so module code stays clean. Build them in dependency order.

- [ ] **Step 1: Create AdminPage**

Create `frontend/react-Admin3/src/components/admin/composed/AdminPage.tsx`:

```tsx
import React from 'react';
import { cn } from '@/components/admin/styles/cn';

interface AdminPageProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminPage({ children, className }: AdminPageProps) {
  return (
    <div className={cn('tw-mx-auto tw-max-w-7xl tw-px-6 tw-py-8', className)}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create AdminPageHeader**

Create `frontend/react-Admin3/src/components/admin/composed/AdminPageHeader.tsx`:

```tsx
import React from 'react';
import { cn } from '@/components/admin/styles/cn';
import { Button } from '@/components/admin/ui/button';
import type { LucideIcon } from 'lucide-react';

interface HeaderAction {
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: HeaderAction[];
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn('tw-mb-8', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="tw-mb-3 tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-text-admin-fg-muted">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="tw-text-admin-fg-subtle">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:tw-text-admin-fg tw-transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-4">
        <div>
          <h1 className="tw-text-2xl tw-font-semibold tw-tracking-tight tw-text-admin-fg">
            {title}
          </h1>
          {description && (
            <p className="tw-mt-1 tw-text-sm tw-text-admin-fg-muted">{description}</p>
          )}
        </div>
        {actions && actions.length > 0 && (
          <div className="tw-flex tw-items-center tw-gap-2">
            {actions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Button
                  key={i}
                  variant={action.variant ?? 'default'}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {Icon && <Icon className="tw-mr-2 tw-h-4 tw-w-4" />}
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create AdminBadge**

Create `frontend/react-Admin3/src/components/admin/composed/AdminBadge.tsx`:

```tsx
import { cn } from '@/components/admin/styles/cn';
import { Badge } from '@/components/admin/ui/badge';

interface AdminBadgeProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

export function AdminBadge({
  active,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  className,
}: AdminBadgeProps) {
  return (
    <Badge
      className={cn(
        active
          ? 'tw-bg-admin-success/10 tw-text-admin-success tw-border-admin-success/20'
          : 'tw-bg-admin-bg-muted tw-text-admin-fg-muted tw-border-admin-border',
        className
      )}
      variant="outline"
    >
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
```

- [ ] **Step 4: Create AdminErrorAlert**

Create `frontend/react-Admin3/src/components/admin/composed/AdminErrorAlert.tsx`:

```tsx
import { cn } from '@/components/admin/styles/cn';
import { AlertCircle } from 'lucide-react';

interface AdminErrorAlertProps {
  message: string | null | undefined;
  onRetry?: () => void;
  className?: string;
}

export function AdminErrorAlert({ message, onRetry, className }: AdminErrorAlertProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        'tw-mb-4 tw-flex tw-items-center tw-gap-3 tw-rounded-admin tw-border tw-border-admin-destructive/20 tw-bg-admin-destructive/5 tw-px-4 tw-py-3 tw-text-sm tw-text-admin-destructive',
        className
      )}
      role="alert"
    >
      <AlertCircle className="tw-h-4 tw-w-4 tw-shrink-0" />
      <span className="tw-flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="tw-text-admin-destructive tw-underline tw-underline-offset-2 hover:tw-no-underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create AdminEmptyState**

Create `frontend/react-Admin3/src/components/admin/composed/AdminEmptyState.tsx`:

```tsx
import { cn } from '@/components/admin/styles/cn';
import { Button } from '@/components/admin/ui/button';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface AdminEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function AdminEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <div className={cn('tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-16 tw-text-center', className)}>
      <Icon className="tw-mb-4 tw-h-12 tw-w-12 tw-text-admin-fg-subtle" />
      <h3 className="tw-text-lg tw-font-medium tw-text-admin-fg">{title}</h3>
      {description && (
        <p className="tw-mt-1 tw-max-w-md tw-text-sm tw-text-admin-fg-muted">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="tw-mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create AdminLoadingState**

Create `frontend/react-Admin3/src/components/admin/composed/AdminLoadingState.tsx`:

```tsx
import { cn } from '@/components/admin/styles/cn';
import { Skeleton } from '@/components/admin/ui/skeleton';

interface AdminLoadingStateProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function AdminLoadingState({ rows = 5, columns = 4, className }: AdminLoadingStateProps) {
  return (
    <div className={cn('tw-space-y-3', className)}>
      {/* Header skeleton */}
      <div className="tw-flex tw-gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="tw-h-4 tw-flex-1" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="tw-flex tw-gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="tw-h-8 tw-flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Create AdminConfirmDialog**

Create `frontend/react-Admin3/src/components/admin/composed/AdminConfirmDialog.tsx`:

```tsx
import { Button } from '@/components/admin/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/admin/ui/dialog';

interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 8: Create AdminFormField**

Create `frontend/react-Admin3/src/components/admin/composed/AdminFormField.tsx`:

```tsx
import React from 'react';
import { cn } from '@/components/admin/styles/cn';
import { Label } from '@/components/admin/ui/label';

interface AdminFormFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function AdminFormField({
  label,
  required,
  error,
  description,
  children,
  className,
}: AdminFormFieldProps) {
  return (
    <div className={cn('tw-space-y-2', className)}>
      <Label className="tw-text-sm tw-font-medium tw-text-admin-fg">
        {label}
        {required && <span className="tw-ml-0.5 tw-text-admin-destructive">*</span>}
      </Label>
      {description && (
        <p className="tw-text-xs tw-text-admin-fg-muted">{description}</p>
      )}
      {children}
      {error && (
        <p className="tw-text-xs tw-text-admin-destructive">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Create AdminFormLayout**

Create `frontend/react-Admin3/src/components/admin/composed/AdminFormLayout.tsx`:

```tsx
import React from 'react';
import { cn } from '@/components/admin/styles/cn';
import { Button } from '@/components/admin/ui/button';
import { AdminErrorAlert } from './AdminErrorAlert';

interface AdminFormLayoutProps {
  title: string;
  description?: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
  submitLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function AdminFormLayout({
  title,
  description,
  onSubmit,
  onCancel,
  loading = false,
  error,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  children,
  className,
}: AdminFormLayoutProps) {
  return (
    <form onSubmit={onSubmit} className={cn('tw-space-y-6', className)}>
      <div>
        <h1 className="tw-text-2xl tw-font-semibold tw-tracking-tight tw-text-admin-fg">
          {title}
        </h1>
        {description && (
          <p className="tw-mt-1 tw-text-sm tw-text-admin-fg-muted">{description}</p>
        )}
      </div>

      <AdminErrorAlert message={error} />

      <div className="tw-space-y-4">
        {children}
      </div>

      <div className="tw-flex tw-items-center tw-gap-3 tw-border-t tw-border-admin-border tw-pt-6">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 10: Create AdminSelect**

Create `frontend/react-Admin3/src/components/admin/composed/AdminSelect.tsx`:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/admin/ui/select';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AdminSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AdminSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled,
}: AdminSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 11: Create AdminDataTable**

Create `frontend/react-Admin3/src/components/admin/composed/AdminDataTable.tsx`:

```tsx
import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { cn } from '@/components/admin/styles/cn';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/admin/ui/table';
import { Button } from '@/components/admin/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/admin/ui/dropdown-menu';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { AdminLoadingState } from './AdminLoadingState';
import { AdminEmptyState } from './AdminEmptyState';
import type { LucideIcon } from 'lucide-react';

// --- Public API types (what module code uses) ---

interface SimpleColumn<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface RowAction<T> {
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive';
  onClick: () => void;
}

interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onPageSizeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  pageSizeOptions?: number[];
}

interface AdminDataTableProps<T extends Record<string, any>> {
  columns: SimpleColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  pagination?: PaginationConfig;
  actions?: (row: T) => RowAction<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
}

// --- Adapter: SimpleColumn → TanStack ColumnDef ---

function buildColumnDefs<T extends Record<string, any>>(
  columns: SimpleColumn<T>[],
  actions?: (row: T) => RowAction<T>[]
): ColumnDef<T, any>[] {
  const defs: ColumnDef<T, any>[] = columns.map((col) => ({
    id: col.key,
    accessorKey: col.key,
    header: ({ column }) =>
      col.sortable ? (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="tw--ml-3 tw-h-8"
        >
          {col.header}
          <ArrowUpDown className="tw-ml-2 tw-h-3.5 tw-w-3.5" />
        </Button>
      ) : (
        col.header
      ),
    cell: ({ row }) => {
      const value = row.getValue(col.key);
      return col.render ? col.render(value, row.original) : String(value ?? '');
    },
    enableSorting: col.sortable ?? false,
  }));

  if (actions) {
    defs.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const rowActions = actions(row.original);
        if (!rowActions.length) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="tw-h-8 tw-w-8 tw-p-0">
                <MoreHorizontal className="tw-h-4 tw-w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {rowActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={i}
                    onClick={action.onClick}
                    className={action.variant === 'destructive' ? 'tw-text-admin-destructive' : ''}
                  >
                    {Icon && <Icon className="tw-mr-2 tw-h-4 tw-w-4" />}
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
    });
  }

  return defs;
}

// --- Component ---

export function AdminDataTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyMessage = 'No data found',
  emptyIcon,
  pagination,
  actions,
  onRowClick,
  className,
}: AdminDataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columnDefs = React.useMemo(
    () => buildColumnDefs(columns, actions),
    [columns, actions]
  );

  const table = useReactTable({
    data,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (loading) {
    return <AdminLoadingState rows={5} columns={columns.length} />;
  }

  if (!data.length) {
    return <AdminEmptyState icon={emptyIcon} title={emptyMessage} />;
  }

  return (
    <div className={cn('tw-space-y-4', className)}>
      <div className="tw-rounded-admin tw-border tw-border-admin-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="tw-text-admin-fg-muted">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={onRowClick ? 'tw-cursor-pointer hover:tw-bg-admin-bg-muted' : ''}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="tw-flex tw-items-center tw-justify-between tw-text-sm tw-text-admin-fg-muted">
          <span>
            Showing {pagination.page * pagination.pageSize + 1}–
            {Math.min((pagination.page + 1) * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </span>
          <div className="tw-flex tw-items-center tw-gap-2">
            <span>Rows per page:</span>
            <select
              value={pagination.pageSize}
              onChange={pagination.onPageSizeChange}
              className="tw-rounded-admin tw-border tw-border-admin-border tw-bg-admin-bg tw-px-2 tw-py-1 tw-text-sm"
            >
              {(pagination.pageSizeOptions ?? [10, 20, 50]).map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => pagination.onPageChange(e, pagination.page - 1)}
              disabled={pagination.page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => pagination.onPageChange(e, pagination.page + 1)}
              disabled={(pagination.page + 1) * pagination.pageSize >= pagination.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 12: Create AdminFilterBar**

Create `frontend/react-Admin3/src/components/admin/composed/AdminFilterBar.tsx`:

```tsx
import React from 'react';
import { cn } from '@/components/admin/styles/cn';
import { Input } from '@/components/admin/ui/input';
import { AdminSelect } from './AdminSelect';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/admin/ui/button';

interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'search';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface AdminFilterBarProps {
  filters: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear?: () => void;
  className?: string;
}

export function AdminFilterBar({
  filters,
  values,
  onChange,
  onClear,
  className,
}: AdminFilterBarProps) {
  const hasActiveFilters = Object.values(values).some((v) => v !== '');

  return (
    <div className={cn('tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-gap-3', className)}>
      {filters.map((filter) => (
        <div key={filter.key} className="tw-min-w-[180px]">
          {filter.type === 'search' ? (
            <div className="tw-relative">
              <Search className="tw-absolute tw-left-2.5 tw-top-2.5 tw-h-4 tw-w-4 tw-text-admin-fg-muted" />
              <Input
                placeholder={filter.placeholder ?? `Search ${filter.label}...`}
                value={values[filter.key] ?? ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="tw-pl-9"
              />
            </div>
          ) : (
            <AdminSelect
              options={[{ value: '__all__', label: `All ${filter.label}` }, ...(filter.options ?? [])]}
              value={values[filter.key] || '__all__'}
              onChange={(v) => onChange(filter.key, v === '__all__' ? '' : v)}
              placeholder={filter.placeholder ?? `Filter by ${filter.label}`}
            />
          )}
        </div>
      ))}
      {onClear && hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="tw-mr-1 tw-h-3.5 tw-w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 13: Create AdminBreadcrumbs**

Create `frontend/react-Admin3/src/components/admin/composed/AdminBreadcrumbs.tsx`:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/admin/styles/cn';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function AdminBreadcrumbs({ items, className }: AdminBreadcrumbsProps) {
  return (
    <nav className={cn('tw-mb-4 tw-flex tw-items-center tw-gap-1 tw-text-sm', className)}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="tw-h-3.5 tw-w-3.5 tw-text-admin-fg-subtle" />}
          {item.href ? (
            <Link
              to={item.href}
              className="tw-text-admin-fg-muted hover:tw-text-admin-fg tw-transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="tw-text-admin-fg">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
```

- [ ] **Step 14: Create barrel export**

Create `frontend/react-Admin3/src/components/admin/composed/index.ts`:

```ts
export { AdminPage } from './AdminPage';
export { AdminPageHeader } from './AdminPageHeader';
export { AdminDataTable } from './AdminDataTable';
export { AdminFormLayout } from './AdminFormLayout';
export { AdminFormField } from './AdminFormField';
export { AdminSelect } from './AdminSelect';
export { AdminConfirmDialog } from './AdminConfirmDialog';
export { AdminBadge } from './AdminBadge';
export { AdminEmptyState } from './AdminEmptyState';
export { AdminLoadingState } from './AdminLoadingState';
export { AdminErrorAlert } from './AdminErrorAlert';
export { AdminFilterBar } from './AdminFilterBar';
export { AdminBreadcrumbs } from './AdminBreadcrumbs';
```

- [ ] **Step 15: Verify TypeScript compilation**

Run: `cd frontend/react-Admin3 && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors from `components/admin/composed/`

- [ ] **Step 16: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/composed/
git commit -m "feat: build compound component library for admin panel (AdminPage, AdminDataTable, AdminFormLayout, etc.)"
```

---

### Task 6: Migrate AdminLayout and AdminSidebar Shell

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/AdminLayout.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/AdminSidebar.tsx`
- Create: `frontend/react-Admin3/src/components/admin/layout/AdminLayout.tsx` (new location)
- Create: `frontend/react-Admin3/src/components/admin/layout/AdminSidebar.tsx` (new location)

The admin shell wraps all admin routes with the sidebar and main content area. This is the first component to use shadcn/ui in production — it validates the entire pipeline.

- [ ] **Step 1: Create new AdminLayout in layout/ directory**

Create `frontend/react-Admin3/src/components/admin/layout/AdminLayout.tsx`:

```tsx
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AdminSidebar } from './AdminSidebar';
import { cn } from '@/components/admin/styles/cn';
import '@/components/admin/styles/admin.css';

export function AdminLayout() {
  const { isSuperuser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="admin-root tw-flex tw-h-screen tw-items-center tw-justify-center tw-bg-admin-bg">
        <div className="tw-text-admin-fg-muted">Loading...</div>
      </div>
    );
  }

  if (!isSuperuser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-root tw-flex tw-min-h-screen tw-bg-admin-bg tw-font-sans">
      <AdminSidebar />
      <main
        className={cn(
          'tw-flex-1 tw-overflow-auto',
          'tw-ml-[var(--admin-sidebar-width)]'
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
```

Note: The `import '@/components/admin/styles/admin.css'` loads the CSS variables. The `admin-root` class activates the variables for the entire admin tree.

- [ ] **Step 2: Create new AdminSidebar in layout/ directory**

Create `frontend/react-Admin3/src/components/admin/layout/AdminSidebar.tsx`:

This is a larger component. Replicate the existing sidebar's navigation structure but using shadcn primitives instead of MUI:

```tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/components/admin/styles/cn';
import { ScrollArea } from '@/components/admin/ui/scroll-area';
import { Separator } from '@/components/admin/ui/separator';
import {
  ChevronDown,
  BookOpen,
  Calendar,
  Package,
  Link2,
  Layers,
  BoxSelect,
  Store,
  DollarSign,
  Gift,
  Star,
  Mail,
  Settings,
  FileText,
  Inbox,
  Paperclip,
  Code,
  Hash,
  MessageSquare,
  Users,
  UserCog,
  Wand2,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Catalog',
    icon: BookOpen,
    items: [
      { label: 'Subjects', href: '/admin/subjects', icon: BookOpen },
      { label: 'Exam Sessions', href: '/admin/exam-sessions', icon: Calendar },
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'ESS Links', href: '/admin/exam-session-subjects', icon: Link2 },
      { label: 'Variations', href: '/admin/product-variations', icon: Layers },
      { label: 'Product Bundles', href: '/admin/product-bundles', icon: BoxSelect },
    ],
  },
  {
    label: 'Store',
    icon: Store,
    items: [
      { label: 'Store Products', href: '/admin/store-products', icon: Store },
      { label: 'Prices', href: '/admin/prices', icon: DollarSign },
      { label: 'Store Bundles', href: '/admin/store-bundles', icon: Gift },
      { label: 'Recommendations', href: '/admin/recommendations', icon: Star },
    ],
  },
  {
    label: 'Email System',
    icon: Mail,
    items: [
      { label: 'Settings', href: '/admin/email/settings', icon: Settings },
      { label: 'Templates', href: '/admin/email/templates', icon: FileText },
      { label: 'Queue', href: '/admin/email/queue', icon: Inbox },
      { label: 'Attachments', href: '/admin/email/attachments', icon: Paperclip },
      { label: 'Content Rules', href: '/admin/email/content-rules', icon: Code },
      { label: 'Placeholders', href: '/admin/email/placeholders', icon: Hash },
      { label: 'Salutations', href: '/admin/email/closing-salutations', icon: MessageSquare },
    ],
  },
  {
    label: 'Users',
    icon: Users,
    items: [
      { label: 'User Profiles', href: '/admin/user-profiles', icon: Users },
      { label: 'Staff', href: '/admin/staff', icon: UserCog },
    ],
  },
  {
    label: 'Setup',
    icon: Wand2,
    items: [
      { label: 'New Session Setup', href: '/admin/new-session-setup', icon: Wand2 },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Auto-expand group containing current path
    const initial: Record<string, boolean> = {};
    navGroups.forEach((group) => {
      initial[group.label] = group.items.some((item) =>
        location.pathname.startsWith(item.href)
      );
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className="tw-fixed tw-inset-y-0 tw-left-0 tw-z-30 tw-flex tw-w-[var(--admin-sidebar-width)] tw-flex-col tw-border-r tw-border-admin-border tw-bg-admin-sidebar-bg"
    >
      <div className="tw-flex tw-h-14 tw-items-center tw-px-4">
        <Link to="/admin" className="tw-text-lg tw-font-semibold tw-text-admin-fg">
          Admin
        </Link>
      </div>
      <Separator />
      <ScrollArea className="tw-flex-1">
        <nav className="tw-px-3 tw-py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="tw-mb-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  'tw-flex tw-w-full tw-items-center tw-justify-between tw-rounded-admin tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-text-admin-sidebar-fg tw-transition-colors',
                  'hover:tw-bg-admin-bg-muted hover:tw-text-admin-fg'
                )}
              >
                <span className="tw-flex tw-items-center tw-gap-2">
                  <group.icon className="tw-h-4 tw-w-4" />
                  {group.label}
                </span>
                <ChevronDown
                  className={cn(
                    'tw-h-4 tw-w-4 tw-transition-transform',
                    openGroups[group.label] && 'tw-rotate-180'
                  )}
                />
              </button>
              {openGroups[group.label] && (
                <div className="tw-ml-4 tw-mt-1 tw-space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          'tw-flex tw-items-center tw-gap-2 tw-rounded-admin tw-px-3 tw-py-1.5 tw-text-sm tw-transition-colors',
                          isActive
                            ? 'tw-bg-admin-sidebar-active tw-text-admin-sidebar-active-fg'
                            : 'tw-text-admin-sidebar-fg hover:tw-bg-admin-bg-muted hover:tw-text-admin-fg'
                        )}
                      >
                        <item.icon className="tw-h-3.5 tw-w-3.5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
```

- [ ] **Step 3: Update route imports in App.js**

In `frontend/react-Admin3/src/App.js`, update the lazy import for AdminLayout to point to the new location:

```js
// Change from:
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
// To:
const AdminLayout = lazy(() => import('./components/admin/layout/AdminLayout').then(m => ({ default: m.AdminLayout })));
```

Or if the current import uses default export, update the new file to have a default export:
```tsx
// At the bottom of layout/AdminLayout.tsx, add:
export default AdminLayout;
```

- [ ] **Step 4: Verify admin shell renders**

Run: `cd frontend/react-Admin3 && npm run dev` (manual check — navigate to `http://127.0.0.1:3000/admin/subjects`)
Expected: Sidebar renders with shadcn styling. Existing MUI content pages still render inside the main area.

- [ ] **Step 5: Verify storefront is unaffected**

Navigate to `http://127.0.0.1:3000` (storefront home page).
Expected: No visual changes. No Tailwind classes in storefront DOM.

- [ ] **Step 6: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/layout/ frontend/react-Admin3/src/App.js
git commit -m "feat: migrate AdminLayout and AdminSidebar shell to shadcn/ui"
```

---

## Phase 1: Subjects Module Migration

### Task 7: Migrate SubjectList

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/subjects/SubjectList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/subjects/__tests__/SubjectList.test.tsx`
- Unchanged: `frontend/react-Admin3/src/components/admin/subjects/useSubjectListVM.ts`

- [ ] **Step 1: Read the current SubjectList.tsx to understand exact VM interface**

Read: `frontend/react-Admin3/src/components/admin/subjects/SubjectList.tsx`
Read: `frontend/react-Admin3/src/components/admin/subjects/useSubjectListVM.ts`

Note the exact property names and types returned by the VM hook.

- [ ] **Step 2: Rewrite SubjectList.tsx using compound components**

Replace the MUI-based implementation with compound components. The structure follows the spec's "After" example. Adapt to the exact VM hook interface found in Step 1.

Template:
```tsx
import { Navigate, useNavigate } from 'react-router-dom';
import { Upload, Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminDataTable, AdminBadge, AdminErrorAlert } from '@/components/admin/composed';
import { useSubjectListVM } from './useSubjectListVM';

export function SubjectList() {
  const vm = useSubjectListVM();
  const navigate = useNavigate();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Subjects"
        actions={[
          { label: 'Import', icon: Upload, variant: 'outline', onClick: () => navigate('/admin/subjects/import') },
          { label: 'Add New', icon: Plus, onClick: () => navigate('/admin/subjects/new') },
        ]}
      />
      <AdminErrorAlert message={vm.error} />
      <AdminDataTable
        columns={[
          { key: 'code', header: 'Code', sortable: true },
          { key: 'description', header: 'Description' },
          { key: 'active', header: 'Status', render: (val) => <AdminBadge active={val} /> },
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
          { label: 'Edit', icon: Pencil, onClick: () => navigate(`${row.id}/edit`) },
          { label: 'Delete', icon: Trash2, variant: 'destructive', onClick: () => vm.handleDelete(row.id) },
        ]}
      />
    </AdminPage>
  );
}
```

Adapt property names to match the actual VM interface.

- [ ] **Step 3: Update tests**

Update `SubjectList.test.tsx` to query by accessible role and text instead of MUI-specific selectors:
- Replace `screen.getByText('Subjects')` → keep (text queries still work)
- Replace any MUI `TableRow` queries → use `screen.getAllByRole('row')`
- Replace `Button` queries → use `screen.getByRole('button', { name: /Add New/ })`

- [ ] **Step 4: Verify no MUI imports remain**

Run: `grep -r "@mui" frontend/react-Admin3/src/components/admin/subjects/SubjectList.tsx`
Expected: No matches

- [ ] **Step 5: Verify VM hook is unchanged**

Run: `git diff frontend/react-Admin3/src/components/admin/subjects/useSubjectListVM.ts`
Expected: No changes

- [ ] **Step 6: Run tests**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=SubjectList --watchAll=false`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/subjects/SubjectList.tsx frontend/react-Admin3/src/components/admin/subjects/__tests__/
git commit -m "migrate: SubjectList to shadcn/ui compound components"
```

---

### Task 8: Migrate SubjectForm

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/subjects/SubjectForm.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/subjects/__tests__/SubjectForm.test.tsx`
- Unchanged: `frontend/react-Admin3/src/components/admin/subjects/useSubjectFormVM.ts`

- [ ] **Step 1: Read current SubjectForm.tsx and VM interface**

Read: `frontend/react-Admin3/src/components/admin/subjects/SubjectForm.tsx`
Read: `frontend/react-Admin3/src/components/admin/subjects/useSubjectFormVM.ts`

- [ ] **Step 2: Rewrite using compound components**

Template:
```tsx
import { Navigate, useNavigate } from 'react-router-dom';
import { AdminPage, AdminFormLayout, AdminFormField } from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { useSubjectFormVM } from './useSubjectFormVM';

export function SubjectForm() {
  const vm = useSubjectFormVM();
  const navigate = useNavigate();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminFormLayout
        title={vm.isEdit ? 'Edit Subject' : 'New Subject'}
        onSubmit={vm.handleSubmit}
        onCancel={() => navigate('/admin/subjects')}
        loading={vm.submitting}
        error={vm.error}
      >
        <AdminFormField label="Code" required error={vm.errors?.code}>
          <Input value={vm.formData.code} onChange={vm.handleChange('code')} />
        </AdminFormField>
        <AdminFormField label="Description">
          <Input value={vm.formData.description} onChange={vm.handleChange('description')} />
        </AdminFormField>
        <AdminFormField label="Active">
          <Checkbox checked={vm.formData.active} onCheckedChange={vm.handleChange('active')} />
        </AdminFormField>
      </AdminFormLayout>
    </AdminPage>
  );
}
```

Adapt to exact VM interface.

- [ ] **Step 3: Update tests**
- [ ] **Step 4: Verify no MUI imports, VM unchanged**
- [ ] **Step 5: Run tests**
- [ ] **Step 6: Commit**

```bash
git commit -m "migrate: SubjectForm to shadcn/ui compound components"
```

---

### Task 9: Migrate SubjectDetail and SubjectImport

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/subjects/SubjectDetail.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/subjects/SubjectImport.tsx`
- Modify: related tests

- [ ] **Step 1: Read current SubjectDetail.tsx** — uses MUI Card layout
- [ ] **Step 2: Rewrite SubjectDetail using AdminPage + AdminPageHeader** — replace Card with a simple detail layout using AdminBreadcrumbs
- [ ] **Step 3: Read and rewrite SubjectImport** — currently uses plain HTML, migrate to AdminPage + AdminFormLayout
- [ ] **Step 4: Update tests**
- [ ] **Step 5: Verify no MUI imports remain in any subjects/ view file**

Run: `grep -r "@mui" frontend/react-Admin3/src/components/admin/subjects/ --include="*.tsx" | grep -v __tests__ | grep -v "VM"`
Expected: No matches

- [ ] **Step 6: Commit**

```bash
git commit -m "migrate: SubjectDetail and SubjectImport to shadcn/ui"
```

---

## Phase 2–12: Remaining Simple/Medium Module Migrations

Each phase follows the **exact same pattern** as Phase 1 (Tasks 7–9). The steps for each module are:

1. **Read** the current view files and VM hooks
2. **Rewrite** List view → `AdminPage` + `AdminPageHeader` + `AdminDataTable`
3. **Rewrite** Form view → `AdminPage` + `AdminFormLayout` + `AdminFormField`
4. **Rewrite** any special pages (Detail, Import, Panel)
5. **Update tests** to query by role/text
6. **Verify** no MUI imports remain, VM unchanged
7. **Commit** per module

### Task 10: Phase 2 — Exam Sessions

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/exam-sessions/ExamSessionList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/exam-sessions/ExamSessionForm.tsx`
- Unchanged: VMs (`useExamSessionListVM.ts`, `useExamSessionFormVM.ts`)

**Special notes:**
- ExamSessionForm has datetime fields — use `<Input type="datetime-local" />` from shadcn/ui
- No nested panels or special patterns

---

### Task 11: Phase 3 — Product Variations

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/product-variations/ProductVariationList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/product-variations/ProductVariationForm.tsx`

**Special notes:**
- Form has a fixed variation type dropdown (eBook, Hub, Printed, Marking, Tutorial) — use `AdminSelect`

---

### Task 12: Phase 4 — Exam Session Subjects

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/exam-session-subjects/ExamSessionSubjectList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/exam-session-subjects/ExamSessionSubjectForm.tsx`

**Special notes:**
- List has an inline filter dropdown for exam sessions — use `AdminFilterBar`
- Form has two select dropdowns (exam session + subject) — use `AdminSelect`

---

### Task 13: Phase 5 — Product Bundles

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/product-bundles/ProductBundleList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/product-bundles/ProductBundleForm.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/product-bundles/BundleProductsPanel.tsx`

**Special notes:**
- List has expandable rows — this may require extending `AdminDataTable` with a `renderExpandedRow` prop, or using the shadcn Table primitive directly (Approach B fallback)
- BundleProductsPanel uses MUI `Autocomplete` — replace with a shadcn combobox or Command component
- This is the first module with a nested sub-table pattern

---

### Task 14: Phase 6 — Products (Catalog Master)

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/products/ProductList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/products/ProductForm.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/products/ProductDetail.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/products/ProductImport.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/products/ProductTable.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/products/ProductVariationsPanel.tsx`

**Special notes:**
- Largest catalog module (6 view files)
- ProductTable has expandable rows with nested ProductVariationsPanel (same pattern as Product Bundles)
- ProductVariationsPanel uses `Autocomplete` — same solution as BundleProductsPanel
- ProductImport shows a preview table — use `AdminDataTable` in read-only mode

---

### Task 15: Phase 7 — Prices

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/prices/PriceList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/prices/PriceForm.tsx`

**Special notes:**
- Form has price type dropdown (standard, retaker, reduced, additional) — use `AdminSelect`
- Standard List/Form pattern

---

### Task 16: Phase 8 — Store Products

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/store-products/StoreProductList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/store-products/StoreProductForm.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/store-products/StoreProductVariationsPanel.tsx`

**Special notes:**
- List has expandable rows (same pattern as Products)
- Form links to catalog products — use `AdminSelect` or Combobox

---

### Task 17: Phase 9 — Store Bundles

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/store-bundles/StoreBundleList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/store-bundles/StoreBundleForm.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/store-bundles/StoreBundleProductsPanel.tsx`

**Special notes:**
- Same expandable row pattern as Product Bundles and Store Products
- StoreBundleProductsPanel is read-only — simpler than editable panels

---

### Task 18: Phase 10 — Recommendations

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/recommendations/RecommendationList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/recommendations/RecommendationForm.tsx`

**Special notes:**
- Standard List/Form pattern
- Form has product selector — use `AdminSelect`

---

### Task 19: Phase 11 — User Profiles

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/user-profiles/UserProfileList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/user-profiles/UserProfileForm.tsx`

**Special notes:**
- List is standard
- **Form uses MUI Stepper** (multi-step: Personal, Home, Work, Preferences) — create `AdminStepper` compound component here (Task 21 / Phase 13 also needs it). Build `AdminStepper` as part of this task so it's ready for the New Session Setup wizard.

---

### Task 20: Phase 12 — Staff

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/staff/StaffList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/staff/StaffForm.tsx`

**Special notes:**
- Standard List/Form pattern. Simplest module.

---

## Phase 13: New Session Setup Wizard

### Task 21: Migrate New Session Setup

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/new-session-setup/NewSessionSetup.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/new-session-setup/StepExamSession.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/new-session-setup/StepSubjects.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/new-session-setup/StepMaterials.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/new-session-setup/StepTutorials.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/new-session-setup/SessionProductsSummary.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/new-session-setup/SessionBundlesSummary.tsx`

**Special notes:**
- Uses MUI `Stepper`, `Step`, `StepLabel` — create a lightweight `AdminStepper` compound component (or build directly with shadcn/Tailwind since this is the only wizard besides UserProfileForm)
- 7 view files + 7 VM hooks
- Each step has its own VM — migration is view-layer only
- Summary panels are data display only — use `AdminDataTable` in read-only mode

- [ ] **Step 1: Verify AdminStepper exists** (created in Task 19 / Phase 11)

```tsx
// frontend/react-Admin3/src/components/admin/composed/AdminStepper.tsx
interface AdminStepperProps {
  steps: string[];
  activeStep: number;
}
```

Build a simple horizontal stepper using shadcn primitives + Tailwind.

- [ ] **Step 2: Migrate NewSessionSetup.tsx** — replace MUI Stepper with AdminStepper
- [ ] **Step 3: Migrate each step component** (4 steps)
- [ ] **Step 4: Migrate summary panels** (2 panels)
- [ ] **Step 5: Update tests**
- [ ] **Step 6: Commit**

```bash
git commit -m "migrate: New Session Setup wizard to shadcn/ui"
```

---

## Phase 14: Email System

### Task 22: Migrate Email Simple Submodules

**Files:**
- All files in: `email/attachments/`, `email/closing-salutations/`, `email/placeholders/`

These are standard List/Form patterns — same approach as Phases 1–12.

- [ ] **Step 1: Migrate EmailAttachmentList and EmailAttachmentForm**
- [ ] **Step 2: Migrate ClosingSalutationList and ClosingSalutationForm**
- [ ] **Step 3: Migrate EmailPlaceholderList and EmailPlaceholderForm**
- [ ] **Step 4: Verify and commit**

```bash
git commit -m "migrate: email attachments, salutations, and placeholders to shadcn/ui"
```

---

### Task 23: Migrate Email Settings

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/email/settings/EmailSettingsList.tsx`

**Special notes:**
- Uses inline editing with Switch toggles and TextField inputs
- May need direct shadcn primitive usage (Approach B) for the inline edit pattern

- [ ] **Step 1: Read current implementation**
- [ ] **Step 2: Rewrite using AdminPage + inline editing with shadcn Switch and Input**
- [ ] **Step 3: Commit**

---

### Task 24: Migrate Email Templates

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/email/templates/EmailTemplateList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/email/templates/EmailTemplateForm.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/email/templates/EmailTemplateMjmlEditor.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/email/templates/BasicModeToolbar.tsx`

**Special notes:**
- EmailTemplateForm uses MUI Tabs for editor modes — replace with a shadcn Tabs component (add via `npx shadcn@latest add tabs`)
- EmailTemplateMjmlEditor integrates CodeMirror — **keep CodeMirror as-is**, only wrap with shadcn layout components
- BasicModeToolbar — migrate button bar to shadcn Button

- [ ] **Step 1: Add shadcn tabs primitive**

```bash
cd frontend/react-Admin3 && npx shadcn@latest add tabs -y
```

- [ ] **Step 2: Migrate EmailTemplateList** (standard)
- [ ] **Step 3: Migrate EmailTemplateForm** (Tabs + forms)
- [ ] **Step 4: Migrate MjmlEditor and BasicModeToolbar** (keep CodeMirror, wrap layout)
- [ ] **Step 5: Commit**

---

### Task 25: Migrate Email Queue

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/email/queue/EmailQueueList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/email/queue/EmailQueueDetail.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/email/queue/EmailQueueDuplicateForm.tsx`

**Special notes:**
- EmailQueueList uses MUI Dialog for confirmation — use `AdminConfirmDialog`
- EmailQueueDetail has collapsible sections — use a custom accordion or shadcn Collapsible
- EmailQueueDuplicateForm has chip-based email input — may need custom component

- [ ] **Step 1: Add shadcn collapsible if needed**

```bash
cd frontend/react-Admin3 && npx shadcn@latest add collapsible -y
```

- [ ] **Step 2: Migrate EmailQueueList**
- [ ] **Step 3: Migrate EmailQueueDetail** (collapsible sections)
- [ ] **Step 4: Migrate EmailQueueDuplicateForm** (email chip input)
- [ ] **Step 5: Commit**

---

### Task 26: Migrate Email Content Rules and Shared Components

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/email/content-rules/EmailContentRuleList.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/email/content-rules/EmailContentRuleForm.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/email/shared/RuleConditionBuilder.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/email/shared/RuleJsonEditor.tsx`
- Modify: `frontend/react-Admin3/src/components/admin/email/shared/MjmlPreviewPane.tsx`

**Special notes:**
- RuleJsonEditor uses CodeMirror — **keep CodeMirror as-is**, wrap with shadcn layout
- RuleConditionBuilder is a visual builder — may need direct shadcn primitives (Approach B)
- MjmlPreviewPane uses iframe — minimal MUI, easy migration

- [ ] **Step 1: Migrate EmailContentRuleList and Form**
- [ ] **Step 2: Migrate shared components** (keep CodeMirror, replace MUI wrappers)
- [ ] **Step 3: Commit**

---

## Phase 15: Final Verification and Cleanup

### Task 27: Verify Full Migration and Clean Up

- [ ] **Step 1: Verify no MUI imports in admin files**

```bash
grep -r "@mui" frontend/react-Admin3/src/components/admin/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v __tests__
```

Expected: No matches (except possibly test mocks)

- [ ] **Step 2: Verify storefront is unaffected**

Navigate through storefront pages (home, product list, product detail, cart) and verify no visual changes.

- [ ] **Step 3: Run full test suite**

```bash
cd frontend/react-Admin3 && npm test -- --watchAll=false
```

Expected: All tests pass

- [ ] **Step 4: Build for production**

```bash
cd frontend/react-Admin3 && npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 5: Check bundle size**

```bash
ls -la frontend/react-Admin3/build/assets/*.js | awk '{print $5, $9}'
```

Compare against pre-migration bundle sizes. Expected: Less than 10% increase.

- [ ] **Step 6: Remove old admin component files** (if moved to layout/)

Delete `frontend/react-Admin3/src/components/admin/AdminLayout.tsx` and `AdminSidebar.tsx` if they've been replaced by the `layout/` versions.

- [ ] **Step 7: Final commit**

```bash
git commit -m "chore: complete admin panel shadcn/ui migration — verify and clean up"
```
