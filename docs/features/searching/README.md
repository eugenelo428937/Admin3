# Search System

Product search in Admin3 is handled by two search paths that share a common scoring engine.

## Architecture Overview

```
Frontend
  |
  +--> SearchBox (search modal dropdown)
  |      |
  |      +--> GET /api/catalog/search/        (catalog app - navigation_views.py)
  |             Returns: suggested_filters + suggested_products (top 5)
  |
  +--> ProductList (products page)
         |
         +--> POST /api/search/unified/       (search app - views.py)
                Returns: full product list + filter_counts + pagination
```

Both endpoints delegate store-product scoring to `SearchService._calculate_fuzzy_score()` in `search/services/search_service.py`.

## Scoring Formula

All product scoring uses a **weighted composite formula** (R1):

```
score = 0.15 * subject_bonus
      + 0.40 * token_sort_ratio
      + 0.25 * partial_name_ratio
      + 0.20 * token_set_ratio
```

| Component | Weight | Source | Description |
|-----------|--------|--------|-------------|
| `subject_bonus` | 0.15 | Binary: 0 or 100 | 100 if query starts with the product's subject code |
| `token_sort_ratio` | 0.40 | `fuzz.token_sort_ratio(query, searchable_text)` | Word-order-independent similarity |
| `partial_name_ratio` | 0.25 | `fuzz.partial_ratio(query, product_name)` | Substring match against product short name |
| `token_set_ratio` | 0.20 | `fuzz.token_set_ratio(query, searchable_text)` | Handles extra/missing words |

**Minimum threshold**: 45 (products scoring below this are excluded from results).

### Searchable Text

Built from `store.Product` fields by `SearchService._build_searchable_text()`:

```
{catalog_product.fullname} {catalog_product.shortname} {subject.code} {variation.name}
```

Example: `"course notes course notes cs1 vitalsource ebook"` (lowercased).

## API Endpoints

### Catalog Search (Search Modal)

```
GET /api/catalog/search/?q=cs1+course+notes&limit=5&min_score=45
```

Used by the **SearchBox** component for the search modal dropdown. Returns suggested filters (subjects, product groups) alongside suggested products.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | required | Search query |
| `limit` | int | 5 | Max suggested products |
| `min_score` | int | 45 | Minimum fuzzy score (0-100) |

**Response shape**:
```json
{
  "suggested_filters": {
    "subjects": [...],
    "product_groups": [...],
    "variations": [],
    "products": [...]
  },
  "suggested_products": [...],
  "query": "cs1 course notes",
  "total_count": 15,
  "total_matches": {
    "subjects": 1,
    "product_groups": 3,
    "products": 15
  }
}
```

**Source**: `catalog/views/navigation_views.py` > `fuzzy_search()`

### Unified Search (Products Page)

```
POST /api/search/unified/
```

Primary search endpoint used by the **ProductList** component. Supports filters, pagination, fuzzy search, and navbar dropdown navigation.

**Request body**:
```json
{
  "searchQuery": "cs1 course notes",
  "filters": {
    "subjects": ["CS1"],
    "categories": [],
    "product_types": [],
    "products": [],
    "modes_of_delivery": []
  },
  "pagination": { "page": 1, "page_size": 20 },
  "options": { "include_bundles": true }
}
```

**Response shape**:
```json
{
  "products": [...],
  "filter_counts": {
    "subjects": { "CS1": 12, "CB1": 10 },
    "categories": { ... }
  },
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_count": 42,
    "has_next": true,
    "has_previous": false,
    "total_pages": 3
  }
}
```

**Source**: `search/views.py` > `UnifiedSearchView`

### Fuzzy Search (Standalone)

```
GET /api/search/fuzzy/?q=course+notes&min_score=60&limit=50
```

Standalone fuzzy search returning products only (no filter suggestions).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | required (min 2 chars) | Search query |
| `min_score` | int | 60 | Minimum fuzzy score |
| `limit` | int | 50 | Max results |

**Source**: `search/views.py` > `FuzzySearchView`

### Advanced Fuzzy Search

```
GET /api/search/advanced-fuzzy/?q=notes&subjects=1,2&categories=5&min_score=65
```

Fuzzy search with subject and category pre-filtering.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | optional | Search query |
| `subjects` | string | - | Comma-separated subject IDs |
| `categories` | string | - | Comma-separated category IDs |
| `min_score` | int | 65 | Minimum fuzzy score |
| `limit` | int | 50 | Max results |

**Source**: `search/views.py` > `AdvancedFuzzySearchView`

### Catalog Advanced Search

```
GET /api/catalog/advanced-search/?q=mock&subjects=CS1&page=1&page_size=20
```

Advanced product search with multiple filters and pagination, served from the catalog app.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | optional | Text search query |
| `subjects` | list | - | Subject codes |
| `groups` | list | - | Product group IDs |
| `variations` | list | - | Variation IDs |
| `products` | list | - | Product IDs |
| `page` | int | 1 | Page number |
| `page_size` | int | 20 | Items per page |

**Source**: `catalog/views/navigation_views.py` > `advanced_product_search()`

## Management Commands

### `debug_search`

Diagnostic command that shows the top matching products for a query with full score breakdown.

```bash
cd backend/django_Admin3

# Basic usage - top 10 results
python manage.py debug_search "cs1 course notes"

# Show top 20 results
python manage.py debug_search "cs1 additional mock" --top 20

# Show all results above threshold
python manage.py debug_search "cb1" --all

# Custom minimum score
python manage.py debug_search "course notes" --min-score 30
```

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `query` | positional | required | Search query to debug |
| `--top` | int | 10 | Number of top results to show |
| `--min-score` | int | 45 (from SearchService) | Minimum score threshold |
| `--all` | flag | false | Show all results above threshold |

**Example output**:
```
  Search Debug: "cs1 course notes"
  31 matches (of 336 active products) | min_score=45 | showing top 10
  Formula: score = 0.15*subject + 0.40*token_sort + 0.25*partial_name + 0.20*token_set
  ------------------------------------------------------------------------------------------

  #  1  score=80  (raw=80.4)
       product_code: CS1/CN/25S
       subject: CS1  |  product_name: course notes
       searchable_text: course notes course notes cs1 vitalsource ebook
       breakdown: subject=100(*0.15=15.0) + token_sort=51(*0.40=20.4) + partial_name=100(*0.25=25.0) + token_set=100(*0.20=20.0)

  #  2  score=63  (raw=62.6)
       product_code: CP1/CN/25S
       subject: CP1  |  product_name: course notes
       searchable_text: course notes course notes cp1 vitalsource ebook
       breakdown: subject=0(*0.15=0.0) + token_sort=51(*0.40=20.4) + partial_name=100(*0.25=25.0) + token_set=86(*0.20=17.2)
```

The command uses the same `SearchService._build_searchable_text()` and `SearchService._calculate_fuzzy_score()` methods as the live endpoints, so the scores always match production behavior.

**Source**: `search/management/commands/debug_search.py`

## Key Source Files

| File | Purpose |
|------|---------|
| `search/services/search_service.py` | Core scoring engine (`_calculate_fuzzy_score`, `_build_searchable_text`, `unified_search`) |
| `search/views.py` | Search API views (unified, fuzzy, advanced-fuzzy, default-data) |
| `search/urls.py` | URL routing for `/api/search/` endpoints |
| `search/serializers.py` | Product serialization (`StoreProductListSerializer`) |
| `catalog/views/navigation_views.py` | Catalog search views (`fuzzy_search`, `advanced_product_search`) |
| `search/management/commands/debug_search.py` | Score debugging command |

## Tests

Search tests are in `search/tests/`:

| File | Coverage |
|------|----------|
| `test_fuzzy_scoring.py` | Weighted composite scoring formula |
| `test_views.py` | API endpoint integration tests |
| `test_views_coverage.py` | Additional view coverage |
| `test_bundle_filtering.py` | Bundle search and filtering |
| `test_disjunctive_faceting.py` | Disjunctive facet counts |
| `test_serializers.py` | Product serialization |
| `test_search_delegates_to_filter_service.py` | Filter delegation |
| `test_navbar_filter_translation.py` | Navbar filter translation |

Catalog search ranking tests are in `catalog/tests/test_catalog_search_ranking.py`.

```bash
# Run all search tests
python manage.py test search

# Run catalog search ranking tests
python manage.py test catalog.tests.test_catalog_search_ranking

# Run specific scoring tests
python manage.py test search.tests.test_fuzzy_scoring
```
