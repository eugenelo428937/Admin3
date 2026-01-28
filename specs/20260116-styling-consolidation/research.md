# Research: Frontend Styling System Cleanup

**Feature**: 20260116-styling-consolidation
**Updated**: 2025-01-27

## Research Questions

### 1. MUI Theme Palette Extension Best Practices

**Question**: How should custom palette properties be structured in MUI v7 for optimal sx prop access?

**Decision**: Use module augmentation pattern with flat + nested structure.

**Rationale**: MUI v7 supports custom palette properties accessed via sx prop string paths (e.g., `bgcolor: 'semantic.bgPaper'`). Nested objects work but require the path string syntax.

**Usage Pattern**:

```javascript
// Static - use string path
<Box sx={{ bgcolor: 'semantic.bgPaper' }} />

// Dynamic - use theme callback
<Box sx={(theme) => ({ bgcolor: theme.palette.productCards[type].header })} />
```

### 2. Color Token Naming: Numeric Keys

**Question**: What naming convention for color scale keys?

**Decision**: Numeric keys only. String keys (`'010'`, `'020'`) deleted.

**Rationale**:
- `scales.purple[20]` is cleaner than `legacyScales.purple['020']`
- Matches common design token conventions (Tailwind, Radix)
- No leading zeros needed (JS preserves integer key order for keys < 2^32)

### 3. CSS to MUI Migration Strategy

**Question**: Best approach for migrating CSS files to MUI without visual regression?

**Decision**: Component-by-component migration with visual comparison checkpoints.

**Rationale**: Isolates changes to single components, enables incremental testing, allows rollback.

### 4. Semantic Token Access Patterns

**Question**: How should components access semantic tokens?

**Decision**: Two patterns only (down from four):

| Pattern | When to Use | Example |
|---------|-------------|---------|
| String path | Static/known values | `sx={{ color: 'semantic.textPrimary' }}` |
| Theme callback | Dynamic/computed values | `sx={(theme) => ({ bgcolor: theme.palette.productCards[type].header })}` |

**Forbidden Patterns**:
- Direct palette scale access in components: `theme.palette.scales.purple[20]`
- Legacy semantic paths: `theme.palette.semantic.cardHeader.tutorial`
- Top-level palette colors: `theme.palette.granite['020']`
- Raw hex literals: `'#755085'`

### 5. `statusColors` Analysis (New Finding)

**Question**: What is `statusColors` in `tokens/colors.js` and should it be kept?

**Finding**: `statusColors` is misnamed. It defines a complete palette (primary, secondary, tertiary, error, warning, info, success, background, surface, text) with **different hex values** from `md3`. It is actually a LiftKit palette, not status colors.

**Example of value conflict**:

| Concept | `md3` value | `statusColors` value |
|---------|-------------|---------------------|
| primary | `#755085` | `#4658ac` |
| error | `#BA1A1A` | `#BA1A1A` (same) |
| background | `#FFF7FF` | `#fafafa` |

**Decision**: Delete `statusColors`. MUI palette roles derive directly from `md3` and `scales`:

```javascript
palette: {
  primary: { main: md3.primary },
  warning: { main: scales.orange[50] },
  info: { main: scales.cobalt[60] },
  success: { main: scales.green[60] },
}
```

Alert overrides use `status` tokens from `semantic/common.js`.

### 6. Color Value Drift Between CSS and JS (T001 Audit Complete)

**Question**: Are CSS custom properties in `index.css` consistent with JS tokens?

**Finding**: **No.** Full audit (T001) reveals **31 mismatches** out of 47 MD3 system color tokens. The CSS and JS were generated from different Material Theme Builder configurations (CSS seed: `#6F358A`, JS primary: `#755085` — same primary but different secondary/tertiary/error families).

**Critical discovery**: The `--md-sys-color-*` CSS variables (without `_lkv` suffix) defined in `index.css` lines 33-177 have **zero consumers** in any JS/component file. They are 100% dead CSS. The styleguide (`MaterialDesign3Palette.js`) and `cards/index.js` reference `_lkv`-suffixed variants instead.

**Complete mismatch table (31 mismatches, JS values are correct)**:

| Token | CSS value | JS value (correct) | Group |
|-------|-----------|---------------------|-------|
| secondary | `#765085` | `#69596D` | Secondary |
| secondary-container | `#F7D8FF` | `#F1DCF4` | Secondary |
| on-secondary-container | `#5C386B` | `#504255` | Secondary |
| tertiary | `#8F4C34` | `#815251` | Tertiary |
| tertiary-container | `#FFDBCF` | `#FFDAD8` | Tertiary |
| on-tertiary-container | `#72351F` | `#663B3A` | Tertiary |
| error | `#904A45` | `#904A43` | Error |
| error-container | `#FFDAD7` | `#FFDAD5` | Error |
| on-error-container | `#73332F` | `#73342D` | Error |
| surface | `#FFF7FB` | `#FDF8FF` | Surface |
| on-surface | `#1F1A1F` | `#1C1B20` | Surface |
| surface-variant | `#DBE4E6` | `#E5E1EC` | Surface |
| on-surface-variant | `#3F484A` | `#47464F` | Surface |
| surface-dim | `#E1D7DE` | `#DDD8E0` | Surface |
| surface-bright | `#FFF7FB` | `#FDF8FF` | Surface |
| surface-container-low | `#FBF1F8` | `#F7F2FA` | Surface |
| surface-container | `#F5EBF2` | `#F1ECF4` | Surface |
| surface-container-high | `#EFE5ED` | `#EBE6EE` | Surface |
| surface-container-highest | `#EAE0E7` | `#E6E1E9` | Surface |
| outline | `#6F797A` | `#787680` | Outline |
| outline-variant | `#BFC8CA` | `#C9C5D0` | Outline |
| inverse-surface | `#342F34` | `#312F36` | Inverse |
| inverse-on-surface | `#F8EEF5` | `#F4EFF7` | Inverse |
| secondary-fixed | `#F7D8FF` | `#F1DCF4` | Fixed |
| on-secondary-fixed | `#2D0B3D` | `#231728` | Fixed |
| secondary-fixed-dim | `#E4B7F3` | `#D4C0D7` | Fixed |
| on-secondary-fixed-variant | `#5C386B` | `#504255` | Fixed |
| tertiary-fixed | `#FFDBCF` | `#FFDAD8` | Fixed |
| on-tertiary-fixed | `#380D00` | `#331111` | Fixed |
| tertiary-fixed-dim | `#FFB59B` | `#F5B7B5` | Fixed |
| on-tertiary-fixed-variant | `#72351F` | `#663B3A` | Fixed |

**Matching tokens (16)**: primary, on-primary, primary-container, on-primary-container, on-secondary, on-tertiary, on-error, surface-container-lowest, surface-tint, background, on-background, inverse-primary, primary-fixed, on-primary-fixed, primary-fixed-dim, on-primary-fixed-variant, shadow, scrim.

**CSS variable consumer audit (Phase 3 impact)**:

| CSS Variable Family | Consumers | Action |
|---------------------|-----------|--------|
| `--md-sys-color-*` (no suffix) | **None** (0 consumers) | Delete in T010 |
| `--md-ref-palette-*` | **None** (0 consumers) | Delete in T010 |
| `--color-*` BPP brand | `MaterialDesign3Palette.js` (styleguide, ~75 refs), `glass.css` (misc, 3 refs) | Migrate styleguide or accept. Delete glass.css in T018 |
| `--light__*_lkv` / `--dark__*_lkv` | `chips.js` (2 refs) | Migrate to JS tokens |
| `--shadow-*` | `baseProductCard.js` (2), `tutorialCard.js` (1), `onlineClassroomCard.js` (1), `markingVoucherCard.js` (1), `testTheme.js` (2) | Migrate to JS shadow tokens (T011) |
| `--bs-*` Bootstrap | **None** (0 consumers in src/) | Delete in T010 |
| `--product-card-header-*` | Only self-referencing in index.css | Delete in T010 |

**Decision**: Fix by deleting all CSS color variables in Phase 3 (T010). JS tokens are the single source of truth. Shadow vars need migration to JS tokens first (T011).

### 7. Dark Mode Architecture

**Question**: Should dark mode tokens be preserved for future use?

**Previous Decision (Jan 16)**: Keep `darkMd3` export for future dark mode.

**Updated Decision (Jan 27)**: Delete `darkMd3`. Dark mode is not a product requirement. Dead code should be deleted, not maintained. If needed later, it can be re-added with proper MUI `colorSchemes` integration.

### 8. Bootstrap Dependency

**Question**: Can Bootstrap be fully removed?

**Decision**: Audit required (T019). Bootstrap may still be used for checkout forms and grid utilities. Do not delete `custom-bootstrap.scss` without confirming all consumers are migrated.

## Findings Summary

| Topic | Decision | Confidence |
|-------|----------|------------|
| Palette extension | Flat + nested, string path access | High |
| Token naming | Numeric keys only, delete string keys | High |
| Migration strategy | Component-by-component | High |
| Access patterns | 2 patterns only (string path + callback) | High |
| `statusColors` | Delete (misnamed LiftKit palette) | High |
| CSS/JS color drift | Delete CSS vars, JS is authoritative | High |
| Dark mode | Delete `darkMd3` (dead code) | High |
| Bootstrap | Audit before deletion | Medium |

## Unresolved Questions

- **Bootstrap scope**: How much of the checkout/forms still depends on Bootstrap grid? (Resolved in T019)
- **Storybook CSS**: Are `src/stories/*.css` files actively used by Storybook, or can they be deleted? (Resolved in T018)
