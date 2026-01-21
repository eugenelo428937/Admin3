# Implementation Plan: Fix RulesEngineInlineAlert Layout Props

**Branch**: `20251120-fix-rulesengineinlinealert-layout` | **Date**: 2025-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/20251120-fix-rulesengineinlinealert-layout/spec.md`

---

## Summary

Fix the RulesEngineInlineAlert component's layout props (`fullWidth`, `float`, `floatPosition`, `width`) which are not working due to theme interference. The global MuiAlert theme override with `maxWidth: "20rem"` takes precedence over inline styles, and the CSS float implementation doesn't work correctly in the current container structure.

**Technical Approach**:
1. Override the theme's maxWidth constraint within the component using sx prop with higher specificity
2. Ensure width props apply directly to the Alert component, not just the container
3. Re-evaluate float behavior - may need absolute positioning or flexbox-based approach instead of CSS float

---

## Technical Context

**Language/Version**: JavaScript ES6+ / React 18
**Primary Dependencies**: Material-UI v5, React
**Storage**: N/A
**Testing**: Jest, React Testing Library
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web (frontend)
**Performance Goals**: No visible render delay; instant layout changes
**Constraints**: Must maintain backward compatibility with existing usages
**Scale/Scope**: Single component fix with 4 affected files

---

## Constitution Check

*No constitution file found - using standard best practices*

**Simplicity Gates (Standard)**:
- [x] Avoid over-engineering - minimal changes to fix the specific issues
- [x] No new dependencies required
- [x] No architectural changes needed
- [x] Single component modification plus theme adjustment

---

## Project Structure

### Documentation (this feature)
```
specs/20251120-fix-rulesengineinlinealert-layout/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (affected files)
```
frontend/react-Admin3/src/
├── theme/
│   └── theme.js                              # Global MuiAlert overrides (modify)
├── components/
│   └── Common/
│       ├── RulesEngineInlineAlert.js         # Main component (modify)
│       └── __tests__/
│           └── RulesEngineInlineAlert.test.js # Tests (add layout tests)
└── pages/
    └── Home.js                                # Primary usage for validation
```

**Structure Decision**: Option 2 (Web application) - frontend modifications only

---

## Phase 0: Research & Analysis

### Root Cause Analysis

**Issue 1: Theme Interference**
- Location: `frontend/react-Admin3/src/theme/theme.js` lines 304-360
- Problem: `MuiAlert.styleOverrides.root.maxWidth: "20rem"` (320px)
- Impact: Any width > 320px is ignored regardless of component props

**Issue 2: Float Container Behavior**
- Location: `RulesEngineInlineAlert.js` lines 141-169 (`getContainerStyles`)
- Problem: CSS `float` is applied to outer Box, but:
  - Float only removes element from document flow for inline content
  - Parent Container in Home.js is a flex column (`display: flex; flexDirection: column`)
  - Float has no effect inside flex containers
- Impact: Content still shifts down instead of wrapping

**Issue 3: Width Application Conflict**
- Location: `RulesEngineInlineAlert.js` lines 174-189 (`getAlertStyles`)
- Problem: Width applied to both Box container AND Alert component
- Theme's maxWidth on Alert overrides the inline width

### Solution Research

**Approach A: Override Theme at Component Level (Recommended)**
- Use `sx` prop with `!important` or higher specificity
- Example: `sx={{ maxWidth: props.width || (props.fullWidth ? 'none' : '20rem') }}`
- Pros: Clean, isolated to component, theme defaults preserved elsewhere
- Cons: Requires careful specificity management

**Approach B: Conditional Theme Variant**
- Create a separate Alert variant in theme for "full-width" alerts
- Pros: Theme-consistent solution
- Cons: Requires theme modification, more complex

**Approach C: Replace Float with Positioning**
- Use `position: absolute` for float behavior
- Pros: Works in flex containers
- Cons: Requires parent to have `position: relative`, more complex to center

**Decision**: Use Approach A for width/fullWidth, and Approach C for float behavior

### Key Technical Findings

1. **MUI sx prop specificity**: The `sx` prop generates inline styles that can override theme defaults when using the `!important` flag or by resetting `maxWidth` to `'none'`

2. **Flex container + float incompatibility**: CSS float has no effect inside flex containers. The Home.js content area uses flex layout, so float cannot work. Alternative approaches:
   - Use `position: absolute` with parent `position: relative`
   - Use flexbox `align-self` for positioning within flex containers
   - Add a wrapper div that's not in flex flow

3. **Test coverage gaps**: Current tests don't cover layout props (`fullWidth`, `float`, `width`)

---

**Output**: Research complete - all technical decisions made

---

## Phase 1: Design & Solution

### Component Changes

**1. RulesEngineInlineAlert.js - getAlertStyles function**

Current implementation applies theme-constrained styles. New implementation must:
- Override `maxWidth` when `fullWidth={true}` or custom `width` is provided
- Set `maxWidth: 'none'` to remove theme constraint
- Apply width directly to Alert, not just container

**2. RulesEngineInlineAlert.js - getContainerStyles function**

Current float implementation doesn't work in flex containers. New implementation must:
- Remove CSS float entirely (doesn't work in flex context)
- For `float={true}` with `floatPosition='left'` or `'right'`:
  - Use `position: absolute` with appropriate `left`/`right` values
  - Add `zIndex` to ensure visibility over other content
- For `float={true}` with `floatPosition='center'`:
  - Use margin auto centering
- Add documentation that parent must have `position: relative` for float to work

**3. Theme.js - Optional adjustment**

Consider adding a comment noting that individual components may override `maxWidth` when needed.

### Test Additions

New test cases for `RulesEngineInlineAlert.test.js`:
1. `test('applies fullWidth style correctly')` - verify 100% width
2. `test('applies custom width style correctly')` - verify custom width
3. `test('floatPosition right applies correct positioning')`
4. `test('floatPosition center applies correct centering')`
5. `test('fullWidth takes precedence over width prop')`
6. `test('default props maintain existing behavior')` - regression test

### Contract Summary

| Prop | Current Behavior | Expected Behavior |
|------|-----------------|-------------------|
| `fullWidth={true}` | Width capped at 320px | Width = 100% of parent |
| `width="400px"` | Width capped at 320px | Width = 400px |
| `float={true}` | Shifts content down | Content wraps around |
| `floatPosition="right"` | Shifts content down | Alert on right, content left |
| `floatPosition="center"` | No visible effect | Alert centered |

---

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Write failing tests for each layout prop (TDD Red phase)
2. Fix component implementation to pass tests (TDD Green phase)
3. Verify no regressions in existing usages
4. Manual visual validation on Home page

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Component fix before integration verification
- Regression tests run after each change

**Estimated Output**: 8-12 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

---

## Complexity Tracking

*No violations - solution is minimal and focused*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

---

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none needed)

---

## Next Steps

Run `/speckit.tasks` to break down this plan into actionable TDD tasks.
