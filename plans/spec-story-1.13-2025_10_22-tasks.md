# Tasks: Remove Cookie Persistence Middleware (Story 1.13)

**Input**: Design documents from `/Users/work/Documents/Code/Admin3/plans/spec-story-1.13-2025_10_22-plan.md`
**Branch**: `1.13-remove-cookie-middleware`
**Prerequisites**: plan.md (no research.md or contracts needed - removal task)

## Execution Flow
```
1. Load plan.md from feature directory
   → Tech stack: React 18, JavaScript ES6+, Redux Toolkit
   → Structure: Frontend-only removal (Option 2)
   → Task type: Simplification (removing code)
2. No contracts needed (removal task)
3. Generate tasks by phase:
   → Phase A: Pre-Removal Verification (ensure URL persistence works)
   → Phase B: Systematic Removal (delete files, remove imports, clean references)
   → Phase C: Post-Removal Verification (run tests, manual checks)
   → Phase D: Optional Enhancement (cookie cleanup)
4. Apply task rules:
   → Verification before removal (safety gate)
   → Systematic removal in dependency order
   → Comprehensive testing after removal
5. SUCCESS: 10 tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Pre-Removal Verification (Safety Gate)

**CRITICAL: These verification tasks MUST PASS before ANY removal**

- [x] **T001** [P] Verify URL persistence is working correctly:
  - Manual test: Apply filters in UI → verify URL updates with query parameters
  - Manual test: Copy URL with filters → paste in new tab → verify filters restored
  - Manual test: Refresh page with filters in URL → verify filters persist
  - Manual test: Share URL with filters → verify recipient sees same filters
  - Document current behavior as baseline
- [x] **T002** [P] Run existing filter tests to establish baseline:
  - Run `npm test -- filtersSlice.test.js` → document results
  - Run `npm test -- urlSyncMiddleware.test.js` → document results
  - Run `npm test -- ProductList.test.js` → document results
  - Run `npm test` (full suite) → document pass/fail count
  - Save baseline: all tests must pass before proceeding
- [x] **T003** [P] Search codebase for cookie middleware usage:
  ```bash
  # Find all cookie middleware imports
  grep -r "cookiePersistence\|cookieMiddleware" frontend/react-Admin3/src/

  # Find loadFromCookies usage
  grep -r "loadFromCookies" frontend/react-Admin3/src/

  # Verify no other dependencies
  grep -r "from.*cookiePersistence" frontend/react-Admin3/src/
  ```
  - Document all findings (file paths and line numbers)
  - Verify cookie middleware is ONLY used for filter persistence (not other features)
  - If found in non-filter context → STOP and investigate before proceeding

**GATE: ALL verification tasks (T001-T003) MUST PASS before proceeding to Phase 3.2**

## Phase 3.2: Systematic Removal (Execute in Order)

- [x] **T004** Remove cookie middleware from Redux store config in `frontend/react-Admin3/src/store/store.js`:
  - Remove import line: `import { cookieMiddleware } from '../utils/cookiePersistenceMiddleware';`
  - Remove from middleware chain: `.concat(cookieMiddleware)` or similar
  - Verify store.js compiles without errors
  - Verify Redux store still initializes correctly
- [x] **T005** Search and remove cookie actions from filtersSlice in `frontend/react-Admin3/src/store/slices/filtersSlice.js`:
  - Search for `loadFromCookies` action (if exists)
  - Remove loadFromCookies action and reducer
  - Search for any cookie-related imports
  - Remove cookie-related imports
  - Verify filtersSlice.js compiles without errors
- [x] **T006** Delete cookie middleware file:
  ```bash
  # Delete the middleware file
  rm frontend/react-Admin3/src/utils/cookiePersistenceMiddleware.js

  # Verify file deleted
  ls frontend/react-Admin3/src/utils/cookiePersistenceMiddleware.js
  # Should return: No such file or directory
  ```
  - Confirm file deletion
  - Verify no import errors in console
- [x] **T007** Final search for cookie middleware references:
  ```bash
  # Comprehensive search for any remaining references
  grep -r "cookiePersistence\|cookieMiddleware\|loadFromCookies" frontend/react-Admin3/src/

  # Should return: no matches (or only comments)
  ```
  - Document any remaining references
  - If found: investigate and remove
  - If none found: proceed to verification

## Phase 3.3: Post-Removal Verification

- [x] **T008** [P] Run full test suite and compare to baseline:
  - Run `npm test -- filtersSlice.test.js` → compare to T002 baseline
  - Run `npm test -- urlSyncMiddleware.test.js` → compare to T002 baseline
  - Run `npm test -- ProductList.test.js` → compare to T002 baseline
  - Run `npm test` (full suite) → verify pass/fail count matches or improves
  - GATE: Test results must match or improve from baseline
- [x] **T009** [P] Manual verification of filter persistence:
  - Manual test: Apply filters in UI → verify URL updates (same as T001)
  - Manual test: Refresh page → verify filters restored from URL
  - Manual test: Share URL → verify recipient sees same filters
  - Open DevTools Application tab → verify NO filter cookies created
  - Verify behavior identical to T001 baseline
  - GATE: All manual tests must match baseline behavior

## Phase 3.4: Optional Enhancement (Cookie Cleanup)

- [x] **T010** [OPTIONAL] Add legacy cookie cleanup to App.js in `frontend/react-Admin3/src/App.js`:
  - Add useEffect on mount to clear legacy filter cookies:
    ```javascript
    useEffect(() => {
      // Clear legacy filter cookies (Story 1.13)
      document.cookie.split(";").forEach((c) => {
        if (c.trim().startsWith("filters_") || c.trim().startsWith("productFilters")) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        }
      });
    }, []);
    ```
  - Test: Manually set legacy cookie → verify cleared on app load
  - Note: This is optional cleanup for users with old cookies

## Dependencies
```
Phase 3.1 (Verification) → GATE → Phase 3.2 (Removal) → Phase 3.3 (Verification) → Phase 3.4 (Optional)

Detailed:
- T001-T003 (Pre-removal verification) must ALL PASS before T004-T007 (Removal)
- T004 (Remove from store) before T005 (Remove from slice)
- T005 (Remove from slice) before T006 (Delete file)
- T006 (Delete file) before T007 (Final search)
- T007 (No references) before T008-T009 (Post-removal verification)
- T008-T009 (Verification) must PASS before T010 (Optional enhancement)
```

## Parallel Execution Examples
```bash
# Phase 3.1: Pre-Removal Verification (all parallel - independent checks)
# Launch T001-T003 together:
Task: "Verify URL persistence is working correctly"
Task: "Run existing filter tests to establish baseline"
Task: "Search codebase for cookie middleware usage"

# Phase 3.2: Removal (sequential - dependency order)
# Must run one at a time: T004 → T005 → T006 → T007

# Phase 3.3: Post-Removal Verification (parallel - independent checks)
# Launch T008-T009 together:
Task: "Run full test suite and compare to baseline"
Task: "Manual verification of filter persistence"

# Phase 3.4: Optional (single task)
# Run T010 if desired
```

## Success Metrics
- ✅ **Code Reduction**: ~100-200 lines of middleware code removed
- ✅ **Simplification**: Single persistence mechanism (URL only)
- ✅ **No Regression**: All tests pass, filter persistence works identically
- ✅ **No Cookies**: DevTools confirms no filter cookies created
- ✅ **Performance**: Potentially faster (one less middleware)

## Rollback Plan
```bash
# If T008 or T009 fails (filter persistence breaks):

# 1. Immediate rollback (5 minutes)
git stash  # Stash removal changes
npm install  # Restore dependencies if needed
npm test  # Verify rollback successful

# 2. Investigate (15 minutes)
# - Check URL persistence mechanism (urlSyncMiddleware)
# - Review error logs
# - Test individual filter types
# - Compare to baseline from T001-T002

# 3. Fix forward (1 hour)
# - Fix URL persistence if broken
# - Re-remove cookie middleware
# - Re-test thoroughly (T008-T009)
```

## Notes
- **Safety First**: Pre-removal verification (T001-T003) is CRITICAL
- **Baseline Comparison**: T002 and T008 must show identical or better results
- **Manual Testing**: T001 and T009 must show identical behavior
- **[P] tasks**: Can run in parallel (independent checks)
- **Sequential Removal**: T004-T007 must run in order (dependency chain)
- **Commit strategy**: Commit after Phase 3.2 complete and Phase 3.3 passes
- **Rollback ready**: Stash changes if verification fails

## Validation Checklist
*GATE: Checked before marking story complete*

- [x] Pre-removal verification passed (T001-T003)
- [x] Cookie middleware removed from store.js (T004)
- [x] Cookie actions removed from filtersSlice.js (T005)
- [x] Cookie middleware file deleted (T006)
- [x] No cookie middleware references remain (T007)
- [x] All tests pass (match baseline from T002) (T008)
- [x] Manual filter persistence identical to baseline (T009)
- [x] DevTools confirms no filter cookies created (T009)
- [x] URL persistence works correctly (T009)
- [x] Optional cookie cleanup added (T010) - if desired

## Important Notes

### What This Task Does
- Removes redundant cookie persistence middleware
- Relies solely on URL-based persistence (Story 1.1)
- Simplifies codebase (~100-200 lines removed)
- No user-facing changes (behavior identical)

### What This Task Does NOT Do
- Does not change URL persistence mechanism (already working)
- Does not change filter state management (Redux unchanged)
- Does not affect filter functionality (only persistence mechanism)
- Does not require new tests (existing tests verify URL persistence)

### Key Assumption
**URL persistence (Story 1.1) is already working correctly**. This task verifies that assumption in T001-T003 before removing cookies. If URL persistence is broken, the removal task should be blocked until Story 1.1 is fixed.
