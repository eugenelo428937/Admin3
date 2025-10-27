# Epic: Material Product Card SpeedDial Enhancements

**Status:** Draft
**Type:** Brownfield Enhancement
**Created:** 2025-10-27
**Stories:** 3
**Risk Level:** 🟢 Low

---

## Epic Goal

Enhance the Material Product Card component to use Material UI SpeedDial for "Buy Both" and "Buy with Recommended Product" actions, replacing the existing radio button interface with a more intuitive and modern UI pattern that promotes product bundling and cross-selling opportunities.

---

## Epic Description

### Existing System Context

**Current relevant functionality:**
- MaterialProductCard component displays products with variations (eBook, Printed, Marking, etc.)
- "Buy Both" feature exists as a radio button option within the variations selector
- Users can select "Buy Both" to add both primary variations (typically eBook + Printed) to cart
- Add to cart logic sequentially adds both variations when buy_both is selected
- No recommendation system exists for suggesting complementary products

**Technology stack:**
- Backend: Django 5.1, DRF, PostgreSQL
- Frontend: React 18, Material-UI v5
- State: Context API for cart management
- API: RESTful endpoint `/api/exam-sessions-subjects-products/search/`

**Integration points:**
- `acted_products.buy_both` boolean field drives current buy_both display
- MaterialProductCard.js (lines 373-437) renders buy_both as radio option
- Add to cart handler (lines 578-642) processes buy_both selection
- API serializers return products with nested variations and prices

### Enhancement Details

**What's being added/changed:**

1. **Backend Recommendation Model** - New `acted_product_productvariation_recommendations` table
   - Maps source product variation → recommended product variation
   - Example: Mock Exam eBook (ID 289) → Mock Exam Marking (ID 4)
   - One-to-one relationship (each variation can have max 1 recommendation)

2. **API Enhancement** - Extend search response to include recommendations
   - Add `recommended_product` field to variation serialization
   - Include: essp_id, esspv_id, product_code, product_name, variation_type, prices

3. **Buy Both SpeedDial** - Replace radio button with Material UI SpeedDial
   - When `buy_both=true`: Show SpeedDial with 2 actions
   - Actions: "Add to Cart" (single variation), "Buy Both" (both variations)
   - Remove existing radio button code (64 lines)

4. **Recommended Product SpeedDial** - Conditional SpeedDial for recommendations
   - When variation has recommendation: Show SpeedDial with 2 actions
   - Actions: "Add to Cart", "Buy with {Product Name} ({Standard Price})"
   - Reuse existing add-to-cart logic for bundle addition

**How it integrates:**
- **Database:** Additive only - new table with foreign keys to existing `acted_product_productvariation`
- **API:** Backward compatible - adds optional `recommended_product` field to existing response
- **Frontend:** Component refactoring - replaces radio button UI, reuses cart logic
- **Cart Flow:** No changes - reuses existing onAddToCart handlers with metadata

**Success criteria:**
- ✅ Products with `buy_both=true` display SpeedDial (not radio button)
- ✅ Variations with recommendations display SpeedDial with dynamic action label
- ✅ Products without flags/recommendations display standard "Add to Cart" button
- ✅ All cart additions maintain existing metadata and pricing logic
- ✅ Legacy buy_both radio button code removed
- ✅ Zero regression in existing product display or cart functionality

---

## Stories

### Story 1: Backend Recommendation System & API Extension

**Goal:** Create database model for product variation recommendations and extend API to return recommendation data

**Scope:**
- Create `ProductVariationRecommendation` model with fields: id, product_variation_id, recommended_product_variation_id
- Add Django admin interface for managing recommendations
- Create/update serializer to include `recommended_product` nested object in variations
- Modify search view to fetch and serialize recommendations
- Write API tests for recommendation data inclusion

**Key Integration:** Links to existing `acted_product_productvariation` via foreign keys, extends existing ProductListSerializer

**Files to modify:**
- `backend/django_Admin3/products/models/` - New model file
- `backend/django_Admin3/exam_sessions_subjects_products/serializers.py` - Extend serializer
- `backend/django_Admin3/exam_sessions_subjects_products/views.py` - Add recommendation query logic
- `backend/django_Admin3/products/admin.py` - Add admin interface

---

### Story 2: Frontend SpeedDial for Buy Both Feature

**Goal:** Replace buy_both radio button with Material UI SpeedDial component

**Scope:**
- Remove buy_both radio button code (lines 373-437 in MaterialProductCard.js)
- Implement Material UI SpeedDial component with 2 actions: "Add to Cart", "Buy Both"
- Conditionally render SpeedDial when `product.buy_both === true`
- Maintain existing add-to-cart logic (lines 578-642) - no changes to cart flow
- Add hover/click interactions following Material-UI patterns

**Key Integration:** Replaces existing radio button, reuses existing cart handlers, maintains Material-UI design consistency

**Files to modify:**
- `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js` - Replace radio button with SpeedDial

**Dependencies:**
- Story 1 must be completed and deployed (API returns buy_both flag)

---

### Story 3: Frontend SpeedDial for Recommended Products

**Goal:** Implement conditional SpeedDial for variations with recommended products

**Scope:**
- Check variation.recommended_product in API response
- Render SpeedDial when recommended product exists for selected variation
- Display actions: "Add to Cart", "Buy with {product_short_name} ({standard_price})"
- Implement "Buy with Recommended" action to add both items to cart
- Handle edge cases: no recommendation, missing standard price, loading states
- Ensure fallback to normal "Add to Cart" button when no recommendation exists

**Key Integration:** Consumes new API recommendation data, reuses cart addition logic, conditionally replaces button based on variation selection

**Files to modify:**
- `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js` - Add recommendation SpeedDial logic

**Dependencies:**
- Story 1 must be completed and deployed (API returns recommended_product data)

---

## API Response Structure

### Current Response (Before Enhancement)
```json
{
  "products": [
    {
      "id": 2633,
      "essp_id": 2633,
      "product_code": "M1",
      "product_name": "Mock Exam",
      "buy_both": false,
      "variations": [
        {
          "id": 1,
          "variation_type": "eBook",
          "name": "Vitalsource eBook",
          "prices": [
            {"id": 488, "price_type": "standard", "amount": 16, "currency": "gbp"}
          ]
        }
      ]
    }
  ]
}
```

### Enhanced Response (After Story 1)
```json
{
  "products": [
    {
      "id": 2633,
      "essp_id": 2633,
      "product_code": "M1",
      "product_name": "Mock Exam",
      "buy_both": false,
      "variations": [
        {
          "id": 1,
          "variation_type": "eBook",
          "name": "Vitalsource eBook",
          "prices": [
            {"id": 488, "price_type": "standard", "amount": 16, "currency": "gbp"}
          ],
          "recommended_product": {
            "essp_id": 2740,
            "esspv_id": 390,
            "product_code": "M1",
            "product_name": "Mock Exam Marking",
            "product_short_name": "Mock Exam Marking",
            "variation_type": "Marking",
            "prices": [
              {"id": 1407, "price_type": "standard", "amount": 73, "currency": "gbp"}
            ]
          }
        }
      ]
    }
  ]
}
```

---

## Database Schema

### New Table: `acted_product_productvariation_recommendations`

```sql
CREATE TABLE acted_product_productvariation_recommendations (
    id SERIAL PRIMARY KEY,
    product_variation_id INTEGER NOT NULL,
    recommended_product_variation_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_variation_id)
        REFERENCES acted_product_productvariation(id) ON DELETE CASCADE,
    FOREIGN KEY (recommended_product_variation_id)
        REFERENCES acted_product_productvariation(id) ON DELETE CASCADE,
    UNIQUE(product_variation_id)  -- One-to-one relationship constraint
);

CREATE INDEX idx_product_variation_id
    ON acted_product_productvariation_recommendations(product_variation_id);
```

**Example Data:**
| id | product_variation_id | recommended_product_variation_id |
|----|---------------------|----------------------------------|
| 1  | 289 (Mock Exam eBook) | 4 (Mock Exam Marking) |
| 2  | 145 (Study Material eBook) | 67 (Revision Notes) |

---

## Compatibility Requirements

- ✅ **Existing APIs remain unchanged** - Response structure extended with optional field only
- ✅ **Database schema changes are backward compatible** - New table, no modifications to existing tables
- ✅ **UI changes follow existing patterns** - Uses Material-UI SpeedDial, consistent with existing design system
- ✅ **Performance impact is minimal** - Single additional LEFT JOIN for recommendations, indexed foreign keys

---

## Risk Mitigation

### Primary Risk
UI regression where existing products without buy_both/recommendations fail to display "Add to Cart" button

### Mitigation Strategy
- Defensive conditional rendering: Always check for flags before rendering SpeedDial
- Fallback to standard button when conditions not met
- Comprehensive unit tests for all UI states (no flags, buy_both only, recommendation only, neither)
- Manual QA testing on products across all categories

### Rollback Plan

**Backend:**
- DROP TABLE `acted_product_productvariation_recommendations` (no dependencies)
- Revert serializer changes (additive field removal)
- No data loss, clean rollback

**Frontend:**
- Git revert commits for MaterialProductCard.js changes
- Redeploy previous version from main branch
- Existing cart logic unchanged, zero risk

**API:**
- Serializer change is additive-only, safe to revert without data loss
- Frontend gracefully handles missing `recommended_product` field

**Database:**
- No existing data modified during implementation
- New table can be removed cleanly without cascading effects

---

## Definition of Done

### Epic Completion Criteria

- ✅ All 3 stories completed with acceptance criteria met
- ✅ Existing product display and cart functionality verified through regression testing
- ✅ Buy Both products display SpeedDial (validated with production data samples)
- ✅ Recommended products display conditional SpeedDial (validated with test recommendations)
- ✅ Products without flags display standard button (validated across all product types)
- ✅ API documentation updated to reflect new `recommended_product` field
- ✅ Django admin configured for managing recommendations
- ✅ Legacy buy_both radio button code removed from codebase
- ✅ Zero regression in existing features (validated via automated + manual testing)

### Testing Requirements

**Backend Tests:**
- Model creation and foreign key constraints
- Unique constraint validation (one-to-one relationship)
- API serializer includes `recommended_product` when available
- API response without recommendations (backward compatibility)

**Frontend Tests:**
- SpeedDial renders when `buy_both=true`
- SpeedDial renders when `recommended_product` exists
- Standard button renders when both conditions false (fallback)
- "Buy Both" action adds both variations to cart
- "Buy with Recommended" action adds both products to cart
- Cart metadata structure maintained for all addition paths

**Regression Tests:**
- Materials products without buy_both continue to work
- Tutorial products unaffected by changes
- Marking products unaffected by changes
- Bundle products unaffected by changes
- All existing add-to-cart flows maintain functionality

---

## Technical Constraints

### Assumptions
1. **Mutual Exclusivity:** A product will NOT have both `buy_both=true` AND recommendations simultaneously
2. **One-to-One Relationship:** Each product variation can have maximum 1 recommended product
3. **Price Type:** Always use "standard" price for recommendation display
4. **Variation Selection:** Recommendation SpeedDial only shows for currently selected variation

### Design Decisions
- **SpeedDial Placement:** Replace existing button location (maintain layout consistency)
- **Action Order:** Primary action (Add to Cart) always first, bundle/recommendation action second
- **Pricing Display:** Show only standard price in recommendation label (e.g., "Buy with Marking (£73)")
- **Loading States:** Maintain existing loading behavior from parent component

---

## Story Manager Handoff

**Integration Points:**
1. **Database:** New `acted_product_productvariation_recommendations` table with FK to `acted_product_productvariation`
2. **API Serializer:** Extend `ProductListSerializer` with optional `recommended_product` nested object
3. **Search View:** `exam_sessions_subjects_products/views.py:708` - add recommendation fetch logic
4. **MaterialProductCard:** Remove lines 373-437, add conditional SpeedDial component
5. **Cart Context:** Reuse existing `onAddToCart` handlers (no changes required)

**Existing Patterns:**
- Django Models: FK relationships through junction tables
- DRF Serializers: Nested serialization with prefetch optimization
- React Components: Memoized functional components with Material-UI
- Cart Metadata: Standard structure with type/productType/variationId/etc.

**Critical Compatibility:**
- Backward compatible API (optional field only)
- Conditional rendering with fallback to standard button
- Zero breaking changes to existing product types
- Database one-to-one constraint enforcement
- Price fallback to "standard" type

**Regression Testing Required:**
- Products WITHOUT buy_both flag (normal button)
- Products WITHOUT recommendations (normal button)
- Existing add-to-cart metadata structure preserved
- API backward compatibility validation
- All UI states tested (SpeedDial variants + fallback)

---

## Success Metrics

### User Experience
- ✅ Reduced clicks for buying multiple related products (2 clicks → 1 click)
- ✅ Improved discoverability of complementary products
- ✅ Modern, intuitive UI following Material Design principles

### Business Value
- 📈 Increased average order value through cross-selling
- 📈 Higher conversion rate for bundle purchases
- 📈 Improved product recommendation engagement

### Technical Quality
- ✅ Zero regression in existing functionality
- ✅ Maintainable code following project conventions
- ✅ Comprehensive test coverage (unit + integration)
- ✅ Performance impact < 10ms per request

---

## References

- **Material-UI SpeedDial Documentation:** https://mui.com/material-ui/react-speed-dial/
- **CLAUDE.md Project Guidelines:** `/Users/work/Documents/Code/Admin3/CLAUDE.md`
- **Existing MaterialProductCard:** `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
- **API Views:** `backend/django_Admin3/exam_sessions_subjects_products/views.py`
- **Product Models:** `backend/django_Admin3/products/models/products.py`

---

**Epic Created By:** John (PM Agent)
**Date:** 2025-10-27
**Next Step:** Detailed story creation with acceptance criteria and technical specifications
