# Bug Fix: Conjunctive Filter Counts Preventing Multiple Subject Selection

**Issue**: After selecting one subject filter (e.g., CS1), all other subject checkboxes disappear from the filter panel, preventing users from selecting multiple subjects.

**Date**: 2025-10-23
**Story**: 1.10 - Centralized URL Parameter Utility
**Status**: IN PROGRESS

## Root Cause

The filter panel is **NOT** collapsing - it stays expanded. The real issue is that filter counts are being calculated **conjunctively** instead of **disjunctively**.

### Backend Flow

1. User selects CS1 subject
2. Frontend sends request: `{ filters: { subjects: ['CS1'] } }`
3. Backend applies all filters to queryset (line 88-93)
4. Backend passes **filtered queryset** to `_generate_optimized_filter_counts` (line 108)
5. Filter counts calculated from **already-filtered** queryset
6. Result: Only CS1 appears in subject counts (no CS2, CM2, etc.)

### Evidence from Browser Testing

**Before selecting CS1:**
```yaml
- heading "Subjects" [expanded]:
  - checkbox "CS1 (23)"
  - checkbox "CS2 (22)"
  - checkbox "CM2 (22)"
  # ... 22 total subjects
```

**After selecting CS1:**
```yaml
- heading "Subjects" [expanded]:  # ← Still expanded!
  - checkbox "CS1 (23)" [checked]
  # ← Only CS1 visible, all others disappeared
```

## Problem Code

**File**: `backend/django_Admin3/exam_sessions_subjects_products/services/optimized_search_service.py`

### Line 88-108 (Current - BROKEN):
```python
# Apply filters
if filters:
    queryset = self._apply_optimized_filters(queryset, filters)  # ← Filters applied

# Apply navbar filters
if navbar_filters:
    queryset = self._apply_navbar_filters(queryset, navbar_filters)

# Get counts for pagination
total_count = queryset.count()

# Apply pagination
start_idx = (page - 1) * page_size
end_idx = start_idx + page_size
paginated_queryset = queryset[start_idx:end_idx]

# Serialize results
serializer = ProductListSerializer(paginated_queryset, many=True)
products_data = serializer.data

# Generate filter counts
filter_counts = self._generate_optimized_filter_counts(filters, queryset)
#                                                              ^^^^^^^^
#                                                              Already filtered! ❌
```

### Line 331-363 (Filter Count Calculation - CONJUNCTIVE):
```python
def _generate_optimized_filter_counts(self, applied_filters, base_queryset):
    """
    Generate disjunctive facet counts using the FilterConfiguration system.
    """
    # ...

    # Subject filter - CONJUNCTIVE (wrong!)
    subject_counts = base_queryset.values(  # ← base_queryset already filtered
        'exam_session_subject__subject__code'
    ).annotate(count=Count('id')).order_by('-count')

    for item in subject_counts:
        code = item['exam_session_subject__subject__code']
        count = item['count']
        if code and count > 0:
            filter_counts['subjects'][code] = {
                'count': count,
                'name': code
            }
```

## Solution: Disjunctive Faceting

For proper disjunctive faceting, when counting subjects:
1. Start with unfiltered base queryset
2. Apply ALL filters EXCEPT subjects
3. Count products for each subject

Example:
```
Filters applied: subjects=['CS1'], categories=['Bundle']

When counting subjects:
- Apply: categories=['Bundle']
- Do NOT apply: subjects filter
- Count: How many products match each subject + Bundle category
- Result: CS1 (15), CS2 (10), CM2 (8), ... ← All subjects visible!
```

## Proposed Fix

### Option 1: Pass Unfiltered Queryset (RECOMMENDED)

**Change line 78-108:**
```python
# Build optimized queryset
base_queryset = self._build_optimized_queryset(use_fuzzy_sorting=use_fuzzy_search)

# If using fuzzy search, filter base queryset
if use_fuzzy_search and fuzzy_essp_ids:
    from django.db.models import Case, When, IntegerField
    preserved_order = Case(*[When(id=pk, then=pos) for pos, pk in enumerate(fuzzy_essp_ids)], output_field=IntegerField())
    base_queryset = base_queryset.filter(id__in=fuzzy_essp_ids).order_by(preserved_order)

# Create filtered queryset for products
filtered_queryset = base_queryset

# Apply filters to get products
if filters:
    filtered_queryset = self._apply_optimized_filters(filtered_queryset, filters)

if navbar_filters:
    filtered_queryset = self._apply_navbar_filters(filtered_queryset, navbar_filters)

# Get counts and paginate filtered results
total_count = filtered_queryset.count()
start_idx = (page - 1) * page_size
end_idx = start_idx + page_size
paginated_queryset = filtered_queryset[start_idx:end_idx]

# Serialize results
serializer = ProductListSerializer(paginated_queryset, many=True)
products_data = serializer.data

# Generate filter counts using BASE (unfiltered) queryset
filter_counts = self._generate_optimized_filter_counts(
    filters,
    base_queryset  # ← Pass unfiltered queryset! ✅
)
```

### Option 2: Implement True Disjunctive Faceting

Modify `_generate_optimized_filter_counts` to apply filters selectively:

```python
def _generate_optimized_filter_counts(self, applied_filters, base_queryset):
    filter_counts = {
        'subjects': {},
        'categories': {},
        'product_types': {},
        'products': {},
        'modes_of_delivery': {}
    }

    # For each filter type, exclude it from the applied filters
    filter_types_to_count = ['subjects', 'categories', 'product_types', 'modes_of_delivery']

    for filter_type in filter_types_to_count:
        # Create temporary filters excluding current type
        temp_filters = {k: v for k, v in applied_filters.items() if k != filter_type}

        # Apply temporary filters
        temp_queryset = base_queryset
        if temp_filters:
            temp_queryset = self._apply_optimized_filters(temp_queryset, temp_filters)

        # Count options for this filter type
        if filter_type == 'subjects':
            subject_counts = temp_queryset.values(
                'exam_session_subject__subject__code'
            ).annotate(count=Count('id')).order_by('-count')

            for item in subject_counts:
                code = item['exam_session_subject__subject__code']
                count = item['count']
                if code and count > 0:
                    filter_counts['subjects'][code] = {
                        'count': count,
                        'name': code
                    }

        # Similar logic for categories, product_types, modes_of_delivery...

    return filter_counts
```

## Testing Plan

After implementing fix:

1. **Navigate to `/products`**
2. **Select CS1**: Click CS1 checkbox
3. **Verify**: Subjects accordion remains open
4. **Verify**: URL shows `?subject_code=CS1`
5. **Verify**: Products filtered to CS1 only (23 products)
6. **Verify**: Subject filter panel shows:
   - ✅ CS1 (23) [checked]
   - ✅ CS2 (22) [unchecked] ← Should be visible!
   - ✅ CM2 (22) [unchecked] ← Should be visible!
   - ✅ ... all other subjects visible
7. **Select CS2**: Click CS2 checkbox
8. **Verify**: URL shows `?subject_code=CS1&subject_1=CS2`
9. **Verify**: Products show CS1 + CS2 combined
10. **Verify**: Both CS1 and CS2 checkboxes are checked
11. **Verify**: All other subjects still visible

## Performance Considerations

**Option 1 (Recommended)**:
- Minimal performance impact
- One query for products, one for filter counts
- Filter counts calculated from larger dataset (but still indexed)

**Option 2 (True Disjunctive)**:
- More database queries (one per filter type)
- More complex but more flexible
- Allows for advanced filtering scenarios

## Recommendation

**Use Option 1** for immediate fix:
- Simple change (one line)
- Fixes the issue
- Minimal performance impact
- Aligns with method parameter name (`base_queryset`)

**Consider Option 2** for future enhancement:
- More sophisticated
- Better for complex multi-filter scenarios
- May require performance optimization (caching, etc.)

## Files to Modify

1. `/backend/django_Admin3/exam_sessions_subjects_products/services/optimized_search_service.py`
   - Line 78-108: Separate base and filtered querysets
   - Pass `base_queryset` to `_generate_optimized_filter_counts`

## Related Issues

- Story 1.10: Centralized URL Parameter Utility
- Frontend filter panel NOT collapsing (accordion state works correctly)
- FilterUrlManager integration
- URL synchronization middleware

## Notes

- Frontend code is working correctly (accordion stays expanded, state persists via sessionStorage)
- Backend is returning incomplete filter counts
- This is NOT a React.StrictMode issue
- This is NOT a URL synchronization issue
- This is a backend filter counting issue

## Additional Context

The comment on line 333 claims "Generate disjunctive facet counts" but the implementation is actually conjunctive. This suggests the intent was there but the implementation doesn't match.
