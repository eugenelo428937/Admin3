# Backend Code Review: Reorganization Analysis

**Date:** January 2026
**Scope:** Django Backend Architecture Review
**Status:** Comprehensive Analysis Complete

## Executive Summary

This document provides a thorough code review of the Admin3 Django backend, focusing on module organization, dependency management, and recommendations for restructuring. The primary goal is to evaluate the feasibility of creating a consolidated `catalog` app and identify other improvement opportunities.

---

## 1. Current Architecture Overview

### 1.1 App Inventory (20 Django Apps)

| App Name | Purpose | Models | Dependencies |
|----------|---------|--------|--------------|
| `subjects` | Subject management | Subject | None |
| `products` | Product catalog & filtering | Product, ProductVariation, FilterGroup, FilterConfiguration, ProductBundle | subjects |
| `exam_sessions` | Exam session management | ExamSession | None |
| `exam_sessions_subjects` | Junction: ExamSession ↔ Subject | ExamSessionSubject | subjects, products, exam_sessions |
| `exam_sessions_subjects_products` | Current inventory & pricing | ExamSessionSubjectProduct, Price, Bundle | exam_sessions_subjects, products |
| `cart` | Shopping cart & orders | Cart, CartItem, ActedOrder, ActedOrderItem, etc. | exam_sessions_subjects_products, products |
| `tutorials` | Tutorial events | TutorialEvent | exam_sessions_subjects_products |
| `marking` | Marking papers | MarkingPaper | exam_sessions_subjects_products |
| `marking_vouchers` | Marking vouchers | MarkingVoucher | None |
| `rules_engine` | Business rules | ActedRule, MessageTemplate, etc. | None |
| `core_auth` | Authentication | None | None |
| `users` | User management | None | None |
| `userprofile` | User profiles | UserProfile | None |
| `utils` | Utilities (email, etc.) | EmailLog | None |
| `vat` | VAT calculations | VATRateHistory | None |
| `country` | Country data | Country | None |
| `address_cache` | Address lookup caching | AddressCache | None |
| `address_analytics` | Address analytics | AddressLookupAnalytics | None |
| `students` | Student management | Student | None |
| `administrate` | External API integration | None | None |

### 1.2 Dependency Graph (Catalog Domain)

```
subjects ─────────────────────────────────────────┐
    │                                              │
    └───────────────────┬──────────────────────────┤
                        │                          │
                        ▼                          ▼
products ←──────── exam_sessions_subjects ←── exam_sessions
    │                   │
    │                   │
    ▼                   ▼
    └───────────→ exam_sessions_subjects_products
                        │
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
       cart        tutorials       marking
```

### 1.3 Import Analysis

**Cross-app imports from `products`:** (67 occurrences)
- `exam_sessions_subjects_products` → 19 imports
- `cart` → 10 imports
- `marking` → 4 imports
- `tutorials` → 4 imports
- `vat` → 4 imports
- Internal (within products) → 26 imports

**Cross-app imports from `subjects`:** (27 occurrences)
- `products` → 5 imports
- `exam_sessions_subjects` → 4 imports
- `exam_sessions_subjects_products` → 4 imports
- Others → 14 imports

**Cross-app imports from `exam_sessions`:** (25+ occurrences)
- `exam_sessions_subjects` → 5 imports
- `exam_sessions_subjects_products` → 6 imports
- Others → 14+ imports

---

## 2. Critical Issues Identified

### 2.1 Fragmented Catalog Domain (HIGH PRIORITY)

**Problem:** The catalog-related models are unnecessarily split across 5 apps, creating:
- Complex import chains
- Circular import risks
- Difficult model relationship comprehension
- Maintenance overhead

**Evidence:**
```python
# exam_sessions_subjects/models.py - imports from 3 apps
from subjects.models import Subject
from products.models.products import Product
from exam_sessions.models import ExamSession
```

```python
# exam_sessions_subjects_products/models/exam_session_subject_product.py
from exam_sessions_subjects.models import ExamSessionSubject
from products.models.products import Product
```

**Impact:**
- New developers struggle to understand the data model
- Refactoring requires changes across multiple files
- Testing requires complex fixture setup

### 2.2 Verbose App Names (MEDIUM PRIORITY)

**Problem:** `exam_sessions_subjects_products` is 32 characters and creates unwieldy imports.

**Evidence:**
```python
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from exam_sessions_subjects_products.models import ExamSessionSubjectProductVariation
```

**Impact:**
- Code readability suffers
- Line length limits are harder to meet
- IDE autocomplete is less useful

### 2.3 Mixed Concerns in Products App (MEDIUM PRIORITY)

**Problem:** The `products` app contains two distinct domains:
1. **Product Catalog:** Product, ProductVariation, ProductBundle
2. **Filter System:** FilterGroup, FilterConfiguration, FilterPreset, FilterUsageAnalytics

**Evidence:**
```
products/models/
├── __init__.py
├── products.py           # Core product models
├── product_variation.py  # Variation models
├── bundle_product.py     # Bundle models
├── filter_system.py      # Filter configuration (307 lines)
└── product_group_filter.py  # Legacy filter models
```

**Impact:**
- Filter system changes affect product deployments
- Testing is more complex
- Domain boundaries are unclear

### 2.4 Overloaded Cart App (HIGH PRIORITY)

**Problem:** `cart/models.py` contains 1036 lines with 10+ models spanning two domains:
1. **Cart Domain:** Cart, CartItem, CartFee
2. **Order Domain:** ActedOrder, ActedOrderItem, ActedOrderPayment, OrderUserAcknowledgment, etc.

**Evidence:**
```python
# cart/models.py - Lines 1-1036
class Cart(models.Model): ...           # Lines 6-318
class CartItem(models.Model): ...       # Lines 319-451
class CartFee(models.Model): ...        # Lines 452-494
class ActedOrder(models.Model): ...     # Lines 495-522
class ActedOrderItem(models.Model): ... # Lines 523-590
class OrderUserAcknowledgment: ...      # Lines 591-731
class OrderUserPreference: ...          # Lines 733-869
class OrderUserContact: ...             # Lines 871-903
class OrderDeliveryDetail: ...          # Lines 905-962
class ActedOrderPayment: ...            # Lines 964-1036
```

**Impact:**
- Single Responsibility Principle violated
- Cart and Order have different lifecycle concerns
- Difficult to navigate and maintain

### 2.5 Inconsistent Naming Conventions (LOW PRIORITY)

**Problem:** Inconsistent model and table naming:
- Some models use `Acted` prefix: `ActedOrder`, `ActedOrderItem`
- Some don't: `Cart`, `CartItem`, `Product`
- Table names: `acted_products`, `acted_cart_items`

---

## 3. Recommendations

### 3.1 Option A: Consolidated Catalog App (RECOMMENDED)

Create a single `catalog` app containing all product/inventory-related models.

**New Structure:**
```
catalog/
├── __init__.py
├── apps.py
├── admin.py
├── urls.py
├── models/
│   ├── __init__.py
│   ├── subject.py              # Subject
│   ├── exam_session.py         # ExamSession
│   ├── product.py              # Product, ProductVariation
│   ├── product_bundle.py       # ProductBundle, ProductBundleProduct
│   ├── exam_session_subject.py # ExamSessionSubject
│   ├── inventory.py            # ExamSessionSubjectProduct, variations
│   └── price.py                # Price
├── serializers/
│   ├── __init__.py
│   ├── subject.py
│   ├── product.py
│   └── inventory.py
├── views/
│   ├── __init__.py
│   ├── subject.py
│   ├── product.py
│   └── inventory.py
├── services/
│   └── filter_service.py
├── migrations/
└── tests/
```

**Benefits:**
- Single import source: `from catalog.models import Product, Subject, ExamSession`
- Clear domain boundary
- Reduced circular import risks
- Easier onboarding for new developers

**Migration Approach:**
1. Create `catalog` app with new structure
2. Use `db_table` meta option to preserve existing tables
3. Create re-export modules for backward compatibility
4. Gradually update imports across codebase
5. Remove old apps after migration complete

### 3.2 Option B: Domain-Driven Structure

Reorganize into business domains:

```
apps/
├── catalog/              # Product definitions (master data)
│   └── models: Subject, Product, ProductVariation, ProductBundle
│
├── inventory/            # Current availability & pricing
│   └── models: ExamSession, ExamSessionSubject, ExamSessionSubjectProduct, Price
│
├── orders/               # Order management (extracted from cart)
│   └── models: ActedOrder, ActedOrderItem, ActedOrderPayment, etc.
│
├── cart/                 # Shopping cart only
│   └── models: Cart, CartItem, CartFee
│
├── filters/              # Filter system (extracted from products)
│   └── models: FilterGroup, FilterConfiguration, FilterPreset
│
├── tutorials/            # Tutorial events
├── marking/              # Marking papers & vouchers (consolidated)
├── rules/                # Business rules engine
├── auth/                 # Authentication (renamed from core_auth)
├── users/                # Users & profiles (consolidated)
├── integrations/         # External APIs (administrate, address services)
└── core/                 # Utilities, country data
```

**Benefits:**
- Clear bounded contexts
- Better separation of concerns
- Scalable for future growth

**Drawbacks:**
- More extensive refactoring
- Higher migration risk

### 3.3 Recommendation: Hybrid Approach

**Phase 1: Consolidate Catalog (3-4 weeks effort)**
1. Create `catalog` app combining:
   - `subjects`
   - `exam_sessions`
   - `exam_sessions_subjects`
   - Core models from `products` (Product, ProductVariation)
   - `exam_sessions_subjects_products`

2. Keep `db_table` names unchanged to avoid migrations

**Phase 2: Separate Orders from Cart (2 weeks effort)**
1. Create `orders` app with:
   - ActedOrder, ActedOrderItem
   - ActedOrderPayment
   - OrderUserAcknowledgment, OrderUserPreference
   - OrderDeliveryDetail, OrderUserContact

**Phase 3: Extract Filter System (1-2 weeks effort)**
1. Create `filters` app with:
   - FilterGroup, FilterConfiguration
   - FilterPreset, FilterUsageAnalytics

---

## 4. Detailed Migration Plan

### 4.1 Phase 1: Catalog Consolidation

#### Step 1: Create catalog app structure

```bash
python manage.py startapp catalog
```

#### Step 2: Move models with backward compatibility

```python
# catalog/models/__init__.py
from django.db import models

# Re-export all catalog models
from .subject import Subject
from .exam_session import ExamSession
from .product import Product, ProductVariation, ProductProductVariation, ProductProductGroup
from .product_bundle import ProductBundle, ProductBundleProduct
from .exam_session_subject import ExamSessionSubject
from .inventory import (
    ExamSessionSubjectProduct,
    ExamSessionSubjectProductVariation,
    ExamSessionSubjectBundle,
    ExamSessionSubjectBundleProduct
)
from .price import Price

__all__ = [
    'Subject',
    'ExamSession',
    'Product', 'ProductVariation', 'ProductProductVariation', 'ProductProductGroup',
    'ProductBundle', 'ProductBundleProduct',
    'ExamSessionSubject',
    'ExamSessionSubjectProduct', 'ExamSessionSubjectProductVariation',
    'ExamSessionSubjectBundle', 'ExamSessionSubjectBundleProduct',
    'Price',
]
```

#### Step 3: Create backward-compatible re-exports in old apps

```python
# subjects/models.py (backward compatibility)
from catalog.models import Subject

__all__ = ['Subject']
```

```python
# products/models/__init__.py (backward compatibility)
from catalog.models import (
    Product, ProductVariation, ProductProductVariation, ProductProductGroup,
    ProductBundle, ProductBundleProduct
)

# Keep filter models local for now
from .filter_system import FilterGroup, FilterConfiguration, ...
```

#### Step 4: Update INSTALLED_APPS

```python
INSTALLED_APPS = [
    'catalog.apps.CatalogConfig',  # New consolidated app
    # Keep old apps for backward compatibility during migration
    'subjects',  # Will re-export from catalog
    'products.apps.ProductsConfig',  # Will re-export from catalog
    # ... rest unchanged
]
```

### 4.2 Database Table Mapping

Ensure `db_table` meta option preserves existing tables:

| Model | Current Table | New Location |
|-------|--------------|--------------|
| Subject | acted_subjects | catalog.models.subject |
| ExamSession | acted_exam_sessions | catalog.models.exam_session |
| Product | acted_products | catalog.models.product |
| ProductVariation | acted_product_variations | catalog.models.product |
| ExamSessionSubject | acted_exam_session_subjects | catalog.models.exam_session_subject |
| ExamSessionSubjectProduct | acted_exam_session_subject_products | catalog.models.inventory |
| Price | acted_exam_session_subject_product_variation_price | catalog.models.price |

### 4.3 Testing Strategy

1. **Unit Tests:** Ensure all model tests pass with new imports
2. **Integration Tests:** Verify API endpoints work unchanged
3. **Import Tests:** Verify backward compatibility re-exports work
4. **Migration Tests:** Run on copy of production data

---

## 5. Additional Improvements

### 5.1 Code Organization Improvements

#### Issue: Inconsistent model file organization
**Current:**
```
products/models/
├── __init__.py        # Contains ProductProductVariation
├── products.py        # Contains Product, ProductProductGroup
├── product_variation.py
├── bundle_product.py
└── filter_system.py
```

**Recommended:**
```
products/models/
├── __init__.py        # Only re-exports
├── product.py         # Product model only
├── product_variation.py
├── product_product_variation.py  # Junction table
├── product_product_group.py      # Junction table
├── bundle.py          # ProductBundle, ProductBundleProduct
└── filter/            # Subdirectory for filter models
    ├── __init__.py
    ├── group.py
    ├── configuration.py
    └── analytics.py
```

### 5.2 Naming Convention Standardization

**Recommendation:** Adopt consistent naming:
- Remove `Acted` prefix from models (keep in table names for database compatibility)
- Use clear, descriptive names

| Current | Proposed |
|---------|----------|
| ActedOrder | Order |
| ActedOrderItem | OrderItem |
| ActedOrderPayment | OrderPayment |

### 5.3 Service Layer Improvements

**Current Issues:**
- Business logic scattered in views
- No clear service boundaries

**Recommendation:** Create explicit service classes:

```python
# catalog/services/product_service.py
class ProductService:
    def get_available_products(self, exam_session_id, subject_code):
        """Get all available products for a subject in an exam session"""
        pass

    def get_product_with_variations(self, product_id):
        """Get product with all variations and pricing"""
        pass

# catalog/services/pricing_service.py
class PricingService:
    def get_price(self, product_variation_id, price_type='standard'):
        """Get price for a product variation"""
        pass

    def calculate_bundle_price(self, bundle_id):
        """Calculate total price for a bundle"""
        pass
```

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Import breakage | Medium | High | Backward-compatible re-exports |
| Migration failures | Low | High | Test on staging first |
| Performance regression | Low | Medium | Profile queries before/after |
| Developer confusion | Medium | Low | Clear documentation |
| Deployment issues | Low | High | Feature flags, gradual rollout |

---

## 7. Implementation Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Phase 1a | Week 1-2 | Create catalog app, move models |
| Phase 1b | Week 3 | Set up backward-compatible re-exports |
| Phase 1c | Week 4 | Update imports, comprehensive testing |
| Phase 2 | Week 5-6 | Extract orders from cart |
| Phase 3 | Week 7 | Extract filter system |
| Phase 4 | Week 8 | Remove deprecated apps, final cleanup |

---

## 8. Conclusion

The Admin3 Django backend would significantly benefit from restructuring the catalog-related apps into a consolidated `catalog` app. This change would:

1. **Reduce complexity:** Single import source for all catalog models
2. **Improve maintainability:** Clear domain boundaries
3. **Enhance developer experience:** Easier to understand and navigate
4. **Reduce technical debt:** Eliminate circular import risks

The recommended hybrid approach (Option A + targeted improvements) provides the best balance of benefit vs. risk, with a clear migration path and backward compatibility.

### Next Steps

1. Review and approve this proposal
2. Create detailed task breakdown
3. Set up feature branch for migration
4. Begin Phase 1 implementation

---

## Appendix A: Current Model Relationships Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CATALOG DOMAIN                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐         ┌─────────────────────┐         ┌──────────────┐   │
│  │   Subject   │←────────│  ExamSessionSubject │────────→│ ExamSession  │   │
│  └─────────────┘         └─────────────────────┘         └──────────────┘   │
│        │                          │                                          │
│        │                          │                                          │
│        ▼                          ▼                                          │
│  ┌─────────────┐         ┌─────────────────────────────┐                    │
│  │ProductBundle│         │ ExamSessionSubjectProduct   │                    │
│  └─────────────┘         └─────────────────────────────┘                    │
│        │                          │                                          │
│        │    ┌─────────────────────┼─────────────────────┐                   │
│        │    │                     │                     │                    │
│        ▼    ▼                     ▼                     ▼                    │
│  ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐     │
│  │ProductBundleProduct│   │   ESS Product     │   │  ESS Bundle       │     │
│  └───────────────────┘   │   Variation       │   └───────────────────┘     │
│        │                 └───────────────────┘          │                    │
│        │                          │                     │                    │
│        ▼                          ▼                     ▼                    │
│  ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐     │
│  │ProductProductVar. │   │      Price        │   │ESS BundleProduct  │     │
│  └───────────────────┘   └───────────────────┘   └───────────────────┘     │
│        │                                                                     │
│        │                                                                     │
│  ┌─────┴─────┐                                                              │
│  │           │                                                               │
│  ▼           ▼                                                               │
│┌─────────┐ ┌─────────────────┐                                              │
││ Product │ │ProductVariation │                                              │
│└─────────┘ └─────────────────┘                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              BUSINESS DOMAIN                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐         │
│  │           Cart              │    │       TutorialEvent         │         │
│  │  ┌───────────────────────┐  │    │                             │         │
│  │  │      CartItem         │──┼────┼─────────────────────────────┘         │
│  │  └───────────────────────┘  │                                             │
│  │  ┌───────────────────────┐  │    ┌─────────────────────────────┐         │
│  │  │      CartFee          │  │    │       MarkingPaper          │         │
│  │  └───────────────────────┘  │    │                             │         │
│  └─────────────────────────────┘    └─────────────────────────────┘         │
│             │                                                                │
│             ▼                                                                │
│  ┌─────────────────────────────┐                                            │
│  │         Order               │                                            │
│  │  ┌───────────────────────┐  │                                            │
│  │  │     OrderItem         │  │                                            │
│  │  └───────────────────────┘  │                                            │
│  │  ┌───────────────────────┐  │                                            │
│  │  │    OrderPayment       │  │                                            │
│  │  └───────────────────────┘  │                                            │
│  │  ┌───────────────────────┐  │                                            │
│  │  │OrderAcknowledgment    │  │                                            │
│  │  └───────────────────────┘  │                                            │
│  └─────────────────────────────┘                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Appendix B: Import Dependency Matrix

| Importing App | subjects | products | exam_sessions | ess | essp |
|--------------|----------|----------|---------------|-----|------|
| subjects | - | | | | |
| products | x | - | | | x |
| exam_sessions | | | - | | |
| exam_sessions_subjects (ess) | x | x | x | - | |
| exam_sessions_subjects_products (essp) | x | x | | x | - |
| cart | | x | | | x |
| tutorials | | x | | | x |
| marking | | x | | | x |

**Legend:** x = has import dependency
