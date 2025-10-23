# Product Sorting Behavior

**Date:** 2025-10-23
**Status:** Implemented

## Overview

Different endpoints now have different default sorting behaviors:
1. **Product List Page** (`/list-products/`): Sort by subject code (alphabetical)
2. **Unified Search** (`/search/`): Sort by subject code (alphabetical) + product name
3. **Fuzzy Search** (`/fuzzy-search/?q=...`): Sort by relevance score (best match first)

## Implementation

### Product List Endpoint (`/api/exam-sessions-subjects-products/list-products/`)

**Default Sort:** Subject code (alphabetical: CB1, CB2, CM1, CM2, CP1, CP2, CS1, CS2, SA1, SA2, etc.)

**Location:** `backend/django_Admin3/exam_sessions_subjects_products/views.py` (lines 466-478)

```python
# ===== COMBINE, SORT, AND PAGINATE =====
all_items = transformed_bundles + transformed_products

# Sort by subject code (default for product listing)
# Both bundles have 'code' and products have 'subject_code'
all_items.sort(key=lambda x: x.get('code') or x.get('subject_code', ''))

total_count = len(all_items)

# Apply pagination to combined results
start_index = (page - 1) * page_size
end_index = start_index + page_size
paginated_items = all_items[start_index:end_index]
```

**Behavior:**
- Products and bundles are mixed together
- Sorted alphabetically by subject code
- Same subject products appear grouped together
- Within a subject, products appear in database order

**Example Order:**
```
CB1 Additional Mock Pack
CB1 Core Reading
CB1 Flash Cards
CB2 Additional Mock Pack
CB2 Core Reading
CM1 Core Reading
CM1 Mock Exam
CS1 Core Reading
CS1 Course Notes
CS1 Mock Exam
CS2 Core Reading
```

### Unified Search Endpoint (`/api/exam-sessions-subjects-products/search/`)

**Default Sort:** Subject code (alphabetical), then product name (alphabetical)

**Location:** `backend/django_Admin3/exam_sessions_subjects_products/services/optimized_search_service.py` (line 129)

```python
.order_by('exam_session_subject__subject__code', 'product__shortname')
```

**Behavior:**
- Products sorted by subject code first (CB1, CB2, CM1, etc.)
- Within same subject, products sorted by product name
- Used for filtered browsing (no search query)
- Consistent ordering for filter combinations

**Example Order with Filters:**
```
Filters: {subjects: ["CS1", "CS2"], categories: ["Core Study Material"]}

Results:
CS1 Core Reading
CS1 Course Notes
CS1 Revision Notes
CS2 Core Reading
CS2 Course Notes
CS2 Revision Notes
```

### Fuzzy Search Endpoint (`/api/exam-sessions-subjects-products/fuzzy_search/`)

**Default Sort:** Relevance score (uncapped weighted score, best match first)

**Location:** `backend/django_Admin3/exam_sessions_subjects_products/services/fuzzy_search_service.py` (lines 139-141)

```python
# Sort products by uncapped fuzzy score (highest first) for accurate ranking
# x[2] is uncapped_score, x[1] is capped display score
products_with_scores.sort(key=lambda x: x[2], reverse=True)
```

**Behavior:**
- Products sorted by relevance to search query
- Uses uncapped weighted scores for accurate ranking
- Display scores capped at 100 for UX consistency
- Best matches appear first regardless of subject

**Example Order for "CS1 Cor":**
```
1. CS1 Core Reading (display: 100, internal: 300)
2. CS1 Course Notes (display: 100, internal: 201)
3. CS1 Mock Exam (display: 99, internal: 99)
4. CS2 Core Reading (display: 75, internal: 75)
```

## Field Mapping

### Products (from ProductListSerializer)
- Field: `subject_code`
- Source: `exam_session_subject.subject.code`

### Bundles (transformed in views.py)
- Field: `code`
- Source: `subject_code` from bundle data

### Sorting Lambda
```python
x.get('code') or x.get('subject_code', '')
```
- Tries 'code' first (bundles)
- Falls back to 'subject_code' (products)
- Default to empty string if neither exists

## Cache Behavior

### List Products Cache
- Cache key includes: page, page_size, and all filter parameters
- Sorted results are cached for 5 minutes (300 seconds)
- Cache invalidated on filter changes
- Sorting order is consistent for same filter combination

**Cache Key Pattern:**
```python
cache_key = f"products_bundles_list_{hash(str(sorted(cache_key_params.items())))}"
```

### Search Results Cache
- Search service has its own caching mechanism
- Results cached per query + min_score + limit combination
- Uncapped scores stored in cache for consistent sorting

## API Response Examples

### List Products Response
```json
{
  "results": [
    {
      "subject_code": "CB1",
      "product_name": "Additional Mock Pack",
      ...
    },
    {
      "subject_code": "CB1",
      "product_name": "Core Reading",
      ...
    },
    {
      "subject_code": "CB2",
      "product_name": "Additional Mock Pack",
      ...
    }
  ],
  "count": 150,
  "page": 1,
  "page_size": 50
}
```

### Search Results Response
```json
{
  "products": [
    {
      "subject_code": "CS1",
      "product_name": "Core Reading",
      "score": 100,
      ...
    },
    {
      "subject_code": "CS1",
      "product_name": "Course Notes",
      "score": 100,
      ...
    }
  ],
  "total_count": 15,
  "search_info": {
    "query": "CS1 Cor",
    "min_score": 60
  }
}
```

## Testing

### Test List Products Sorting
```bash
# Get products without filters - should be sorted by subject code
curl "http://localhost:8888/api/exam-sessions-subjects-products/list-products/?page=1&page_size=10"

# Expected: CB1, CB2, CM1, CM2, CP1, CP2, CS1, CS2, etc.
```

### Test Unified Search Sorting
```bash
# POST filtered search - should be sorted by subject code + product name
curl -X POST "http://localhost:8888/api/exam-sessions-subjects-products/search/" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {"subjects": ["CS1", "CS2"]},
    "pagination": {"page": 1, "page_size": 10}
  }'

# Expected: CS1 products first (alphabetical), then CS2 products
```

### Test Fuzzy Search Sorting
```bash
# GET text search - should be sorted by relevance
curl "http://localhost:8888/api/exam-sessions-subjects-products/fuzzy_search/?q=CS1%20Cor&limit=10"

# Expected: CS1 Core Reading first (best match), then CS1 Course Notes
```

## Related Documentation

- **Uncapped Score Sorting:** `FUZZY-SEARCH-UNCAPPED-SCORING.md`
- **Field-Specific Matching:** `FUZZY-SEARCH-FIELD-SPECIFIC-MATCHING.md`
- **Debug Logging:** `FUZZY-SEARCH-DEBUG-LOGGING.md`

## Notes

- List products endpoint does NOT sort by relevance (no search query)
- Search endpoint does NOT sort by subject code (irrelevant for search results)
- Both endpoints maintain their own caching mechanisms
- Sorting happens AFTER filtering but BEFORE pagination
- Cache keys ensure different sorting orders don't interfere with each other
