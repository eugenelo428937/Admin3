# Phase 0: Research - Recommended Products for Marking Product Card

**Date**: 2025-10-28
**Status**: Complete

## Research Questions

### 1. How does MaterialProductCard implement product recommendations?

**Decision**: Use the three-tier conditional SpeedDial pattern from MaterialProductCard:
1. **Tier 1**: `buy_both` products (buy main + companion)
2. **Tier 2**: `recommended_product` (buy main + recommended)
3. **Tier 3**: Standard "Add to Cart" button

**Rationale**:
- Proven implementation already in production
- Consistent user experience across product types
- Well-tested pattern (43 tests in MaterialProductCard.recommendations.test.js)
- Handles edge cases (pricing validation, cart operations, UI states)

**Implementation Details** (from MaterialProductCard.js:511-850):
```javascript
// Three-tier conditional rendering
{product.buy_both ? (
    // Tier 1: Buy Both SpeedDial
) : currentVariation?.recommended_product ? (
    // Tier 2: Recommended Product SpeedDial
) : (
    // Tier 3: Standard Add to Cart button
)}
```

**Alternatives Considered**:
- Custom UI pattern for marking products → Rejected: Inconsistent UX, more development effort
- Inline recommendation display → Rejected: Conflicts with deadline warning alerts
- Separate recommendation section → Rejected: Reduces conversion by separating action from price

---

### 2. What UI/UX patterns should be used for recommendations with deadline warnings?

**Decision**: Place SpeedDial in CardActions section (bottom-right), preserving all deadline warnings and submission information in CardContent section above.

**Rationale**:
- Maintains existing MarkingProductCard layout (deadline alerts in CardContent)
- SpeedDial floats above card (z-index: 1050), doesn't conflict with inline content
- Users see deadline warnings BEFORE purchase options (better UX)
- Follows Material Design elevation hierarchy

**Visual Layout**:
```
┌─────────────────────────────────┐
│ CardHeader (Subject, Title)     │
├─────────────────────────────────┤
│ CardContent                      │
│  - Submission count              │
│  - Deadline Alert (info/warning) │
│  - "Submission Deadlines" button │
├─────────────────────────────────┤
│ CardActions                      │
│  - Discount Options (retaker)    │
│  - Price Display                 │
│  - SpeedDial (recommendations) ──┤ (floating, bottom-right)
└─────────────────────────────────┘
```

**Alternatives Considered**:
- SpeedDial in CardHeader → Rejected: Conflicts with avatar and title
- Inline button in CardContent → Rejected: Disrupts deadline warning flow
- Replace standard button → Rejected: Loses single-purchase option

---

### 3. How should discount pricing (retaker/additional) interact with recommendations?

**Decision**: Discount pricing applies ONLY to the marking product, NOT to recommended products. Follow MaterialProductCard behavior exactly.

**Rationale**:
- Discount eligibility is tied to the marking product (retaker status for that specific product)
- Recommended products are typically materials (eBook, printed) with separate discount rules
- MaterialProductCard already handles this correctly: `priceType: "standard"` for recommended products (line 858)
- Simplifies pricing logic and avoids confusion

**Implementation** (from MaterialProductCard.js:837-858):
```javascript
// Add recommended product with standard pricing
const recommendedPriceObj = recommendedProduct.prices?.find(
    (p) => p.price_type === "standard"  // Always standard for recommendations
);
```

**Alternatives Considered**:
- Apply marking discount to recommended product → Rejected: Incorrect business logic
- Separate discount selection for recommendations → Rejected: Too complex for UX
- Ask user per-product → Rejected: Friction in checkout flow

---

### 4. How are recommendations exposed in the product API response?

**Decision**: No backend changes required. Recommendations are already included in the product serializer response via `recommended_product` field on each variation.

**Evidence** (from MaterialProductCard implementation):
- MaterialProductCard reads `currentVariation?.recommended_product` (line 674)
- Recommended product object includes: `essp_id`, `esspv_id`, `product_code`, `product_name`, `product_short_name`, `variation_type`, `prices[]`
- Database table `acted_product_productvariation_recommendations` already populated by user

**API Response Structure** (inferred from MaterialProductCard usage):
```json
{
  "variations": [
    {
      "id": 1,
      "name": "Standard Marking",
      "prices": [...],
      "recommended_product": {
        "essp_id": 202,
        "esspv_id": 2002,
        "product_code": "MAT001",
        "product_name": "CB1 Mock Exam eBook",
        "product_short_name": "Mock Exam eBook",
        "variation_type": "eBook",
        "prices": [
          { "price_type": "standard", "amount": "16.00", "currency": "GBP" }
        ]
      }
    }
  ]
}
```

**Alternatives Considered**:
- Separate API endpoint for recommendations → Rejected: Already included in product response
- GraphQL query for recommendations → Rejected: REST API sufficient, no over-fetching issue
- Client-side join of recommendation table → Rejected: Backend already handles this

---

### 5. What happens when all deadlines are expired but recommendations exist?

**Decision**: Show recommendations with disabled state when all deadlines expired (following MaterialProductCard pattern for disabled states).

**Rationale**:
- MarkingProductCard already disables "Add to Cart" when `allExpired = true` (line 698)
- SpeedDial should respect the same business rule: can't purchase expired marking products
- Recommendations remain visible but non-clickable for informational purposes
- Consistent with existing error handling

**Implementation Pattern**:
```javascript
disabled={
    allExpired ||  // Existing deadline check
    (hasVariations && !singleVariation && selectedVariations.length === 0)
}
```

**Alternatives Considered**:
- Hide recommendations when expired → Rejected: Users lose context about product relationships
- Allow recommendation purchase only → Rejected: Violates business rule (can't purchase without marking product)
- Show different message → Rejected: Existing "All deadlines expired" alert is sufficient

---

### 6. Should recommendations be filtered based on deadline availability?

**Decision**: No filtering. Show recommendations regardless of deadline status, but disable purchase when appropriate.

**Rationale**:
- Recommendations are product relationships, not time-dependent
- Users should see what products go together (educational value)
- Deadline warnings already clearly communicate availability
- Filtering would hide valuable information

**Alternatives Considered**:
- Filter out recommendations when deadlines expired → Rejected: Reduces product discovery
- Show only for upcoming deadlines → Rejected: Too restrictive, arbitrary threshold
- Time-based recommendation rules → Rejected: Overengineering, not in requirements

---

## Technology Stack Best Practices

### Material-UI SpeedDial Component

**Documentation**: https://mui.com/material-ui/react-speed-dial/

**Key Patterns**:
1. **SpeedDial** container with FAB (Floating Action Button)
2. **SpeedDialAction** for each action option
3. **SpeedDialIcon** for open/close state
4. Controlled `open` state with `onClick` and `onClose` handlers

**Accessibility Features**:
- `aria-label` on SpeedDial and actions
- Keyboard navigation (Tab, Enter, Escape)
- Focus management
- Tooltips on actions

**Performance Considerations**:
- Use `sx` prop for styling (compiled at build time)
- Memoize action handlers to prevent re-renders
- Lazy load action icons if needed (not required for this feature)

---

### React Testing Library Best Practices

**Reference**: MaterialProductCard.recommendations.test.js (100 lines, 43 tests)

**Test Structure**:
1. **Rendering tests**: Verify SpeedDial appears when recommendations exist
2. **Interaction tests**: Click SpeedDial, select actions, verify cart updates
3. **Edge case tests**: No recommendations, invalid pricing, disabled states
4. **Accessibility tests**: ARIA labels, keyboard navigation

**Mock Patterns**:
```javascript
// Mock useCart hook
jest.mock('../../../../contexts/CartContext', () => ({
  useCart: jest.fn(),
}));

// Mock onAddToCart callback
const mockOnAddToCart = jest.fn();

// Test SpeedDial rendering
test('should render SpeedDial when recommended_product exists', () => {
  const product = createMockProduct({
    variations: [{ recommended_product: createRecommendedProduct() }]
  });
  render(<MarkingProductCard product={product} onAddToCart={mockOnAddToCart} />);
  expect(screen.getByLabelText(/Buy with Recommended/i)).toBeInTheDocument();
});
```

---

## Resolved Clarifications

### From Specification

1. **Should the recommendation UI match MaterialProductCard's SpeedDial implementation?**
   - ✅ **RESOLVED**: Yes, use identical SpeedDial pattern for consistency

2. **What happens when a marking product has all deadlines expired but has recommendations?**
   - ✅ **RESOLVED**: Show SpeedDial in disabled state, maintain existing "All deadlines expired" alert

3. **Should recommendations be filtered based on deadline availability?**
   - ✅ **RESOLVED**: No, show all recommendations regardless of deadlines (disable purchase action when needed)

4. **Should discount pricing apply to both products or only the marking product?**
   - ✅ **RESOLVED**: Discounts apply ONLY to marking product, recommended products use "standard" price type

---

## Implementation Strategy

### Minimal Changes Required

**Single File Modification**: `MarkingProductCard.js`
- Add SpeedDial import from Material-UI
- Add `open` state for SpeedDial
- Copy three-tier conditional pattern from MaterialProductCard (lines 511-850)
- Adapt `handleAddToCart` logic to support recommendations
- Preserve all existing deadline/discount logic

**Estimated Scope**: ~150 lines of code (mostly copied from MaterialProductCard)

**Risk Assessment**: **LOW**
- Pattern is proven (MaterialProductCard has 43 passing tests)
- No backend changes (API already supports recommendations)
- No style changes (SpeedDial uses theme styles)
- No breaking changes (existing functionality preserved)

---

## Phase 0 Complete

**All Research Questions Answered**: ✅
**All Clarifications Resolved**: ✅
**Implementation Approach Defined**: ✅
**Risk Assessment**: LOW
**Ready for Phase 1**: ✅
