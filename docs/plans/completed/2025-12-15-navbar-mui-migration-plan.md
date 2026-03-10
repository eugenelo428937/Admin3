# Navigation Bootstrap to MUI Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all Bootstrap navigation components with Material-UI equivalents while preserving functionality, improving accessibility, and reducing bundle size by ~60KB.

**Architecture:** Migrate incrementally by component - create shared utilities first (keyboard nav hook, MegaMenuPopover), then migrate NavigationMenu (most complex), MobileNavigation, and finally MainNavBar. Each component is migrated with its tests.

**Tech Stack:** React 19.2, Material-UI v7 (AppBar, Toolbar, Popover, Drawer, Menu, List), React Router v6, Jest + React Testing Library + jest-axe

---

## Prerequisites

Before starting, ensure you have:
- Node.js and npm installed
- Access to `frontend/react-Admin3/` directory
- Dev server can run: `npm start`
- Tests can run: `npm test`

---

## Task 1: Create Keyboard Navigation Hook

**Files:**
- Create: `frontend/react-Admin3/src/hooks/useMenuKeyboardNav.js`
- Create: `frontend/react-Admin3/src/hooks/__tests__/useMenuKeyboardNav.test.js`

**Step 1: Write the failing test**

Create the test file:

```javascript
// frontend/react-Admin3/src/hooks/__tests__/useMenuKeyboardNav.test.js
import { renderHook, act } from '@testing-library/react';
import useMenuKeyboardNav from '../useMenuKeyboardNav';

describe('useMenuKeyboardNav', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with focusedIndex 0', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );
    expect(result.current.focusedIndex).toBe(0);
  });

  test('ArrowDown increments focusedIndex', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowDown',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(1);
  });

  test('ArrowDown does not exceed itemCount - 1', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(3, mockOnClose, mockOnSelect)
    );

    // Move to last item
    act(() => {
      result.current.setFocusedIndex(2);
    });

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowDown',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(2);
  });

  test('ArrowUp decrements focusedIndex', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.setFocusedIndex(2);
    });

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowUp',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(1);
  });

  test('ArrowUp does not go below 0', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowUp',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(0);
  });

  test('Home moves to first item', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.setFocusedIndex(3);
    });

    act(() => {
      result.current.handleKeyDown({
        key: 'Home',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(0);
  });

  test('End moves to last item', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({
        key: 'End',
        preventDefault: jest.fn()
      });
    });

    expect(result.current.focusedIndex).toBe(4);
  });

  test('Escape calls onClose', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({
        key: 'Escape',
        preventDefault: jest.fn()
      });
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('Enter calls onSelect with focusedIndex', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.setFocusedIndex(2);
    });

    act(() => {
      result.current.handleKeyDown({
        key: 'Enter',
        preventDefault: jest.fn()
      });
    });

    expect(mockOnSelect).toHaveBeenCalledWith(2);
  });

  test('Space calls onSelect with focusedIndex', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({
        key: ' ',
        preventDefault: jest.fn()
      });
    });

    expect(mockOnSelect).toHaveBeenCalledWith(0);
  });

  test('Tab calls onClose', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.handleKeyDown({ key: 'Tab' });
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('resetFocus sets focusedIndex to 0', () => {
    const { result } = renderHook(() =>
      useMenuKeyboardNav(5, mockOnClose, mockOnSelect)
    );

    act(() => {
      result.current.setFocusedIndex(3);
    });

    act(() => {
      result.current.resetFocus();
    });

    expect(result.current.focusedIndex).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=useMenuKeyboardNav --watchAll=false`

Expected: FAIL with "Cannot find module '../useMenuKeyboardNav'"

**Step 3: Write minimal implementation**

```javascript
// frontend/react-Admin3/src/hooks/useMenuKeyboardNav.js
import { useState, useCallback } from 'react';

/**
 * Hook for keyboard navigation in menus.
 * Handles arrow keys, Home/End, Escape, Enter/Space, and Tab.
 *
 * @param {number} itemCount - Total number of items in the menu
 * @param {function} onClose - Callback when menu should close
 * @param {function} onSelect - Callback when item is selected, receives focusedIndex
 * @returns {object} { focusedIndex, setFocusedIndex, handleKeyDown, resetFocus }
 */
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

**Step 4: Run test to verify it passes**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=useMenuKeyboardNav --watchAll=false`

Expected: All 12 tests PASS

**Step 5: Commit**

```bash
cd frontend/react-Admin3
git add src/hooks/useMenuKeyboardNav.js src/hooks/__tests__/useMenuKeyboardNav.test.js
git commit -m "feat(navigation): add keyboard navigation hook for menus"
```

---

## Task 2: Create MegaMenuPopover Component

**Files:**
- Create: `frontend/react-Admin3/src/components/Navigation/MegaMenuPopover.js`
- Create: `frontend/react-Admin3/src/components/Navigation/__tests__/MegaMenuPopover.test.js`

**Step 1: Write the failing test**

```javascript
// frontend/react-Admin3/src/components/Navigation/__tests__/MegaMenuPopover.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { axe, toHaveNoViolations } from 'jest-axe';
import MegaMenuPopover from '../MegaMenuPopover';

expect.extend(toHaveNoViolations);

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MegaMenuPopover', () => {
  const defaultProps = {
    id: 'test-menu',
    label: 'Test Menu',
    children: <div data-testid="menu-content">Menu Content</div>,
  };

  test('renders trigger button with label', () => {
    renderWithTheme(<MegaMenuPopover {...defaultProps} />);
    expect(screen.getByRole('button', { name: /test menu/i })).toBeInTheDocument();
  });

  test('menu is closed by default', () => {
    renderWithTheme(<MegaMenuPopover {...defaultProps} />);
    expect(screen.queryByTestId('menu-content')).not.toBeInTheDocument();
  });

  test('opens menu on button click', async () => {
    renderWithTheme(<MegaMenuPopover {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: /test menu/i }));

    expect(screen.getByTestId('menu-content')).toBeInTheDocument();
  });

  test('closes menu on click away', async () => {
    renderWithTheme(
      <div>
        <MegaMenuPopover {...defaultProps} />
        <button>Outside</button>
      </div>
    );

    await userEvent.click(screen.getByRole('button', { name: /test menu/i }));
    expect(screen.getByTestId('menu-content')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /outside/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('menu-content')).not.toBeInTheDocument();
    });
  });

  test('closes menu on Escape key', async () => {
    renderWithTheme(<MegaMenuPopover {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: /test menu/i }));
    expect(screen.getByTestId('menu-content')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByTestId('menu-content')).not.toBeInTheDocument();
    });
  });

  test('has correct aria-controls when closed', () => {
    renderWithTheme(<MegaMenuPopover {...defaultProps} />);
    const button = screen.getByRole('button', { name: /test menu/i });

    expect(button).not.toHaveAttribute('aria-controls');
  });

  test('has correct aria-controls when open', async () => {
    renderWithTheme(<MegaMenuPopover {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: /test menu/i }));

    const button = screen.getByRole('button', { name: /test menu/i });
    expect(button).toHaveAttribute('aria-controls', 'test-menu-popover');
  });

  test('has aria-haspopup="true"', () => {
    renderWithTheme(<MegaMenuPopover {...defaultProps} />);
    const button = screen.getByRole('button', { name: /test menu/i });

    expect(button).toHaveAttribute('aria-haspopup', 'true');
  });

  test('aria-expanded is false when closed', () => {
    renderWithTheme(<MegaMenuPopover {...defaultProps} />);
    const button = screen.getByRole('button', { name: /test menu/i });

    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('aria-expanded is true when open', async () => {
    renderWithTheme(<MegaMenuPopover {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: /test menu/i }));

    const button = screen.getByRole('button', { name: /test menu/i });
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  test('calls onOpen when menu opens', async () => {
    const onOpen = jest.fn();
    renderWithTheme(<MegaMenuPopover {...defaultProps} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button', { name: /test menu/i }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when menu closes', async () => {
    const onClose = jest.fn();
    renderWithTheme(<MegaMenuPopover {...defaultProps} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /test menu/i }));
    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  test('has no accessibility violations when closed', async () => {
    const { container } = renderWithTheme(<MegaMenuPopover {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('has no accessibility violations when open', async () => {
    const { container } = renderWithTheme(<MegaMenuPopover {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: /test menu/i }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=MegaMenuPopover --watchAll=false`

Expected: FAIL with "Cannot find module '../MegaMenuPopover'"

**Step 3: Write minimal implementation**

```javascript
// frontend/react-Admin3/src/components/Navigation/MegaMenuPopover.js
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Popover, Box, Typography, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/**
 * Reusable mega-menu popover component with full accessibility support.
 * Handles open/close state, ARIA attributes, and keyboard navigation.
 */
const MegaMenuPopover = ({
  id,
  label,
  children,
  width = 800,
  onOpen,
  onClose,
  buttonProps = {},
  popoverProps = {},
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const buttonRef = useRef(null);
  const theme = useTheme();
  const open = Boolean(anchorEl);
  const popoverId = `${id}-popover`;

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    onOpen?.();
  };

  const handleClose = () => {
    setAnchorEl(null);
    onClose?.();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      handleClose();
      buttonRef.current?.focus();
    }
  };

  return (
    <>
      <Button
        ref={buttonRef}
        id={`${id}-button`}
        aria-controls={open ? popoverId : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleOpen}
        endIcon={<ExpandMoreIcon />}
        sx={{
          color: theme.palette.offwhite?.['000'] || 'inherit',
          textTransform: 'none',
          ...buttonProps.sx,
        }}
        {...buttonProps}
      >
        <Typography variant="navlink">
          {label}
        </Typography>
      </Button>
      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        onKeyDown={handleKeyDown}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        disableRestoreFocus={false}
        slotProps={{
          paper: {
            sx: {
              maxWidth: width,
              mt: 1,
            },
          },
        }}
        {...popoverProps}
      >
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      </Popover>
    </>
  );
};

MegaMenuPopover.propTypes = {
  /** Unique identifier for the menu (used for ARIA) */
  id: PropTypes.string.isRequired,
  /** Button label text */
  label: PropTypes.string.isRequired,
  /** Menu content */
  children: PropTypes.node.isRequired,
  /** Maximum width of the popover */
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /** Callback when menu opens */
  onOpen: PropTypes.func,
  /** Callback when menu closes */
  onClose: PropTypes.func,
  /** Additional props for the Button component */
  buttonProps: PropTypes.object,
  /** Additional props for the Popover component */
  popoverProps: PropTypes.object,
};

export default MegaMenuPopover;
```

**Step 4: Run test to verify it passes**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=MegaMenuPopover --watchAll=false`

Expected: All 14 tests PASS

**Step 5: Commit**

```bash
cd frontend/react-Admin3
git add src/components/Navigation/MegaMenuPopover.js src/components/Navigation/__tests__/MegaMenuPopover.test.js
git commit -m "feat(navigation): add MegaMenuPopover component with a11y"
```

---

## Task 3: Install jest-axe for Accessibility Testing

**Files:**
- Modify: `frontend/react-Admin3/package.json`

**Step 1: Check if jest-axe is already installed**

Run: `cd frontend/react-Admin3 && npm ls jest-axe`

Expected: Either "jest-axe@x.x.x" (already installed) or "empty" (not installed)

**Step 2: Install jest-axe if not present**

Run: `cd frontend/react-Admin3 && npm install --save-dev jest-axe`

**Step 3: Verify installation**

Run: `cd frontend/react-Admin3 && npm ls jest-axe`

Expected: "jest-axe@x.x.x"

**Step 4: Commit**

```bash
cd frontend/react-Admin3
git add package.json package-lock.json
git commit -m "chore: add jest-axe for accessibility testing"
```

---

## Task 4: Migrate NavigationMenu - Replace Nav with Box

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/NavigationMenu.js`
- Modify: `frontend/react-Admin3/src/components/Navigation/__tests__/NavigationMenu.test.js`

**Step 1: Update imports in NavigationMenu.js**

Replace the Bootstrap imports at the top of the file:

```javascript
// REMOVE these lines:
// import { Nav, NavDropdown, Row, Col } from "react-bootstrap";

// ADD these lines:
import { Box, Grid, MenuList, MenuItem, Typography, useTheme } from '@mui/material';
import MegaMenuPopover from './MegaMenuPopover';
```

**Step 2: Replace outer Nav with Box**

Replace the outer `<Nav>` element:

```javascript
// BEFORE:
<Nav className="navbar-nav px-md-2 px-lg-2 flex-wrap d-none d-md-flex align-items-center justify-content-lg-evenly justify-content-xs-start">

// AFTER:
<Box
  component="nav"
  aria-label="Main navigation"
  sx={{
    display: { xs: 'none', md: 'flex' },
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: { xs: 'flex-start', lg: 'space-evenly' },
    px: { md: 2, lg: 2 },
  }}
>
```

Also update the closing tag from `</Nav>` to `</Box>`.

**Step 3: Run existing tests to ensure no regression**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=NavigationMenu --watchAll=false`

Expected: Tests should still pass (may need adjustment for component queries)

**Step 4: Commit**

```bash
cd frontend/react-Admin3
git add src/components/Navigation/NavigationMenu.js
git commit -m "refactor(navigation): replace Bootstrap Nav with MUI Box"
```

---

## Task 5: Migrate NavigationMenu - Replace Home Nav.Link

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/NavigationMenu.js`

**Step 1: Replace Home Nav.Link with MUI Button**

Find and replace the Home link:

```javascript
// BEFORE:
<Nav.Link as={NavLink} to="/home" className="mt-0 mt-lg-1">
   <Typography variant="navlink" color={theme.palette.offwhite["000"]} className="px-2 px-xl-4">
      Home
   </Typography>
</Nav.Link>

// AFTER:
import { Button } from '@mui/material';
import { NavLink } from 'react-router-dom';

<Button
  component={NavLink}
  to="/home"
  sx={{
    color: theme.palette.offwhite?.['000'] || 'inherit',
    textTransform: 'none',
    mt: { xs: 0, lg: 1 },
    px: { xs: 2, xl: 4 },
  }}
>
  <Typography variant="navlink">
    Home
  </Typography>
</Button>
```

**Step 2: Run tests**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=NavigationMenu --watchAll=false`

Expected: PASS

**Step 3: Commit**

```bash
cd frontend/react-Admin3
git add src/components/Navigation/NavigationMenu.js
git commit -m "refactor(navigation): replace Home Nav.Link with MUI Button"
```

---

## Task 6: Migrate NavigationMenu - Subjects Dropdown

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/NavigationMenu.js`

**Step 1: Replace Subjects NavDropdown with MegaMenuPopover**

Find the Subjects NavDropdown and replace:

```javascript
// BEFORE:
<NavDropdown
   title={<Typography variant="navlink" color={theme.palette.offwhite["000"]}>Subjects</Typography>}
   menuVariant="light"
   renderMenuOnMount={true}
   align="start"
   style={{ position: "relative" }}
   className="mx-xl-2"
>
   <div className="dropdown-submenu">
      <Row>
         <Col xl={3}>
            <div className="mb-2 text-primary heading">Core Principles</div>
            {subjects && subjects.filter((s) => /^(CB|CS|CM)/.test(s.code)).map((subject) => (
               <NavDropdown.Item key={subject.id} onClick={() => { handleSubjectClick(subject.code); onCollapseNavbar && onCollapseNavbar(); }}>
                  <span>{subject.code} - {subject.description}</span>
               </NavDropdown.Item>
            ))}
         </Col>
         {/* ... other columns */}
      </Row>
   </div>
</NavDropdown>

// AFTER:
<MegaMenuPopover
  id="subjects"
  label="Subjects"
  width={900}
  onClose={onCollapseNavbar}
>
  <Grid container spacing={2}>
    <Grid item xs={12} xl={3}>
      <Typography
        variant="subtitle2"
        color="primary"
        sx={{ mb: 1, fontWeight: 'bold' }}
        id="core-principles-heading"
      >
        Core Principles
      </Typography>
      <MenuList dense aria-labelledby="core-principles-heading">
        {subjects &&
          subjects
            .filter((s) => /^(CB|CS|CM)/.test(s.code))
            .map((subject) => (
              <MenuItem
                key={subject.id}
                onClick={() => {
                  handleSubjectClick(subject.code);
                  onCollapseNavbar?.();
                }}
              >
                {subject.code} - {subject.description}
              </MenuItem>
            ))}
      </MenuList>
    </Grid>
    <Grid item xs={12} xl={3}>
      <Typography
        variant="subtitle2"
        color="primary"
        sx={{ mb: 1, fontWeight: 'bold' }}
        id="core-practices-heading"
      >
        Core Practices
      </Typography>
      <MenuList dense aria-labelledby="core-practices-heading">
        {subjects &&
          subjects
            .filter((s) => /^CP[1-3]$/.test(s.code))
            .map((subject) => (
              <MenuItem
                key={subject.id}
                onClick={() => {
                  handleSubjectClick(subject.code);
                  onCollapseNavbar?.();
                }}
              >
                {subject.code} - {subject.description}
              </MenuItem>
            ))}
      </MenuList>
    </Grid>
    <Grid item xs={12} xl={3}>
      <Typography
        variant="subtitle2"
        color="primary"
        sx={{ mb: 1, fontWeight: 'bold' }}
        id="specialist-principles-heading"
      >
        Specialist Principles
      </Typography>
      <MenuList dense aria-labelledby="specialist-principles-heading">
        {subjects &&
          subjects
            .filter((s) => /^SP/.test(s.code))
            .map((subject) => (
              <MenuItem
                key={subject.id}
                onClick={() => {
                  handleSubjectClick(subject.code);
                  onCollapseNavbar?.();
                }}
              >
                {subject.code} - {subject.description}
              </MenuItem>
            ))}
      </MenuList>
    </Grid>
    <Grid item xs={12} xl={3}>
      <Typography
        variant="subtitle2"
        color="primary"
        sx={{ mb: 1, fontWeight: 'bold' }}
        id="specialist-advanced-heading"
      >
        Specialist Advanced
      </Typography>
      <MenuList dense aria-labelledby="specialist-advanced-heading">
        {subjects &&
          subjects
            .filter((s) => /^SA/.test(s.code))
            .map((subject) => (
              <MenuItem
                key={subject.id}
                onClick={() => {
                  handleSubjectClick(subject.code);
                  onCollapseNavbar?.();
                }}
              >
                {subject.code} - {subject.description}
              </MenuItem>
            ))}
      </MenuList>
    </Grid>
  </Grid>
</MegaMenuPopover>
```

**Step 2: Run tests**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=NavigationMenu --watchAll=false`

Expected: PASS (may need test updates for new structure)

**Step 3: Commit**

```bash
cd frontend/react-Admin3
git add src/components/Navigation/NavigationMenu.js
git commit -m "refactor(navigation): migrate Subjects dropdown to MegaMenuPopover"
```

---

## Task 7: Migrate NavigationMenu - Products Dropdown

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/NavigationMenu.js`

**Step 1: Replace Products NavDropdown with MegaMenuPopover**

This is a larger dropdown with dynamic columns. Replace the Products NavDropdown similarly to Subjects, but preserve the dynamic column rendering logic.

**Step 2: Run tests**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=NavigationMenu --watchAll=false`

**Step 3: Commit**

```bash
git commit -m "refactor(navigation): migrate Products dropdown to MegaMenuPopover"
```

---

## Task 8: Migrate NavigationMenu - Distance Learning Dropdown

Similar pattern to Task 7.

---

## Task 9: Migrate NavigationMenu - Tutorials Dropdown

Similar pattern to Task 7.

---

## Task 10: Migrate NavigationMenu - Admin Dropdown

Similar pattern but simpler (no mega-menu, just basic dropdown).

---

## Task 11: Migrate NavigationMenu - Apprenticeships and Study Plus Links

Replace remaining `Nav.Link` components with MUI `Button`.

---

## Task 12: Update NavigationMenu Tests

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/__tests__/NavigationMenu.test.js`

**Step 1: Update test queries for MUI components**

Update tests to query for MUI Button/MenuItem components instead of Bootstrap Nav/NavDropdown.

**Step 2: Add accessibility tests**

```javascript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('NavigationMenu has no accessibility violations', async () => {
  const { container } = render(<NavigationMenu {...defaultProps} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Step 3: Run tests**

Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern=NavigationMenu --watchAll=false`

**Step 4: Commit**

```bash
git commit -m "test(navigation): update NavigationMenu tests for MUI migration"
```

---

## Task 13: Migrate MobileNavigation - Replace Custom Drawer with MUI Drawer

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/MobileNavigation.js`

**Step 1: Update imports**

```javascript
// ADD:
import { Drawer, List, ListItem, ListItemButton, ListItemText, Box, Divider } from '@mui/material';
```

**Step 2: Replace custom drawer structure with MUI Drawer**

Replace the outer structure:

```javascript
// BEFORE:
<div className={`mobile-navigation-container ${open ? "open" : ""}`}>
  <div className="mobile-nav-backdrop" onClick={closeNavigation}></div>
  <div className={`mobile-nav-panel slide-right ${open ? "active" : ""}`}>
    {renderCurrentPanel()}
  </div>
</div>

// AFTER:
<Drawer
  anchor="right"
  open={open}
  onClose={closeNavigation}
  aria-label="Navigation menu"
  ModalProps={{
    keepMounted: true,
  }}
  sx={{
    '& .MuiDrawer-paper': {
      width: '85%',
      maxWidth: 360,
      backgroundColor: 'primary.main',
    },
  }}
>
  {renderCurrentPanel()}
</Drawer>
```

**Step 3: Replace ul/li with MUI List components**

In each panel, replace:

```javascript
// BEFORE:
<ul className="mobile-nav-list">
  <li className="mobile-nav-list-item">
    <div className="mobile-nav-link" onClick={...}>
      <span>Subjects</span>
      <ExpandMore />
    </div>
  </li>
</ul>

// AFTER:
<List component="nav">
  <ListItem disablePadding>
    <ListItemButton onClick={...}>
      <ListItemText primary="Subjects" />
      <ExpandMore />
    </ListItemButton>
  </ListItem>
</List>
```

**Step 4: Run tests**

**Step 5: Commit**

```bash
git commit -m "refactor(navigation): migrate MobileNavigation to MUI Drawer"
```

---

## Task 14: Update MobileNavigation Tests

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/__tests__/MobileNavigation.test.js`

Update tests for MUI components and add accessibility tests.

---

## Task 15: Migrate MainNavBar - Replace Navbar with AppBar

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/MainNavBar.js`

**Step 1: Update imports**

```javascript
// REMOVE:
// import { Navbar } from "react-bootstrap";

// ADD:
import { AppBar, Toolbar, IconButton, Box, Collapse } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
```

**Step 2: Replace Navbar with AppBar structure**

**Step 3: Replace Navbar.Toggle with IconButton**

**Step 4: Update responsive hiding to use sx prop**

**Step 5: Run tests and commit**

---

## Task 16: Update MainNavBar Tests

Update tests for MUI components.

---

## Task 17: Cleanup TopNavBar - Remove Unused Bootstrap Imports

**Files:**
- Modify: `frontend/react-Admin3/src/components/Navigation/TopNavBar.js`

Remove any remaining Bootstrap imports that are no longer used.

---

## Task 18: Remove Bootstrap Dependencies

**Files:**
- Modify: `frontend/react-Admin3/package.json`
- Modify: Entry point files (App.js or index.js)

**Step 1: Remove Bootstrap CSS import**

Find and remove:
```javascript
import 'bootstrap/dist/css/bootstrap.min.css';
```

**Step 2: Uninstall Bootstrap packages**

```bash
cd frontend/react-Admin3
npm uninstall react-bootstrap bootstrap
```

**Step 3: Run full test suite**

```bash
npm test -- --watchAll=false
```

**Step 4: Run the application and verify**

```bash
npm start
```

**Step 5: Commit**

```bash
git add package.json package-lock.json src/
git commit -m "chore: remove Bootstrap dependencies"
```

---

## Task 19: Final Accessibility Audit

**Step 1: Run all accessibility tests**

```bash
cd frontend/react-Admin3
npm test -- --testPathPattern=Navigation --watchAll=false
```

**Step 2: Manual screen reader testing**

Test with NVDA (Windows) or VoiceOver (Mac):
- Navigate to each dropdown with Tab
- Open dropdown with Enter/Space
- Navigate items with Arrow keys
- Close with Escape
- Verify focus returns to trigger button

**Step 3: Document any issues found**

---

## Task 20: Bundle Size Verification

**Step 1: Build production bundle**

```bash
cd frontend/react-Admin3
npm run build
```

**Step 2: Compare bundle size**

Check the output and compare with previous build size. Expected reduction: ~60-70KB gzipped.

**Step 3: Commit final changes**

```bash
git commit -m "docs: complete MUI navigation migration"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|----------------|
| 1 | Create useMenuKeyboardNav hook | 15 min |
| 2 | Create MegaMenuPopover component | 20 min |
| 3 | Install jest-axe | 5 min |
| 4-5 | NavigationMenu - Nav and Home link | 15 min |
| 6-11 | NavigationMenu - All dropdowns | 45 min |
| 12 | Update NavigationMenu tests | 15 min |
| 13-14 | MobileNavigation migration | 30 min |
| 15-16 | MainNavBar migration | 20 min |
| 17-18 | Cleanup and remove Bootstrap | 15 min |
| 19-20 | Final audit and verification | 20 min |

**Total: ~3.5 hours**
