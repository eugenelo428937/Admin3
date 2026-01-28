# Implementation Plan: Styling System Cleanup

**Branch**: `20260116-styling-consolidation` | **Date**: 2025-01-27 | **Spec**: [spec.md](spec.md)
**Supersedes**: Previous plan (2025-01-16)
**Decision**: No backward compatibility. Legacy patterns deleted, not maintained.

## Summary

Complete the styling system cleanup by removing all backward-compatibility layers, deleting legacy files, gutting `index.css`, migrating raw hex values, and adding tooling enforcement. 9 phases, 28 tasks.

## Technical Context

**Language/Version**: JavaScript (ES6+), React 19.2
**Primary Dependencies**: MUI v7 (Material-UI), React Router
**Storage**: N/A (styling refactoring - no data changes)
**Testing**: Jest, React Testing Library (existing test infrastructure)
**Constraints**: Must maintain exact visual appearance of all existing components

## Project Structure

### Documentation

```text
specs/20260116-styling-consolidation/
├── spec.md              # Feature specification (updated 2025-01-27)
├── plan.md              # This file
├── research.md          # Research findings
├── data-model.md        # Token structure definitions
├── quickstart.md        # Developer guide
├── checklists/
│   └── requirements.md  # Quality validation checklist
├── tasks.md             # Implementation tasks
└── STYLING_PLACEMENT_RULES.md  # Where to place styles
```

### Source Code Changes

```text
frontend/react-Admin3/src/
├── theme/
│   ├── index.js                  # REWRITE: Remove all backward-compat wrappers
│   ├── tokens/
│   │   ├── colors.js             # MODIFY: Delete legacyScales, statusColors, darkMd3
│   │   ├── typography.js         # No change
│   │   └── spacing.js            # No change
│   ├── semantic/
│   │   ├── common.js             # MODIFY: Add a11y tokens
│   │   ├── productCards.js       # No change
│   │   └── navigation.js         # No change
│   ├── components/
│   │   ├── alerts.js             # MODIFY: Replace statusColors with semantic status
│   │   ├── navigation.js         # MODIFY: Replace semanticColors with navigation import
│   │   ├── misc.js               # MODIFY: Replace legacyScales with scales
│   │   └── ...
│   ├── utils/                    # NEW: Style helper utilities
│   │   └── styleHelpers.js
│   ├── colors/                   # DELETE entirely
│   │   ├── semantic.js           # DELETE
│   │   └── index.js              # DELETE
│   └── [backward-compat wrappers removed from index.js]
│
├── index.css                     # MODIFY: 675 lines → ~30 lines
├── App.scss                      # MODIFY: Delete unused App-* classes
├── .eslintrc.js                  # MODIFY: Add no-restricted-imports rules
│
└── components/                   # UPDATE: Replace hex literals, legacy palette paths
    ├── Navigation/UserActions.js        # Replace palette.liftkit
    ├── Address/SmartAddressInput.js      # Replace palette.liftkit
    ├── User/UserFormWizard.js            # Replace palette.liftkit, hex gradient
    ├── Footer/Footer.js                  # Replace palette.granite['XXX']
    ├── User/ResetPasswordForm.js         # Replace palette.granite
    ├── User/ForgotPasswordForm.js        # Replace palette.granite
    ├── pages/Home.js                     # Replace palette.granite
    ├── Navigation/SearchModal.js         # Replace hex values
    ├── Common/JsonContentRenderer.js     # Replace hex values
    └── Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js  # Replace hex
```

## Implementation Phases

### Phase 1: Fix Color Value Drift (Bug Fix)

Audit MD3 color values between `index.css` CSS vars and `tokens/colors.js`. JS values are correct (from Material Theme Builder). The fix happens in Phase 3 when CSS vars are deleted.

### Phase 2: Delete Legacy Layers

The critical path. Migrate all consumers of legacy patterns, then delete the legacy code:

1. Migrate `semanticColors` consumers in theme layer
2. Delete `colors/semantic.js` and `colors/index.js`
3. Delete `legacyScales` and `createStringKeyScale` from `tokens/colors.js`
4. Delete `statusColors` from `tokens/colors.js`
5. Clean `theme/index.js` - remove all backward-compat wrappers
6. Migrate `palette.liftkit` consumers in components
7. Migrate top-level `palette.{color}['XXX']` consumers in components

### Phase 3: Gut `index.css`

Reduce from ~675 lines to ~30 lines. Keep only golden ratio scale variables, font smoothing, and body reset. Delete all color CSS variables.

### Phase 4: Migrate Raw Hex Values in Components

Replace hex literals in production component files with semantic tokens.

### Phase 5: Clean Up Remaining CSS/SCSS Files

Evaluate and migrate or delete: `CheckoutSteps.css`, `App.scss`, unused CSS files, `custom-bootstrap.scss`.

### Phase 6: Tooling Enforcement

Add ESLint `no-restricted-imports` rules and hex-literal CI check. Update theme tests.

### Phase 7: Developer Ergonomics

Add `composeSx()` and `productCardSx()` helper utilities. Add JSDoc variant documentation.

### Phase 8: Accessibility Tokens

Add focus/disabled/a11y tokens to `semantic/common.js`. Add `prefers-reduced-motion` to `MuiCssBaseline`.

### Phase 9: Remove Dark Mode Dead Code

Delete `darkMd3` from `tokens/colors.js`. Verify no dark mode CSS blocks remain.

## Dependency Graph

```text
T001 (audit) ──────────────────────────────────────────┐
                                                        │
T002 (migrate semanticColors) ──┬── T003 (delete colors/semantic.js)
                                │        │
                                │   T004 (delete colors/index.js)
                                │        │
                                │   T005 (delete legacyScales) ────┤
                                │                                   │
                                │   T006 (delete statusColors) ────┤
                                │                                   │
                                └── T007 (clean theme/index.js) ───┤
                                                                    │
                                    T008 (migrate liftkit) ────────┤
                                                                    │
                                    T009 (migrate palette.color) ──┤
                                                                    │
T010 (gut index.css) ◄──────────────────────────────────────────────┘
T011 (shadow tokens)

T012-T015 (hex cleanup) ◄── T010
T016-T019 (CSS/SCSS cleanup) ◄── T010
T020-T022 (tooling) ◄── T012-T015
T023-T024 (ergonomics) - independent
T025-T026 (a11y) - independent
T027-T028 (dark mode cleanup) ◄── T010
```

## Parallelization

**Sequential (critical path):** T001 → T002 → T003/T004/T005/T006 → T007 → T008/T009 → T010

**After T010 (can run in parallel):**
- T012, T013, T014, T015 (hex cleanup - independent files)
- T016, T017, T018, T019 (CSS cleanup - independent files)
- T023, T024 (ergonomics)
- T025, T026 (a11y)
- T027 (dark mode)

**After hex cleanup:** T020, T021 (lint enforcement), T022 (test updates)

## Verification Checkpoints

| After Phase | Verify |
|-------------|--------|
| Phase 1 | Document all CSS/JS color mismatches |
| Phase 2 | `grep -r "legacyScales\|statusColors\|colorTheme\|palettesTheme\|semanticColors" src/` = 0 results |
| Phase 2 | `grep -r "palette\.liftkit\|palette\.bpp\|palette\.offwhite\|palette\.granite\|palette\.purple\|palette\.sky" src/components/` = 0 results |
| Phase 2 | App runs, navigation and product cards render correctly |
| Phase 3 | `index.css` < 40 lines, no `--md-sys-*` or `--color-*` variables |
| Phase 3 | App loads without console errors |
| Phase 4 | `grep -rn '#[0-9a-fA-F]' src/components/ --exclude-dir=__tests__ --exclude-dir=styleguide --exclude-dir=sandbox` = 0 results |
| Phase 6 | ESLint catches forbidden imports and hex colors |
| Phase 9 | `grep -r "darkMd3\|prefers-color-scheme" src/` = 0 results |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missing a consumer of deleted code | Medium | High | Pre-deletion grep for all references. Build must succeed. |
| Visual regression | Medium | High | Manual comparison of navigation, cards, footer, forms before/after each phase |
| `var(--color-*)` CSS refs from third-party libs | Low | Low | Check node_modules is not affected. BPP CSS vars are app-specific. |
| Bootstrap dependency still active | Medium | Medium | Audit before deleting `custom-bootstrap.scss`. Keep if checkout/forms need it. |
| Test failures from removed palette paths | Medium | Medium | Update test mocks to match new palette shape. Batch test updates in T022. |

## Success Criteria (from spec)

| Metric | Before | Target | Verified After |
|--------|--------|--------|----------------|
| `index.css` lines | 675 | < 40 | Phase 3 |
| CSS custom properties | 430 | 16 | Phase 3 |
| Color access patterns | 4 | 2 | Phase 5 |
| Raw hex in components | 26 | 0 | Phase 4 |
| Semantic layer files | 2 (overlapping) | 1 set | Phase 2 |
| Backward-compat wrappers | 4 | 0 | Phase 2 |
