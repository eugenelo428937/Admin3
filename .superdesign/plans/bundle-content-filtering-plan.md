# Implementation Plan: Content-Based Bundle Filtering

## Problem Statement

**Current Behavior**: When users search or filter products (e.g., searching "tutorial" or filtering by category "Core Study Materials"), **all bundles are displayed** unless:
1. A subject filter is explicitly specified, OR
2. The search query contains bundle-specific keywords ("bundle", "package", "combo", "set")

**Expected Behavior**: Bundles should ONLY appear when their contents match the search/filter criteria. For example:
- Searching "Core Study Materials" should only show bundles that CONTAIN Core Study Materials
- Searching "tutorial" should only show bundles that contain tutorial products
- Bundles should NOT appear for unrelated searches like "marking voucher"

## Root Cause Analysis

### Location of Issue
**File**: `backend/django_Admin3/exam_sessions_subjects_products/services/optimized_search_service.py`

### Current Logic (Lines 97-129)
```python
# Bundle inclusion is based ONLY on:
# 1. Keyword matching (bundle, package, combo, set)
# 2. Subject filtering

should_include_bundles = True
if search_query and len(search_query) >= 2:
    search_lower = search_query.lower()
    bundle_keywords = ['bundle', 'package', 'combo', 'set']
    if not any(keyword in search_lower for keyword in bundle_keywords):
        should_include_bundles = False  # Excludes ALL bundles
```

### Missing Logic
The `views.py` (lines 333-374) has content-based bundle filtering for the products endpoint:
```python
# Get the products that match the current filters
filtered_product_ids = list(products_queryset.values_list('product_id', flat=True))

if filtered_product_ids:
    # Find bundles that contain any of these products
    bundle_products_with_matching_items = ExamSessionSubjectBundleProduct.objects.filter(
        exam_session_subject_product_variation__product_id__in=filtered_product_ids
    ).values_list('bundle_id', flat=True).distinct()
```

**This logic is NOT implemented in `OptimizedSearchService`.**

## Data Model Reference

```
ExamSessionSubjectBundle
  ├── bundle_products (ExamSessionSubjectBundleProduct[])
  │     └── exam_session_subject_product_variation (FK)
  │           └── exam_session_subject_product (FK)
  │                 └── product (FK to Product)
  │                       └── groups (M2M to FilterGroup - categories)
```

## Implementation Plan

### Task 1: Add Content-Based Bundle Filtering Method

**File**: `optimized_search_service.py`
**Location**: After `_apply_bundle_filters()` method (~line 515)

**New Method**:
```python
def _filter_bundles_by_matching_products(self, bundles_queryset, matching_essp_ids):
    """
    Filter bundles to only include those containing products from the matching ESSP IDs.

    Args:
        bundles_queryset: Base bundle queryset
        matching_essp_ids: List of ExamSessionSubjectProduct IDs that match filters/search

    Returns:
        Filtered bundle queryset containing only bundles with matching products
    """
    if not matching_essp_ids:
        return bundles_queryset.none()

    from exam_sessions_subjects_products.models import ExamSessionSubjectBundleProduct

    # Find bundle IDs that contain any of the matching products
    bundle_ids_with_matching_content = ExamSessionSubjectBundleProduct.objects.filter(
        exam_session_subject_product_variation__exam_session_subject_product_id__in=matching_essp_ids,
        is_active=True
    ).values_list('bundle_id', flat=True).distinct()

    return bundles_queryset.filter(id__in=bundle_ids_with_matching_content)
```

### Task 2: Modify Bundle Filtering Logic in `search_products()`

**File**: `optimized_search_service.py`
**Location**: Lines 97-129 (replace existing logic)

**Changes**:

#### 2a. Remove Keyword-Only Approach
Replace the bundle keyword check with content-based filtering.

**Before** (current):
```python
should_include_bundles = True
if search_query and len(search_query) >= 2:
    search_lower = search_query.lower()
    bundle_keywords = ['bundle', 'package', 'combo', 'set']
    if not any(keyword in search_lower for keyword in bundle_keywords):
        should_include_bundles = False
```

**After** (new approach):
```python
# Determine bundle inclusion strategy
# If bundle keywords are in search, include all bundles (user explicitly searching for bundles)
# Otherwise, only include bundles whose contents match the search/filter results
bundle_keyword_search = False
if search_query and len(search_query) >= 2:
    search_lower = search_query.lower()
    bundle_keywords = ['bundle', 'package', 'combo', 'set']
    bundle_keyword_search = any(keyword in search_lower for keyword in bundle_keywords)
```

#### 2b. Apply Content-Based Filtering
After filtering products but BEFORE counting, filter bundles by matching content.

**Insert after line ~118** (after `filtered_queryset = self._apply_optimized_filters(...)`):
```python
# Content-based bundle filtering
# Only include bundles that contain products matching the current search/filter
if not bundle_filter_active:
    if bundle_keyword_search:
        # User explicitly searching for bundles - include all (subject-filtered)
        if filters:
            filtered_bundles_queryset = self._apply_bundle_filters(filtered_bundles_queryset, filters)
    elif filters or (use_fuzzy_search and fuzzy_essp_ids):
        # Content-based filtering: only bundles containing matching products
        matching_essp_ids = list(filtered_queryset.values_list('id', flat=True)[:1000])  # Limit for performance
        if matching_essp_ids:
            filtered_bundles_queryset = self._filter_bundles_by_matching_products(
                filtered_bundles_queryset,
                matching_essp_ids
            )
            # Also apply subject filter for consistency
            if filters:
                filtered_bundles_queryset = self._apply_bundle_filters(filtered_bundles_queryset, filters)
        else:
            # No matching products = no bundles to show
            filtered_bundles_queryset = filtered_bundles_queryset.none()
    # No filters and no search = show all bundles (home page / browse all scenario)
```

### Task 3: Optimize Query Performance

**Concern**: The content-based filtering requires an additional query to find bundle IDs.

**Mitigation**:
1. Use `values_list('id', flat=True)[:1000]` to limit the product IDs passed to the bundle query
2. Use database indexes that already exist on `ExamSessionSubjectBundleProduct`
3. The bundle count is typically small (< 50), so this additional query is acceptable

**Consider Adding Index** (if performance issues arise):
```python
# In ExamSessionSubjectBundleProduct model Meta
indexes = [
    models.Index(
        fields=['exam_session_subject_product_variation'],
        name='idx_essbp_variation'
    ),
]
```

### Task 4: Update Tests

**File**: `backend/django_Admin3/exam_sessions_subjects_products/tests/test_optimized_search_service.py`

**New Test Cases**:
```python
def test_bundles_excluded_when_search_has_no_matching_content(self):
    """Bundles should not appear when search query doesn't match any bundle contents"""
    # Search for "marking voucher" - bundles don't contain vouchers
    result = self.service.search_products(search_query='marking voucher')
    bundles = [p for p in result['products'] if p.get('is_bundle')]
    self.assertEqual(len(bundles), 0)

def test_bundles_included_when_content_matches_search(self):
    """Bundles should appear when their contents match the search"""
    # Search for a product that exists in a bundle
    result = self.service.search_products(search_query='Core Reading')
    bundles = [p for p in result['products'] if p.get('is_bundle')]
    # Should include bundles containing Core Reading
    self.assertGreater(len(bundles), 0)

def test_bundles_included_when_filter_matches_content(self):
    """Bundles should appear when their contents match category filters"""
    result = self.service.search_products(
        filters={'categories': ['Core Study Materials']}
    )
    bundles = [p for p in result['products'] if p.get('is_bundle')]
    # Bundles containing Core Study Materials should appear
    self.assertGreater(len(bundles), 0)

def test_bundles_all_included_with_bundle_keyword_search(self):
    """Bundles should all appear when user explicitly searches 'bundle'"""
    result = self.service.search_products(search_query='bundle')
    bundles = [p for p in result['products'] if p.get('is_bundle')]
    # All active bundles should appear
    self.assertGreater(len(bundles), 0)

def test_bundles_excluded_with_no_matching_filters(self):
    """Bundles should not appear when filters exclude all bundle contents"""
    # Filter for a category that bundles don't contain
    result = self.service.search_products(
        filters={'categories': ['Marking Voucher']}
    )
    bundles = [p for p in result['products'] if p.get('is_bundle')]
    self.assertEqual(len(bundles), 0)
```

### Task 5: Update Logging

**Add debug logging** for bundle filtering decisions:
```python
logger.debug(f'[BUNDLES] Content-based filtering: {len(matching_essp_ids)} matching products')
logger.debug(f'[BUNDLES] Bundles with matching content: {filtered_bundles_queryset.count()}')
```

## Implementation Order

1. **Task 1**: Add `_filter_bundles_by_matching_products()` method
2. **Task 2a**: Replace keyword-only logic with content-aware logic
3. **Task 2b**: Integrate content-based filtering into search flow
4. **Task 3**: Monitor performance, add index if needed
5. **Task 4**: Write and run tests
6. **Task 5**: Add logging for debugging

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance degradation | Medium | Limit ESSP IDs to 1000, use existing indexes |
| Breaking existing behavior | High | Preserve bundle keyword search as override |
| Edge case: empty bundles | Low | Filter handles empty results gracefully |

## Rollback Plan

If issues arise, revert to the original keyword-based approach by:
1. Restoring the `should_include_bundles` logic
2. Removing the `_filter_bundles_by_matching_products()` calls

## Success Criteria

1. Searching "marking voucher" shows NO bundles
2. Searching "Core Reading" shows bundles containing Core Reading products
3. Filtering by "Core Study Materials" shows bundles with those products
4. Searching "bundle" shows ALL bundles (explicit bundle search)
5. No filters/search shows ALL bundles (browse all scenario)
6. Performance remains under 100ms for typical queries
