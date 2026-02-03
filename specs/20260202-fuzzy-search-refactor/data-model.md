# Data Model: Fuzzy Search Accuracy & Search Service Refactoring

**Branch**: `20260202-fuzzy-search-refactor` | **Date**: 2026-02-02

## Overview

This feature introduces **no new database models or schema changes**. All changes are to service-layer logic (scoring algorithms and method delegation). This document describes the existing entities relevant to the feature and how they interact with the modified services.

## Existing Entities (Read-Only Reference)

### store.Product

The primary entity for search results. Each record represents a purchasable item.

| Field | Type | Relationship |
|-------|------|-------------|
| `id` | AutoField | PK |
| `exam_session_subject` | FK | → `catalog.ExamSessionSubject` |
| `product_product_variation` | FK | → `catalog.ProductProductVariation` |
| `product_code` | CharField(64) | Auto-generated, unique |
| `is_active` | BooleanField | Soft delete flag |

**Key traversal paths for search/filter**:
- Subject code: `product.exam_session_subject.subject.code`
- Product name: `product.product_product_variation.product.shortname` / `.fullname`
- Product groups: `product.product_product_variation.product.groups` (M2M → FilterGroup)
- Variation type: `product.product_product_variation.product_variation.variation_type`
- Variation name: `product.product_product_variation.product_variation.name`

### catalog.ExamSessionSubject

Links an exam session to a subject.

| Field | Type | Relationship |
|-------|------|-------------|
| `subject` | FK | → `catalog.Subject` (has `.code`, `.name`) |
| `exam_session` | FK | → `catalog.ExamSession` |

### catalog.ProductProductVariation

Links a product template to a product variation.

| Field | Type | Relationship |
|-------|------|-------------|
| `product` | FK | → `catalog.Product` (has `.shortname`, `.fullname`, `.groups` M2M) |
| `product_variation` | FK | → `catalog.ProductVariation` (has `.variation_type`, `.name`) |

### filtering.FilterGroup

Hierarchical classification for products.

| Field | Type | Notes |
|-------|------|-------|
| `id` | AutoField | PK |
| `name` | CharField | Display name |
| `code` | CharField | Lookup code |
| `parent` | FK (self) | Enables tree hierarchy |

**Methods**: `get_descendants(include_self=True)` — returns all child groups recursively.

### filtering.FilterConfiguration

Defines available filter dimensions.

| Field | Type | Notes |
|-------|------|-------|
| `filter_key` | CharField | e.g., 'categories', 'product_types' |
| `filter_type` | CharField | e.g., 'filter_group', 'subject' |
| `is_active` | BooleanField | Whether filter is enabled |

### filtering.FilterConfigurationGroup

M2M linking filter configurations to filter groups.

| Field | Type | Relationship |
|-------|------|-------------|
| `filter_configuration` | FK | → FilterConfiguration |
| `filter_group` | FK | → FilterGroup |

## Value Objects (Non-Persistent)

### Relevance Score

A composite value computed per search query + product pair. Not stored in database.

| Component | Range | Description |
|-----------|-------|-------------|
| `subject_bonus` | 0 or 100 | Binary: does query start with product's subject code? |
| `token_sort` | 0-100 | FuzzyWuzzy token_sort_ratio on full searchable text |
| `partial_name` | 0-100 | FuzzyWuzzy partial_ratio on product name |
| `token_set` | 0-100 | FuzzyWuzzy token_set_ratio on full searchable text |
| **composite** | 0-100 | Weighted sum: `0.15*subject + 0.40*token_sort + 0.25*partial_name + 0.20*token_set` |

### Filter Counts (Response Shape)

Returned by `generate_filter_counts()`. Not stored in database.

```python
{
    'subjects': {'CS2': {'count': 12, 'name': 'CS2'}, ...},
    'categories': {'Bundle': {'count': 3, 'name': 'Bundle'}, ...},
    'product_types': {'Core Study Material': {'count': 8, 'name': 'Core Study Material'}, ...},
    'products': {'42': {'count': 2, 'name': 'CS2 Course Notes', 'display_name': 'CS2 Course Notes'}, ...},
    'modes_of_delivery': {'Printed': {'count': 5, 'name': 'Printed', 'display_name': 'Printed'}, ...}
}
```

## Relationship Diagram

```text
store.Product ──FK──→ catalog.ExamSessionSubject ──FK──→ catalog.Subject
                │                                            (.code, .name)
                │
                └──FK──→ catalog.ProductProductVariation
                              │
                              ├──FK──→ catalog.Product ──M2M──→ filtering.FilterGroup
                              │          (.shortname, .fullname)       (.name, .code, .parent)
                              │
                              └──FK──→ catalog.ProductVariation
                                         (.variation_type, .name)

filtering.FilterConfiguration ──M2M──→ filtering.FilterConfigurationGroup ──FK──→ filtering.FilterGroup
   (.filter_key, .filter_type)
```

## State Transitions

No state transitions are introduced by this feature. `store.Product.is_active` is used as a read-only filter (inactive products excluded from search base queryset) but is not modified.
