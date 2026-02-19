# Data Model: Admin Panel

**Branch**: `20260216-admin-panel` | **Date**: 2026-02-16

This document defines the frontend entity shapes (API response/request formats) based on existing backend models and serializers.

## Catalog Entities

### ExamSession

```
{
  id: number (PK)
  session_code: string (unique, e.g., "2026-04")
  start_date: string (ISO 8601 datetime)
  end_date: string (ISO 8601 datetime)
  create_date: string (ISO 8601, read-only)
  modified_date: string (ISO 8601, read-only)
}
```

**API**: `/api/catalog/exam-sessions/` | **Status**: Exists

### Subject

```
{
  id: number (PK)
  code: string (unique, max 10, e.g., "CM2", "SA1")
  description: string (nullable)
  active: boolean (default true)
  created_at: string (read-only)
  updated_at: string (read-only)
}
```

**API**: `/api/catalog/subjects/` | **Status**: Exists

### ExamSessionSubject

```
{
  id: number (PK)
  exam_session: number (FK to ExamSession)
  subject: number (FK to Subject)
  is_active: boolean (default true)
  created_at: string (read-only)
  updated_at: string (read-only)
}
```

**Display fields**: exam_session.session_code, subject.code
**Unique constraint**: (exam_session, subject)
**API**: `/api/catalog/exam-session-subjects/` | **Status**: Needs backend

### CatalogProduct

```
{
  id: number (PK)
  code: string (max 10)
  fullname: string (max 255)
  shortname: string (max 100)
  description: string (nullable)
  is_active: boolean (default true)
  buy_both: boolean (default false)
  created_at: string (read-only)
  updated_at: string (read-only)
}
```

**API**: `/api/catalog/products/` | **Status**: Exists

### ProductVariation

```
{
  id: number (PK)
  variation_type: string (enum: "eBook" | "Hub" | "Printed" | "Marking" | "Tutorial")
  name: string (max 64, e.g., "Standard eBook")
  description: string (nullable)
  description_short: string (max 255, nullable)
  code: string (max 50, unique, nullable)
  created_at: string (read-only)
  updated_at: string (read-only)
}
```

**Unique constraint**: (variation_type, name)
**API**: `/api/catalog/product-variations/` | **Status**: Needs backend

### ProductProductVariation

```
{
  id: number (PK)
  product: number (FK to CatalogProduct)
  product_variation: number (FK to ProductVariation)
  created_at: string (read-only)
  updated_at: string (read-only)
}
```

**Display fields**: product.shortname, product_variation.name
**Unique constraint**: (product, product_variation)
**API**: `/api/catalog/product-product-variations/` | **Status**: Needs backend

### ProductBundle (Catalog)

```
{
  id: number (PK)
  bundle_name: string (max 255)
  subject: number (FK to Subject)
  bundle_description: string (nullable)
  is_featured: boolean (default false)
  is_active: boolean (default true)
  display_order: number (default 0)
  created_at: string (read-only)
  updated_at: string (read-only)
  components: ProductBundleProduct[] (nested, read-only)
  components_count: number (read-only)
}
```

**Display fields**: subject.code
**Unique constraint**: (subject, bundle_name)
**API**: `/api/catalog/product-bundles/` | **Status**: Needs backend

### ProductBundleProduct (Catalog)

```
{
  id: number (PK)
  bundle: number (FK to ProductBundle)
  product_product_variation: number (FK to ProductProductVariation)
  default_price_type: string (enum: "standard" | "retaker" | "additional")
  quantity: number (default 1)
  sort_order: number (default 0)
  is_active: boolean (default true)
  created_at: string (read-only)
  updated_at: string (read-only)
}
```

**Display fields**: PPV product.shortname + product_variation.name
**Unique constraint**: (bundle, product_product_variation)
**API**: `/api/catalog/bundle-products/` | **Status**: Needs backend

### ProductVariationRecommendation

```
{
  id: number (PK)
  product_product_variation: number (OneToOne FK to PPV - source)
  recommended_product_product_variation: number (FK to PPV - target)
  created_at: string (read-only)
  updated_at: string (read-only)
}
```

**Display fields**: source PPV label -> recommended PPV label
**Validation**: No self-references, no circular recommendations
**API**: `/api/catalog/recommendations/` | **Status**: Needs backend

## Store Entities

### StoreProduct

```
{
  id: number (PK)
  product_code: string (unique, auto-generated, read-only)
  exam_session_subject: number (FK to ExamSessionSubject)
  product_product_variation: number (FK to ProductProductVariation)
  is_active: boolean (default true)
  created_at: string (read-only)
  updated_at: string (read-only)
  // Nested read-only display fields:
  subject_code: string
  session_code: string
  variation_type: string
  product_name: string
}
```

**Unique constraint**: (exam_session_subject, product_product_variation)
**API**: `/api/store/products/` | **Status**: Read exists, CUD needs backend

### Price

```
{
  id: number (PK)
  product: number (FK to StoreProduct)
  price_type: string (enum: "standard" | "retaker" | "reduced" | "additional")
  amount: string (decimal, e.g., "59.99")
  currency: string (default "GBP")
  created_at: string (read-only)
  updated_at: string (read-only)
  // Display field:
  product_code: string (read-only)
}
```

**Unique constraint**: (product, price_type)
**API**: `/api/store/prices/` | **Status**: Read exists, CUD needs backend

### StoreBundle

```
{
  id: number (PK)
  bundle_template: number (FK to catalog ProductBundle)
  exam_session_subject: number (FK to ExamSessionSubject)
  is_active: boolean (default true)
  override_name: string (nullable)
  override_description: string (nullable)
  display_order: number (default 0)
  created_at: string (read-only)
  updated_at: string (read-only)
  // Computed:
  name: string (override or template name)
  description: string (override or template description)
  components: StoreBundleProduct[] (nested, read-only)
  components_count: number (read-only)
}
```

**Unique constraint**: (bundle_template, exam_session_subject)
**API**: `/api/store/bundles/` | **Status**: Read exists, CUD needs backend

### StoreBundleProduct

```
{
  id: number (PK)
  bundle: number (FK to StoreBundle)
  product: number (FK to StoreProduct)
  default_price_type: string (enum: "standard" | "retaker" | "reduced" | "additional")
  quantity: number (default 1)
  sort_order: number (default 0)
  is_active: boolean (default true)
  created_at: string (read-only)
  updated_at: string (read-only)
}
```

**Unique constraint**: (bundle, product)
**API**: `/api/store/bundle-products/` | **Status**: Needs backend

## User Entities

### UserProfile

```
{
  id: number (PK)
  user: number (FK to Django User)
  title: string (nullable, e.g., "Mr", "Ms")
  send_invoices_to: string (enum: "HOME" | "WORK")
  send_study_material_to: string (enum: "HOME" | "WORK")
  remarks: string (nullable)
  // Nested read-only:
  user_email: string
  user_first_name: string
  user_last_name: string
}
```

**API**: `/api/users/profiles/` | **Status**: Needs backend

### UserProfileAddress

```
{
  id: number (PK)
  user_profile: number (FK to UserProfile)
  address_type: string (enum: "HOME" | "WORK")
  address_data: object (JSON, country-specific format)
  country: string (max 64)
  company: string (nullable, WORK only)
  department: string (nullable, WORK only)
}
```

**API**: `/api/users/profiles/{id}/addresses/` | **Status**: Needs backend

### UserProfileContactNumber

```
{
  id: number (PK)
  user_profile: number (FK to UserProfile)
  contact_type: string (enum: "HOME" | "WORK" | "MOBILE")
  number: string (max 32)
  country_code: string (max 2, ISO 3166-1 alpha-2)
}
```

**API**: `/api/users/profiles/{id}/contacts/` | **Status**: Needs backend

### UserProfileEmail

```
{
  id: number (PK)
  user_profile: number (FK to UserProfile)
  email_type: string (enum: "PERSONAL" | "WORK")
  email: string (max 128)
}
```

**API**: `/api/users/profiles/{id}/emails/` | **Status**: Needs backend

### Staff

```
{
  id: number (PK)
  user: number (OneToOne FK to Django User)
  created_at: string (read-only)
  updated_at: string (read-only)
  // Display fields:
  user_email: string (read-only)
  user_first_name: string (read-only)
  user_last_name: string (read-only)
}
```

**API**: `/api/users/staff/` | **Status**: Needs backend

## Entity Relationship Summary

```
CATALOG:
  ExamSession <--M2M via ExamSessionSubject--> Subject
  CatalogProduct <--M2M via ProductProductVariation--> ProductVariation
  ProductBundle --> Subject (FK)
  ProductBundleProduct --> ProductBundle (FK), ProductProductVariation (FK)
  ProductVariationRecommendation --> ProductProductVariation (1:1 source, M:1 target)

STORE:
  StoreProduct --> ExamSessionSubject (FK), ProductProductVariation (FK)
  Price --> StoreProduct (FK)
  StoreBundle --> catalog.ProductBundle (FK), ExamSessionSubject (FK)
  StoreBundleProduct --> StoreBundle (FK), StoreProduct (FK)

USER:
  UserProfile --> Django User (1:1)
  UserProfileAddress --> UserProfile (FK)
  UserProfileContactNumber --> UserProfile (FK)
  UserProfileEmail --> UserProfile (FK)
  Staff --> Django User (1:1)
```
