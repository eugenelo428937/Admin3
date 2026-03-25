# Admin Shell Redesign — Design Spec

**Date**: 2026-03-25
**Status**: Draft
**Scope**: Admin layout shell, top bar, dashboard placeholder, dark mode, color palette
**Out of scope**: Public storefront, individual admin page migrations, backend changes

---

## 1. Problem Statement

The internal admin UI (`INTERNAL=true`) currently reuses the public storefront's `MainNavBar` with an `AdminNavigationMenu` mega-menu overlay, creating a disjointed experience. The admin also has a separate `AdminSidebar` visible only on `/admin/*` routes. The goal is to unify the internal admin into a cohesive shadcn-admin-style shell: full-height sidebar + slim top bar + content area, with dark mode support and an updated color palette.

## 2. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Layout pattern** | Two containers: full-height sidebar (left) + top bar & content (right) | Matches shadcn-admin reference (shadcn-admin.netlify.app) |
| **Sidebar implementation** | shadcn/ui `Sidebar` primitives (`sidebar-07` pattern: collapses to icons) | Battle-tested collapse/expand, keyboard shortcuts, cookie persistence |
| **Top bar** | Slim utility strip inside right column (not full-width) | Contains: PanelLeft collapse trigger, search, dark/light toggle, settings, avatar |
| **MainNavBar** | Completely hidden when `INTERNAL=true` | No logo, no cart — purely internal admin experience |
| **Dark mode** | Fully wired with localStorage persistence | Existing `.admin-root.dark` CSS variables already defined |
| **Color palette** | tweakcn theme (oklch color space) | Warm orange primary, cool blue-gray base |
| **Dashboard** | Minimal placeholder (title, welcome, 3 empty metric cards) | Fleshed out later |
| **Unauthenticated** | Standalone centered login card | No sidebar or top bar shown until authenticated |

## 3. Component Architecture

### New Files

```
src/components/admin/layout/
├── AdminShell.tsx           # SidebarProvider + AppSidebar + SidebarInset wrapper
├── AppSidebar.tsx           # shadcn Sidebar (header, grouped nav, footer, rail)
├── AdminTopBar.tsx          # PanelLeft trigger, search, dark/light, settings, avatar
├── DarkModeProvider.tsx     # Dark mode context + localStorage persistence

src/pages/
├── Dashboard.tsx            # Minimal placeholder for INTERNAL home
├── AdminLogin.tsx           # Centered login card for unauthenticated users

src/components/admin/ui/
├── sidebar.tsx              # shadcn sidebar primitive (installed via CLI)
```

### Modified Files

```
src/components/admin/layout/AdminLayout.tsx   # Simplified to auth guard + AdminShell
src/components/admin/styles/admin.css          # CSS variables → tweakcn oklch palette
src/App.js                                     # Conditional home route for INTERNAL mode
src/components/Navigation/useMainNavBarVM.ts   # Return early when isInternal
src/components/Navigation/MainNavBar.tsx       # Render null when isInternal
```

### Removed Files

```
src/components/Navigation/AdminNavigationMenu.tsx    # Replaced by sidebar nav
src/components/Navigation/AdminMobileNavigation.tsx  # Sidebar handles mobile via sheet
src/components/admin/layout/AdminSidebar.tsx          # Replaced by AppSidebar.tsx
```

### Component Hierarchy

```
<Route path="/">
  isInternal && !isAuthenticated → <AdminLogin />
  isInternal && isAuthenticated  → <AdminLayout>      (auth guard: isSuperuser)
                                      <DarkModeProvider>
                                        <AdminShell>
                                          <SidebarProvider>
                                            <AppSidebar />
                                              ├── SidebarHeader    (Admin3 brand)
                                              ├── SidebarContent   (nav groups)
                                              ├── SidebarFooter    (user info)
                                              └── SidebarRail      (expand hover target)
                                            <SidebarInset>
                                              <AdminTopBar />
                                              <Outlet />           (Dashboard or admin page)
                                            </SidebarInset>
                                          </SidebarProvider>
                                        </AdminShell>
                                      </DarkModeProvider>
                                    </AdminLayout>
  !isInternal                    → <Home />            (public storefront, unchanged)
```

## 4. AdminTopBar Design

Slim horizontal bar at the top of the right column (not full page width).

```
┌─────────────────────────────────────────────┐
│ [PanelLeft]              [🔍] [🌙] [⚙] [JD] │
└─────────────────────────────────────────────┘
```

- **Left**: `PanelLeft` icon button (Lucide) — toggles sidebar collapse via `useSidebar().toggleSidebar()`
- **Right group**:
  - Search input (compact, expandable or fixed width)
  - Dark/light mode toggle (`Sun`/`Moon` icons, swaps on click)
  - Settings cog icon button (`Settings` icon)
  - Avatar circle with initials (from `useAuth().user`) — or "Login" button if unauthenticated

Height: ~48px. Background matches content area with bottom border.

## 5. AppSidebar Design

Full-height left panel using shadcn `Sidebar` component with `collapsible="icon"` variant.

### Expanded State (240px)

```
┌──────────────────┐
│ [A] Admin3       │  ← SidebarHeader (brand icon + name)
│     ActEd Store  │
├──────────────────┤
│ OVERVIEW         │  ← SidebarGroup label
│ 📊 Dashboard     │  ← SidebarMenuItem (active)
│                  │
│ CATALOG          │
│ 📚 Subjects      │
│ 📦 Products      │
│ 📅 Exam Sessions │
│                  │
│ STORE            │
│ 💰 Prices        │
│ 🎁 Bundles       │
│                  │
│ EMAIL            │
│ ✉️  Templates    │
│ 📤 Queue         │
│                  │
│ USERS            │
│ 👥 User List     │
│                  │
│ SETUP            │
│ 🔧 New Session   │
├──────────────────┤
│ [JD] John Doe    │  ← SidebarFooter (avatar + name + email)
│  admin@acted.co  │
└──────────────────┘
```

### Collapsed State (56px, icon-only)

```
┌────┐
│ [A]│
├────┤
│ 📊 │
│ 📚 │
│ 📦 │
│ 📅 │
│ 💰 │
│ 🎁 │
│ ✉️ │
│ 📤 │
│ 👥 │
│ 🔧 │
├────┤
│[JD]│
└────┘
```

Icons are Lucide React icons (already installed). Hover on collapsed items shows tooltip with label.

### Nav Items

All nav items are migrated 1:1 from the existing `AdminSidebar.tsx`. No items are dropped.

| Group | Item | Route | Icon |
|-------|------|-------|------|
| Overview | Dashboard | `/` | `LayoutDashboard` |
| Catalog | Subjects | `/admin/subjects` | `GraduationCap` |
| Catalog | Exam Sessions | `/admin/exam-sessions` | `CalendarDays` |
| Catalog | Products | `/admin/products` | `Package` |
| Catalog | ESS Links | `/admin/exam-session-subjects` | `Link` |
| Catalog | Variations | `/admin/product-variations` | `Layers` |
| Catalog | Product Bundles | `/admin/product-bundles` | `Gift` |
| Store | Store Products | `/admin/store-products` | `Store` |
| Store | Prices | `/admin/prices` | `DollarSign` |
| Store | Store Bundles | `/admin/store-bundles` | `BoxesIcon` |
| Store | Recommendations | `/admin/recommendations` | `Star` |
| Email System | Settings | `/admin/email/settings` | `Settings` |
| Email System | Templates | `/admin/email/templates` | `FileText` |
| Email System | Queue | `/admin/email/queue` | `ListOrdered` |
| Email System | Attachments | `/admin/email/attachments` | `Paperclip` |
| Email System | Content Rules | `/admin/email/content-rules` | `Scale` |
| Email System | Placeholders | `/admin/email/placeholders` | `Code` |
| Email System | Salutations | `/admin/email/closing-salutations` | `PenLine` |
| Users | User Profiles | `/admin/user-profiles` | `Users` |
| Users | Staff | `/admin/staff` | `BadgeCheck` |
| Setup | New Session Setup | `/admin/new-session-setup` | `SlidersHorizontal` |

Active state determined by `useLocation()` matching current route (`pathname === path || pathname.startsWith(path + '/')`).

## 6. Dark Mode Implementation

### DarkModeProvider

```typescript
interface DarkModeContext {
  mode: 'light' | 'dark';
  toggleMode: () => void;
}
```

- Reads initial value from `localStorage.getItem('admin-dark-mode')` (default: `'light'`)
- On toggle: flips mode, writes to localStorage, adds/removes `.dark` class on `.admin-root` element
- Exposes `useDarkMode()` hook for components

### CSS Mechanism

The existing `admin.css` already defines dark mode variables under `.admin-root.dark`. The toggle class approach works with zero CSS changes beyond updating variable values to the tweakcn palette.

### Toggle Button (AdminTopBar)

- Light mode: shows `Moon` icon (click to switch to dark)
- Dark mode: shows `Sun` icon (click to switch to light)
- Smooth icon swap, no page reload

## 7. Color Palette (tweakcn Theme)

All CSS variables in `admin.css` updated to oklch values from the tweakcn theme.

### Light Mode Variables

```css
.admin-root {
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
  --sidebar: oklch(0.9030 0.0046 258.3257);
  --sidebar-foreground: oklch(0.3211 0 0);
  --sidebar-primary: oklch(0.6397 0.1720 36.4421);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.9119 0.0222 243.8174);
  --sidebar-accent-foreground: oklch(0.3791 0.1378 265.5222);
  --sidebar-border: oklch(0.9276 0.0058 264.5313);
  --sidebar-ring: oklch(0.6397 0.1720 36.4421);
  --chart-1: oklch(0.7156 0.0605 248.6845);
  --chart-2: oklch(0.7875 0.0917 35.9616);
  --chart-3: oklch(0.5778 0.0759 254.1573);
  --chart-4: oklch(0.5016 0.0849 259.4902);
  --chart-5: oklch(0.4241 0.0952 264.0306);
}
```

### Dark Mode Variables

```css
.admin-root.dark {
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
  --sidebar: oklch(0.3100 0.0283 267.7408);
  --sidebar-foreground: oklch(0.9219 0 0);
  --sidebar-primary: oklch(0.6397 0.1720 36.4421);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.3380 0.0589 267.5867);
  --sidebar-accent-foreground: oklch(0.8823 0.0571 254.1284);
  --sidebar-border: oklch(0.3843 0.0301 269.7337);
  --sidebar-ring: oklch(0.6397 0.1720 36.4421);
  --chart-1: oklch(0.7156 0.0605 248.6845);
  --chart-2: oklch(0.7693 0.0876 34.1875);
  --chart-3: oklch(0.5778 0.0759 254.1573);
  --chart-4: oklch(0.5016 0.0849 259.4902);
  --chart-5: oklch(0.4241 0.0952 264.0306);
}
```

## 8. Routing Changes

### When `INTERNAL=true`

| Condition | Route `/` | Shell |
|-----------|-----------|-------|
| Unauthenticated | `<AdminLogin />` (centered login card, no shell) | None |
| Authenticated + Superuser | `<AdminLayout><Dashboard /></AdminLayout>` | Full sidebar + top bar |
| Authenticated + not Superuser | Redirect to `/` login (matches existing AdminLayout behavior) | None |

### When `INTERNAL=false`

No changes. Public storefront routes as today.

### App.js Modifications

- Add conditional route: `path="/"` checks `isInternal` from `ConfigContext`
- Add `<AdminLogin />` as lazy-loaded component
- Add `<Dashboard />` as lazy-loaded component inside `AdminLayout`

## 9. AdminLogin Page

Standalone page (no sidebar, no top bar). Centered card:

```
┌─────────────────────────┐
│                         │
│     [A] Admin3          │
│     Sign in to your     │
│     account             │
│                         │
│     ┌─────────────────┐ │
│     │ Email           │ │
│     └─────────────────┘ │
│     ┌─────────────────┐ │
│     │ Password        │ │
│     └─────────────────┘ │
│                         │
│     [  Sign In  ]       │
│                         │
└─────────────────────────┘
```

- Uses shadcn `Card`, `Input`, `Button`, `Label` components (all already installed)
- Calls `useAuth().login()` on submit
- Shows error message on failed login
- Redirects to `/` (Dashboard) on success
- Styled with tweakcn palette (dark background)

## 10. Dependencies

### New packages (installed via shadcn CLI)

```bash
npx shadcn@latest add sidebar
```

This installs the `sidebar.tsx` primitive into `src/components/admin/ui/`. Additional Radix dependencies (`@radix-ui/react-tooltip` for collapsed tooltips) will be auto-resolved.

### No additional Radix packages needed manually

The project already has `@radix-ui/react-dialog`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, and others. The sidebar component may pull in `@radix-ui/react-tooltip` if not present.

### Collapsible component

The sidebar uses shadcn's `Collapsible` for expandable nav groups. Install if not present:

```bash
npx shadcn@latest add collapsible tooltip
```

## 11. What Stays Unchanged

- All existing admin page components (subjects, products, exam sessions, etc.)
- Public store pages and all public routing
- Auth system (`useAuth`, `AuthProvider`, `authService`)
- Backend (`/api/config/` endpoint, Django settings)
- Redux store, RTK Query, filter system
- MUI theme for public storefront
