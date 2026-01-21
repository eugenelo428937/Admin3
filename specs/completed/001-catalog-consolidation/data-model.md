# Data Model: Catalog App Consolidation

**Feature**: 001-catalog-consolidation
**Date**: 2026-01-05
**Schema**: `acted`

## Entity Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          acted schema                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐         ┌─────────────────────────┐                │
│  │    Subject      │◄────────│    ProductBundle        │                │
│  │  catalog_       │         │    catalog_             │                │
│  │  subjects       │         │    product_bundles      │                │
│  └─────────────────┘         └───────────┬─────────────┘                │
│                                          │                               │
│  ┌─────────────────┐                     │                               │
│  │  ExamSession    │                     │                               │
│  │  catalog_       │                     ▼                               │
│  │  exam_sessions  │         ┌─────────────────────────┐                │
│  └─────────────────┘         │  ProductBundleProduct   │                │
│                              │  catalog_product_       │                │
│  ┌─────────────────┐         │  bundle_products        │                │
│  │    Product      │         └───────────┬─────────────┘                │
│  │  catalog_       │◄────┐               │                               │
│  │  products       │     │               │                               │
│  └────────┬────────┘     │               │                               │
│           │              │               ▼                               │
│           │         ┌────┴───────────────────────────┐                  │
│           │         │  ProductProductVariation       │                  │
│           │         │  catalog_product_product_      │                  │
│           │         │  variations                    │                  │
│           │         └────────────────┬───────────────┘                  │
│           │                          │                                   │
│           │                          ▼                                   │
│           │              ┌─────────────────────────┐                    │
│           │              │  ProductVariation       │                    │
│           │              │  catalog_product_       │                    │
│           │              │  variations             │                    │
│           │              └─────────────────────────┘                    │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────────────┐                                            │
│  │  ProductProductGroup    │────────► FilterGroup (products app)        │
│  │  catalog_product_       │          (external, not moved)             │
│  │  groups                 │                                            │
│  └─────────────────────────┘                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Entity Definitions

### Subject

**Table**: `acted.catalog_subjects`
**Description**: Academic subject for exams and courses

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| code | CharField(10) | UNIQUE, NOT NULL | Subject code (e.g., 'CM2', 'SA1') |
| description | TextField | NULL | Full subject description |
| active | BooleanField | DEFAULT TRUE | Whether subject is active |
| created_at | DateTimeField | AUTO | Creation timestamp |
| updated_at | DateTimeField | AUTO | Last update timestamp |

**Indexes**: `code` (unique)
**Validation**: None beyond field constraints

---

### ExamSession

**Table**: `acted.catalog_exam_sessions`
**Description**: Exam session period with start and end dates

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| session_code | CharField(50) | NOT NULL | Session identifier (e.g., 'April 2026') |
| start_date | DateTimeField | NOT NULL | Session start date |
| end_date | DateTimeField | NOT NULL | Session end date |
| create_date | DateTimeField | AUTO | Creation timestamp |
| modified_date | DateTimeField | AUTO | Last update timestamp |

**Indexes**: None beyond PK
**Validation**: `start_date < end_date` (application level)

---

### Product

**Table**: `acted.catalog_products`
**Description**: Master product definition

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| fullname | CharField(255) | NOT NULL | Full product name |
| shortname | CharField(100) | NOT NULL | Short display name |
| description | TextField | NULL | Product description |
| code | CharField(10) | NOT NULL | Product code |
| created_at | DateTimeField | AUTO | Creation timestamp |
| updated_at | DateTimeField | AUTO | Last update timestamp |
| is_active | BooleanField | DEFAULT TRUE | Whether product is active |
| buy_both | BooleanField | DEFAULT FALSE | Buy both variations flag |

**Relationships**:
- M2M to FilterGroup via ProductProductGroup
- M2M to ProductVariation via ProductProductVariation

**Indexes**: None beyond PK
**Ordering**: `shortname`

---

### ProductVariation

**Table**: `acted.catalog_product_variations`
**Description**: Variation types for products (eBook, Printed, etc.)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| variation_type | CharField(32) | NOT NULL | Type: eBook, Hub, Printed, Marking, Tutorial |
| name | CharField(64) | NOT NULL | Variation name |
| description | TextField | NULL | Full description |
| description_short | CharField(255) | NULL | Short description |
| code | CharField(50) | UNIQUE, NULL | Variation code |

**Indexes**: `code` (unique), `(variation_type, name)` (unique together)
**Choices**: variation_type in ['eBook', 'Hub', 'Printed', 'Marking', 'Tutorial']

---

### ProductBundle

**Table**: `acted.catalog_product_bundles`
**Description**: Bundle packages for subjects

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| bundle_name | CharField(255) | NOT NULL | Bundle name |
| subject_id | FK(Subject) | ON DELETE CASCADE | Subject this bundle is for |
| bundle_description | TextField | NULL | Description |
| is_featured | BooleanField | DEFAULT FALSE | Featured bundle flag |
| is_active | BooleanField | DEFAULT TRUE | Active flag |
| display_order | PositiveIntegerField | DEFAULT 0 | Sort order |
| created_at | DateTimeField | AUTO | Creation timestamp |
| updated_at | DateTimeField | AUTO | Last update timestamp |

**Relationships**:
- FK to Subject (ON DELETE CASCADE)
- M2M to ProductProductVariation via ProductBundleProduct

**Indexes**: `(subject_id, bundle_name)` (unique together)
**Ordering**: `subject__code`, `display_order`, `bundle_name`

---

### ProductProductVariation (Junction)

**Table**: `acted.catalog_product_product_variations`
**Description**: Links products to their variations

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| product_id | FK(Product) | ON DELETE CASCADE | Product |
| product_variation_id | FK(ProductVariation) | ON DELETE CASCADE | Variation |

**Indexes**: `(product_id, product_variation_id)` (unique together)

---

### ProductProductGroup (Junction)

**Table**: `acted.catalog_product_product_groups`
**Description**: Links products to filter groups

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| product_id | FK(Product) | ON DELETE CASCADE | Product |
| product_group_id | FK(FilterGroup) | ON DELETE CASCADE | Filter group (external) |

**Note**: `product_group_id` references `products.FilterGroup` which remains in the products app.

**Indexes**: `(product_id, product_group_id)` (unique together)

---

### ProductBundleProduct (Junction)

**Table**: `acted.catalog_product_bundle_products`
**Description**: Links bundles to product variations

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| bundle_id | FK(ProductBundle) | ON DELETE CASCADE | Parent bundle |
| product_product_variation_id | FK(ProductProductVariation) | ON DELETE CASCADE | Product-variation combo |
| default_price_type | CharField(20) | DEFAULT 'standard' | Price type |
| quantity | PositiveIntegerField | DEFAULT 1 | Quantity to add |
| sort_order | PositiveIntegerField | DEFAULT 0 | Display order |
| is_active | BooleanField | DEFAULT TRUE | Active in bundle |
| created_at | DateTimeField | AUTO | Creation timestamp |
| updated_at | DateTimeField | AUTO | Last update timestamp |

**Indexes**: `(bundle_id, product_product_variation_id)` (unique together)
**Choices**: default_price_type in ['standard', 'retaker', 'additional']
**Ordering**: `sort_order`, `product_product_variation__product__shortname`

---

## Table Mapping (Old → New)

| Model | Old Table | New Table |
|-------|-----------|-----------|
| Subject | `acted_subjects` | `acted.catalog_subjects` |
| ExamSession | `acted_exam_sessions` | `acted.catalog_exam_sessions` |
| Product | `acted_products` | `acted.catalog_products` |
| ProductVariation | `acted_product_variations` | `acted.catalog_product_variations` |
| ProductBundle | `acted_product_bundles` | `acted.catalog_product_bundles` |
| ProductProductVariation | `acted_product_productvariation` | `acted.catalog_product_product_variations` |
| ProductProductGroup | `acted_product_productgroup` | `acted.catalog_product_product_groups` |
| ProductBundleProduct | `acted_product_bundle_products` | `acted.catalog_product_bundle_products` |

## Migration Order

1. **0001_initial.py**: Create `acted` schema (CREATE SCHEMA IF NOT EXISTS acted)
2. **0002_models.py**: Create all models with new `db_table` settings (via makemigrations)
3. **0003_copy_data.py**: Copy data from old tables to new tables

## Cross-App Dependencies

### Incoming (apps referencing catalog)

| App | Model | References |
|-----|-------|------------|
| cart | CartItem | Product, ProductProductVariation |
| tutorials | TutorialEvent | Product, ExamSession |
| marking | MarkingSession | Product, Subject |
| exam_sessions_subjects | ExamSessionSubject | Subject, ExamSession |
| exam_sessions_subjects_products | ExamSessionSubjectProduct | Product, ProductProductVariation |

### Outgoing (catalog referencing other apps)

| Model | References | External App |
|-------|------------|--------------|
| ProductProductGroup | FilterGroup | products.filter_system |

**Note**: FilterGroup stays in `products` app. This is the only outgoing dependency.
