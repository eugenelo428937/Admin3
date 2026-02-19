# Data Model: New Session Setup Wizard

**Branch**: `20260218-new-session-setup`
**Date**: 2026-02-18

## Existing Entities (No Schema Changes)

All entities already exist in the database. No migrations are needed for
this feature. This document maps the entities, their relationships, and
how they are used in each wizard step.

### Catalog Entities

#### ExamSession (`acted.catalog_exam_sessions`)

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | AutoField | PK | |
| session_code | CharField(20) | required | e.g. "2026-09" |
| start_date | DateTimeField | required | |
| end_date | DateTimeField | required | must be > start_date |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Created in**: Step 1
**Django model**: `catalog.ExamSession`
**API**: `POST /api/catalog/exam-sessions/`

#### Subject (`acted.catalog_subjects`)

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | AutoField | PK | |
| code | CharField | unique | e.g. "CB1" |
| description | CharField | | e.g. "Business Finance" |
| active | BooleanField | default=True | only active shown in Step 2 |

**Read in**: Step 2 (left panel of transfer list)
**Django model**: `catalog.Subject`
**API**: `GET /api/catalog/admin-subjects/`

#### ExamSessionSubject (`acted.catalog_exam_session_subjects`)

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | AutoField | PK | |
| exam_session | FK(ExamSession) | CASCADE | |
| subject | FK(Subject) | CASCADE | |
| is_active | BooleanField | default=True | |
| unique_together | | (exam_session, subject) | |

**Created in**: Step 2 (one per assigned subject)
**Django model**: `catalog.ExamSessionSubject`
**API**: `POST /api/catalog/exam-session-subjects/`

#### ProductBundle (`acted.catalog_product_bundles`) - Template

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | AutoField | PK | |
| bundle_name | CharField(255) | | |
| subject | FK(Subject) | CASCADE | |
| bundle_description | TextField | nullable | |
| is_featured | BooleanField | default=False | |
| is_active | BooleanField | default=True | |
| display_order | PositiveIntegerField | default=0 | |
| unique_together | | (subject, bundle_name) | |

**Read in**: Step 3 (template for creating store bundles)
**Django model**: `catalog_products_bundles.ProductBundle`

#### ProductBundleProduct (`acted.catalog_product_bundle_products`) - Template

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | AutoField | PK | |
| bundle | FK(ProductBundle) | CASCADE | |
| product_product_variation | FK(PPV) | CASCADE | |
| default_price_type | CharField(20) | default='standard' | |
| quantity | PositiveIntegerField | default=1 | |
| sort_order | PositiveIntegerField | default=0 | |
| is_active | BooleanField | default=True | |
| unique_together | | (bundle, ppv) | |

**Read in**: Step 3 (components within each bundle template)
**Django model**: `catalog_products_bundles.ProductBundleProduct`

### Store Entities

#### Product (`acted.products`)

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | AutoField | PK | |
| exam_session_subject | FK(ESS) | CASCADE | |
| product_product_variation | FK(PPV) | CASCADE | |
| product_code | CharField(64) | unique, auto-generated | |
| is_active | BooleanField | default=True | |
| unique_together | | (ess, ppv) | |

**Created in**: Step 3 (copied from previous session)
**Django model**: `store.Product`
**Key behavior**: `product_code` auto-generates on `save()` based on
variation type. No manual code construction needed.

#### Price (`acted.prices`)

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | AutoField | PK | |
| product | FK(Product) | CASCADE | |
| price_type | CharField(20) | choices | standard/retaker/reduced/additional |
| amount | DecimalField(10,2) | | copied as-is from previous |
| currency | CharField(8) | default='GBP' | |
| unique_together | | (product, price_type) | |

**Created in**: Step 3 (copied from previous session's prices)
**Django model**: `store.Price`

#### Bundle (`acted.bundles`)

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | AutoField | PK | |
| bundle_template | FK(ProductBundle) | CASCADE | catalog template |
| exam_session_subject | FK(ESS) | CASCADE | new session's ESS |
| is_active | BooleanField | default=True | |
| override_name | CharField(255) | nullable | |
| override_description | TextField | nullable | |
| display_order | PositiveIntegerField | default=0 | |
| unique_together | | (bundle_template, ess) | |

**Created in**: Step 3 (from catalog bundle templates)
**Django model**: `store.Bundle`

#### BundleProduct (`acted.bundle_products`)

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | AutoField | PK | |
| bundle | FK(Bundle) | CASCADE | new store bundle |
| product | FK(Product) | CASCADE | new store product |
| default_price_type | CharField(20) | default='standard' | from template |
| quantity | PositiveIntegerField | default=1 | from template |
| sort_order | PositiveIntegerField | default=0 | from template |
| is_active | BooleanField | default=True | |
| unique_together | | (bundle, product) | |

**Created in**: Step 3 (populated from catalog template components)
**Django model**: `store.BundleProduct`

## Entity Relationship Diagram

```text
Step 1 creates:
  ExamSession (new)

Step 2 creates:
  ExamSessionSubject (new) ──FK──> ExamSession (new)
                            ──FK──> Subject (existing)

Step 3 creates (from previous session + catalog templates):
  Product (new) ──FK──> ExamSessionSubject (new, from Step 2)
                ──FK──> ProductProductVariation (existing, shared)

  Price (new) ──FK──> Product (new)
              copies amount/currency from previous Price

  Bundle (new) ──FK──> ProductBundle template (existing catalog)
               ──FK──> ExamSessionSubject (new, from Step 2)

  BundleProduct (new) ──FK──> Bundle (new)
                      ──FK──> Product (new, matched by PPV)
```

## Step 3 Copy/Create Data Flow

```text
Previous Session                    New Session
================                    ===========
ExamSession (prev)                  ExamSession (new, from Step 1)
  │                                   │
  ├─ ESS(prev, subj=CB1)             ├─ ESS(new, subj=CB1)  ← Step 2
  │    │                              │    │
  │    ├─ Product(ppv=X) ─────copy───>│    ├─ Product(ppv=X, new ESS)
  │    │    └─ Price(std, £99) ─copy─>│    │    └─ Price(std, £99)
  │    │    └─ Price(ret, £79) ─copy─>│    │    └─ Price(ret, £79)
  │    │                              │    │
  │    └─ Product(ppv=Y) ─────copy───>│    └─ Product(ppv=Y, new ESS)
  │         └─ Price(std, £49) ─copy─>│         └─ Price(std, £49)
  │                                   │
  └─ ESS(prev, subj=CM2)             └─ ESS(new, subj=CM2)  ← Step 2
       │                                   │
       └─ Product(ppv=Z) ─────copy───>     └─ Product(ppv=Z, new ESS)

Catalog Templates                   New Session (bundles)
=================                   ====================
ProductBundle(subj=CB1)             Bundle(template, ESS(new,CB1))
  └─ PBP(ppv=X)  ──match product──>  └─ BundleProduct(product(ppv=X))
  └─ PBP(ppv=Y)  ──match product──>  └─ BundleProduct(product(ppv=Y))
```
