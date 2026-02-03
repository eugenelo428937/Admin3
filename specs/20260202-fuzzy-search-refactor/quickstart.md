# Quickstart: Fuzzy Search Accuracy & Search Service Refactoring

**Branch**: `20260202-fuzzy-search-refactor` | **Date**: 2026-02-02

## Prerequisites

- Python 3.14 with virtual environment activated
- PostgreSQL database running (ACTEDDBDEV01)
- Django development server available on port 8888

## Setup

```bash
# Switch to feature branch
git checkout 20260202-fuzzy-search-refactor

# Navigate to backend
cd backend/django_Admin3

# Activate virtual environment (macOS/Linux)
source .venv/bin/activate

# Verify dependencies (FuzzyWuzzy should already be installed)
python -c "from fuzzywuzzy import fuzz; print('FuzzyWuzzy OK')"
```

## Development Workflow

### Run existing tests first (baseline)

```bash
# Run all search tests (expect 256 passing)
python manage.py test search -v2

# Run all filtering tests (expect 149 passing)
python manage.py test filtering -v2
```

### Task-by-task implementation order

1. **Task 1**: Weighted scoring formula
   - Test file: `search/tests/test_fuzzy_scoring.py`
   - Implementation file: `search/services/search_service.py` (lines 224-246)
   - Run: `python manage.py test search.tests.test_fuzzy_scoring -v2`

2. **Task 2**: Filter count generation in ProductFilterService
   - Test file: `filtering/tests/test_filter_counts.py`
   - Implementation file: `filtering/services/filter_service.py`
   - Run: `python manage.py test filtering.tests.test_filter_counts -v2`

3. **Task 3**: Filter delegation from SearchService
   - Test file: `search/tests/test_search_delegates_to_filter_service.py`
   - Implementation file: `search/services/search_service.py`
   - Run: `python manage.py test search.tests.test_search_delegates_to_filter_service -v2`

4. **Task 4**: Navbar filter translation
   - Test file: `search/tests/test_navbar_filter_translation.py`
   - Implementation file: `search/services/search_service.py`
   - Run: `python manage.py test search.tests.test_navbar_filter_translation -v2`

5. **Task 5**: Full regression suite
   - Run: `python manage.py test search filtering -v2`
   - Fix any assertion adjustments needed for new scoring formula

### Full test suite

```bash
# Run both apps together
python manage.py test search filtering -v2

# Run with coverage
python manage.py test search filtering --coverage
```

## Key Files

| File | Action | Lines Affected |
|------|--------|---------------|
| `search/services/search_service.py` | MODIFY | 224-246 (scoring), 37-39 (threshold), 86-158 (unified_search delegation) |
| `filtering/services/filter_service.py` | MODIFY | Add ~200 lines (new methods at end of file) |
| `search/tests/test_fuzzy_scoring.py` | CREATE | ~100 lines |
| `filtering/tests/test_filter_counts.py` | CREATE | ~50 lines |
| `search/tests/test_search_delegates_to_filter_service.py` | CREATE | ~40 lines |
| `search/tests/test_navbar_filter_translation.py` | CREATE | ~40 lines |

## Verification

After all tasks complete:

```bash
# 1. Run full test suite
python manage.py test search filtering -v2

# 2. Manual smoke test (if dev server running)
# Search for "CS2 addition mock" — mock products should rank above course notes
# Search for "CM2 study text" — study text should be top result

# 3. Check no API contract changes
# Compare response structure before/after for /api/catalog/search/ endpoint
```

## Rollback

All changes are in two service files. To rollback:

```bash
git checkout main -- backend/django_Admin3/search/services/search_service.py
git checkout main -- backend/django_Admin3/filtering/services/filter_service.py
```

Test files can be safely deleted as they test the new behavior only.
