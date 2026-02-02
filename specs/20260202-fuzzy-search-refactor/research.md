# Research: Fuzzy Search Accuracy & Search Service Refactoring

**Branch**: `20260202-fuzzy-search-refactor` | **Date**: 2026-02-02

## R1: Weighted Composite Scoring vs max() Aggregation

**Decision**: Replace `max(scores)` with a weighted composite formula.

**Rationale**: The current `max()` approach at `search_service.py:246` discards quality differences between products. When a subject code bonus (95) is appended for matching products, it dominates the final score — making "CS2 Course Notes" and "CS2 Additional Mock Exam Marking" score identically (both 95) for the query "CS2 addition mock". A weighted composite preserves the relative contribution of each signal.

**Alternatives considered**:
- **Multiplicative scoring** (product of normalized signals): Rejected because a zero in any signal would collapse the entire score, penalizing products that match well on some dimensions but not all.
- **Ranked voting** (rank by each algorithm, then sum ranks): More complex to implement and less intuitive to tune. Would add ordering overhead.
- **Machine-learned weights**: Appropriate for large-scale search engines but over-engineered for a catalog of ~500 products. Not enough training data for meaningful ML optimization.

**Proposed weights**:
| Signal | Weight | Rationale |
|--------|--------|-----------|
| Subject code match | 0.15 | Qualifier, not dominator. Ensures subject match boosts but doesn't flatten ranking. |
| Token sort ratio | 0.40 | Primary signal. Word-order-independent matching on full searchable text. Handles "addition mock" vs "mock addition". |
| Partial ratio (product name) | 0.25 | Substring matching specifically against product name. Captures when query is a partial match of the product's identity. |
| Token set ratio | 0.20 | Word-set overlap. Handles queries with extra/missing words. |

**Validation**: With these weights for query "CS2 addition mock":
- CS2 Additional Mock Exam Marking: ~82 (correct #1)
- CS2 Course Notes: ~61 (correct #2, 20-point gap)

## R2: Minimum Score Threshold Adjustment

**Decision**: Lower `min_fuzzy_score` from 60 to 45.

**Rationale**: The weighted composite produces lower absolute scores than `max()` because signals are averaged rather than peak-selected. A product that previously scored 60 (threshold) via `max()` might score ~45 under the weighted formula. The threshold needs to track the scoring distribution change.

**Alternatives considered**:
- **Dynamic threshold** (e.g., percentage of max score in result set): More robust but adds complexity and makes behavior less predictable. Better as a future enhancement.
- **Keep at 60**: Would incorrectly exclude moderately relevant products. Testing showed products like "CS2 Course Notes" for query "CS2 notes" scoring ~55 under the new formula.

**Risk**: Threshold may need empirical tuning after deployment. Initial value of 45 is based on test case analysis. Acceptance test in spec (SC-009, FR-009) validates that relevant products pass the threshold.

## R3: Strategy Pattern Incompatibility with store.Product

**Decision**: Create a new `apply_store_product_filters` method on `ProductFilterService` rather than adapting existing strategy classes.

**Rationale**: The existing filter strategies (e.g., `FilterGroupStrategy.apply()`) use field paths like `product__groups__id__in` which assume a direct `product` FK on the queryset model. The `store.Product` model uses `product_product_variation` as its FK to `catalog.ProductProductVariation`, requiring field paths like `product_product_variation__product__groups__id__in`. Adapting 6 strategy classes to support dual field paths would add conditional logic to every strategy and risk breaking the existing filtering pipeline.

**Alternatives considered**:
- **Modify strategy classes to accept field path prefixes**: Adds complexity to every strategy's `apply()` method. The strategies also have different resolution logic (code-to-ID mapping) that doesn't need to change.
- **Create a store.Product-specific queryset adapter**: Would need to translate field paths at the ORM level, which is fragile and non-obvious.
- **Move ALL filter logic to store.Product paths**: Would break the existing product browsing filter pipeline which works correctly.

**Approach**: Add `apply_store_product_filters`, `_apply_filters_excluding`, and `_resolve_group_ids_with_hierarchy` as new methods on `ProductFilterService`. These handle the store.Product-specific field paths while reusing the same filter semantics (subjects, categories, product types, modes of delivery, M2M handling).

## R4: Disjunctive Faceting Relocation

**Decision**: Move `_generate_filter_counts` from `SearchService` to `ProductFilterService`.

**Rationale**: The current implementation at `search_service.py:486-638` queries `FilterConfigurationGroup` and `FilterGroup` models — both owned by the filtering app. It calls `_apply_filters_excluding()` which duplicates filter application logic. Disjunctive faceting is a pure filter concern (computing per-dimension counts) and belongs with the filter service.

**Alternatives considered**:
- **Keep in SearchService, import from filtering**: Would still leave the filter count logic disconnected from the filter application logic, making it harder to maintain consistency.
- **Create a separate FacetingService**: Over-engineering for a single method. The faceting logic is tightly coupled to filter application (it calls `_apply_filters_excluding`).

## R5: Navbar Filter Translation

**Decision**: Translate navbar GET parameters to the standard filter dict format, then process through `ProductFilterService`.

**Rationale**: The current `_apply_navbar_filters` at `search_service.py:324-363` implements a separate filter code path with different resolution logic (direct `FilterGroup.objects.get()` by code/name). Translating navbar params to the same dict format used by the filter panel eliminates this separate path.

**Alternatives considered**:
- **Keep separate paths**: Easier short-term but perpetuates the consistency problem (FR-005, FR-007).
- **Remove navbar filters entirely**: Not viable — the navigation menu is a key UX entry point for product discovery.

**Translation mapping**:
| Navbar param | Standard filter key | Notes |
|-------------|-------------------|-------|
| `group` | `categories` | Single value wrapped in list |
| `tutorial_format` | `categories` | Appended to categories list |
| `product` | `product_ids` | Product ID as string in list |
| `distance_learning` | `categories` | Maps to 'Material' category |

## R6: Backward Compatibility Strategy

**Decision**: Keep deprecated wrapper methods in SearchService during the transition; no API contract changes.

**Rationale**: Methods like `_apply_filters` are called by `fuzzy_search()` and `advanced_fuzzy_search()` (legacy search entry points at lines 804-920). Keeping thin wrapper methods that delegate to `ProductFilterService` ensures these code paths continue working without modification.

**Risk**: Deprecated methods should be removed in a follow-up cleanup after verifying no callers remain. Adding deprecation warnings ensures visibility.
