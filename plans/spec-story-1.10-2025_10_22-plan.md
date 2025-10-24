# Implementation Plan: Centralized URL Parameter Utility

**Branch**: `1.10-centralized-url-utility` | **Date**: 2025-10-22 | **Spec**: [spec-story-1.10-2025_10_22.md](../specs/spec-story-1.10-2025_10_22.md)
**Input**: Feature specification from `/specs/spec-story-1.10-2025_10_22.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Spec loaded successfully
2. Fill Technical Context
   → Project Type: web (React frontend)
   → Structure Decision: Option 2 (frontend/backend split)
3. Constitution Check
   → No constitution file found, proceeding with CLAUDE.md guidelines
   → DRY principle applied (eliminate duplication)
   → Single Responsibility (utility for URL conversions only)
4. Execute Phase 0 → Minimal research needed
   → Review existing URL conversion patterns in codebase
5. Execute Phase 1 → Design utility API and contracts
   → Define FilterUrlManager class interface
   → Create comprehensive test suite (TDD approach)
6. Re-evaluate Constitution Check
   → Simplification achieved ✓
   → Code duplication eliminated ✓
7. Plan Phase 2 → Task generation approach documented
8. STOP - Ready for /tasks command
```

## Summary
Create a centralized FilterUrlManager utility class to eliminate duplicated URL parameter conversion logic across the codebase. Currently, URL conversion logic is scattered across urlSyncMiddleware (Story 1.1) and ProductList component (Story 1.6), causing maintenance issues and inconsistencies. This utility provides a single, well-tested source of truth for bidirectional filter ↔ URL parameter conversions.

**Primary Requirement**: Centralized utility for converting filter objects to/from URL parameters with < 1ms execution time

**Technical Approach**: Pure JavaScript utility class with static methods, comprehensive test coverage (≥95%), and integration with existing middleware and components

## Technical Context
**Language/Version**: JavaScript ES6+, React 18
**Primary Dependencies**: None (pure JavaScript, works with standard URLSearchParams API)
**Storage**: N/A (utility for URL manipulation only)
**Testing**: Jest (unit tests), React Testing Library (integration tests)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: web - React frontend utility
**Performance Goals**: < 1ms per conversion (fast enough for real-time middleware)
**Constraints**: Must maintain backward compatibility with existing URL parameter format
**Scale/Scope**: ~50-70 lines utility + ~200-300 lines comprehensive tests

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality Principles (from CLAUDE.md)
- ✅ **DRY (Don't Repeat Yourself)**: Eliminates ~150 lines of duplicated URL logic
- ✅ **Single Responsibility**: Utility focused solely on URL parameter conversions
- ✅ **Testability**: Pure functions with no dependencies, 100% testable
- ✅ **Maintainability**: Changes to URL format require updating one file only
- ✅ **Open/Closed**: Existing components use utility without modification (after initial integration)

### Test-Driven Development
- ✅ **Test First**: Write comprehensive test suite before implementation
- ✅ **High Coverage**: Target ≥95% code coverage for utility
- ✅ **Edge Cases**: Test null/undefined/empty values, malformed URLs, whitespace
- ✅ **Bidirectional**: Test filters → URL → filters integrity

**Status**: ✅ PASS - Utility pattern with TDD approach

## Project Structure

### Documentation (this feature)
```
specs/spec-story-1.10-2025_10_22/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (minimal - review existing patterns)
├── contracts/           # Phase 1 output (utility API contract)
│   └── FilterUrlManager.contract.js
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
frontend/react-Admin3/
├── src/
│   ├── utils/
│   │   └── filterUrlManager.js                # NEW: Centralized utility
│   ├── store/
│   │   ├── middleware/
│   │   │   └── urlSyncMiddleware.js          # MODIFY: Use FilterUrlManager
│   │   └── slices/
│   │       └── filtersSlice.js                # No changes (state unchanged)
│   └── components/
│       └── Product/
│           └── ProductList.js                 # MODIFY: Use FilterUrlManager
└── tests/
    └── utils/
        └── filterUrlManager.test.js           # NEW: Comprehensive tests (≥95% coverage)
```

**Structure Decision**: Option 2 (web application) - Frontend utility only

## Phase 0: Outline & Research
**Status**: Minimal research needed (existing patterns review)

### Research Tasks
1. **Review existing URL conversion logic**:
   - Study `urlSyncMiddleware.js` (Story 1.1) - how it builds URLs from filters
   - Study `ProductList.js` (Story 1.6) - how it parses URLs to filters
   - Document current parameter formats and conventions

2. **Identify URL parameter patterns**:
   - Indexed format: `subject_code=X&subject_1=Y&subject_2=Z`
   - Comma-separated: `group=A,B,C`
   - Single value: `search=query`
   - Parameter aliases: `subject` → `subject_code`, `q` → `search`

3. **Performance requirements**:
   - Target: < 1ms per conversion
   - Justification: Must be fast enough for middleware (runs on every filter change)
   - Measurement: Add performance tests to test suite

### Research Findings
```markdown
# research.md content:

## Current URL Conversion Patterns

### urlSyncMiddleware Pattern (filters → URL)
- Iterates through filter object
- Builds URLSearchParams incrementally
- Special handling for arrays (indexed vs comma-separated)
- Omits null/undefined/empty values

### ProductList Pattern (URL → filters)
- Parses URLSearchParams on mount
- Handles parameter aliases
- Converts strings to appropriate data types
- Returns filter object matching Redux state shape

### Parameter Format Conventions
| Filter Type | URL Format | Example |
|-------------|------------|---------|
| subjects | indexed | subject_code=CB1&subject_1=CB2 |
| product_types | comma-separated | group=Materials,Tutorials |
| searchQuery | single | search=mock+exam |

## Decision: Utility API Design
- Static methods (no instantiation needed)
- Pure functions (no side effects)
- Standard URLSearchParams for input/output
- Separate constants for parameter names
```

**Output**: research.md with existing pattern analysis

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. Utility API Contract
**File**: `contracts/FilterUrlManager.contract.js`

```javascript
/**
 * FilterUrlManager API Contract
 *
 * This contract defines the public API for the FilterUrlManager utility.
 * All methods are static (no instantiation required).
 */

export const FilterUrlManagerContract = {
  // Core conversion methods
  toUrlParams: {
    signature: '(filters: FilterObject) => URLSearchParams',
    description: 'Convert filter object to URL parameters',
    performance: '< 1ms',
    edgeCases: ['null filters', 'empty arrays', 'undefined values']
  },

  fromUrlParams: {
    signature: '(searchParams: URLSearchParams | string) => FilterObject',
    description: 'Parse URL parameters to filter object',
    performance: '< 1ms',
    edgeCases: ['malformed URLs', 'unknown parameters', 'whitespace handling']
  },

  buildUrl: {
    signature: '(filters: FilterObject, basePath?: string) => string',
    description: 'Build complete URL with query parameters',
    default: 'basePath = "/products"',
    performance: '< 1ms'
  },

  // Helper methods
  hasActiveFilters: {
    signature: '(filters: FilterObject) => boolean',
    description: 'Check if any filters are active',
    performance: '< 0.1ms'
  },

  areFiltersEqual: {
    signature: '(filters1: FilterObject, filters2: FilterObject) => boolean',
    description: 'Compare two filter objects for equality',
    performance: '< 0.5ms'
  },

  // Constants
  URL_PARAM_KEYS: {
    type: 'object',
    description: 'URL parameter name constants',
    values: [
      'SUBJECT', 'SUBJECT_ALIAS', 'GROUP', 'PRODUCT', 'CATEGORY',
      'MODE_OF_DELIVERY', 'SEARCH', 'SEARCH_ALIAS'
    ]
  }
};

/**
 * FilterObject Type Definition
 * Matches Redux state shape from filtersSlice
 */
export const FilterObjectType = {
  subjects: 'string[]',
  categories: 'string[]',
  product_types: 'string[]',
  products: 'string[]',
  modes_of_delivery: 'string[]',
  searchQuery: 'string'
};
```

### 2. Test Suite Structure
**File**: `tests/utils/filterUrlManager.test.js`

```javascript
describe('FilterUrlManager', () => {
  describe('toUrlParams', () => {
    // Positive cases (16 tests)
    test('converts subjects array to indexed parameters')
    test('converts product_types to comma-separated group parameter')
    test('converts all filter types simultaneously')
    test('handles single subject')
    test('handles multiple subjects (2-10)')
    // ... more positive tests

    // Negative cases (7 tests)
    test('omits null/undefined values')
    test('omits empty arrays')
    test('returns empty params for empty filters')
    test('handles null filters gracefully')
    // ... more negative tests

    // Edge cases (6 tests)
    test('trims search query whitespace')
    test('handles empty strings in arrays')
    test('handles very long filter arrays (100+ items)')
    // ... more edge cases
  });

  describe('fromUrlParams', () => {
    // Positive cases (16 tests)
    test('parses subject_code parameter to subjects array')
    test('parses multiple subjects with subject_1, subject_2')
    test('parses comma-separated group to product_types array')
    test('parses search query from search or q parameter')
    // ... more positive tests

    // Negative cases (7 tests)
    test('returns default empty filter structure for empty params')
    test('ignores unknown parameters')
    // ... more negative tests

    // Edge cases (6 tests)
    test('handles whitespace in comma-separated values')
    test('handles empty array entries from comma-separated values')
    test('accepts string parameter format')
    // ... more edge cases
  });

  describe('buildUrl', () => {
    test('builds complete URL with query parameters')
    test('returns base path for empty filters')
    test('accepts custom base path')
  });

  describe('Bidirectional conversion (idempotency)', () => {
    test('filters → URL → filters produces same result')
    test('URL → filters → URL produces same result')
  });

  describe('hasActiveFilters', () => {
    test('returns true when filters are active')
    test('returns false when no filters are active')
  });

  describe('areFiltersEqual', () => {
    test('returns true for identical filters')
    test('returns false for different filters')
  });

  describe('Performance', () => {
    test('toUrlParams executes in < 1ms')
    test('fromUrlParams executes in < 1ms')
    test('buildUrl executes in < 1ms')
  });
});

// Total: ~65 tests targeting ≥95% coverage
```

### 3. Integration Points
**Files to modify**:

1. **urlSyncMiddleware.js**
   ```javascript
   // BEFORE (inline logic - ~60 lines)
   const params = new URLSearchParams();
   if (filters.subjects && filters.subjects.length > 0) {
     filters.subjects.forEach((subject, index) => {
       if (index === 0) params.set('subject_code', subject);
       else params.set(`subject_${index}`, subject);
     });
   }
   // ... 40 more lines

   // AFTER (using utility - ~5 lines)
   import { FilterUrlManager } from '../../utils/filterUrlManager';
   const newUrl = FilterUrlManager.buildUrl(filters, '/products');
   window.history.replaceState({}, '', newUrl);
   ```

2. **ProductList.js**
   ```javascript
   // BEFORE (inline parsing - ~35 lines)
   const params = new URLSearchParams(location.search);
   const filters = { subjects: [], categories: [], ... };
   const mainSubject = params.get('subject_code') || params.get('subject');
   if (mainSubject) filters.subjects.push(mainSubject);
   // ... 30 more lines

   // AFTER (using utility - ~3 lines)
   import { FilterUrlManager } from '../../utils/filterUrlManager';
   const filters = FilterUrlManager.fromUrlParams(location.search);
   dispatch(setMultipleFilters(filters));
   ```

### 4. No Data Model Changes
Filter state model unchanged - utility operates on existing Redux state shape.

### 5. No API Endpoints
Frontend utility only - no backend changes.

**Output**: contracts/FilterUrlManager.contract.js, comprehensive test structure, integration points documented

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy
TDD approach - tests before implementation:

**Task Categories**:
1. **Setup Tasks** [P]
   - Create filterUrlManager.js file (empty/stub)
   - Create filterUrlManager.test.js file
   - Export URL_PARAM_KEYS constants

2. **Test Tasks** [RED phase - tests fail initially]
   - Write toUrlParams tests (32 tests)
   - Write fromUrlParams tests (32 tests)
   - Write buildUrl tests (3 tests)
   - Write helper method tests (4 tests)
   - Write bidirectional tests (2 tests)
   - Write performance tests (3 tests)

3. **Implementation Tasks** [GREEN phase - make tests pass]
   - Implement toUrlParams method
   - Implement fromUrlParams method
   - Implement buildUrl method
   - Implement hasActiveFilters method
   - Implement areFiltersEqual method

4. **Integration Tasks** [Sequential]
   - Update urlSyncMiddleware to use FilterUrlManager
   - Update ProductList to use FilterUrlManager
   - Remove inline URL logic from both files

5. **Verification Tasks** [P]
   - Run test suite (verify ≥95% coverage)
   - Run existing filter tests (verify no regression)
   - Manual testing (verify URL sync still works)

### Ordering Strategy
**TDD Order**:
1. RED: Write failing tests
2. GREEN: Implement to make tests pass
3. REFACTOR: Optimize and clean up
4. INTEGRATE: Update existing components
5. VERIFY: Run all tests and manual checks

**Estimated Output**: 18-22 numbered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run tests, verify coverage ≥95%, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**Status**: No violations - utility pattern is standard practice

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A - Standard utility pattern      |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (existing pattern review)
- [x] Phase 1: Design complete (API contract defined)
- [x] Phase 2: Task planning complete (TDD approach documented)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (DRY principle, testability)
- [x] Post-Design Constitution Check: PASS (clean utility API)
- [x] All NEEDS CLARIFICATION resolved (existing patterns documented)
- [x] Complexity deviations documented (N/A - simplifying)

## Risk Mitigation

### Risk 1: Breaking URL Compatibility
**Mitigation**: Bidirectional conversion tests ensure URL format consistency
- Test filters → URL → filters produces identical result
- Test with existing bookmark URLs
- Gradual rollout if needed

### Risk 2: Performance Regression
**Mitigation**: Performance tests in test suite
- Measure execution time for each method
- Target: < 1ms per conversion
- Profile if performance issues detected

### Risk 3: Incomplete Migration
**Mitigation**: Code search verification
```bash
# Verify no hardcoded URL parameter names remain
grep -r "subject_code\|group\|product" --include="*.js" src/ | grep -v filterUrlManager
# Review results to ensure only legitimate references
```

## Success Metrics

### Code Quality
- ✅ **LOC Reduction**: ~150 lines of duplicated logic → ~50 lines utility
- ✅ **Test Coverage**: ≥95% for filterUrlManager.js
- ✅ **Maintainability**: One file to update for URL format changes

### Performance
- ✅ **Execution Time**: < 1ms per conversion (measured)
- ✅ **No Regression**: Middleware performance unchanged or improved

### Correctness
- ✅ **Bidirectional Integrity**: filters → URL → filters is lossless
- ✅ **Edge Case Handling**: Null/undefined/empty values handled gracefully
- ✅ **Alias Support**: Parameter aliases work correctly

---
*Plan follows CLAUDE.md TDD principles and DRY principle*
