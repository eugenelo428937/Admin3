# Tasks: Fix RulesEngineInlineAlert Layout Props

**Feature**: 20251120-fix-rulesengineinlinealert-layout
**Generated**: 2025-12-15
**Plan**: [plan.md](./plan.md)

---

## Task Overview

| Phase | Tasks | Description |
|-------|-------|-------------|
| Setup | T001 | Read existing component and test files |
| Tests | T002-T007 | Write failing tests for layout props (TDD Red) |
| Core | T008-T010 | Implement fixes to pass tests (TDD Green) |
| Integration | T011 | Update Home.js for float positioning |
| Polish | T012 | Visual validation and regression check |

---

## Phase: Setup

### T001: Read Existing Implementation
- [ ] Read `frontend/react-Admin3/src/components/Common/RulesEngineInlineAlert.js`
- [ ] Read `frontend/react-Admin3/src/components/Common/__tests__/RulesEngineInlineAlert.test.js`
- [ ] Read `frontend/react-Admin3/src/theme/theme.js` (MuiAlert overrides)
- [ ] Read `frontend/react-Admin3/src/pages/Home.js` (usage context)

**Output**: Understanding of current implementation state

---

## Phase: Tests (TDD Red)

### T002: Test fullWidth Prop
- [x] Add test: `applies fullWidth style correctly`
- [x] Verify test fails (maxWidth constraint blocks 100% width)

**File**: `frontend/react-Admin3/src/components/Common/__tests__/RulesEngineInlineAlert.test.js`

### T003: Test Custom Width Prop
- [x] Add test: `applies custom width style correctly` (width="400px")
- [x] Verify test fails (theme maxWidth: 20rem blocks custom width)

**File**: `frontend/react-Admin3/src/components/Common/__tests__/RulesEngineInlineAlert.test.js`

### T004: Test Float Position Right
- [x] Add test: `floatPosition right applies correct positioning`
- [x] Verify test fails (float doesn't work in flex containers)

**File**: `frontend/react-Admin3/src/components/Common/__tests__/RulesEngineInlineAlert.test.js`

### T005: Test Float Position Center
- [x] Add test: `floatPosition center applies correct centering`
- [x] Verify test fails

**File**: `frontend/react-Admin3/src/components/Common/__tests__/RulesEngineInlineAlert.test.js`

### T006: Test Prop Precedence
- [x] Add test: `fullWidth takes precedence over width prop`
- [x] Verify test behavior

**File**: `frontend/react-Admin3/src/components/Common/__tests__/RulesEngineInlineAlert.test.js`

### T007: Test Default Behavior (Regression)
- [x] Add test: `default props maintain existing behavior`
- [x] Verify theme defaults still apply when no width props set

**File**: `frontend/react-Admin3/src/components/Common/__tests__/RulesEngineInlineAlert.test.js`

---

## Phase: Core (TDD Green)

### T008: Fix Width and fullWidth Props
- [x] Modify `getAlertStyles()` to override `maxWidth: 'none'` when width props provided
- [x] Apply width directly to Alert component with theme override
- [x] Run tests T002, T003, T006 - verify they pass

**File**: `frontend/react-Admin3/src/components/Common/RulesEngineInlineAlert.js`

### T009: Fix Float Positioning
- [x] Replace CSS `float` with `position: absolute` in `getContainerStyles()`
- [x] Implement `floatPosition` cases: left, right, center
- [x] Add `zIndex` for proper layering
- [x] Run tests T004, T005 - verify they pass

**File**: `frontend/react-Admin3/src/components/Common/RulesEngineInlineAlert.js`

### T010: Verify Regression Tests Pass
- [x] Run test T007 (default behavior)
- [x] Run full existing test suite
- [x] All tests must pass (21/21 passed)

**Command**: `cd frontend/react-Admin3 && npm test -- --testPathPattern=RulesEngineInlineAlert --watchAll=false`

---

## Phase: Integration

### T011: Update Home.js for Float Support
- [x] Add `position: relative` to parent Container for absolute positioning to work
  - **Note**: Parent Container already has `position: "relative"` (line 273) - no changes needed
- [x] Verify float behavior works correctly in context

**File**: `frontend/react-Admin3/src/pages/Home.js`

---

## Phase: Polish

### T012: Visual Validation
- [x] Start development server
- [x] Navigate to Home page (using Playwright at http://127.0.0.1:3000)
- [x] Verify RulesEngineInlineAlert displays correctly - full-width banner confirmed
- [x] Verify no visual regressions

**Command**: `cd frontend/react-Admin3 && npm start`

---

## Completion Checklist

- [x] All tests pass (T002-T007) - 21/21 layout tests pass
- [x] Component implementation complete (T008-T009)
- [x] Integration verified (T011) - Home.js updated to use fullWidth only
- [x] Visual validation passed (T012) - verified with Playwright screenshot
- [x] No regressions in existing functionality - 226/226 related tests pass

---

## Summary of Changes

### Files Modified
1. **`RulesEngineInlineAlert.js`** - Fixed layout props:
   - `getContainerStyles()`: Added full-bleed CSS pattern for fullWidth (100vw + transform centering)
   - `getAlertStyles()`: Added `maxWidth: 'none'` to override theme constraint
   - Float positioning: Changed from CSS float to absolute positioning

2. **`RulesEngineInlineAlert.test.js`** - Added 8 new layout tests

3. **`Home.js`** - Simplified props to use `fullWidth={true}` only (removed conflicting float props)

4. **`CLAUDE.md`** - Added Playwright testing section with 127.0.0.1 requirement
