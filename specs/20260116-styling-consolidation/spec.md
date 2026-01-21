# Feature Specification: Frontend Styling System Consolidation

**Feature Branch**: `20260116-styling-consolidation`
**Created**: 2025-01-16
**Status**: Draft
**Input**: Design document: `docs/plans/2025-01-16-styling-system-consolidation-design.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Uses Semantic Tokens for Styling (Priority: P1)

A developer styling a component can access semantic tokens directly through the MUI theme's sx prop, finding the correct color or spacing value without searching through multiple files or guessing which naming convention to use.

**Why this priority**: This is the core value proposition - developers need a single, discoverable source for styling values. Without this, all other improvements are meaningless.

**Independent Test**: Can be fully tested by creating a new component that uses semantic tokens (e.g., `sx={{ color: 'semantic.textPrimary' }}`) and verifying it compiles and renders correctly with the expected color value.

**Acceptance Scenarios**:

1. **Given** a developer is styling a new component, **When** they use `sx={{ bgcolor: 'semantic.bgPaper' }}`, **Then** the component renders with the correct background color defined in the theme.
2. **Given** a developer needs a product-specific color, **When** they use `sx={{ color: 'productCards.tutorial.header' }}`, **Then** the component renders with the correct tutorial purple color.
3. **Given** a developer uses IDE autocomplete in the sx prop, **When** they type `theme.palette.`, **Then** they see semantic, productCards, and navigation options with full path completion.

---

### User Story 2 - Developer Maintains Product Card Theming (Priority: P1)

A developer updating the tutorial product card colors can change values in a single location (`tokens/colors.js`) and have those changes propagate to all tutorial-themed components automatically.

**Why this priority**: Eliminating duplication is a primary goal. Product cards are a major UI element with colors currently defined in multiple places.

**Independent Test**: Can be tested by changing a color value in `tokens/colors.js` (e.g., purple[20]) and verifying all tutorial cards update without modifying any other files.

**Acceptance Scenarios**:

1. **Given** the tutorial header color is defined as `colors.scales.purple[20]`, **When** a developer changes the purple[20] value in tokens/colors.js, **Then** all tutorial card headers reflect the new color.
2. **Given** semantic mappings reference the color tokens, **When** a raw color value changes, **Then** no code changes are needed in component files or semantic layer files.

---

### User Story 3 - Developer Styles Navigation Components (Priority: P2)

A developer working on navigation components can find all navigation-related styling tokens in one place (`semantic/navigation.js`) with consistent naming that reflects the component's purpose.

**Why this priority**: Navigation is a core UI element with significant CSS currently in `navbar.css`. Migrating this to MUI enables consistent theming.

**Independent Test**: Can be tested by styling a navigation element using `theme.palette.navigation.text.primary` and verifying it renders correctly.

**Acceptance Scenarios**:

1. **Given** a developer is styling a nav link, **When** they use `sx={{ color: 'navigation.text.primary' }}`, **Then** the link renders with the correct navigation text color.
2. **Given** the navbar.css file has been migrated, **When** a developer inspects the navigation components, **Then** no CSS class references remain, only MUI sx prop styling.

---

### User Story 4 - Developer Removes Legacy CSS Files (Priority: P2)

After migration, developers no longer need to maintain separate CSS files. All styling is consolidated in the MUI theme, reducing the CSS bundle size and eliminating the mental overhead of multiple styling systems.

**Why this priority**: Performance improvement and reduced maintenance burden. This is a natural outcome of full migration.

**Independent Test**: Can be tested by verifying the build completes without any CSS files from `src/styles/` being imported.

**Acceptance Scenarios**:

1. **Given** all CSS has been migrated to MUI, **When** a developer builds the application, **Then** no files from `src/styles/*.css` are included in the bundle.
2. **Given** `bpp-color-system.css` has been deleted, **When** the application runs, **Then** all styling renders correctly from MUI theme values.

---

### User Story 5 - Developer Adds Dark Mode Support (Priority: P3)

The theme architecture supports dark mode by providing a `darkColors` object that overrides only the values that change, enabling future dark mode implementation without restructuring the theme.

**Why this priority**: Theme switching capability was listed as a goal but lower priority than consistency and maintainability. The architecture should enable it without requiring immediate implementation.

**Independent Test**: Can be tested by verifying `darkColors` exports exist and contain valid override values for MD3 system colors.

**Acceptance Scenarios**:

1. **Given** the theme exports `darkColors`, **When** a developer inspects the object, **Then** it contains overrides for primary, surface, and text colors.
2. **Given** the color token architecture, **When** dark mode is implemented in the future, **Then** only the theme composition logic needs to change, not individual components.

---

### Edge Cases

- What happens when a developer uses an old color path (e.g., `theme.palette.purple['020']`)? The scales remain accessible at `theme.palette.scales.purple[20]` for migration compatibility.
- How does the system handle components that import deleted CSS files? Build will fail with clear error messages indicating the import path no longer exists.
- What happens if a product type is not found in productCards? Components using dynamic product type lookup should include fallback handling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Theme MUST export all color values from a single source file (`tokens/colors.js`)
- **FR-002**: Theme MUST provide flat semantic tokens for common styling needs (text, background, borders, status)
- **FR-003**: Theme MUST provide nested semantic tokens for domain-specific styling (product cards, navigation)
- **FR-004**: Theme MUST support all six product card types (tutorial, material, bundle, onlineClassroom, marking, markingVoucher) with consistent token structure
- **FR-005**: Theme MUST migrate all styles from CSS files to MUI component overrides
- **FR-006**: Theme MUST maintain the existing visual appearance of all components after migration
- **FR-007**: Theme MUST provide raw color scales access via `theme.palette.scales` for edge cases
- **FR-008**: Theme MUST export dark mode color overrides for future implementation
- **FR-009**: All legacy color definition files (`colorTheme.js`, `palettesTheme.js`, `liftKitTheme.js`) MUST be removed after migration
- **FR-010**: All CSS files in `src/styles/` MUST be migrated and removed after migration

### Key Entities

- **Color Token**: A raw hex color value with a numeric scale key (e.g., `purple[20]: '#dfd4f7'`)
- **Semantic Token**: A named reference mapping purpose to a color token (e.g., `textPrimary: colors.md3.onSurface`)
- **Component Override**: MUI theme configuration that applies default styles to a component type
- **Product Card Semantic**: A nested object containing all color tokens for a specific product type

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can find any color value by searching in exactly one file (`tokens/colors.js`)
- **SC-002**: All product card types render with correct colors using only semantic token references
- **SC-003**: Zero CSS files remain in `src/styles/` after migration completion
- **SC-004**: Theme object size does not increase bundle size by more than 5KB compared to current CSS + JS combined
- **SC-005**: All existing visual regression tests pass without modification to test expectations
- **SC-006**: IDE autocomplete provides full path suggestions for all semantic tokens
- **SC-007**: Build completes successfully with zero CSS import errors after migration

## Assumptions

- The existing visual appearance of components is the correct reference - migration should preserve, not change, the look
- Numeric scale keys (10, 20, 30...) are preferred over string keys ('010', '020') for cleaner code
- MD3 (Material Design 3) color naming conventions are appropriate for system colors
- Dark mode implementation will be a separate future task - this spec only ensures the architecture supports it
- Components currently using CSS classes will be updated to use sx props or MUI variants
- The `liftkit-css/` utility classes will be replaced by MUI's built-in responsive utilities and theme spacing

## Dependencies

- MUI v7 (already in use)
- Existing theme infrastructure in `src/theme/`
- Current component implementations that will be updated to use new token paths

## Out of Scope

- Implementing dark mode toggle functionality (architecture only)
- Creating new component designs (migration preserves existing appearance)
- Updating third-party component styling (only first-party components)
- TypeScript type definitions for theme extensions (can be added later)
