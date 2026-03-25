# Admin Shell Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin layout with a shadcn/ui sidebar shell, slim top bar, dark mode toggle, tweakcn color palette, dashboard placeholder, and internal-mode login page.

**Architecture:** Full-height shadcn Sidebar (left) + SidebarInset (right column with AdminTopBar + Outlet). DarkModeProvider toggles `.admin-root.dark` class with localStorage persistence. When `INTERNAL=true` and unauthenticated, a standalone AdminLogin page is shown.

**Tech Stack:** React 19.2, shadcn/ui sidebar primitives, Tailwind CSS v4 (tw: prefix), Lucide React icons, existing useAuth/useConfig hooks

**Spec:** `docs/superpowers/specs/2026-03-25-admin-shell-redesign-design.md`

---

## File Structure

```
src/components/admin/
├── layout/
│   ├── AdminLayout.tsx          # MODIFY — simplify to auth guard + AdminShell
│   ├── AdminShell.tsx           # CREATE — SidebarProvider wrapper
│   ├── AppSidebar.tsx           # CREATE — shadcn Sidebar with all 21 nav items
│   ├── AdminTopBar.tsx          # CREATE — PanelLeft, search, dark/light, settings, avatar
│   ├── DarkModeProvider.tsx     # CREATE — dark mode context + localStorage
│   └── AdminSidebar.tsx         # DELETE — replaced by AppSidebar.tsx
├── ui/
│   ├── sidebar.tsx              # CREATE (via CLI) — shadcn sidebar primitive
│   ├── collapsible.tsx          # CREATE (via CLI) — shadcn collapsible primitive
│   └── tooltip.tsx              # CREATE (via CLI) — shadcn tooltip primitive
├── styles/
│   └── admin.css                # MODIFY — tweakcn oklch palette + sidebar CSS vars

src/pages/
├── Dashboard.tsx                # CREATE — minimal placeholder
├── AdminLogin.tsx               # CREATE — centered login card
├── InternalHome.tsx             # CREATE — route guard for INTERNAL mode

src/components/Navigation/
├── MainNavBar.tsx               # MODIFY — render null when isInternal
├── AdminNavigationMenu.tsx      # DELETE — replaced by sidebar
├── AdminMobileNavigation.tsx    # DELETE — replaced by sidebar
├── useAdminMobileNavigationVM.ts # DELETE — dead code after deletion

src/App.js                       # MODIFY — conditional home route
src/App.test.js                  # MODIFY — update AdminSidebar mock
```

---

### Task 1: Install shadcn/ui sidebar, collapsible, tooltip primitives

**Files:**
- Create: `src/components/admin/ui/sidebar.tsx` (via CLI)
- Create: `src/components/admin/ui/collapsible.tsx` (via CLI)
- Create: `src/components/admin/ui/tooltip.tsx` (via CLI)

- [ ] **Step 1: Install sidebar primitive**

Run from `frontend/react-Admin3/`:
```bash
npx shadcn@latest add sidebar
```

This installs `sidebar.tsx` into `src/components/admin/ui/` (per `components.json` alias config). It will auto-install any missing Radix dependencies.

- [ ] **Step 2: Install collapsible primitive**

```bash
npx shadcn@latest add collapsible
```

- [ ] **Step 3: Install tooltip primitive**

```bash
npx shadcn@latest add tooltip
```

- [ ] **Step 4: Verify installation**

```bash
ls src/components/admin/ui/sidebar.tsx src/components/admin/ui/collapsible.tsx src/components/admin/ui/tooltip.tsx
```

All three files should exist.

- [ ] **Step 5: Verify the app still builds**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/ui/sidebar.tsx src/components/admin/ui/collapsible.tsx src/components/admin/ui/tooltip.tsx package.json package-lock.json
git commit -m "feat: install shadcn sidebar, collapsible, tooltip primitives"
```

---

### Task 2: Update admin.css with tweakcn oklch color palette

**Files:**
- Modify: `src/components/admin/styles/admin.css`

- [ ] **Step 1: Replace `.admin-root` light mode variables**

Replace the contents of the `.admin-root { ... }` block (lines 42-89) with the tweakcn oklch palette. Keep the existing `@theme` block (lines 12-39) and Tailwind imports (lines 1-9) untouched.

The new `.admin-root` block must include both the **existing admin-prefixed variables** (mapped from new shadcn variable names) and the **new shadcn standard variables** (used by shadcn sidebar component). The shadcn sidebar primitive references `--sidebar`, `--sidebar-foreground`, etc. directly.

```css
/* ── Admin root variables (tweakcn oklch palette) ── */
.admin-root {
  /* ── shadcn standard tokens (used by shadcn/ui primitives) ── */
  --background: oklch(0.9383 0.0042 236.4993);
  --foreground: oklch(0.3211 0 0);
  --card: oklch(1.0000 0 0);
  --card-foreground: oklch(0.3211 0 0);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0.3211 0 0);
  --primary: oklch(0.6397 0.1720 36.4421);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.9670 0.0029 264.5419);
  --secondary-foreground: oklch(0.4461 0.0263 256.8018);
  --muted: oklch(0.9846 0.0017 247.8389);
  --muted-foreground: oklch(0.5510 0.0234 264.3637);
  --accent: oklch(0.9119 0.0222 243.8174);
  --accent-foreground: oklch(0.3791 0.1378 265.5222);
  --destructive: oklch(0.6368 0.2078 25.3313);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.9022 0.0052 247.8822);
  --input: oklch(0.9700 0.0029 264.5420);
  --ring: oklch(0.6397 0.1720 36.4421);
  --radius: 0.375rem;

  /* ── Sidebar tokens (used by shadcn sidebar primitive) ── */
  --sidebar-background: oklch(0.9030 0.0046 258.3257);
  --sidebar-foreground: oklch(0.3211 0 0);
  --sidebar-primary: oklch(0.6397 0.1720 36.4421);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.9119 0.0222 243.8174);
  --sidebar-accent-foreground: oklch(0.3791 0.1378 265.5222);
  --sidebar-border: oklch(0.9276 0.0058 264.5313);
  --sidebar-ring: oklch(0.6397 0.1720 36.4421);

  /* ── Chart tokens ── */
  --chart-1: oklch(0.7156 0.0605 248.6845);
  --chart-2: oklch(0.7875 0.0917 35.9616);
  --chart-3: oklch(0.5778 0.0759 254.1573);
  --chart-4: oklch(0.5016 0.0849 259.4902);
  --chart-5: oklch(0.4241 0.0952 264.0306);

  /* ── Admin-prefixed aliases (used by existing admin components via @theme) ── */
  --admin-bg:              var(--background);
  --admin-bg-muted:        var(--muted);
  --admin-bg-subtle:       var(--accent);
  --admin-fg:              var(--foreground);
  --admin-fg-muted:        var(--muted-foreground);
  --admin-fg-subtle:       var(--secondary-foreground);
  --admin-border:          var(--border);
  --admin-border-strong:   oklch(0.8500 0.0060 247.8822);
  --admin-primary:         var(--primary);
  --admin-primary-fg:      var(--primary-foreground);
  --admin-destructive:     var(--destructive);
  --admin-destructive-fg:  var(--destructive-foreground);
  --admin-success:         oklch(0.6500 0.1700 145.0000);
  --admin-success-fg:      oklch(1.0000 0 0);
  --admin-warning:         oklch(0.7500 0.1500 65.0000);
  --admin-warning-fg:      oklch(1.0000 0 0);
  --admin-ring:            var(--ring);
  --admin-radius:          var(--radius);
  --admin-sidebar-bg:      var(--sidebar-background);
  --admin-sidebar-fg:      var(--sidebar-foreground);
  --admin-sidebar-active:  var(--sidebar-primary);
  --admin-sidebar-active-fg: var(--sidebar-primary-foreground);
  --admin-sidebar-width:   240px;

  /* ── Typography ── */
  --admin-font-sans:       'Inter', system-ui, sans-serif;
  --admin-font-mono:       'JetBrains Mono', monospace;
}
```

- [ ] **Step 2: Replace `.admin-root.dark` dark mode variables**

Replace the dark mode block (lines 92-114) with:

```css
/* ── Dark mode ── */
.admin-root.dark {
  /* ── shadcn standard tokens ── */
  --background: oklch(0.2598 0.0306 262.6666);
  --foreground: oklch(0.9219 0 0);
  --card: oklch(0.3106 0.0301 268.6365);
  --card-foreground: oklch(0.9219 0 0);
  --popover: oklch(0.2900 0.0249 268.3986);
  --popover-foreground: oklch(0.9219 0 0);
  --primary: oklch(0.6397 0.1720 36.4421);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.3095 0.0266 266.7132);
  --secondary-foreground: oklch(0.9219 0 0);
  --muted: oklch(0.3095 0.0266 266.7132);
  --muted-foreground: oklch(0.7155 0 0);
  --accent: oklch(0.3380 0.0589 267.5867);
  --accent-foreground: oklch(0.8823 0.0571 254.1284);
  --destructive: oklch(0.6368 0.2078 25.3313);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.3843 0.0301 269.7337);
  --input: oklch(0.3843 0.0301 269.7337);
  --ring: oklch(0.6397 0.1720 36.4421);

  /* ── Sidebar tokens ── */
  --sidebar-background: oklch(0.3100 0.0283 267.7408);
  --sidebar-foreground: oklch(0.9219 0 0);
  --sidebar-primary: oklch(0.6397 0.1720 36.4421);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.3380 0.0589 267.5867);
  --sidebar-accent-foreground: oklch(0.8823 0.0571 254.1284);
  --sidebar-border: oklch(0.3843 0.0301 269.7337);
  --sidebar-ring: oklch(0.6397 0.1720 36.4421);

  /* ── Chart tokens ── */
  --chart-1: oklch(0.7156 0.0605 248.6845);
  --chart-2: oklch(0.7693 0.0876 34.1875);
  --chart-3: oklch(0.5778 0.0759 254.1573);
  --chart-4: oklch(0.5016 0.0849 259.4902);
  --chart-5: oklch(0.4241 0.0952 264.0306);

  /* ── Admin-prefixed aliases ── */
  --admin-bg:              var(--background);
  --admin-bg-muted:        var(--muted);
  --admin-bg-subtle:       var(--accent);
  --admin-fg:              var(--foreground);
  --admin-fg-muted:        var(--muted-foreground);
  --admin-fg-subtle:       var(--secondary-foreground);
  --admin-border:          var(--border);
  --admin-border-strong:   oklch(0.4500 0.0300 269.7337);
  --admin-primary:         var(--primary);
  --admin-primary-fg:      var(--primary-foreground);
  --admin-destructive:     var(--destructive);
  --admin-destructive-fg:  var(--destructive-foreground);
  --admin-success:         oklch(0.6500 0.1400 145.0000);
  --admin-success-fg:      oklch(1.0000 0 0);
  --admin-warning:         oklch(0.7200 0.1300 65.0000);
  --admin-warning-fg:      oklch(1.0000 0 0);
  --admin-ring:            var(--ring);
  --admin-sidebar-bg:      var(--sidebar-background);
  --admin-sidebar-fg:      var(--sidebar-foreground);
  --admin-sidebar-active:  var(--sidebar-primary);
  --admin-sidebar-active-fg: var(--sidebar-primary-foreground);
}
```

- [ ] **Step 3: Verify build**

```bash
cd frontend/react-Admin3 && npm run build 2>&1 | tail -20
```

Expected: Build succeeds. Existing admin components should still render correctly since admin-prefixed variables now alias to the new shadcn variables.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/styles/admin.css
git commit -m "feat: update admin.css to tweakcn oklch color palette with shadcn variable bridge"
```

---

### Task 3: Create DarkModeProvider

**Files:**
- Create: `src/components/admin/layout/DarkModeProvider.tsx`

- [ ] **Step 1: Create the DarkModeProvider component**

```tsx
// src/components/admin/layout/DarkModeProvider.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Mode = 'light' | 'dark';

interface DarkModeContextValue {
  mode: Mode;
  toggleMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextValue>({
  mode: 'light',
  toggleMode: () => {},
});

const STORAGE_KEY = 'admin-dark-mode';

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<Mode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.querySelector('.admin-root');
    if (!root) return;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <DarkModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = (): DarkModeContextValue => useContext(DarkModeContext);
```

- [ ] **Step 2: Verify build**

```bash
cd frontend/react-Admin3 && npm run build 2>&1 | tail -20
```

Expected: Build succeeds (component not yet used anywhere).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/layout/DarkModeProvider.tsx
git commit -m "feat: add DarkModeProvider with localStorage persistence"
```

---

### Task 4: Create AppSidebar

**Files:**
- Create: `src/components/admin/layout/AppSidebar.tsx`

**Depends on:** Task 1 (sidebar primitive installed)

- [ ] **Step 1: Create AppSidebar with all 21 nav items**

This component replaces `AdminSidebar.tsx`. It uses shadcn `Sidebar` primitives with `collapsible="icon"` for the icon-only collapsed state.

```tsx
// src/components/admin/layout/AppSidebar.tsx
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  CalendarDays,
  Package,
  Link as LinkIcon,
  Layers,
  Gift,
  Store,
  DollarSign,
  BoxesIcon,
  Star,
  Mail,
  Settings,
  FileText,
  ListOrdered,
  Paperclip,
  Scale,
  Code,
  PenLine,
  Users,
  BadgeCheck,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/admin/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/admin/ui/collapsible';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Subjects', path: '/admin/subjects', icon: GraduationCap },
      { label: 'Exam Sessions', path: '/admin/exam-sessions', icon: CalendarDays },
      { label: 'Products', path: '/admin/products', icon: Package },
      { label: 'ESS Links', path: '/admin/exam-session-subjects', icon: LinkIcon },
      { label: 'Variations', path: '/admin/product-variations', icon: Layers },
      { label: 'Product Bundles', path: '/admin/product-bundles', icon: Gift },
    ],
  },
  {
    label: 'Store',
    items: [
      { label: 'Store Products', path: '/admin/store-products', icon: Store },
      { label: 'Prices', path: '/admin/prices', icon: DollarSign },
      { label: 'Store Bundles', path: '/admin/store-bundles', icon: BoxesIcon },
      { label: 'Recommendations', path: '/admin/recommendations', icon: Star },
    ],
  },
  {
    label: 'Email System',
    items: [
      { label: 'Settings', path: '/admin/email/settings', icon: Settings },
      { label: 'Templates', path: '/admin/email/templates', icon: FileText },
      { label: 'Queue', path: '/admin/email/queue', icon: ListOrdered },
      { label: 'Attachments', path: '/admin/email/attachments', icon: Paperclip },
      { label: 'Content Rules', path: '/admin/email/content-rules', icon: Scale },
      { label: 'Placeholders', path: '/admin/email/placeholders', icon: Code },
      { label: 'Salutations', path: '/admin/email/closing-salutations', icon: PenLine },
    ],
  },
  {
    label: 'Users',
    items: [
      { label: 'User Profiles', path: '/admin/user-profiles', icon: Users },
      { label: 'Staff', path: '/admin/staff', icon: BadgeCheck },
    ],
  },
  {
    label: 'Setup',
    items: [
      { label: 'New Session Setup', path: '/admin/new-session-setup', icon: SlidersHorizontal },
    ],
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { user } = useAuth() as any;

  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const userInitials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="tw:flex tw:aspect-square tw:size-8 tw:items-center tw:justify-center tw:rounded-lg tw:bg-sidebar-primary tw:text-sidebar-primary-foreground tw:font-bold tw:text-sm">
                  A
                </div>
                <div className="tw:flex tw:flex-col tw:gap-0.5 tw:leading-none">
                  <span className="tw:font-semibold">Admin3</span>
                  <span className="tw:text-xs tw:text-muted-foreground">ActEd Store</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.path)}
                      tooltip={item.label}
                    >
                      <Link to={item.path}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="tw:flex tw:aspect-square tw:size-8 tw:items-center tw:justify-center tw:rounded-full tw:bg-sidebar-primary tw:text-sidebar-primary-foreground tw:text-xs tw:font-bold">
                {userInitials}
              </div>
              <div className="tw:flex tw:flex-col tw:gap-0.5 tw:leading-none">
                <span className="tw:font-medium tw:text-sm">
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="tw:text-xs tw:text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend/react-Admin3 && npm run build 2>&1 | tail -20
```

Expected: Build succeeds (component not yet mounted).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/layout/AppSidebar.tsx
git commit -m "feat: add AppSidebar with shadcn sidebar primitives and all 21 nav items"
```

---

### Task 5: Create AdminTopBar

**Files:**
- Create: `src/components/admin/layout/AdminTopBar.tsx`

**Depends on:** Task 1 (sidebar primitive), Task 3 (DarkModeProvider)

- [ ] **Step 1: Create AdminTopBar component**

```tsx
// src/components/admin/layout/AdminTopBar.tsx
import { PanelLeft, Search, Sun, Moon, Settings, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from './DarkModeProvider';
import { useSidebar } from '@/components/admin/ui/sidebar';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Separator } from '@/components/admin/ui/separator';

export function AdminTopBar() {
  const { toggleSidebar } = useSidebar();
  const { mode, toggleMode } = useDarkMode();
  const { user, isAuthenticated } = useAuth() as any;

  const userInitials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || 'U'
    : '';

  return (
    <header className="tw:flex tw:h-12 tw:shrink-0 tw:items-center tw:justify-between tw:border-b tw:border-border tw:px-4">
      {/* Left: sidebar toggle */}
      <div className="tw:flex tw:items-center tw:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="tw:h-8 tw:w-8"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="tw:h-4 tw:w-4" />
        </Button>
        <Separator orientation="vertical" className="tw:h-4" />
      </div>

      {/* Right: search, dark mode, settings, avatar */}
      <div className="tw:flex tw:items-center tw:gap-2">
        <div className="tw:relative">
          <Search className="tw:absolute tw:left-2.5 tw:top-1/2 tw:-translate-y-1/2 tw:h-3.5 tw:w-3.5 tw:text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="tw:h-8 tw:w-40 tw:pl-8 tw:text-sm"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMode}
          className="tw:h-8 tw:w-8"
          aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {mode === 'light' ? (
            <Moon className="tw:h-4 tw:w-4" />
          ) : (
            <Sun className="tw:h-4 tw:w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="tw:h-8 tw:w-8"
          aria-label="Settings"
        >
          <Settings className="tw:h-4 tw:w-4" />
        </Button>

        {isAuthenticated && user ? (
          <div className="tw:flex tw:h-8 tw:w-8 tw:items-center tw:justify-center tw:rounded-full tw:bg-primary tw:text-primary-foreground tw:text-xs tw:font-bold">
            {userInitials}
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="tw:h-8 tw:w-8" aria-label="Log in">
            <LogIn className="tw:h-4 tw:w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend/react-Admin3 && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/layout/AdminTopBar.tsx
git commit -m "feat: add AdminTopBar with PanelLeft trigger, search, dark mode, settings, avatar"
```

---

### Task 6: Create AdminShell

**Files:**
- Create: `src/components/admin/layout/AdminShell.tsx`

**Depends on:** Task 4 (AppSidebar), Task 5 (AdminTopBar)

- [ ] **Step 1: Create AdminShell wrapper**

```tsx
// src/components/admin/layout/AdminShell.tsx
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/admin/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AdminTopBar } from './AdminTopBar';

export function AdminShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AdminTopBar />
        <main className="tw:flex-1 tw:overflow-auto tw:p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend/react-Admin3 && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/layout/AdminShell.tsx
git commit -m "feat: add AdminShell wrapper with SidebarProvider, AppSidebar, AdminTopBar"
```

---

### Task 7: Modify AdminLayout to use AdminShell

**Files:**
- Modify: `src/components/admin/layout/AdminLayout.tsx`

**Depends on:** Task 3 (DarkModeProvider), Task 6 (AdminShell)

- [ ] **Step 1: Replace AdminLayout contents**

Replace the entire contents of `AdminLayout.tsx` with:

```tsx
// src/components/admin/layout/AdminLayout.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { DarkModeProvider } from './DarkModeProvider';
import { AdminShell } from './AdminShell';
import '@/components/admin/styles/admin.css';

export default function AdminLayout() {
  const { isSuperuser, isLoading } = useAuth() as any;

  if (isLoading) {
    return (
      <div className="admin-root tw:flex tw:h-screen tw:items-center tw:justify-center tw:bg-[var(--background)]">
        <div className="tw:text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  if (!isSuperuser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-root tw:font-sans">
      <DarkModeProvider>
        <AdminShell />
      </DarkModeProvider>
    </div>
  );
}
```

Key changes:
- Removes `AdminSidebar` import (deleted in Task 10)
- Removes manual `flex` + `margin-left` layout (handled by SidebarProvider/SidebarInset)
- Wraps in `DarkModeProvider`
- Delegates layout to `AdminShell`

- [ ] **Step 2: Verify build**

```bash
cd frontend/react-Admin3 && npm run build 2>&1 | tail -20
```

Expected: May warn about unused `AdminSidebar` import if it still exists. That's OK — Task 10 deletes it.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/layout/AdminLayout.tsx
git commit -m "refactor: simplify AdminLayout to auth guard + DarkModeProvider + AdminShell"
```

---

### Task 8: Create Dashboard placeholder page

**Files:**
- Create: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Create Dashboard component**

```tsx
// src/pages/Dashboard.tsx
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth() as any;
  const firstName = user?.first_name || 'Admin';

  return (
    <div>
      <h1 className="tw:text-2xl tw:font-bold tw:tracking-tight tw:text-[var(--foreground)]">
        Dashboard
      </h1>
      <p className="tw:text-[var(--muted-foreground)] tw:mt-1">
        Welcome back, {firstName}.
      </p>

      <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:mt-6 md:tw:grid-cols-3">
        {['Total Orders', 'Active Sessions', 'Pending Items'].map((title) => (
          <div
            key={title}
            className="tw:rounded-lg tw:border tw:border-[var(--border)] tw:bg-[var(--card)] tw:p-6"
          >
            <p className="tw:text-sm tw:text-[var(--muted-foreground)]">{title}</p>
            <p className="tw:text-2xl tw:font-bold tw:text-[var(--foreground)] tw:mt-1">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend/react-Admin3 && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add minimal Dashboard placeholder page"
```

---

### Task 9: Create AdminLogin page

**Files:**
- Create: `src/pages/AdminLogin.tsx`

- [ ] **Step 1: Create AdminLogin component**

Uses existing shadcn `Card`, `Input`, `Button`, `Label` components and the `useAuth().login()` method.

```tsx
// src/pages/AdminLogin.tsx
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import '@/components/admin/styles/admin.css';

export default function AdminLogin() {
  const { login, isAuthenticated, isSuperuser, isLoading } = useAuth() as any;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="admin-root tw:flex tw:h-screen tw:items-center tw:justify-center tw:bg-[var(--background)]">
        <div className="tw:text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated && isSuperuser) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login({ email, password });
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-root tw:flex tw:min-h-screen tw:items-center tw:justify-center tw:bg-[var(--background)]">
      <div className="tw:w-full tw:max-w-sm tw:rounded-lg tw:border tw:border-[var(--border)] tw:bg-[var(--card)] tw:p-8">
        <div className="tw:flex tw:flex-col tw:items-center tw:gap-2 tw:mb-6">
          <div className="tw:flex tw:h-10 tw:w-10 tw:items-center tw:justify-center tw:rounded-lg tw:bg-[var(--primary)] tw:text-[var(--primary-foreground)] tw:font-bold">
            A
          </div>
          <h1 className="tw:text-xl tw:font-semibold tw:text-[var(--foreground)]">Admin3</h1>
          <p className="tw:text-sm tw:text-[var(--muted-foreground)]">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="tw:flex tw:flex-col tw:gap-4">
          <div className="tw:flex tw:flex-col tw:gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@acted.co.uk"
              required
            />
          </div>

          <div className="tw:flex tw:flex-col tw:gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="tw:text-sm tw:text-[var(--destructive)]">{error}</p>
          )}

          <Button type="submit" disabled={submitting} className="tw:w-full">
            {submitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend/react-Admin3 && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminLogin.tsx
git commit -m "feat: add AdminLogin page with centered card and shadcn components"
```

---

### Task 10: Update App.js routing + hide MainNavBar for internal mode

**Files:**
- Create: `src/pages/InternalHome.tsx`
- Modify: `src/App.js`
- Modify: `src/components/Navigation/MainNavBar.tsx`

**Depends on:** Task 7 (AdminLayout updated), Task 8 (Dashboard), Task 9 (AdminLogin)

**Approach:** Create an `InternalHome.tsx` route guard component that checks `isInternal` + auth state, then update `App.js` routes to use it and add a `/admin/dashboard` route under `AdminLayout`.

- [ ] **Step 1: Create `src/pages/InternalHome.tsx`**

```tsx
// src/pages/InternalHome.tsx
import { Navigate } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../hooks/useAuth';
import Home from './Home.tsx';
import AdminLogin from './AdminLogin.tsx';

export default function InternalHome() {
  const { isInternal, configLoaded } = useConfig();
  const { isAuthenticated, isSuperuser, isLoading } = useAuth() as any;

  if (!configLoaded || isLoading) return null;

  // Public mode: show storefront home
  if (!isInternal) return <Home />;

  // Internal mode, not authenticated: show login
  if (!isAuthenticated || !isSuperuser) return <AdminLogin />;

  // Internal mode, authenticated superuser: redirect to admin dashboard
  return <Navigate to="/admin/dashboard" replace />;
}
```

- [ ] **Step 2: Add lazy imports to App.js**

At the top of `src/App.js`, after the existing lazy imports (around line 40), add:

```javascript
const Dashboard = React.lazy(() => import("./pages/Dashboard.tsx"));
const InternalHome = React.lazy(() => import("./pages/InternalHome.tsx"));
```

- [ ] **Step 3: Update home routes in App.js**

In `App.js`, replace lines 211-214:

```jsx
<Route path="/" element={<Navigate to="/home" replace />} />
<Route path="/home" element={<Home />} />
```

With:

```jsx
<Route path="/" element={<InternalHome />} />
<Route path="/home" element={<InternalHome />} />
```

- [ ] **Step 4: Add Dashboard route under AdminLayout**

Inside the `<Route element={<AdminLayout />}>` block in `App.js` (around line 219), add at the top:

```jsx
{/* Admin: Dashboard (internal home) */}
<Route path="/admin/dashboard" element={<Dashboard />} />
```

- [ ] **Step 5: Update MainNavBar to render null when internal**

In `src/components/Navigation/MainNavBar.tsx`, add an early return after line 23 (`const vm = useMainNavBarVM();`):

```tsx
// Hide entire navbar in internal mode — admin shell provides its own top bar
if (vm.isInternal) return null;
```

Note: `vm.isInternal` is confirmed to exist on the `MainNavBarVM` interface (line 20 of `useMainNavBarVM.ts`).

- [ ] **Step 6: Verify build**

```bash
cd frontend/react-Admin3 && npm run build 2>&1 | tail -20
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/InternalHome.tsx src/App.js src/components/Navigation/MainNavBar.tsx
git commit -m "feat: conditional routing for INTERNAL mode with AdminLogin and Dashboard"
```

---

### Task 11: Delete old navigation components and update references

**Files:**
- Delete: `src/components/Navigation/AdminNavigationMenu.tsx`
- Delete: `src/components/Navigation/AdminMobileNavigation.tsx`
- Delete: `src/components/Navigation/useAdminMobileNavigationVM.ts`
- Delete: `src/components/admin/layout/AdminSidebar.tsx`
- Modify: `src/components/Navigation/MainNavBar.tsx` (remove dead imports)
- Modify: `src/App.test.js` (update AdminSidebar mock)

**Depends on:** Task 10 (all new routing in place)

- [ ] **Step 1: Remove dead imports from MainNavBar.tsx**

In `src/components/Navigation/MainNavBar.tsx`, remove these import lines:
```tsx
import AdminMobileNavigation from './AdminMobileNavigation.tsx';
import AdminNavigationMenu from './AdminNavigationMenu.tsx';
```

Also remove the JSX branches that reference them (inside the `vm.isInternal` conditionals). Since `MainNavBar` now returns `null` when `vm.isInternal`, all `isInternal`-specific branches are dead code. Remove the `AdminNavActions` import from `MainNavActions.tsx` if it's only used in internal branches.

- [ ] **Step 2: Search for remaining references**

```bash
cd frontend/react-Admin3
grep -r "AdminNavigationMenu\|AdminMobileNavigation\|AdminSidebar\|useAdminMobileNavigationVM" src/ --include="*.tsx" --include="*.ts" --include="*.js" -l
```

Remove all imports and references found in non-test files.

- [ ] **Step 3: Update App.test.js**

In `src/App.test.js`, the mock at line 53 references `AdminSidebar`:

```javascript
vi.mock('./components/admin/layout/AdminSidebar', () => ({
  AdminSidebar: () => null,
}));
```

Replace with mocks for the new components:

```javascript
vi.mock('./components/admin/layout/AdminShell', () => ({
  AdminShell: () => null,
}));
vi.mock('./components/admin/layout/DarkModeProvider', () => ({
  DarkModeProvider: ({ children }) => children,
  useDarkMode: () => ({ mode: 'light', toggleMode: () => {} }),
}));
```

- [ ] **Step 4: Delete the files**

```bash
cd frontend/react-Admin3
rm src/components/Navigation/AdminNavigationMenu.tsx
rm src/components/Navigation/AdminMobileNavigation.tsx
rm src/components/Navigation/useAdminMobileNavigationVM.ts
rm src/components/admin/layout/AdminSidebar.tsx
```

- [ ] **Step 5: Verify build**

```bash
cd frontend/react-Admin3 && npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no import errors.

- [ ] **Step 6: Run tests**

```bash
cd frontend/react-Admin3 && npm test -- --watchAll=false 2>&1 | tail -30
```

Fix any remaining test failures from deleted imports.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove AdminNavigationMenu, AdminMobileNavigation, AdminSidebar, update test mocks"
```

---

### Task 12: Final verification and integration test

**Depends on:** All previous tasks

- [ ] **Step 1: Full build check**

```bash
cd frontend/react-Admin3 && npm run build 2>&1 | tail -30
```

Expected: Clean build with no errors.

- [ ] **Step 2: Run existing test suite**

```bash
cd frontend/react-Admin3 && npm test -- --watchAll=false 2>&1 | tail -30
```

Note: Some existing tests may fail if they import deleted components. If so, update those test files to remove references to `AdminNavigationMenu`, `AdminMobileNavigation`, or `AdminSidebar`.

- [ ] **Step 3: Manual smoke test checklist**

Start dev server: `cd frontend/react-Admin3 && npm start`

Test with `INTERNAL=False` (public mode):
1. `http://127.0.0.1:3000/` → Public home page with MainNavBar
2. `http://127.0.0.1:3000/products` → Product list works
3. Admin routes (`/admin/subjects`) → AdminLayout renders (but now with new shadcn shell)

Test with `INTERNAL=True` (internal mode):
1. Not logged in → AdminLogin card centered on screen
2. Log in with superuser → Redirects to admin Dashboard
3. Sidebar visible with all nav groups (Catalog, Store, Email, Users, Setup)
4. Click PanelLeft button → Sidebar collapses to icons
5. Click again → Sidebar expands
6. Click Moon icon → Dark mode activates, all colors change
7. Click Sun icon → Light mode restores
8. Refresh page → Dark mode preference persisted (localStorage)
9. Navigate to any admin page via sidebar → Page renders in main content area
10. Sidebar active state highlights current route

- [ ] **Step 4: Fix any test failures**

If admin layout tests reference deleted components, update them to mock or remove those references.

- [ ] **Step 5: Final commit (if any fixes)**

```bash
git add -A
git commit -m "fix: update tests for admin shell redesign"
```
