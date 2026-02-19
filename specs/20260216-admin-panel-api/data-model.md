# Data Model: Admin Panel Backend API

**Branch**: `20260216-admin-panel-api` | **Date**: 2026-02-16

All models pre-exist. No migrations needed. This document maps existing models to serializer fields for the admin API.

## Catalog Entities

### ExamSessionSubject

**Model**: `catalog.models.ExamSessionSubject`
**Table**: `"acted"."catalog_exam_session_subjects"`
**ViewSet**: New `ExamSessionSubjectViewSet` at `/api/catalog/exam-session-subjects/`

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| exam_session | FK → ExamSession | read-write | Required on create |
| subject | FK → Subject | read-write | Required on create |
| is_active | BooleanField | read-write | Default: True |
| created_at | DateTimeField | read-only | auto_now_add |
| updated_at | DateTimeField | read-only | auto_now |

**Unique constraint**: `(exam_session, subject)`
**Serializer**: Reuse existing `ExamSessionSubjectSerializer`

---

### ProductVariation

**Model**: `catalog_products.ProductVariation`
**Table**: `"acted"."catalog_product_variations"`
**ViewSet**: New `ProductVariationViewSet` at `/api/catalog/product-variations/`

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| variation_type | CharField(32) | read-write | Choices: eBook, Hub, Printed, Marking, Tutorial |
| name | CharField(64) | read-write | Required |
| description | TextField | read-write | Optional |
| description_short | CharField(255) | read-write | Optional |
| code | CharField(50) | read-write | Unique, optional |

**Unique constraint**: `(variation_type, name)`
**Serializer**: Extend existing `ProductVariationSerializer` to include `description_short` and `code`

---

### ProductProductVariation

**Model**: `catalog_products.ProductProductVariation`
**Table**: `"acted"."catalog_product_product_variations"`
**ViewSet**: New `ProductProductVariationViewSet` at `/api/catalog/product-product-variations/`

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| product | FK → catalog Product | read-write | Required on create |
| product_variation | FK → ProductVariation | read-write | Required on create |

**Unique constraint**: `(product, product_variation)`
**Serializer**: New `ProductProductVariationAdminSerializer` with nested read representations for product/variation details on GET, FK IDs on write

---

### ProductBundle

**Model**: `catalog_products_bundles.ProductBundle`
**Table**: `"acted"."catalog_product_bundles"`
**ViewSet**: New `ProductBundleAdminViewSet` at `/api/catalog/product-bundles/`

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| bundle_name | CharField(255) | read-write | Required |
| subject | FK → Subject | read-write | Required |
| bundle_description | TextField | read-write | Optional |
| is_featured | BooleanField | read-write | Default: False |
| is_active | BooleanField | read-write | Default: True |
| display_order | PositiveIntegerField | read-write | Default: 0 |
| created_at | DateTimeField | read-only | auto_now_add |
| updated_at | DateTimeField | read-only | auto_now |

**Unique constraint**: `(subject, bundle_name)`
**Serializer**: New `ProductBundleAdminSerializer` (simpler than existing `ProductBundleSerializer` which has heavy computed components)

---

### ProductBundleProduct

**Model**: `catalog_products_bundles.ProductBundleProduct`
**Table**: `"acted"."catalog_product_bundle_products"`
**ViewSet**: New `ProductBundleProductViewSet` at `/api/catalog/bundle-products/`

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| bundle | FK → ProductBundle | read-write | Required; filterable via `?bundle={id}` |
| product_product_variation | FK → PPV | read-write | Required |
| default_price_type | CharField(20) | read-write | Choices: standard/retaker/additional. Default: standard |
| quantity | PositiveIntegerField | read-write | Default: 1 |
| sort_order | PositiveIntegerField | read-write | Default: 0 |
| is_active | BooleanField | read-write | Default: True |
| created_at | DateTimeField | read-only | auto_now_add |
| updated_at | DateTimeField | read-only | auto_now |

**Unique constraint**: `(bundle, product_product_variation)`
**Serializer**: New `ProductBundleProductAdminSerializer`

---

### ProductVariationRecommendation

**Model**: `catalog_products_recommendations.ProductVariationRecommendation`
**Table**: `"acted"."product_productvariation_recommendations"`
**ViewSet**: New `RecommendationViewSet` at `/api/catalog/recommendations/`

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| product_product_variation | OneToOneField → PPV | read-write | Required |
| recommended_product_product_variation | FK → PPV | read-write | Required |
| created_at | DateTimeField | read-only | auto_now_add |
| updated_at | DateTimeField | read-only | auto_now |

**Validation**: No self-references (source PPV != recommended PPV). No circular references. Model enforces this in `clean()`.
**Serializer**: New `RecommendationAdminSerializer`

---

## Store Entities

### Store Product

**Model**: `store.Product`
**Table**: `"acted"."products"`
**ViewSet**: Upgrade existing `store.ProductViewSet` (ReadOnly → ModelViewSet)

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| exam_session_subject | FK → ESS | read-write | Required on create |
| product_product_variation | FK → PPV | read-write | Required on create |
| product_code | CharField(64) | read-only | Auto-generated on save |
| is_active | BooleanField | read-write | Default: True |
| created_at | DateTimeField | read-only | auto_now_add |
| updated_at | DateTimeField | read-only | auto_now |

**Unique constraint**: `(exam_session_subject, product_product_variation)`
**Serializer**: Existing `ProductSerializer` (store) for reads; existing fields support writes (FK IDs accepted)

---

### Store Price

**Model**: `store.Price`
**Table**: `"acted"."prices"`
**ViewSet**: Upgrade existing `store.PriceViewSet` (ReadOnly → ModelViewSet)

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| product | FK → store.Product | read-write | Required |
| price_type | CharField(20) | read-write | Choices: standard/retaker/reduced/additional. Default: standard |
| amount | DecimalField(10,2) | read-write | Required |
| currency | CharField(8) | read-write | Default: GBP |
| created_at | DateTimeField | read-only | auto_now_add |
| updated_at | DateTimeField | read-only | auto_now |

**Unique constraint**: `(product, price_type)`
**Serializer**: Existing `PriceSerializer` — fields already support writes

---

### Store Bundle

**Model**: `store.Bundle`
**Table**: `"acted"."bundles"`
**ViewSet**: Upgrade existing `store.BundleViewSet` (ReadOnly → ModelViewSet)

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| bundle_template | FK → ProductBundle | read-write | Required |
| exam_session_subject | FK → ESS | read-write | Required |
| is_active | BooleanField | read-write | Default: True |
| override_name | CharField(255) | read-write | Optional |
| override_description | TextField | read-write | Optional |
| display_order | PositiveIntegerField | read-write | Default: 0 |
| created_at | DateTimeField | read-only | auto_now_add |
| updated_at | DateTimeField | read-only | auto_now |

**Unique constraint**: `(bundle_template, exam_session_subject)`
**Serializer**: Need admin write serializer (existing `BundleSerializer` has heavy computed components field)

---

### Store BundleProduct

**Model**: `store.BundleProduct`
**Table**: `"acted"."bundle_products"`
**ViewSet**: New `BundleProductViewSet` at `/api/store/bundle-products/`

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| bundle | FK → store.Bundle | read-write | Required |
| product | FK → store.Product | read-write | Required |
| default_price_type | CharField(20) | read-write | Default: standard |
| quantity | PositiveIntegerField | read-write | Default: 1 |
| sort_order | PositiveIntegerField | read-write | Default: 0 |
| is_active | BooleanField | read-write | Default: True |
| created_at | DateTimeField | read-only | auto_now_add |
| updated_at | DateTimeField | read-only | auto_now |

**Unique constraint**: `(bundle, product)`
**Serializer**: Existing `BundleProductSerializer` — fields match

---

## User Entities

### UserProfile

**Model**: `userprofile.UserProfile`
**Table**: `"acted"."user_profile"`
**ViewSet**: New `UserProfileViewSet` at `/api/users/profiles/`

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| user | OneToOneField → User | read-only | Include user.username, first_name, last_name, email |
| title | CharField(16) | read-write | Optional |
| send_invoices_to | CharField(8) | read-write | Choices: HOME/WORK |
| send_study_material_to | CharField(8) | read-write | Choices: HOME/WORK |
| remarks | TextField(500) | read-write | Optional |

**Serializer**: New `UserProfileAdminSerializer` with nested user info (read-only)

### UserProfileAddress

**Model**: `userprofile.UserProfileAddress`
**Table**: `"acted"."user_profile_address"`
**Endpoint**: `@action` on `UserProfileViewSet` + custom URL for individual update

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| user_profile | FK → UserProfile | read-only | Determined by URL path |
| address_type | CharField(8) | read-write | HOME/WORK |
| address_data | JSONField | read-write | Flexible address structure |
| country | CharField(64) | read-write | |
| company | CharField(64) | read-write | Optional (work only) |
| department | CharField(64) | read-write | Optional (work only) |

**Serializer**: New `UserProfileAddressSerializer`

### UserProfileContactNumber

**Model**: `userprofile.UserProfileContactNumber`
**Table**: `"acted"."user_profile_contact_number"`
**Endpoint**: `@action` on `UserProfileViewSet` + custom URL for individual update

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| user_profile | FK → UserProfile | read-only | Determined by URL path |
| contact_type | CharField(8) | read-write | HOME/WORK/MOBILE |
| number | CharField(32) | read-write | |
| country_code | CharField(2) | read-write | Default: '' |

**Serializer**: New `UserProfileContactSerializer`

### UserProfileEmail

**Model**: `userprofile.UserProfileEmail`
**Table**: `"acted"."user_profile_email"`
**Endpoint**: `@action` on `UserProfileViewSet` + custom URL for individual update

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| user_profile | FK → UserProfile | read-only | Determined by URL path |
| email_type | CharField(16) | read-write | PERSONAL/WORK |
| email | EmailField(128) | read-write | |

**Serializer**: New `UserProfileEmailSerializer`

### Staff

**Model**: `tutorials.Staff`
**Table**: `"acted"."staff"`
**ViewSet**: New `StaffViewSet` at `/api/users/staff/`

| Field | Type | Serializer Mode | Notes |
| --- | --- | --- | --- |
| id | AutoField (PK) | read-only | |
| user | OneToOneField → User | read-write | Required on create |
| created_at | DateTimeField | read-only | auto_now_add |
| updated_at | DateTimeField | read-only | auto_now |

**Serializer**: New `StaffAdminSerializer` with nested user info (username, name, email) on reads
