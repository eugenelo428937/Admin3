# Fuzzy Search Accuracy Improvement & Search Service Refactoring

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve fuzzy search ranking accuracy (e.g., "CS2 addition mock" should rank mock-related products above course notes) and refactor the search service to eliminate filter logic duplication by delegating to `ProductFilterService`.

**Architecture:** The search service currently duplicates filter application logic from the filtering app. We will (1) fix the scoring algorithm to use weighted multi-field matching instead of naive `max()`, (2) extract `_generate_filter_counts` into the filtering app as a new method on `ProductFilterService`, and (3) have `SearchService` delegate all filter operations to `ProductFilterService`.

**Tech Stack:** Python 3.14, Django 6.0, FuzzyWuzzy, Django REST Framework

---

## Analysis: Why "CS2 addition mock" Returns Wrong Results

### Root Cause

The current `_calculate_fuzzy_score()` at [search_service.py:224-246](backend/django_Admin3/search/services/search_service.py#L224-L246) uses `max(scores)` across four algorithms. This causes a **subject-code bonus domination problem**:

```python
# Current scoring for query "cs2 addition mock":
#
# Product: "CS2 Course Notes" (WRONG - ranked #1)
#   - subject_code "cs2" matches query prefix → bonus 95
#   - token_sort_ratio("cs2 addition mock", "cs2 course notes cs2 course notes cs2 printed") → ~55
#   - partial_ratio("cs2 addition mock", "cs2 course notes") → ~60
#   - token_set_ratio → ~50
#   - FINAL: max(95, 55, 60, 50) = 95  ← Subject bonus dominates!
#
# Product: "CS2 Additional Mock Exam Marking" (CORRECT - should be #1)
#   - subject_code "cs2" matches query prefix → bonus 95
#   - token_sort_ratio("cs2 addition mock", "cs2 additional mock exam marking...") → ~85
#   - partial_ratio("cs2 addition mock", "cs2 mock") → ~70
#   - token_set_ratio → ~80
#   - FINAL: max(95, 85, 70, 80) = 95  ← Same score! Ordering is arbitrary.
```

**Problem 1**: `max()` discards the quality differences between products. Both get 95 because the subject bonus caps them equally.

**Problem 2**: The subject bonus (95) is a flat value that doesn't differentiate between "CS2 Course Notes" and "CS2 Additional Mock Exam". Once both match on subject code, they're tied.

**Problem 3**: No field-level weighting. The product name "Additional Mock Exam Marking" strongly matches "addition mock" but this signal is lost in the `max()` aggregation.

### Solution: Weighted Composite Score

Replace `max(scores)` with a **weighted composite formula**:

```
final_score = (
    0.15 * subject_bonus +         # Subject match is a qualifier, not dominator
    0.40 * token_sort_ratio +       # Primary: word-order-independent full text match
    0.25 * partial_ratio_name +     # Secondary: substring match on product name
    0.20 * token_set_ratio          # Tertiary: word-set overlap
)
```

With this formula for "cs2 addition mock":
- **CS2 Additional Mock Exam Marking**: `0.15*95 + 0.40*85 + 0.25*70 + 0.20*80 = 14.25 + 34 + 17.5 + 16 = 81.75`
- **CS2 Course Notes**: `0.15*95 + 0.40*55 + 0.25*60 + 0.20*50 = 14.25 + 22 + 15 + 10 = 61.25`

Now the mock product correctly ranks 20 points higher.

---

## Analysis: `_apply_filters` vs `_apply_navbar_filters`

### `_apply_filters` ([search_service.py:248-322](backend/django_Admin3/search/services/search_service.py#L248-L322))

- **Source**: POST request body (`filters` dict from FilterPanel UI)
- **Parameters**: `subjects`, `categories`, `product_types`, `products`, `modes_of_delivery`
- **Resolution**: Group names resolved to IDs via `_resolve_group_ids_with_hierarchy()`
- **M2M handling**: Separate `.filter()` calls for categories and product_types (correct Django M2M pattern)
- **Use case**: Side filter panel refinement (multi-select checkboxes)

### `_apply_navbar_filters` ([search_service.py:324-363](backend/django_Admin3/search/services/search_service.py#L324-L363))

- **Source**: GET query parameters (from top navigation dropdowns)
- **Parameters**: `group`, `tutorial_format`, `product`, `distance_learning`
- **Resolution**: Direct `FilterGroup.objects.get()` by code/name
- **M2M handling**: Single `.filter()` per param (simpler, no hierarchy expansion)
- **Use case**: Navigation menu drill-down (e.g., "Show all Materials" from navbar)

### Key Difference

`_apply_filters` handles **complex multi-dimensional filtering with hierarchy** (user builds up filter selections). `_apply_navbar_filters` handles **simple single-dimension navigation** (user clicks a navbar link). Both ultimately filter on `product__groups` but through different resolution paths.

### Recommendation

Both should delegate to `ProductFilterService` strategies. The navbar filters can be translated into the same filter dict format and passed through the same pipeline.

---

## Analysis: Moving `_generate_filter_counts` to Filtering App

### Current State

`_generate_filter_counts` lives in `SearchService` ([search_service.py:486-638](backend/django_Admin3/search/services/search_service.py#L486-L638)). It:
1. Calls `_apply_filters_excluding()` which calls `_apply_filters()` — duplicating filter logic
2. Queries `FilterConfigurationGroup` — a filtering app model
3. Uses `FilterGroup.get_descendants()` — a filtering app method
4. Implements disjunctive faceting — a pure filter concern

### Why Move It

| Concern | Current Owner | Correct Owner |
|---------|--------------|---------------|
| Filter configuration | filtering | filtering |
| Filter application | **search** (duplicate) | filtering |
| Filter count generation | **search** | filtering |
| Hierarchy resolution | **search** (duplicate) | filtering |
| Fuzzy search | search | search |
| Bundle matching | search | search |

The search service should focus on **search** (fuzzy matching, relevance ranking). Filter operations belong in the filtering app.

### Proposed Architecture

```
SearchService.unified_search()
  ├── _build_optimized_queryset()          # Search concern: base queryset
  ├── _fuzzy_search_ids()                  # Search concern: relevance matching
  ├── filter_service.apply_filters()       # DELEGATE to filtering app
  ├── _get_bundles()                       # Search concern: bundle matching
  ├── serialize results                    # Search concern: response format
  └── filter_service.generate_filter_counts()  # DELEGATE to filtering app
```

After refactoring, `SearchService` returns matched store.Product IDs from fuzzy search, then hands the queryset to `ProductFilterService` for all filter operations including count generation.

---

## Task 1: Add Weighted Scoring to `_calculate_fuzzy_score`

**Files:**
- Modify: `backend/django_Admin3/search/services/search_service.py:224-246`
- Test: `backend/django_Admin3/search/tests/test_fuzzy_scoring.py` (create)

### Step 1: Write failing tests for weighted scoring

Create test file `backend/django_Admin3/search/tests/test_fuzzy_scoring.py`:

```python
"""Tests for fuzzy search scoring accuracy.

Validates that the weighted composite scoring algorithm ranks
products correctly for common search patterns.
"""
from unittest.mock import MagicMock
from django.test import TestCase
from search.services.search_service import SearchService


class TestCalculateFuzzyScore(TestCase):
    """Test _calculate_fuzzy_score weighted composite scoring."""

    def setUp(self):
        self.service = SearchService()

    def _make_store_product(self, subject_code, shortname, fullname, variation_name):
        """Create a mock store product for scoring tests."""
        sp = MagicMock()
        sp.exam_session_subject.subject.code = subject_code
        sp.product_product_variation.product.shortname = shortname
        sp.product_product_variation.product.fullname = fullname
        sp.product_product_variation.product_variation.name = variation_name
        return sp

    def test_mock_product_ranks_above_course_notes_for_mock_query(self):
        """'CS2 addition mock' should rank mock products above course notes."""
        mock_product = self._make_store_product(
            'CS2', 'CS2 Mock', 'CS2 Additional Mock Exam Marking', 'Marking Service'
        )
        course_notes = self._make_store_product(
            'CS2', 'CS2 Course Notes', 'CS2 Course Notes', 'Printed'
        )

        mock_text = self.service._build_searchable_text(mock_product)
        notes_text = self.service._build_searchable_text(course_notes)

        mock_score = self.service._calculate_fuzzy_score(
            'cs2 addition mock', mock_text, mock_product
        )
        notes_score = self.service._calculate_fuzzy_score(
            'cs2 addition mock', notes_text, course_notes
        )

        self.assertGreater(mock_score, notes_score,
            f"Mock product ({mock_score}) should rank above course notes ({notes_score})")

    def test_exact_name_match_scores_highest(self):
        """Product whose name exactly matches query should score highest."""
        exact_match = self._make_store_product(
            'CM2', 'CM2 Study Text', 'CM2 Study Text', 'eBook'
        )
        partial_match = self._make_store_product(
            'CM2', 'CM2 Course Notes', 'CM2 Course Notes', 'Printed'
        )

        exact_text = self.service._build_searchable_text(exact_match)
        partial_text = self.service._build_searchable_text(partial_match)

        exact_score = self.service._calculate_fuzzy_score(
            'cm2 study text', exact_text, exact_match
        )
        partial_score = self.service._calculate_fuzzy_score(
            'cm2 study text', partial_text, partial_match
        )

        self.assertGreater(exact_score, partial_score)

    def test_subject_code_match_boosts_but_does_not_dominate(self):
        """Subject code match should boost score but not flatten ranking."""
        strong_match = self._make_store_product(
            'CS2', 'CS2 Mock', 'CS2 Additional Mock Exam', 'Marking'
        )
        weak_match = self._make_store_product(
            'CS2', 'CS2 Notes', 'CS2 Core Reading', 'Printed'
        )

        strong_text = self.service._build_searchable_text(strong_match)
        weak_text = self.service._build_searchable_text(weak_match)

        strong_score = self.service._calculate_fuzzy_score(
            'cs2 mock exam', strong_text, strong_match
        )
        weak_score = self.service._calculate_fuzzy_score(
            'cs2 mock exam', weak_text, weak_match
        )

        # Both match subject code, but strong_match should score significantly higher
        self.assertGreater(strong_score - weak_score, 5,
            "Content relevance should create meaningful score differences")

    def test_cross_subject_query_penalizes_wrong_subject(self):
        """Query for CS2 product should score CS2 products above CM2 products."""
        correct_subject = self._make_store_product(
            'CS2', 'CS2 Mock', 'CS2 Mock Exam', 'Marking'
        )
        wrong_subject = self._make_store_product(
            'CM2', 'CM2 Mock', 'CM2 Mock Exam', 'Marking'
        )

        correct_text = self.service._build_searchable_text(correct_subject)
        wrong_text = self.service._build_searchable_text(wrong_subject)

        correct_score = self.service._calculate_fuzzy_score(
            'cs2 mock', correct_text, correct_subject
        )
        wrong_score = self.service._calculate_fuzzy_score(
            'cs2 mock', wrong_text, wrong_subject
        )

        self.assertGreater(correct_score, wrong_score)

    def test_minimum_score_threshold_filters_irrelevant(self):
        """Completely irrelevant products should score below threshold."""
        irrelevant = self._make_store_product(
            'SA1', 'SA1 Handbook', 'SA1 Professional Standards Handbook', 'Printed'
        )

        text = self.service._build_searchable_text(irrelevant)
        score = self.service._calculate_fuzzy_score(
            'cs2 mock exam', text, irrelevant
        )

        self.assertLess(score, 60, "Irrelevant product should score below threshold")

    def test_score_range_is_0_to_100(self):
        """All scores should be in the 0-100 range."""
        product = self._make_store_product(
            'CM2', 'CM2 Study Text', 'CM2 Study Text', 'eBook'
        )
        text = self.service._build_searchable_text(product)

        score = self.service._calculate_fuzzy_score('cm2 study text', text, product)

        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
```

### Step 2: Run tests to verify they fail

Run: `cd backend/django_Admin3 && python manage.py test search.tests.test_fuzzy_scoring -v2`

Expected: `test_mock_product_ranks_above_course_notes_for_mock_query` FAILS (both products score 95 due to `max()`)

### Step 3: Implement weighted composite scoring

Modify `_calculate_fuzzy_score` in [search_service.py:224-246](backend/django_Admin3/search/services/search_service.py#L224-L246):

```python
def _calculate_fuzzy_score(self, query: str, searchable_text: str,
                           store_product: StoreProduct) -> int:
    """Calculate fuzzy match score using weighted composite of multiple algorithms.

    Uses a weighted formula instead of max() to prevent any single signal
    (especially subject-code bonus) from dominating the ranking.

    Weights:
        subject_bonus (0.15): Subject code prefix match — qualifier, not dominator
        token_sort   (0.40): Primary signal — word-order-independent full text match
        partial_name (0.25): Secondary — best substring match against product name
        token_set    (0.20): Tertiary — word-set overlap on full searchable text
    """
    catalog_product = store_product.product_product_variation.product
    subject_code = store_product.exam_session_subject.subject.code.lower()
    product_name = (catalog_product.shortname or catalog_product.fullname or '').lower()

    # Subject code prefix match (0 or 100, then weighted)
    subject_bonus = 100 if query.startswith(subject_code) else 0

    # Token sort ratio — handles word order differences
    token_sort = fuzz.token_sort_ratio(query, searchable_text)

    # Partial ratio — best substring match against product name
    partial_name = fuzz.partial_ratio(query, product_name)

    # Token set ratio — handles extra/missing words
    token_set = fuzz.token_set_ratio(query, searchable_text)

    # Weighted composite
    score = (
        0.15 * subject_bonus +
        0.40 * token_sort +
        0.25 * partial_name +
        0.20 * token_set
    )

    return min(round(score), 100)
```

### Step 4: Run tests to verify they pass

Run: `cd backend/django_Admin3 && python manage.py test search.tests.test_fuzzy_scoring -v2`

Expected: All 6 tests PASS

### Step 5: Adjust minimum score threshold

The weighted formula produces lower scores than `max()`. Update the threshold:

In [search_service.py:39](backend/django_Admin3/search/services/search_service.py#L39), change:
```python
self.min_fuzzy_score = 60
```
to:
```python
self.min_fuzzy_score = 45
```

The exact threshold will need tuning. Add a test:

```python
def test_reasonable_products_pass_threshold(self):
    """Products with some relevance should pass the minimum score."""
    product = self._make_store_product(
        'CS2', 'CS2 Course Notes', 'CS2 Course Notes', 'Printed'
    )
    text = self.service._build_searchable_text(product)

    score = self.service._calculate_fuzzy_score('cs2 notes', text, product)
    self.assertGreaterEqual(score, self.service.min_fuzzy_score,
        f"Relevant product score {score} should pass threshold {self.service.min_fuzzy_score}")
```

### Step 6: Run full search test suite

Run: `cd backend/django_Admin3 && python manage.py test search -v2`

Expected: All existing tests PASS (some score thresholds in existing tests may need adjustment due to the new formula — update assertions to match new weighted scores)

### Step 7: Commit

```bash
git add backend/django_Admin3/search/tests/test_fuzzy_scoring.py backend/django_Admin3/search/services/search_service.py
git commit -m "feat: replace max() fuzzy scoring with weighted composite formula

Fixes ranking where subject-code bonus (95) dominated all other signals,
causing 'CS2 addition mock' to rank course notes equal to mock products.

New weighted formula: 0.15*subject + 0.40*token_sort + 0.25*partial_name + 0.20*token_set"
```

---

## Task 2: Add `generate_filter_counts` to `ProductFilterService`

**Files:**
- Modify: `backend/django_Admin3/filtering/services/filter_service.py`
- Test: `backend/django_Admin3/filtering/tests/test_filter_counts.py` (create)

### Step 1: Write failing test for filter count generation

Create `backend/django_Admin3/filtering/tests/test_filter_counts.py`:

```python
"""Tests for disjunctive filter count generation in ProductFilterService."""
from django.test import TestCase
from unittest.mock import patch, MagicMock
from filtering.services.filter_service import ProductFilterService


class TestGenerateFilterCounts(TestCase):
    """Test that ProductFilterService can generate disjunctive filter counts."""

    def test_generate_filter_counts_method_exists(self):
        """ProductFilterService should expose generate_filter_counts()."""
        service = ProductFilterService()
        self.assertTrue(
            hasattr(service, 'generate_filter_counts'),
            "ProductFilterService should have generate_filter_counts method"
        )

    def test_generate_filter_counts_returns_expected_dimensions(self):
        """Return dict should contain all filter dimensions."""
        service = ProductFilterService()
        # Use empty queryset for structural test
        from store.models import Product as StoreProduct
        empty_qs = StoreProduct.objects.none()

        result = service.generate_filter_counts(empty_qs, filters={})

        expected_keys = {'subjects', 'categories', 'product_types', 'products', 'modes_of_delivery'}
        self.assertEqual(set(result.keys()), expected_keys)

    def test_generate_filter_counts_with_no_filters_returns_all_counts(self):
        """With no active filters, counts should reflect full queryset."""
        service = ProductFilterService()
        from store.models import Product as StoreProduct
        empty_qs = StoreProduct.objects.none()

        result = service.generate_filter_counts(empty_qs, filters={})

        # All dimensions should be dicts (possibly empty for no data)
        for key in result:
            self.assertIsInstance(result[key], dict)
```

### Step 2: Run test to verify it fails

Run: `cd backend/django_Admin3 && python manage.py test filtering.tests.test_filter_counts -v2`

Expected: FAIL — `AttributeError: 'ProductFilterService' object has no attribute 'generate_filter_counts'`

### Step 3: Move `_generate_filter_counts` logic to `ProductFilterService`

Add to `filtering/services/filter_service.py` on the `ProductFilterService` class:

```python
def generate_filter_counts(self, base_queryset, filters=None) -> Dict[str, Dict]:
    """Generate disjunctive facet counts for all filter dimensions.

    Disjunctive faceting: each dimension's counts are computed against
    a queryset with all OTHER active filters applied, but excluding
    that dimension's own filter.

    Args:
        base_queryset: Unfiltered base queryset of active store products.
        filters: Dict of active filters (subjects, categories, etc.)

    Returns:
        Dict with keys: subjects, categories, product_types, products, modes_of_delivery.
        Each value is a dict of {name: {count: N, name: str}}.
    """
    from django.db.models import Count

    filters = filters or {}
    filter_counts = {
        'subjects': {},
        'categories': {},
        'product_types': {},
        'products': {},
        'modes_of_delivery': {}
    }

    # Subject counts — exclude subjects filter
    subjects_qs = self._apply_filters_excluding(base_queryset, filters, 'subjects')
    subject_counts = subjects_qs.values(
        'exam_session_subject__subject__code'
    ).annotate(count=Count('id')).order_by('-count')

    for item in subject_counts:
        code = item['exam_session_subject__subject__code']
        count = item['count']
        if code and count > 0:
            filter_counts['subjects'][code] = {'count': count, 'name': code}

    # Group counts partitioned by FilterConfigurationGroup
    for filter_key in ('categories', 'product_types'):
        assigned_groups = list(
            FilterConfigurationGroup.objects.filter(
                filter_configuration__filter_key=filter_key,
                filter_configuration__is_active=True,
            ).select_related('filter_group').values_list(
                'filter_group_id', 'filter_group__name', named=True
            )
        )
        if not assigned_groups:
            continue

        assigned_group_ids = {g.filter_group_id for g in assigned_groups}
        assigned_group_names = {
            g.filter_group_id: g.filter_group__name for g in assigned_groups
        }

        # Pre-populate with zero counts (FR-013)
        for group_id, group_name in assigned_group_names.items():
            if group_name:
                filter_counts[filter_key][group_name] = {
                    'count': 0, 'name': group_name
                }

        dimension_qs = self._apply_filters_excluding(base_queryset, filters, filter_key)

        # Hierarchy-aware: expand each group to descendants
        for group_id in assigned_group_ids:
            group_name = assigned_group_names.get(group_id)
            if not group_name:
                continue
            try:
                group = FilterGroup.objects.get(id=group_id)
                desc_ids = {g.id for g in group.get_descendants(include_self=True)}
            except FilterGroup.DoesNotExist:
                desc_ids = {group_id}

            rollup_count = dimension_qs.filter(
                product_product_variation__product__groups__id__in=desc_ids
            ).distinct().count()
            filter_counts[filter_key][group_name] = {
                'count': rollup_count, 'name': group_name
            }

    # Product counts — exclude products filter
    products_qs = self._apply_filters_excluding(base_queryset, filters, 'products')
    product_counts = products_qs.values(
        'product_product_variation__product__id',
        'product_product_variation__product__shortname',
        'product_product_variation__product__fullname'
    ).annotate(count=Count('id', distinct=True)).order_by('-count')

    for item in product_counts:
        product_id = item['product_product_variation__product__id']
        shortname = item['product_product_variation__product__shortname']
        fullname = item['product_product_variation__product__fullname']
        count = item['count']
        if product_id and count > 0:
            filter_counts['products'][str(product_id)] = {
                'count': count,
                'name': shortname or fullname or f'Product {product_id}',
                'display_name': shortname or fullname or f'Product {product_id}'
            }

    # Modes of delivery — exclude modes_of_delivery filter
    modes_qs = self._apply_filters_excluding(base_queryset, filters, 'modes_of_delivery')
    mode_counts = modes_qs.values(
        'product_product_variation__product_variation__variation_type',
        'product_product_variation__product_variation__name'
    ).annotate(count=Count('id', distinct=True)).order_by('-count')

    for item in mode_counts:
        variation_type = item['product_product_variation__product_variation__variation_type']
        variation_name = item['product_product_variation__product_variation__name']
        count = item['count']
        if variation_type and count > 0:
            filter_counts['modes_of_delivery'][variation_type] = {
                'count': count,
                'name': variation_name or variation_type,
                'display_name': variation_name or variation_type
            }

    return filter_counts

def _apply_filters_excluding(self, queryset, filters: Dict, exclude_dimension: str):
    """Apply all filters EXCEPT the excluded dimension (for disjunctive faceting)."""
    if not filters:
        return queryset

    reduced_filters = {k: v for k, v in filters.items() if k != exclude_dimension}
    if not reduced_filters:
        return queryset

    return self._apply_store_product_filters(queryset, reduced_filters)

def _apply_store_product_filters(self, queryset, filters: Dict):
    """Apply filters to a store.Product queryset.

    This is the store.Product-aware filter application method that
    knows the correct field paths for store.Product relationships.
    """
    from django.db.models import Q

    q_filter = Q()

    # Subject filter
    if filters.get('subjects'):
        subject_q = Q()
        for subject in filters['subjects']:
            if isinstance(subject, int) or (isinstance(subject, str) and subject.isdigit()):
                subject_q |= Q(exam_session_subject__subject__id=int(subject))
            else:
                subject_q |= Q(exam_session_subject__subject__code=subject)
        q_filter &= subject_q

    # Product ID filter
    product_ids = filters.get('product_ids') or filters.get('products')
    if product_ids:
        int_ids = [int(pid) for pid in product_ids
                   if isinstance(pid, int) or (isinstance(pid, str) and pid.isdigit())]
        if int_ids:
            q_filter &= Q(product_product_variation__product__id__in=int_ids)

    # Store product ID filter (essp_ids backward compat)
    if filters.get('essp_ids'):
        q_filter &= Q(id__in=filters['essp_ids'])

    # Mode of delivery filter
    if filters.get('modes_of_delivery'):
        mode_q = Q()
        for mode in filters['modes_of_delivery']:
            mode_q |= Q(product_product_variation__product_variation__variation_type__iexact=mode)
            mode_q |= Q(product_product_variation__product_variation__name__icontains=mode)
        q_filter &= mode_q

    if q_filter:
        queryset = queryset.filter(q_filter)

    # M2M group filters — separate .filter() calls
    if filters.get('categories'):
        category_ids = self._resolve_group_ids_with_hierarchy(
            filters['categories'], exclude_names=['Bundle']
        )
        if category_ids:
            queryset = queryset.filter(
                product_product_variation__product__groups__id__in=category_ids
            )

    if filters.get('product_types'):
        type_ids = self._resolve_group_ids_with_hierarchy(filters['product_types'])
        if type_ids:
            queryset = queryset.filter(
                product_product_variation__product__groups__id__in=type_ids
            )

    return queryset.distinct()

@staticmethod
def _resolve_group_ids_with_hierarchy(group_names, exclude_names=None):
    """Resolve group names to IDs, expanding to include descendants."""
    exclude_names = set(exclude_names or [])
    resolved_ids = set()

    for name in group_names:
        if name in exclude_names:
            continue
        try:
            group = FilterGroup.objects.get(name__iexact=name)
            resolved_ids.update(g.id for g in group.get_descendants(include_self=True))
        except FilterGroup.DoesNotExist:
            continue

    return resolved_ids
```

### Step 4: Run test to verify it passes

Run: `cd backend/django_Admin3 && python manage.py test filtering.tests.test_filter_counts -v2`

Expected: All 3 tests PASS

### Step 5: Commit

```bash
git add backend/django_Admin3/filtering/services/filter_service.py backend/django_Admin3/filtering/tests/test_filter_counts.py
git commit -m "feat: add generate_filter_counts to ProductFilterService

Moves disjunctive faceting logic from SearchService to the filtering app
where it belongs. Includes _apply_store_product_filters for store.Product
field paths and _resolve_group_ids_with_hierarchy for group expansion."
```

---

## Task 3: Delegate Filter Operations from SearchService to ProductFilterService

**Files:**
- Modify: `backend/django_Admin3/search/services/search_service.py`
- Test: `backend/django_Admin3/search/tests/test_search_delegates_to_filter_service.py` (create)

### Step 1: Write failing test for delegation

Create `backend/django_Admin3/search/tests/test_search_delegates_to_filter_service.py`:

```python
"""Tests verifying SearchService delegates filter operations to ProductFilterService."""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from search.services.search_service import SearchService


class TestSearchDelegatesToFilterService(TestCase):
    """Verify SearchService delegates to ProductFilterService for filter operations."""

    @patch('search.services.search_service.ProductFilterService')
    def test_unified_search_delegates_filter_counts(self, MockFilterService):
        """unified_search should call filter_service.generate_filter_counts."""
        mock_instance = MockFilterService.return_value
        mock_instance.generate_filter_counts.return_value = {
            'subjects': {}, 'categories': {}, 'product_types': {},
            'products': {}, 'modes_of_delivery': {}
        }
        mock_instance.apply_store_product_filters.side_effect = lambda qs, f: qs

        service = SearchService()
        # Will fail until we wire up the delegation
        result = service.unified_search(search_query='', filters={'subjects': ['CM2']})

        mock_instance.generate_filter_counts.assert_called_once()

    @patch('search.services.search_service.ProductFilterService')
    def test_unified_search_delegates_filter_application(self, MockFilterService):
        """unified_search should call filter_service.apply_store_product_filters."""
        mock_instance = MockFilterService.return_value
        mock_instance.generate_filter_counts.return_value = {
            'subjects': {}, 'categories': {}, 'product_types': {},
            'products': {}, 'modes_of_delivery': {}
        }
        mock_instance.apply_store_product_filters.side_effect = lambda qs, f: qs

        service = SearchService()
        result = service.unified_search(search_query='', filters={'subjects': ['CM2']})

        mock_instance.apply_store_product_filters.assert_called()
```

### Step 2: Run test to verify it fails

Run: `cd backend/django_Admin3 && python manage.py test search.tests.test_search_delegates_to_filter_service -v2`

Expected: FAIL — SearchService doesn't use ProductFilterService yet

### Step 3: Refactor SearchService to delegate

Modify [search_service.py](backend/django_Admin3/search/services/search_service.py):

**Add import** (top of file):
```python
from filtering.services.filter_service import ProductFilterService
```

**Update `__init__`**:
```python
def __init__(self):
    self.cache_timeout = getattr(settings, 'SEARCH_CACHE_TIMEOUT', 300)
    self.min_fuzzy_score = 45  # Adjusted for weighted scoring
    self.filter_service = ProductFilterService()
```

**Replace `_apply_filters` call in `unified_search`** (line 103):
```python
# Before:
filtered_queryset = self._apply_filters(base_queryset, filters)

# After:
filtered_queryset = self.filter_service.apply_store_product_filters(base_queryset, filters)
```

**Replace `_generate_filter_counts` call in `unified_search`** (line 139):
```python
# Before:
filter_counts = self._generate_filter_counts(self._build_optimized_queryset(), filters=filters)

# After:
filter_counts = self.filter_service.generate_filter_counts(
    self._build_optimized_queryset(), filters=filters
)
```

**Add bundle count back**: After the `generate_filter_counts` call, add the bundle count (this remains in SearchService since it's bundle-specific):
```python
# Add bundle count (bundles are a search concern, not a filter concern)
bundle_count = self._get_filtered_bundle_count(filters)
if bundle_count > 0:
    filter_counts['categories']['Bundle'] = {
        'count': bundle_count, 'name': 'Bundle'
    }
```

**Keep `_apply_filters` as deprecated wrapper** (for backward compatibility with `fuzzy_search` and `advanced_fuzzy_search` methods):
```python
def _apply_filters(self, queryset, filters: Dict):
    """Apply filter criteria to queryset.

    DEPRECATED: Delegates to ProductFilterService.apply_store_product_filters().
    Kept for backward compatibility with fuzzy_search() and advanced_fuzzy_search().
    """
    return self.filter_service.apply_store_product_filters(queryset, filters)
```

**Remove `_generate_filter_counts`** and **`_apply_filters_excluding`** and **`_resolve_group_ids_with_hierarchy`** from SearchService (they now live in ProductFilterService).

### Step 4: Run delegation tests

Run: `cd backend/django_Admin3 && python manage.py test search.tests.test_search_delegates_to_filter_service -v2`

Expected: PASS

### Step 5: Run full test suite

Run: `cd backend/django_Admin3 && python manage.py test search filtering -v2`

Expected: All tests PASS. Some existing tests may need import path updates if they were testing the removed methods directly.

### Step 6: Commit

```bash
git add backend/django_Admin3/search/services/search_service.py backend/django_Admin3/search/tests/test_search_delegates_to_filter_service.py
git commit -m "refactor: SearchService delegates filter ops to ProductFilterService

Removes duplicated filter logic from SearchService. Filter application
and disjunctive count generation now handled by ProductFilterService.
SearchService focuses on fuzzy search, bundle matching, and serialization."
```

---

## Task 4: Clean Up Navbar Filters via Delegation

**Files:**
- Modify: `backend/django_Admin3/search/services/search_service.py:324-363`
- Test: `backend/django_Admin3/search/tests/test_navbar_filter_translation.py` (create)

### Step 1: Write failing test for navbar filter translation

```python
"""Tests for navbar filter translation to standard filter format."""
from django.test import TestCase
from search.services.search_service import SearchService


class TestNavbarFilterTranslation(TestCase):
    """Test that navbar filters are translated to standard filter dict format."""

    def setUp(self):
        self.service = SearchService()

    def test_translate_navbar_group_filter(self):
        """Navbar 'group' param should translate to categories filter."""
        navbar_filters = {'group': 'PRINTED'}
        translated = self.service._translate_navbar_filters(navbar_filters)
        self.assertIn('categories', translated)

    def test_translate_empty_navbar_filters(self):
        """Empty navbar filters should return empty dict."""
        translated = self.service._translate_navbar_filters({})
        self.assertEqual(translated, {})

    def test_translate_navbar_product_filter(self):
        """Navbar 'product' param should translate to product_ids filter."""
        navbar_filters = {'product': '42'}
        translated = self.service._translate_navbar_filters(navbar_filters)
        self.assertIn('product_ids', translated)
```

### Step 2: Run test to verify it fails

Run: `cd backend/django_Admin3 && python manage.py test search.tests.test_navbar_filter_translation -v2`

Expected: FAIL — `_translate_navbar_filters` doesn't exist

### Step 3: Implement translation and delegation

Add to SearchService:

```python
def _translate_navbar_filters(self, navbar_filters: Dict) -> Dict:
    """Translate navbar dropdown params to standard filter dict format.

    Converts legacy GET query params (group, tutorial_format, product,
    distance_learning) into the same format used by the filter panel
    so they can be processed through ProductFilterService.

    Args:
        navbar_filters: Dict from GET query params.

    Returns:
        Standard filter dict compatible with apply_store_product_filters().
    """
    if not navbar_filters:
        return {}

    translated = {}

    if 'group' in navbar_filters:
        translated['categories'] = [navbar_filters['group']]

    if 'tutorial_format' in navbar_filters:
        translated.setdefault('categories', []).append(navbar_filters['tutorial_format'])

    if 'product' in navbar_filters:
        translated['product_ids'] = [navbar_filters['product']]

    if 'distance_learning' in navbar_filters:
        translated['categories'] = translated.get('categories', []) + ['Material']

    return translated
```

Update `unified_search` to merge navbar filters:

```python
# Replace line 104:
# Before:
filtered_queryset = self._apply_navbar_filters(filtered_queryset, navbar_filters)

# After:
translated_navbar = self._translate_navbar_filters(navbar_filters)
if translated_navbar:
    # Merge navbar filters with panel filters (navbar takes precedence for categories)
    merged = {**filters}
    for key, values in translated_navbar.items():
        if key in merged and merged[key]:
            merged[key] = list(set(merged[key] + values))
        else:
            merged[key] = values
    filtered_queryset = self.filter_service.apply_store_product_filters(
        base_queryset, merged
    )
```

### Step 4: Run tests

Run: `cd backend/django_Admin3 && python manage.py test search.tests.test_navbar_filter_translation -v2`

Expected: PASS

### Step 5: Deprecate `_apply_navbar_filters`

Mark the old method as deprecated but keep for safety:

```python
def _apply_navbar_filters(self, queryset, navbar_filters: Dict):
    """DEPRECATED: Use _translate_navbar_filters + apply_store_product_filters."""
    import warnings
    warnings.warn(
        "_apply_navbar_filters is deprecated. Use _translate_navbar_filters.",
        DeprecationWarning, stacklevel=2
    )
    # ... existing implementation kept as fallback ...
```

### Step 6: Run full test suite

Run: `cd backend/django_Admin3 && python manage.py test search filtering -v2`

Expected: All tests PASS

### Step 7: Commit

```bash
git add backend/django_Admin3/search/services/search_service.py backend/django_Admin3/search/tests/test_navbar_filter_translation.py
git commit -m "refactor: translate navbar filters to standard format for delegation

Navbar GET params (group, product, etc.) are now translated to the same
filter dict format used by FilterPanel, then processed through
ProductFilterService. Eliminates separate navbar filter code path."
```

---

## Task 5: Run Full Regression Suite and Fix Any Breakage

**Files:**
- Possibly modify: any test files with assertion values that changed due to new scoring formula

### Step 1: Run all search and filtering tests

Run: `cd backend/django_Admin3 && python manage.py test search filtering -v2`

### Step 2: Fix any failing tests

Common fixes needed:
- Existing fuzzy score assertions may expect old `max()` values — update to match weighted formula
- Tests that directly called `SearchService._generate_filter_counts()` need to call `filter_service.generate_filter_counts()` instead
- Tests that mocked `_apply_filters` may need to mock `filter_service.apply_store_product_filters`

### Step 3: Run full backend test suite

Run: `cd backend/django_Admin3 && python manage.py test -v2`

### Step 4: Commit fixes

```bash
git add -u
git commit -m "fix: update test assertions for weighted scoring and filter delegation"
```

---

## Summary of Changes

| File | Change | Why |
|------|--------|-----|
| `search/services/search_service.py` | Weighted scoring formula | Fix ranking accuracy |
| `search/services/search_service.py` | Delegate to `ProductFilterService` | Eliminate duplication |
| `search/services/search_service.py` | Translate navbar filters | Unify filter code path |
| `filtering/services/filter_service.py` | Add `generate_filter_counts()` | Filter counts belong here |
| `filtering/services/filter_service.py` | Add `apply_store_product_filters()` | Store.Product filter path |
| `filtering/services/filter_service.py` | Add `_resolve_group_ids_with_hierarchy()` | Shared hierarchy logic |
| `search/tests/test_fuzzy_scoring.py` | New test file | Scoring accuracy tests |
| `filtering/tests/test_filter_counts.py` | New test file | Filter count tests |
| `search/tests/test_search_delegates_to_filter_service.py` | New test file | Delegation tests |
| `search/tests/test_navbar_filter_translation.py` | New test file | Navbar translation tests |
