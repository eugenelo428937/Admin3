# Data Model: Store App Consolidation

**Date**: 2025-01-14
**Feature**: [spec.md](spec.md) | [plan.md](plan.md) | [research.md](research.md)

## Overview

This document defines the data model for the store app consolidation. The architecture separates:
- **Catalog App**: Master data (templates, definitions, configurations)
- **Store App**: Purchasable items (products available for sale)

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CATALOG APP                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌───────────────────┐     ┌──────────────────────┐   │
│  │ ExamSession  │     │ ProductTemplate   │     │ ProductVariation     │   │
│  │              │     │ (renamed Product) │     │                      │   │
│  │ session_code │     │ fullname          │     │ name                 │   │
│  │ start_date   │     │ shortname         │     │ variation_type       │   │
│  │ end_date     │     │ description       │     │ code                 │   │
│  └──────┬───────┘     │ code              │     └──────────┬───────────┘   │
│         │             │ is_active         │                │               │
│         │             └─────────┬─────────┘                │               │
│         │                       │                          │               │
│  ┌──────┴───────┐              │    ┌─────────────────────┴───────────┐   │
│  │   Subject    │              │    │  ProductProductVariation (PPV)  │   │
│  │              │              │    │                                 │   │
│  │ code         │              └────┤  product_template_id (FK)       │   │
│  │ fullname     │                   │  product_variation_id (FK)      │   │
│  │ is_active    │                   │  recommended_price              │   │
│  └──────┬───────┘                   │  is_active                      │   │
│         │                           └────────────────┬────────────────┘   │
│         │                                            │                    │
│  ┌──────┴──────────────────┐                        │                    │
│  │  ExamSessionSubject     │                        │                    │
│  │  (ESS - MOVED here)     │                        │                    │
│  │                         │                        │                    │
│  │  exam_session_id (FK)   │                        │                    │
│  │  subject_id (FK)        │                        │                    │
│  │  is_active              │                        │                    │
│  └───────────┬─────────────┘                        │                    │
│              │                                      │                    │
└──────────────┼──────────────────────────────────────┼────────────────────┘
               │                                      │
               ▼                                      ▼
┌──────────────┴──────────────────────────────────────┴────────────────────┐
│                              STORE APP                                    │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────┐                                 │
│  │  Product (NEW - replaces ESSPV)     │                                 │
│  │                                     │                                 │
│  │  exam_session_subject_id (FK) ──────┼─► catalog.ExamSessionSubject    │
│  │  product_product_variation_id (FK) ─┼─► catalog.ProductProductVariation│
│  │  product_code (unique)              │                                 │
│  │  is_active                          │                                 │
│  │  created_at                         │                                 │
│  │  updated_at                         │                                 │
│  └─────────────┬───────────────────────┘                                 │
│                │                                                          │
│                │  1:N                                                     │
│                ▼                                                          │
│  ┌─────────────────────────────────────┐                                 │
│  │  Price (NEW - replaces ESSPV Price) │                                 │
│  │                                     │                                 │
│  │  product_id (FK) ───────────────────┼─► store.Product                 │
│  │  price_type (enum)                  │                                 │
│  │  amount (decimal)                   │                                 │
│  │  currency                           │                                 │
│  └─────────────────────────────────────┘                                 │
│                                                                           │
│  ┌─────────────────────────────────────┐     ┌─────────────────────────┐ │
│  │  Bundle (NEW)                       │     │  BundleProduct (NEW)    │ │
│  │                                     │     │                         │ │
│  │  bundle_template_id (FK) ───────────┼─►   │  bundle_id (FK) ────────┤ │
│  │  exam_session_subject_id (FK) ──────┼─►   │  product_id (FK) ───────┤ │
│  │  is_active                          │  ◄──┼──                       │ │
│  │  override_name                      │     │  default_price_type     │ │
│  │  override_description               │     │  quantity               │ │
│  │  display_order                      │     │  sort_order             │ │
│  └─────────────────────────────────────┘     │  is_active              │ │
│                                              └─────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Catalog App Entities

### catalog.ProductTemplate (Renamed from Product)

Master product definition containing reusable product information.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| fullname | CharField(255) | required | Full product name for display |
| shortname | CharField(100) | required | Short product name for compact display |
| description | TextField | nullable | Detailed product description |
| code | CharField(10) | required | Unique product code |
| is_active | BooleanField | default=True | Whether template is available |
| buy_both | BooleanField | default=False | Suggest purchasing both variations |
| created_at | DateTimeField | auto_now_add | Creation timestamp |
| updated_at | DateTimeField | auto_now | Last update timestamp |

**Relationships**:
- M2M → `ProductVariation` via `ProductProductVariation`
- M2M → `FilterGroup` via `ProductProductGroup`

**Table**: `"acted"."catalog_product_templates"` (renamed from `catalog_products`)

**Validation Rules**:
- `code` must be unique across all product templates
- `fullname` and `shortname` are required

---

### catalog.ExamSessionSubject (Moved from exam_sessions_subjects)

Associates exam sessions with subjects, defining availability per exam period.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| exam_session_id | ForeignKey | required, CASCADE | Reference to ExamSession |
| subject_id | ForeignKey | required, CASCADE | Reference to Subject |
| is_active | BooleanField | default=True | Whether combination is active |
| created_at | DateTimeField | auto_now_add | Creation timestamp |
| updated_at | DateTimeField | auto_now | Last update timestamp |

**Relationships**:
- FK → `catalog.ExamSession`
- FK → `catalog.Subject`
- Reverse: `store.Product.exam_session_subject`
- Reverse: `store.Bundle.exam_session_subject`

**Table**: `"acted"."catalog_exam_session_subjects"`

**Validation Rules**:
- `unique_together`: (`exam_session`, `subject`)
- Both FKs are required

---

## Store App Entities

### store.Product (New - replaces ExamSessionSubjectProductVariation)

A purchasable item available for sale in a specific exam session.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key (preserved from ESSPV) |
| exam_session_subject_id | ForeignKey | required, CASCADE | Reference to ESS |
| product_product_variation_id | ForeignKey | required, CASCADE | Reference to PPV |
| product_code | CharField(64) | unique | Auto-generated product code |
| is_active | BooleanField | default=True | Whether product is available |
| created_at | DateTimeField | auto_now_add | Creation timestamp |
| updated_at | DateTimeField | auto_now | Last update timestamp |

**Relationships**:
- FK → `catalog.ExamSessionSubject`
- FK → `catalog.ProductProductVariation`
- Reverse: `store.Price` (1:N)
- Reverse: `store.BundleProduct` (N:M via BundleProduct)
- Referenced by: `cart.CartItem.product`

**Table**: `"acted"."products"`

**Validation Rules**:
- `product_code` must be unique
- `unique_together`: (`exam_session_subject`, `product_product_variation`)
- Product is hidden if referenced catalog template is inactive (FR-012)

**Product Code Generation**:
```
{subject_code}/{prefix}{product_code}{variation_code}/{exam_session_code}
Example: CM2/PCSM01/2025S1
```

---

### store.Price (New - replaces exam_sessions_subjects_products.Price)

Pricing information for a store product.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| product_id | ForeignKey | required, CASCADE | Reference to store.Product |
| price_type | CharField(20) | required, choices | Price category |
| amount | DecimalField(10,2) | required | Price amount |
| currency | CharField(8) | default='GBP' | Currency code |
| created_at | DateTimeField | auto_now_add | Creation timestamp |
| updated_at | DateTimeField | auto_now | Last update timestamp |

**Price Type Choices**:
| Value | Display |
|-------|---------|
| standard | Standard |
| retaker | Retaker |
| reduced | Reduced Rate |
| additional | Additional Copy |

**Relationships**:
- FK → `store.Product`

**Table**: `"acted"."prices"`

**Validation Rules**:
- `unique_together`: (`product`, `price_type`)
- `amount` must be >= 0
- `price_type` must be one of the defined choices

---

### store.Bundle (New - replaces ExamSessionSubjectBundle)

A collection of store products sold together.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| bundle_template_id | ForeignKey | required, CASCADE | Reference to catalog.ProductBundle |
| exam_session_subject_id | ForeignKey | required, CASCADE | Reference to ESS |
| is_active | BooleanField | default=True | Whether bundle is available |
| override_name | CharField(255) | nullable | Override template name |
| override_description | TextField | nullable | Override template description |
| display_order | PositiveIntegerField | default=0 | Sort order for display |
| created_at | DateTimeField | auto_now_add | Creation timestamp |
| updated_at | DateTimeField | auto_now | Last update timestamp |

**Relationships**:
- FK → `catalog.ProductBundle`
- FK → `catalog.ExamSessionSubject`
- Reverse: `store.BundleProduct` (1:N)

**Table**: `"acted"."bundles"`

**Validation Rules**:
- `unique_together`: (`bundle_template`, `exam_session_subject`)
- Bundle is visible even if contains inactive products (display as unavailable)

---

### store.BundleProduct (New - replaces ExamSessionSubjectBundleProduct)

Individual products within a bundle.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| bundle_id | ForeignKey | required, CASCADE | Reference to store.Bundle |
| product_id | ForeignKey | required, CASCADE | Reference to store.Product |
| default_price_type | CharField(20) | default='standard' | Default price type for bundle |
| quantity | PositiveIntegerField | default=1 | Quantity in bundle |
| sort_order | PositiveIntegerField | default=0 | Display order within bundle |
| is_active | BooleanField | default=True | Whether item is active in bundle |
| created_at | DateTimeField | auto_now_add | Creation timestamp |
| updated_at | DateTimeField | auto_now | Last update timestamp |

**Relationships**:
- FK → `store.Bundle`
- FK → `store.Product`

**Table**: `"acted"."bundle_products"`

**Validation Rules**:
- `unique_together`: (`bundle`, `product`)
- `quantity` must be >= 1

---

## Migration Mapping

### Table Mappings

| Source Entity | Target Entity | Migration Type |
|--------------|---------------|----------------|
| `catalog.Product` | `catalog.ProductTemplate` | Rename |
| `exam_sessions_subjects.ExamSessionSubject` | `catalog.ExamSessionSubject` | Move |
| `ExamSessionSubjectProductVariation` | `store.Product` | Flatten + Migrate |
| `exam_sessions_subjects_products.Price` | `store.Price` | Migrate |
| `ExamSessionSubjectBundle` | `store.Bundle` | Migrate |
| `ExamSessionSubjectBundleProduct` | `store.BundleProduct` | Migrate |
| `ExamSessionSubjectProduct` | (eliminated) | Delete after migration |

### Field Mappings

**ESSPV → store.Product**:
| Source Field | Target Field | Transformation |
|--------------|--------------|----------------|
| `id` | `id` | Preserve (FK integrity) |
| `exam_session_subject_product.exam_session_subject_id` | `exam_session_subject_id` | Flatten via JOIN |
| `product_product_variation_id` | `product_product_variation_id` | Direct copy |
| `product_code` | `product_code` | Direct copy |
| (new) | `is_active` | Default True |

---

## State Transitions

### Product Lifecycle

```
┌─────────────┐     activate      ┌─────────────┐
│   INACTIVE  │ ─────────────────► │   ACTIVE    │
│             │ ◄───────────────── │             │
└─────────────┘     deactivate    └─────────────┘
       │                                  │
       │      template_inactive           │
       │ ◄────────────────────────────────┤
       │                                  │
       ▼                                  │
┌─────────────┐                          │
│   HIDDEN    │ (browsing/search only)   │
└─────────────┘                          │
```

**States**:
- **ACTIVE**: `is_active=True` AND catalog template `is_active=True`
- **INACTIVE**: `is_active=False`
- **HIDDEN**: `is_active=True` but catalog template `is_active=False`

---

## Indexes

### Recommended Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `products` | `idx_products_ess` | `exam_session_subject_id` | FK lookup |
| `products` | `idx_products_ppv` | `product_product_variation_id` | FK lookup |
| `products` | `idx_products_active` | `is_active` | Filter queries |
| `products` | `idx_products_code` | `product_code` | Unique lookup |
| `prices` | `idx_prices_product` | `product_id` | FK lookup |
| `bundles` | `idx_bundles_ess` | `exam_session_subject_id` | FK lookup |
| `bundle_products` | `idx_bp_bundle` | `bundle_id` | FK lookup |

---

## Query Patterns

### Before (4-table chain)
```sql
SELECT * FROM products p
JOIN product_product_variations ppv ON ...
JOIN exam_session_subject_product_variations esspv ON esspv.product_product_variation_id = ppv.id
JOIN exam_session_subject_products essp ON esspv.exam_session_subject_product_id = essp.id
JOIN exam_session_subjects ess ON essp.exam_session_subject_id = ess.id
WHERE ess.exam_session_id = ?;
```

### After (2-join maximum)
```sql
SELECT * FROM acted.products p
JOIN catalog_product_product_variations ppv ON p.product_product_variation_id = ppv.id
JOIN acted.catalog_product_templates pt ON ppv.product_id = pt.id
WHERE p.exam_session_subject_id = ?;
```

**Performance Improvement**: 4 joins → 2 joins (SC-003)
