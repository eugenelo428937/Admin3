# Implementation Plan: Filter Registry Pattern

**Branch**: `1.11-filter-registry-pattern` | **Date**: 2025-10-22 | **Spec**: [spec-story-1.11-2025_10_22.md](../specs/spec-story-1.11-2025_10_22.md)
**Input**: Feature specification from `/specs/spec-story-1.11-2025_10_22.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Spec loaded successfully
2. Fill Technical Context
   → Project Type: web (React frontend)
   → Structure Decision: Option 2 (frontend/backend split)
3. Constitution Check
   → No constitution file found, proceeding with CLAUDE.md guidelines
   → Open/Closed Principle: Open for extension, closed for modification
   → Registry Pattern: Centralized configuration management
4. Execute Phase 0 → Review existing filter rendering patterns
   → Analyze FilterPanel component structure
   → Analyze ActiveFilters component structure
5. Execute Phase 1 → Design registry API and migration strategy
   → Define FilterRegistry class interface
   → Design phased migration approach
6. Re-evaluate Constitution Check
   → Shotgun Surgery eliminated ✓
   → Open/Closed Principle achieved ✓
7. Plan Phase 2 → Task generation approach documented
8. STOP - Ready for /tasks command
```

## Summary
Implement a centralized FilterRegistry pattern to eliminate "shotgun surgery" when adding new filter types. Currently, adding a filter requires modifying 6+ files (filtersSlice, FilterPanel, ActiveFilters, ProductList, useProductsSearch, FilterUrlManager). With the registry pattern, adding a filter requires only: (1) one registry entry, (2) Redux state field and actions. All components read from the registry for rendering, display properties, and URL mappings.

**Primary Requirement**: Centralized registry for filter configurations enabling one-entry filter additions

**Technical Approach**: Registry class with Map-based storage, phased migration of FilterPanel → ActiveFilters → FilterUrlManager, comprehensive tests to verify visual consistency

## Technical Context
**Language/Version**: JavaScript ES6+, React 18, Material-UI 5
**Primary Dependencies**: React, Material-UI (for UI component types), Redux Toolkit (for filter state)
**Storage**: In-memory Map (registry data), Redux (filter state - unchanged)
**Testing**: Jest (unit tests for registry), React Testing Library (component integration tests)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: web - React frontend registry pattern
**Performance Goals**: O(1) registry lookups, no noticeable rendering performance impact
**Constraints**: Zero visual changes visible to users, backward compatibility with existing filters
**Scale/Scope**: ~200-300 lines registry + tests, 3 component migrations, 9 filter type registrations

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Design Principles (from CLAUDE.md)
- ✅ **Open/Closed Principle**: System open for extension (add filters) without modification (change components)
- ✅ **Single Responsibility**: Registry handles configuration; components handle rendering
- ✅ **DRY**: Eliminates hardcoded filter definitions in multiple files
- ✅ **Maintainability**: Filter metadata centralized in one location
- ✅ **Testability**: Registry fully unit-testable; component integration tests verify rendering

### Pattern Justification
- ✅ **Registry Pattern**: Standard pattern for extensible systems (plugins, filters, etc.)
- ✅ **Configuration-Driven**: Components driven by data, not code
- ✅ **Separation of Concerns**: Configuration separate from rendering logic

**Status**: ✅ PASS - Registry pattern eliminates shotgun surgery anti-pattern

## Project Structure

### Documentation (this feature)
```
specs/spec-story-1.11-2025_10_22/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (existing pattern analysis)
├── contracts/           # Phase 1 output (registry API contract)
│   └── FilterRegistry.contract.js
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
frontend/react-Admin3/
├── src/
│   ├── store/
│   │   └── filters/
│   │       ├── filterRegistry.js              # NEW: Registry implementation
│   │       └── __tests__/
│   │           └── filterRegistry.test.js     # NEW: Registry tests
│   ├── components/
│   │   └── Product/
│   │       ├── FilterPanel.js                 # MODIFY: Use registry for rendering
│   │       └── ActiveFilters.js               # MODIFY: Use registry for chips
│   └── utils/
│       └── filterUrlManager.js                # MODIFY: Use registry for URL mappings (Story 1.10)
└── docs/
    └── how-to-add-new-filter.md               # NEW: Developer guide
```

**Structure Decision**: Option 2 (web application) - Frontend registry pattern

## Phase 0: Outline & Research
**Status**: Review existing filter rendering patterns

### Research Tasks
1. **Analyze FilterPanel component**:
   - Document current filter section structure
   - Identify hardcoded filter definitions
   - List unique rendering strategies per filter type

2. **Analyze ActiveFilters component**:
   - Document FILTER_CONFIG mapping
   - Identify chip color and label logic
   - List display value formatting per filter type

3. **Analyze FilterUrlManager (Story 1.10)**:
   - Review URL parameter naming conventions
   - Document parameter format per filter type (indexed, comma-separated, single)
   - Identify parameter aliases

4. **Identify filter type patterns**:
   - Array filters: subjects, categories, product_types, products, modes_of_delivery
   - String filters: tutorial_format, searchQuery
   - Boolean filters: distance_learning, tutorial

### Research Findings
```markdown
# research.md content:

## Current Filter Rendering Patterns

### FilterPanel Structure
- Hardcoded Accordion components per filter type
- Each filter has: label, color, count badge, expansion behavior
- Rendering varies by data type:
  - Arrays: Checkbox list with FormControlLabel
  - Strings: Radio group or dropdown
  - Booleans: Single checkbox

### ActiveFilters FILTER_CONFIG
```javascript
const FILTER_CONFIG = {
  subjects: { label: 'Subject', color: 'primary', getDisplayValue: (v) => v },
  categories: { label: 'Category', color: 'info', getDisplayValue: (v) => v },
  // ... 7 more entries
};
```

### URL Parameter Formats (from FilterUrlManager)
| Filter Type | URL Format | Parameter Name(s) |
|-------------|------------|-------------------|
| subjects | indexed | subject_code, subject, subject_1, subject_2... |
| product_types | comma-separated | group |
| tutorial_format | single | tutorial_format |
| distance_learning | boolean | distance_learning |

## Decision: Registry Schema
Based on analysis, registry needs:
- type (Redux state key)
- label, pluralLabel (UI display)
- color (chip/badge color)
- urlParam, urlParamAliases (URL conversion)
- urlFormat (indexed, comma-separated, single)
- dataType (array, string, boolean)
- multiple (supports multi-select)
- getDisplayValue (value formatting function)
- order (display sequence)
```

**Output**: research.md with existing pattern analysis and registry schema design

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. FilterRegistry API Contract
**File**: `contracts/FilterRegistry.contract.js`

```javascript
/**
 * FilterRegistry API Contract
 *
 * Centralized configuration management for product filter types.
 * Registry pattern enables adding new filters via configuration only.
 */

export const FilterRegistryContract = {
  // Registration API
  register: {
    signature: '(config: FilterConfig) => void',
    description: 'Register a new filter type with configuration',
    validation: ['type required', 'label required', 'urlParam required'],
    throws: 'Error if required fields missing'
  },

  clear: {
    signature: '() => void',
    description: 'Clear all registrations (for testing)',
    usage: 'Test setup/teardown only'
  },

  // Query API
  get: {
    signature: '(type: string) => FilterConfig | undefined',
    description: 'Get filter configuration by type (Redux state key)',
    performance: 'O(1) Map lookup'
  },

  getAll: {
    signature: '() => FilterConfig[]',
    description: 'Get all filter configurations sorted by order',
    performance: 'O(n log n) for sorting'
  },

  getByUrlParam: {
    signature: '(paramName: string) => FilterConfig | undefined',
    description: 'Find filter by URL parameter name or alias',
    performance: 'O(n) linear search'
  },

  has: {
    signature: '(type: string) => boolean',
    description: 'Check if filter type is registered',
    performance: 'O(1) Map.has()'
  },

  // Filter subset queries
  getMultipleSelectFilters: {
    signature: '() => FilterConfig[]',
    description: 'Get filters with multiple=true',
    usage: 'For rendering checkbox lists'
  },

  getBooleanFilters: {
    signature: '() => FilterConfig[]',
    description: 'Get filters with dataType=boolean',
    usage: 'For rendering toggle switches'
  },

  getArrayFilters: {
    signature: '() => FilterConfig[]',
    description: 'Get filters with dataType=array',
    usage: 'For rendering multi-select lists'
  }
};

/**
 * FilterConfig Type Definition
 * Complete configuration schema for a filter type
 */
export const FilterConfigSchema = {
  // Required fields
  type: 'string (Redux state key)',
  label: 'string (singular display name)',
  urlParam: 'string (primary URL parameter name)',

  // Optional fields with defaults
  pluralLabel: 'string (defaults to label + "s")',
  urlParamAliases: 'string[] (defaults to [])',
  color: 'string (Material-UI color, defaults to "default")',
  multiple: 'boolean (defaults to true)',
  dataType: '"array" | "string" | "boolean" | "number" (defaults to "array")',
  urlFormat: '"single" | "comma-separated" | "indexed" (defaults to "comma-separated")',
  getDisplayValue: 'function (value => formatted string, defaults to identity)',
  icon: 'string (Material-UI icon name, defaults to null)',
  order: 'number (display order, defaults to 100)'
};
```

### 2. Registry Implementation Structure
**File**: `src/store/filters/filterRegistry.js`

```javascript
/**
 * FilterRegistry class structure (implementation in Phase 4)
 */

class FilterRegistry {
  static #filters = new Map();

  static register(config) {
    // Validate required fields
    // Set defaults for optional fields
    // Store in Map by type
  }

  static get(type) { /* Map lookup */ }
  static getAll() { /* Array from Map.values(), sorted */ }
  static getByUrlParam(paramName) { /* Linear search */ }
  static has(type) { /* Map.has() */ }
  static clear() { /* Map.clear() */ }

  static getMultipleSelectFilters() { /* Filter by multiple=true */ }
  static getBooleanFilters() { /* Filter by dataType=boolean */ }
  static getArrayFilters() { /* Filter by dataType=array */ }
}

// Register all existing filter types (9 registrations)
FilterRegistry.register({ type: 'subjects', label: 'Subject', urlParam: 'subject_code', ... });
FilterRegistry.register({ type: 'categories', label: 'Category', urlParam: 'category', ... });
// ... 7 more registrations

export { FilterRegistry };
```

### 3. Component Migration Strategy
**Phased Approach**: Migrate one component at a time, verify visual consistency

#### Phase 3.1: FilterPanel Migration
**Before** (hardcoded):
```javascript
return (
  <Box>
    <Accordion><AccordionSummary>Subjects</AccordionSummary>...</Accordion>
    <Accordion><AccordionSummary>Categories</AccordionSummary>...</Accordion>
    // ... 7 more hardcoded sections
  </Box>
);
```

**After** (registry-based):
```javascript
const filterConfigs = FilterRegistry.getAll();

return (
  <Box>
    {filterConfigs.map((config) => (
      <Accordion key={config.type}>
        <AccordionSummary>
          {config.pluralLabel}
          {/* Badge logic based on config.dataType */}
        </AccordionSummary>
        <AccordionDetails>
          {renderFilterContent(config, filters[config.type])}
        </AccordionDetails>
      </Accordion>
    ))}
  </Box>
);
```

#### Phase 3.2: ActiveFilters Migration
**Before** (hardcoded FILTER_CONFIG):
```javascript
const FILTER_CONFIG = {
  subjects: { label: 'Subject', color: 'primary', getDisplayValue: (v) => v },
  // ... 8 more entries
};

Object.keys(filters).forEach((filterType) => {
  const config = FILTER_CONFIG[filterType];
  // render chip using hardcoded config
});
```

**After** (registry-based):
```javascript
FilterRegistry.getAll().forEach((config) => {
  const filterValues = filters[config.type];
  if (hasActiveValues(filterValues, config.dataType)) {
    renderChip(config, filterValues);
  }
});
```

#### Phase 3.3: FilterUrlManager Integration (Optional Enhancement)
**Current** (hardcoded URL_PARAM_KEYS):
```javascript
export const URL_PARAM_KEYS = {
  SUBJECT: 'subject_code',
  GROUP: 'group',
  // ... 9 more entries
};
```

**Enhanced** (read from registry):
```javascript
// Optional: Generate URL_PARAM_KEYS from registry
export const URL_PARAM_KEYS = FilterRegistry.getAll().reduce((keys, config) => {
  keys[config.type.toUpperCase()] = config.urlParam;
  return keys;
}, {});
```

### 4. Test Suite Structure
**File**: `src/store/filters/__tests__/filterRegistry.test.js`

```javascript
describe('FilterRegistry', () => {
  beforeEach(() => FilterRegistry.clear());

  describe('register', () => {
    test('registers new filter type')
    test('throws error if type missing')
    test('throws error if label missing')
    test('throws error if urlParam missing')
    test('sets default values for optional fields')
    test('allows re-registration (last wins)')
  });

  describe('get', () => {
    test('retrieves registered filter by type')
    test('returns undefined for unregistered type')
  });

  describe('getAll', () => {
    test('returns all registered filters')
    test('returns filters sorted by order')
    test('returns empty array when no filters registered')
  });

  describe('getByUrlParam', () => {
    test('finds filter by primary URL parameter')
    test('finds filter by URL parameter alias')
    test('returns undefined for unknown URL parameter')
  });

  describe('Query methods', () => {
    test('getMultipleSelectFilters returns only multiple=true')
    test('getBooleanFilters returns only dataType=boolean')
    test('getArrayFilters returns only dataType=array')
  });

  describe('Visual consistency verification', () => {
    test('all 9 existing filters registered')
    test('registered configs match current hardcoded values')
  });
});

// Integration tests (in component test files)
describe('FilterPanel with registry', () => {
  test('renders same sections as before migration')
  test('renders sections in correct order')
  test('applies correct colors to badges')
});

describe('ActiveFilters with registry', () => {
  test('renders chips with correct colors')
  test('renders chips with correct labels')
  test('calls correct display value formatters')
});
```

### 5. No Data Model Changes
Redux filter state unchanged - registry provides metadata only.

### 6. No API Endpoints
Frontend pattern only - no backend changes.

### 7. Developer Documentation
**File**: `docs/how-to-add-new-filter.md`

```markdown
# How to Add a New Filter Type

## Prerequisites
- Story 1.11 (Filter Registry Pattern) implemented

## Steps (2-3 files to modify)

### Step 1: Add Registry Entry
**File**: `src/store/filters/filterRegistry.js`

```javascript
FilterRegistry.register({
  type: 'tutorial_location',           // Redux state key
  label: 'Tutorial Location',           // Singular display name
  pluralLabel: 'Tutorial Locations',    // Plural display name
  urlParam: 'tutorial_location',        // URL parameter name
  urlParamAliases: ['location'],        // Alternative parameter names
  color: 'secondary',                   // Chip/badge color
  multiple: true,                       // Supports multiple selections
  dataType: 'array',                    // Data type (array, string, boolean)
  urlFormat: 'comma-separated',         // URL format
  getDisplayValue: (value) => value,    // Value formatter
  order: 9,                             // Display order (optional)
});
```

### Step 2: Add Redux State and Actions
**File**: `src/store/slices/filtersSlice.js`

```javascript
const initialState = {
  // ... existing filters
  tutorial_location: [],  // NEW filter state
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    // ... existing reducers
    toggleTutorialLocation: (state, action) => {
      const index = state.tutorial_location.indexOf(action.payload);
      if (index === -1) {
        state.tutorial_location.push(action.payload);
      } else {
        state.tutorial_location.splice(index, 1);
      }
    },
  },
});
```

### Step 3: Done!
- FilterPanel automatically renders new filter section
- ActiveFilters automatically renders chips for new filter
- FilterUrlManager automatically handles URL parameters
- No component file modifications needed

## That's it! 🎉
```

**Output**: Registry API contract, component migration strategy, test structure, developer guide

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy
**Phased TDD Approach**:

**Phase A: Registry Foundation** [TDD - tests first]
1. Create filterRegistry.js (empty/stub)
2. Create filterRegistry.test.js
3. Write registry tests (RED)
4. Implement FilterRegistry class (GREEN)
5. Register all 9 existing filter types
6. Verify tests pass

**Phase B: FilterPanel Migration** [Incremental with visual verification]
7. Create FilterPanel integration tests (verify current UI)
8. Update FilterPanel to use registry
9. Run integration tests (verify no visual changes)
10. Manual UI verification

**Phase C: ActiveFilters Migration** [Incremental with visual verification]
11. Create ActiveFilters integration tests (verify current chips)
12. Update ActiveFilters to use registry
13. Run integration tests (verify no chip changes)
14. Manual UI verification

**Phase D: FilterUrlManager Integration** [Optional enhancement]
15. Review FilterUrlManager for registry integration points
16. Update if beneficial (not required - Story 1.10 already complete)

**Phase E: Documentation & Verification**
17. Write developer guide (how-to-add-new-filter.md)
18. Run full test suite
19. Manual end-to-end testing (apply filters, verify rendering, check URLs)

### Ordering Strategy
- **Incremental migration**: One component at a time
- **Visual verification**: Tests + manual checks after each migration
- **Rollback ready**: Each phase can be rolled back independently

### Estimated Output
**17-20 tasks** in tasks.md, grouped into 5 phases

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following incremental migration strategy)
**Phase 5**: Validation (visual consistency tests, full regression testing)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**Status**: No violations - registry pattern is standard for extensible systems

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A - Eliminates shotgun surgery    |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (existing pattern analysis)
- [x] Phase 1: Design complete (registry API + migration strategy)
- [x] Phase 2: Task planning complete (phased TDD approach)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (Open/Closed Principle)
- [x] Post-Design Constitution Check: PASS (registry pattern justification)
- [x] All NEEDS CLARIFICATION resolved (patterns documented)
- [x] Complexity deviations documented (N/A - standard pattern)

## Risk Mitigation

### Risk 1: Visual Regression (UI Changes)
**Mitigation**: Incremental migration with visual verification
- Integration tests capture current UI state before migration
- Each component migrated separately with before/after comparison
- Manual UI verification after each phase
- Rollback if visual differences detected

### Risk 2: Registry Lookup Performance
**Mitigation**: Performance analysis and optimization
- Registry uses Map for O(1) lookups by type
- getAll() sorted once, results can be memoized in components
- Measure component render time before/after migration
- Profile if performance issues detected

### Risk 3: Incomplete Migration
**Mitigation**: Comprehensive testing
```bash
# Verify no hardcoded filter configs remain
grep -r "FILTER_CONFIG\|filter.*label.*color" src/components/ | grep -v registry
# Review results to ensure only registry references
```

## Success Metrics

### Developer Experience
- ✅ **Shotgun Surgery Eliminated**: Add filter = 1-2 files (was 6+ files)
- ✅ **Open/Closed Achieved**: Add filter without modifying components
- ✅ **Developer Guide**: Clear 3-step process documented

### Code Quality
- ✅ **Centralization**: Filter metadata in one location
- ✅ **Test Coverage**: ≥90% for filterRegistry.js
- ✅ **Visual Consistency**: Zero UI changes visible to users

### Maintainability
- ✅ **Single Change Point**: Update filter display = one registry entry change
- ✅ **Consistency**: All components use identical filter metadata
- ✅ **Extensibility**: Easy to add new configuration properties

---
*Plan follows CLAUDE.md principles and Open/Closed Principle for extensibility*
