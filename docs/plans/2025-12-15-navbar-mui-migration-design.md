# Navigation Bar Bootstrap to Material-UI Migration Design

**Date:** 2025-12-15
**Status:** Draft
**Author:** Brainstorming session with Claude

## Overview

Migrate the navigation system from Bootstrap (react-bootstrap) to Material-UI to achieve:

1. **Consistency** - Eliminate Bootstrap dependency, use only MUI
2. **Bundle Size** - Reduce JavaScript/CSS footprint (~60-70KB gzipped)
3. **Accessibility** - Implement proper ARIA attributes and keyboard navigation

## Scope

**In Scope:**
- MainNavBar.js
- NavigationMenu.js
- MobileNavigation.js
- TopNavBar.js (cleanup)
- Associated test files

**Out of Scope:**
- SearchModal, AuthModal, CartPanel (already MUI)
- NavbarBrand.js (no Bootstrap)
- MainNavActions.js (already MUI)

## Architecture

### Component Structure (Preserved)

```
MainNavBar.js (orchestrator - minimal changes)
├── TopNavBar.js (already mostly MUI - minor cleanup)
├── NavbarBrand.js (no Bootstrap - unchanged)
├── NavigationMenu.js (major changes - Popover mega-menus)
│   └── MegaMenuPopover.js (new - reusable popover wrapper)
├── MobileNavigation.js (moderate changes - MUI Drawer)
├── MainNavActions.js (already MUI - unchanged)
└── Modals (SearchModal, AuthModal, CartPanel - unchanged)
```

### Component Mapping

| File | Current Bootstrap | After Migration (MUI) |
|------|-------------------|----------------------|
| MainNavBar.js | `Navbar`, `Navbar.Collapse`, `Navbar.Toggle` | `AppBar`, `Toolbar`, `Collapse`, `IconButton` |
| NavigationMenu.js | `Nav`, `NavDropdown`, `Row`, `Col` | `Box`, `Button`, `Popover`, `Grid`, `MenuList`, `MenuItem` |
| MobileNavigation.js | `Nav` (mostly custom JSX) | `Drawer`, `List`, `ListItem`, `ListItemButton` |
| TopNavBar.js | `Button`, `NavDropdown` (imports) | Remove unused imports |

## Detailed Design

### 1. MainNavBar.js

**Current Bootstrap Structure:**
```jsx
<Navbar expand="md" expanded={expanded} onToggle={setExpanded} sticky="top">
  <Container>
    <NavbarBrand />
    <Navbar.Collapse id="navbar-menu">
      <NavigationMenu ... />
      <MobileNavigation ... />
    </Navbar.Collapse>
    <Navbar.Toggle aria-controls="navbar-menu" aria-label="Toggle navigation" />
  </Container>
</Navbar>
```

**New MUI Structure:**
```jsx
<AppBar position="sticky" component="nav" aria-label="Main navigation">
  <Toolbar>
    <NavbarBrand />

    {/* Desktop Navigation - hidden on mobile */}
    <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
      <NavigationMenu ... />
    </Box>

    {/* Mobile Hamburger */}
    <IconButton
      edge="end"
      aria-controls="mobile-menu"
      aria-label="Open navigation menu"
      aria-expanded={mobileOpen}
      onClick={() => setMobileOpen(!mobileOpen)}
      sx={{ display: { md: 'none' } }}
    >
      <MenuIcon />
    </IconButton>
  </Toolbar>
</AppBar>

{/* Mobile Navigation - Drawer instead of Collapse */}
<MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} ... />
```

**Key Changes:**
- `component="nav"` on AppBar for semantic HTML
- `aria-expanded` reflects menu state
- `aria-controls` links button to menu
- Responsive hiding via `sx` prop instead of Bootstrap classes

### 2. NavigationMenu.js - Popover Mega-Menus

**Current Bootstrap Pattern:**
```jsx
<NavDropdown title="Subjects" renderMenuOnMount={true}>
  <div className="dropdown-submenu">
    <Row>
      <Col xl={3}>Core Principles items...</Col>
      <Col xl={3}>Core Practices items...</Col>
      ...
    </Row>
  </div>
</NavDropdown>
```

**New MUI Pattern:**
```jsx
const [anchorEl, setAnchorEl] = useState(null);
const open = Boolean(anchorEl);

<Button
  aria-controls={open ? 'subjects-menu' : undefined}
  aria-haspopup="menu"
  aria-expanded={open ? 'true' : undefined}
  onClick={(e) => setAnchorEl(e.currentTarget)}
  onKeyDown={handleKeyDown}
  endIcon={<ExpandMoreIcon />}
>
  Subjects
</Button>

<Popover
  id="subjects-menu"
  open={open}
  anchorEl={anchorEl}
  onClose={() => setAnchorEl(null)}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
  role="menu"
  disableRestoreFocus={false}
>
  <Grid container spacing={2} sx={{ p: 2, maxWidth: 800 }}>
    <Grid item xs={3}>
      <Typography variant="subtitle2" id="core-principles-heading">
        Core Principles
      </Typography>
      <MenuList role="group" aria-labelledby="core-principles-heading">
        {subjects.filter(...).map(subject => (
          <MenuItem
            key={subject.id}
            onClick={() => handleSubjectClick(subject.code)}
            role="menuitem"
          >
            {subject.code} - {subject.description}
          </MenuItem>
        ))}
      </MenuList>
    </Grid>
    {/* ... more columns */}
  </Grid>
</Popover>
```

### 3. MegaMenuPopover.js (New Component)

Reusable wrapper for all mega-menu dropdowns:

```jsx
// components/Navigation/MegaMenuPopover.js
import React, { useState, useRef } from 'react';
import { Button, Popover, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const MegaMenuPopover = ({
  id,
  label,
  children,
  width = 800,
  onOpen,
  onClose
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const buttonRef = useRef(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    onOpen?.();
  };

  const handleClose = () => {
    setAnchorEl(null);
    onClose?.();
    // Return focus to button
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <>
      <Button
        ref={buttonRef}
        id={`${id}-button`}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleOpen}
        endIcon={<ExpandMoreIcon />}
      >
        {label}
      </Button>
      <Popover
        id={`${id}-menu`}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        onKeyDown={handleKeyDown}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        aria-labelledby={`${id}-button`}
        disableRestoreFocus={false}
        slotProps={{
          paper: {
            sx: { maxWidth: width, mt: 1 }
          }
        }}
      >
        <Box sx={{ p: 2 }} role="menu">
          {children}
        </Box>
      </Popover>
    </>
  );
};

export default MegaMenuPopover;
```

### 4. MobileNavigation.js - MUI Drawer

**Current Custom Pattern:**
```jsx
<div className={`mobile-navigation-container ${open ? "open" : ""}`}>
  <div className="mobile-nav-backdrop" onClick={closeNavigation} />
  <div className="mobile-nav-panel slide-right">
    <ul className="mobile-nav-list">
      <li className="mobile-nav-list-item">
        <div className="mobile-nav-link" onClick={...}>
          <span>Subjects</span>
          <ExpandMore />
        </div>
      </li>
    </ul>
  </div>
</div>
```

**New MUI Pattern:**
```jsx
<Drawer
  anchor="right"
  open={open}
  onClose={onClose}
  aria-label="Navigation menu"
  ModalProps={{
    keepMounted: true, // Better mobile performance
  }}
  sx={{
    '& .MuiDrawer-paper': { width: '85%', maxWidth: 360 },
  }}
>
  {/* Header with actions */}
  <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
    <IconButton onClick={navigateBack} aria-label="Go back">
      <NavigateBefore />
    </IconButton>
    <IconButton onClick={onOpenSearch} aria-label="Search">
      <Search />
    </IconButton>
    <IconButton onClick={onOpenCart} aria-label="Shopping cart">
      <Badge badgeContent={cartCount} color="primary">
        <ShoppingCartOutlined />
      </Badge>
    </IconButton>
    <IconButton onClick={onOpenAuth} aria-label={isAuthenticated ? "Profile" : "Login"}>
      {isAuthenticated ? <AccountCircle /> : <Login />}
    </IconButton>
  </Box>

  {/* Navigation List */}
  <List component="nav" aria-label="Main navigation">
    <ListItem disablePadding>
      <ListItemButton onClick={() => navigateToPanel('subjects', 'Subjects')}>
        <ListItemText primary="Subjects" />
        <ExpandMore />
      </ListItemButton>
    </ListItem>
    {/* ... more items */}
  </List>
</Drawer>
```

**Navigation Stack Preserved:**
The existing `navigationStack` state pattern for drill-down panels is preserved. Transitions between panels can use MUI's `Slide` component.

### 5. Keyboard Navigation Hook

```jsx
// hooks/useMenuKeyboardNav.js
import { useState, useCallback } from 'react';

const useMenuKeyboardNav = (itemCount, onClose, onSelect) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, itemCount - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(itemCount - 1);
        break;
      case 'Escape':
        event.preventDefault();
        onClose?.();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(focusedIndex);
        break;
      case 'Tab':
        // Allow natural tab behavior but close menu
        onClose?.();
        break;
      default:
        break;
    }
  }, [itemCount, onClose, onSelect, focusedIndex]);

  const resetFocus = useCallback(() => {
    setFocusedIndex(0);
  }, []);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    resetFocus
  };
};

export default useMenuKeyboardNav;
```

## Accessibility Implementation

### ARIA Attributes Summary

| Element | Attributes |
|---------|-----------|
| AppBar | `component="nav"`, `aria-label="Main navigation"` |
| Menu trigger button | `aria-controls`, `aria-haspopup="menu"`, `aria-expanded` |
| Popover | `role="menu"`, `aria-labelledby` |
| Menu column group | `role="group"`, `aria-labelledby` |
| MenuItem | `role="menuitem"`, `tabIndex={-1}` (managed focus) |
| Drawer | `aria-label="Navigation menu"` |
| Mobile back button | `aria-label="Go back to previous menu"` |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Enter` / `Space` | Open menu (on button) / Select item (in menu) |
| `Escape` | Close menu, return focus to trigger |
| `Arrow Down` | Move to next item |
| `Arrow Up` | Move to previous item |
| `Home` | Move to first item |
| `End` | Move to last item |
| `Tab` | Close menu, move to next focusable element |

### Focus Management

| Action | Focus Behavior |
|--------|----------------|
| Open menu (click/Enter) | Focus moves to first menu item |
| Close menu (Escape/click-away) | Focus returns to trigger button |
| Select item (Enter/click) | Menu closes, focus returns to button |
| Mobile Drawer open | Focus trapped inside drawer |
| Mobile Drawer close | Focus returns to hamburger button |

## Testing Strategy

### Test Types

| Test Type | Tools | Coverage |
|-----------|-------|----------|
| Unit Tests | Jest, React Testing Library | Component rendering, state management |
| Accessibility Tests | jest-axe | ARIA compliance, color contrast |
| Keyboard Navigation | RTL userEvent | Arrow keys, Escape, Tab behaviors |
| Responsive Tests | Mock useMediaQuery | Mobile/desktop rendering |

### Example Test Cases

```jsx
// NavigationMenu.test.js
import { axe, toHaveNoViolations } from 'jest-axe';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

expect.extend(toHaveNoViolations);

describe('NavigationMenu', () => {
  test('has no accessibility violations', async () => {
    const { container } = render(<NavigationMenu {...props} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('opens menu on Enter key', async () => {
    render(<NavigationMenu {...props} />);
    const button = screen.getByRole('button', { name: /subjects/i });

    button.focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  test('closes menu on Escape and returns focus', async () => {
    render(<NavigationMenu {...props} />);
    const button = screen.getByRole('button', { name: /subjects/i });

    await userEvent.click(button);
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  test('arrow keys navigate menu items', async () => {
    render(<NavigationMenu {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /subjects/i }));

    const items = screen.getAllByRole('menuitem');
    await userEvent.keyboard('{ArrowDown}');

    expect(items[0]).toHaveFocus();
  });
});
```

## Bundle Impact

| Item | Before | After |
|------|--------|-------|
| react-bootstrap | ~45KB gzipped | Removed |
| bootstrap CSS | ~25KB gzipped | Removed |
| MUI (already included) | - | No change |
| **Net Reduction** | | **~60-70KB gzipped** |

## Files to Modify/Create

| Action | File |
|--------|------|
| Modify | `src/components/Navigation/MainNavBar.js` |
| Modify | `src/components/Navigation/NavigationMenu.js` |
| Modify | `src/components/Navigation/MobileNavigation.js` |
| Modify | `src/components/Navigation/TopNavBar.js` |
| Create | `src/components/Navigation/MegaMenuPopover.js` |
| Create | `src/hooks/useMenuKeyboardNav.js` |
| Update | `src/components/Navigation/__tests__/*.test.js` |
| Remove | Bootstrap imports from `package.json` |
| Remove | Bootstrap CSS imports from entry point |

## Migration Steps

1. **Create new components first**
   - `MegaMenuPopover.js`
   - `useMenuKeyboardNav.js`

2. **Migrate NavigationMenu.js**
   - Replace NavDropdown with MegaMenuPopover
   - Replace Row/Col with Grid
   - Add keyboard navigation
   - Update tests

3. **Migrate MobileNavigation.js**
   - Replace custom slide-in with Drawer
   - Replace custom lists with MUI List components
   - Preserve navigation stack logic
   - Update tests

4. **Migrate MainNavBar.js**
   - Replace Navbar with AppBar/Toolbar
   - Remove Navbar.Collapse (use responsive sx)
   - Replace Navbar.Toggle with IconButton
   - Update tests

5. **Cleanup**
   - Remove Bootstrap imports from TopNavBar.js
   - Remove react-bootstrap from package.json
   - Remove Bootstrap CSS imports
   - Run full test suite
   - Accessibility audit with axe

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Mega-menu styling differences | Create style reference screenshots before migration |
| Keyboard nav edge cases | Comprehensive test coverage for all key combinations |
| Focus management bugs | Test with screen readers (NVDA, VoiceOver) |
| Bundle size regression | Verify with `npm run build` bundle analysis |

## Success Criteria

- [ ] All existing tests pass
- [ ] No accessibility violations (jest-axe)
- [ ] Keyboard navigation works for all menus
- [ ] Focus management correct for open/close
- [ ] Bundle size reduced by ~60KB
- [ ] Visual appearance matches current design
- [ ] Screen reader testing passes (NVDA/VoiceOver)
