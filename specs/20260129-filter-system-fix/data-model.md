# Data Model: Filtering System Remediation

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)
**Date**: 2026-01-29

## Entity Overview

This feature modifies no database schema. All changes are to query logic, API response structures, and frontend state management. The data model below documents the existing entities and their relationships as they pertain to the filtering system.

## Existing Entities (No Schema Changes)

### FilterConfiguration
**Table**: `"acted"."filter_configurations"`
**App**: `filtering`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| id | AutoField | PK | Primary key |
| name | CharField(100) | unique | Internal name |
| display_label | CharField(100) | | User-facing label |
| filter_type | CharField(32) | choices | Type: subject, filter_group, product_variation, tutorial_format, bundle, custom_field, computed, date_range, numeric_range |
| filter_key | CharField(50) | | API request parameter key |
| ui_component | CharField(32) | default='multi_select' | UI rendering: multi_select, single_select, checkbox, radio_buttons, toggle_buttons, search_select, tree_select, range_slider, date_picker, tag_input |
| display_order | IntegerField | default=0 | Sort order in filter panel |
| is_active | BooleanField | default=True | Active/inactive toggle |
| is_collapsible | BooleanField | default=True | Can collapse in UI |
| is_expanded_by_default | BooleanField | default=False | Default expanded state |
| is_required | BooleanField | default=False | Required filter |
| allow_multiple | BooleanField | default=True | Multi-select allowed |
| ui_config | JSONField | default=dict | Additional UI settings |
| validation_rules | JSONField | default=dict | Validation constraints |
| dependency_rules | JSONField | default=dict | Inter-filter dependencies |
| created_at | DateTimeField | auto_now_add | Creation timestamp |
| updated_at | DateTimeField | auto_now | Update timestamp |
| created_by | FK(User) | null=True | Creator |

**Relationships**:
- `filter_groups` → ManyToMany(FilterGroup) through FilterConfigurationGroup

---

### FilterConfigurationGroup (Junction)
**Table**: `"acted"."filter_configuration_groups"`
**App**: `filtering`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| id | AutoField | PK | Primary key |
| filter_configuration | FK(FilterConfiguration) | CASCADE | Parent config |
| filter_group | FK(FilterGroup) | CASCADE | Associated group |
| is_default | BooleanField | default=False | Default selected |
| display_order | IntegerField | default=0 | Order within config |

**Constraints**: unique_together = (filter_configuration, filter_group)

**Role in Remediation**: This is the canonical source for partitioning groups into filter sections (FR-001, FR-009). The current code bypasses this table; the fix routes all group-to-section mappings through it.

---

### FilterGroup
**Table**: `"acted"."filter_groups"`
**App**: `filtering`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| id | AutoField | PK | Primary key |
| name | CharField(100) | | Display name |
| parent | FK(self) | CASCADE, null=True, blank=True | Parent for hierarchy |
| code | CharField(100) | unique, null=True, blank=True | Unique code identifier |
| description | TextField | blank=True | Description |
| is_active | BooleanField | default=True | Active toggle |
| display_order | IntegerField | default=0 | Sort order |

**Hierarchy Methods** (used by FR-003, FR-010):
- `get_descendants(include_self=True)` → list of all descendant FilterGroup objects (recursive)
- `get_full_path()` → "Material > Core Study Materials" breadcrumb string
- `get_level()` → depth integer (0 = root)

---

### ProductProductGroup (Junction)
**Table**: `"acted"."catalog_product_product_groups"`
**App**: `filtering`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| product | FK(catalog.Product) | CASCADE | Catalog product template |
| product_group | FK(FilterGroup) | CASCADE | Filter group |

**Constraints**: unique_together = (product, product_group)

**Role**: Links catalog product templates to filter groups. The filtering system uses this to determine which products belong to which groups.

---

### store.Product (Purchasable Item)
**Table**: `"acted"."products"`
**App**: `store`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| id | AutoField | PK | Primary key |
| exam_session_subject | FK(catalog.ExamSessionSubject) | CASCADE | Subject + exam session |
| product_product_variation | FK(catalog.ProductProductVariation) | CASCADE | Product template + variation |
| product_code | CharField(64) | unique | Auto-generated product code |
| is_active | BooleanField | default=True | Active toggle |

**Constraints**: unique_together = (exam_session_subject, product_product_variation)

**Filter Query Paths** (how filters reach store.Product):
- Subject: `store.Product → exam_session_subject → subject`
- Category/ProductType: `store.Product → product_product_variation → product → groups (FilterGroup)`
- Mode of Delivery: `store.Product → product_product_variation → product_variation → variation_type`
- Product ID: `store.Product → product_product_variation → product → id`

---

### store.Bundle
**Table**: `"acted"."bundles"`
**App**: `store`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| id | AutoField | PK | Primary key |
| bundle_template | FK(catalog.ProductBundle) | CASCADE | Template definition |
| exam_session_subject | FK(catalog.ExamSessionSubject) | CASCADE | Subject + exam session |
| is_active | BooleanField | default=True | Active toggle |
| override_name | CharField(255) | blank=True, null=True | Override template name |
| override_description | TextField | blank=True, null=True | Override template description |
| display_order | PositiveIntegerField | default=0 | Sort order |

---

### store.BundleProduct (Junction)
**Table**: `"acted"."bundle_products"`
**App**: `store`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| bundle | FK(store.Bundle) | CASCADE | Parent bundle |
| product | FK(store.Product) | CASCADE | Component product |
| default_price_type | CharField(20) | default='standard' | Price tier |
| quantity | PositiveIntegerField | default=1 | Quantity in bundle |
| sort_order | PositiveIntegerField | default=0 | Display order |
| is_active | BooleanField | default=True | Active toggle |

**Role in Remediation** (FR-004, FR-014): Bundle filtering now queries through this junction table to find bundles with at least one component product matching all active filters.

---

### catalog.ProductVariation
**Table**: `"acted"."catalog_product_variations"`
**App**: `catalog_products`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| id | AutoField | PK | Primary key |
| variation_type | CharField(32) | choices | eBook, Hub, Printed, Marking, Tutorial |
| name | CharField(64) | | Variation name |
| code | CharField(50) | unique, null=True, blank=True | Unique code |

**Role in Remediation** (FR-008): The `variation_type` field is the canonical source for mode of delivery filtering. Format-level groups (eBook, Printed) in FilterGroup are redundant and will be removed from FilterConfigurationGroup assignments via data migration.

---

### ProductGroupFilter (DEPRECATED)
**Table**: `"acted"."product_group_filter"`
**App**: `filtering`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| name | CharField(100) | | Filter name |
| filter_type | CharField(32) | choices: type, delivery, custom | Simple type mapping |
| groups | M2M(FilterGroup) | | Associated groups |

**Deprecation** (FR-009): This model is replaced by FilterConfiguration + FilterConfigurationGroup. Add deprecation warnings to any remaining usage. Do not delete the model yet (backward compatibility), but no new code should reference it.

---

## Data Migration Required

### Migration: Remove Format Groups from Category/ProductType Configs

**Purpose**: Remove eBook, Printed, Hub groups from FilterConfigurationGroup records where the parent FilterConfiguration is a category or product_type filter. These groups should only be accessible via the `modes_of_delivery` filter which uses `variation_type`.

**Type**: Data migration (no schema change)

**Logic**:
```
For each FilterConfigurationGroup record:
  If filter_configuration.filter_key IN ('categories', 'product_types'):
    If filter_group.name IN ('eBook', 'Printed', 'Hub') OR
       filter_group.code IN ('ebook', 'printed', 'hub'):
      DELETE the FilterConfigurationGroup record
```

**Reversibility**: Reversible by re-creating the junction records. Store deleted records in migration for reverse operation.

---

## Relationship Diagram

```
FilterConfiguration ──── M2M (via FilterConfigurationGroup) ──── FilterGroup
       │                                                              │
       │ (defines filter sections)                                    │ parent → self (hierarchy)
       │                                                              │
       │                                                    ProductProductGroup
       │                                                         │         │
       │                                                catalog.Product    │
       │                                                    │              │
       │                                          ProductProductVariation  │
       │                                               │          │       │
       │                                    ProductVariation   store.Product
       │                                    (variation_type)       │
       │                                                     BundleProduct
       │                                                          │
       │                                                    store.Bundle
       │
  ProductGroupFilter (DEPRECATED - replaced by above)
```

## Frontend State Model Changes

### New Redux State Addition

```javascript
// Added to baseFilters initial state:
{
  // ... existing fields unchanged ...

  // Filter configuration from backend (US5)
  filterConfiguration: null,        // null = not loaded, [] = loaded empty
  filterConfigurationError: null,   // Error message if fetch failed
  filterConfigurationLoading: false // Loading state
}
```

### FilterRegistry Dynamic Population

The `FilterRegistry` class gains a new method:

```javascript
// New method signature:
static registerFromBackend(configurations) {
  // configurations: Array<{
  //   name: string,
  //   display_label: string,
  //   filter_key: string,        // Maps to Redux state key
  //   ui_component: string,
  //   display_order: number,
  //   is_collapsible: boolean,
  //   is_expanded_by_default: boolean,
  //   allow_multiple: boolean,
  //   filter_groups: Array<{id, name, code, display_order}>
  // }>
}
```

The existing static registrations (subjects, categories, product_types, products, modes_of_delivery, searchQuery) remain as the initial/fallback state. Backend configuration overrides display properties (label, order, UI component) but does not change Redux state keys.
