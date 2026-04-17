# Fuzzy Search Optimization: Move from Python to PostgreSQL pg_trgm

## Problem

The current fuzzy search in `search/services/search_service.py` (`_fuzzy_search_ids()`) loads **all active store.Product rows into Python memory** and runs FuzzyWuzzy scoring in a loop. This is O(n) on product count and doesn't scale.

## Current Implementation

**Location**: `backend/django_Admin3/search/services/search_service.py` lines 205-277

**Fields searched** (concatenated into searchable text):
- `catalog.Product.fullname`
- `catalog.Product.shortname`
- `catalog.Subject.code`
- `catalog.ProductVariation.name`

**Scoring formula** (R1 weighted composite):
```
score = 0.15 * subject_bonus
      + 0.40 * token_sort_ratio
      + 0.25 * partial_ratio (on product name only)
      + 0.20 * token_set_ratio
```

- `subject_bonus`: 100 if query starts with subject code, else 0 (binary)
- `token_sort_ratio`: FuzzyWuzzy — handles word reordering
- `partial_ratio`: FuzzyWuzzy — substring matching on product name
- `token_set_ratio`: FuzzyWuzzy — handles extra words
- Minimum threshold: 45

## pg_trgm Extension Status

- **Already enabled**: Migration `catalog/migrations/0005_enable_pg_trgm.py`
- **No GIN indexes exist** on store.Product or catalog.Product tables
- **Partial usage**: `catalog/views/navigation_views.py` (`advanced_product_search`) uses `TrigramSimilarity` on catalog.Product but NOT on the primary search path

## Proposed Solution: Denormalized Trigram Index

### Step 1: Add searchable_text field to store.Product

```python
# store/models/product.py
searchable_text = models.TextField(
    default='',
    help_text='Denormalized text for trigram search'
)
```

### Step 2: Create migration with GIN trigram index

```python
from django.contrib.postgres.indexes import GinIndex

migrations.AddIndex(
    model_name='product',
    index=GinIndex(
        fields=['searchable_text'],
        name='store_product_search_gin_trgm',
        opclasses=['gin_trgm_ops'],
    ),
)
```

### Step 3: Populate and maintain searchable_text

- Data migration to populate existing records (concatenate fullname + shortname + subject code + variation name)
- Override `Product.save()` to update on changes, or use a database trigger

### Step 4: Rewrite fuzzy search to use PostgreSQL

```python
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Case, When, FloatField, F

def _fuzzy_search_ids_pg(self, queryset, query):
    similarity = TrigramSimilarity('searchable_text', query)
    
    # Preserve subject bonus as explicit DB condition
    first_word = query.split()[0] if query else ''
    subject_qs = queryset.filter(
        exam_session_subject__subject__code__iexact=first_word
    )
    
    results = queryset.annotate(
        trgm_similarity=similarity,
        subject_match=Case(
            When(id__in=subject_qs.values('id'), then=1.0),
            default=0.0,
            output_field=FloatField()
        ),
        fuzzy_score=F('trgm_similarity') * 0.60 + F('subject_match') * 0.40
    ).filter(
        fuzzy_score__gte=0.45
    ).order_by('-fuzzy_score')
    
    return list(results.values_list('id', flat=True))
```

## Migration Concerns

### Subject Code Matching

pg_trgm matches "cs1" to both "CS1" and "CB1" based on character overlap. The subject_bonus handles this by using an explicit `ILIKE` condition rather than relying on trigram similarity for short codes.

### Partial Ratio (Substring Matching)

pg_trgm naturally handles substring matching through trigram overlap. "cour" will match "course notes". Threshold may need tuning (0.3-0.5) to avoid false positives.

### Token Ordering

pg_trgm is position-agnostic (splits into 3-character chunks), so word reordering is handled naturally — "course study notes" and "study notes course" produce similar trigram sets.

## Expected Performance Impact

| Metric | Current (Python) | PostgreSQL pg_trgm |
|--------|------------------|--------------------|
| Scaling | O(n) — loads all products | O(log n) — index lookup |
| Memory | All products in Python | Only matched IDs returned |
| Latency (1000 products) | ~100-500ms | ~5-20ms |

## Implementation Checklist

- [ ] Add `searchable_text` field to `store.Product` model
- [ ] Create migration with GIN trigram index (`gin_trgm_ops`)
- [ ] Create data migration to populate searchable_text
- [ ] Modify `Product.save()` to update searchable_text on changes
- [ ] Rewrite `_fuzzy_search_ids()` to use PostgreSQL `TrigramSimilarity`
- [ ] Preserve subject code exact-match priority via `CASE WHEN`
- [ ] Test that subject code queries still rank correctly (e.g., "cs1 course notes" ranks CS1 above CB1)
- [ ] Performance test with realistic product volume
- [ ] Remove FuzzyWuzzy dependency if no longer needed elsewhere
