# Feature Specification: Phase 4 - Cart VAT Integration

**Feature Branch**: `004-phase-4`
**Created**: 2025-01-12
**Status**: Draft
**Input**: User description: "phase 4"

## Execution Flow (main)
```
1. Parse user description from Input
   → Context: Phase 4 follows successful Phase 3 (composite VAT rules)
2. Extract key concepts from description
   → Actors: Customers, Cart system, Rules Engine
   → Actions: Calculate VAT on cart items, display VAT breakdowns
   → Data: Cart items, VAT rates, regional rules
   → Constraints: Must use Phase 3 composite rules
3. For each unclear aspect:
   → ✓ RESOLVED: VAT recalculated only when cart modified (add/remove/quantity change)
   → ✓ RESOLVED: VAT-exclusive display (net price prominent, VAT as separate line item)
   → [NEEDS CLARIFICATION: How should multi-currency carts handle VAT?]
4. Fill User Scenarios & Testing section
   → Primary flow: User adds items to cart → VAT calculated → displayed in cart
5. Generate Functional Requirements
   → Each requirement testable against Phase 3 rule execution
6. Identify Key Entities
   → Cart, CartItem, VAT calculation result
7. Run Review Checklist
   → WARN "Spec has uncertainties - marked with [NEEDS CLARIFICATION]"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-01-12
- Q: When should VAT be recalculated for cart items? → A: Recalculate only when cart modified (add/remove/quantity change)
- Q: How should prices be displayed to customers in the cart? → A: VAT-exclusive (show net price prominently, VAT as separate line below)
- Q: When should VAT rates be locked for an order? → A: Lock VAT rates at order creation with timestamp (VAT can recalculate until order record created)
- Q: How should users be notified when VAT calculation fails? → A: Display error message with retry button (show error, provide "Recalculate VAT" button)
- Q: How long should historical VAT data be retained? → A: 2 years (standard tax audit period, covers typical tax authority audit window)

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a customer shopping on the Online Store for Actuarial Education, I need to see accurate VAT calculations on my cart items so that I understand the total cost before checkout, including the tax I'll be charged based on my country.

### Acceptance Scenarios

1. **Given** a UK customer with an empty cart, **When** they add a Digital product worth £50, **Then** the cart displays:
   - Net amount: £50.00
   - VAT (20%): £10.00
   - Gross total: £60.00

2. **Given** a South African customer with an empty cart, **When** they add a Printed product worth R500, **Then** the cart displays:
   - Net amount: R500.00
   - VAT (15%): R75.00
   - Gross total: R575.00

3. **Given** a customer from an unknown country (ROW), **When** they add any product, **Then** the cart displays:
   - Net amount: [original price]
   - VAT (0%): 0.00
   - Gross total: [original price]

4. **Given** a UK customer with multiple items in cart (Digital £50, Printed £100, FlashCard £30), **When** they view their cart, **Then** the cart displays:
   - Total net amount: £180.00
   - Total VAT (20%): £36.00
   - Total gross amount: £216.00

5. **Given** a customer with items in cart, **When** they change their delivery country, **Then** VAT is recalculated based on the new country's rules

6. **Given** a customer viewing cart, **When** VAT rules are updated by admin, **Then** [NEEDS CLARIFICATION: Should cart reflect new rates immediately or only for new sessions?]

### Edge Cases
- What happens when a customer's country cannot be determined?
  - **Expected**: System defaults to ROW region with 0% VAT
- How does system handle cart items added before VAT rules exist?
  - **Expected**: System applies current active VAT rules on cart view
- What happens if Phase 3 rules engine fails during cart calculation?
  - **Expected**: Display error message with "Recalculate VAT" button, show net prices only without blocking cart view (per FR-014, FR-017)
- How are partial refunds handled when VAT rates change between purchase and refund?
  - [NEEDS CLARIFICATION: Refund VAT policy not specified]

## Requirements *(mandatory)*

### Functional Requirements

#### Cart VAT Calculation
- **FR-001**: System MUST calculate VAT for each cart item using Phase 3 composite rules at cart_calculate_vat entry point
- **FR-002**: System MUST display individual VAT amounts for each cart item
- **FR-003**: System MUST display total VAT amount across all cart items
- **FR-004**: System MUST display gross totals (net + VAT) for individual items and cart total
- **FR-005**: System MUST recalculate VAT when cart items are added, removed, or quantities changed
- **FR-006**: System MUST recalculate VAT when user's delivery country changes (triggers cart modification)

#### VAT Display and Transparency
- **FR-007**: System MUST clearly label VAT amounts separately from net prices
- **FR-008**: System MUST display the VAT rate percentage applied to each item
- **FR-009**: System MUST show regional VAT information (e.g., "UK VAT 20%" or "SA VAT 15%")
- **FR-010**: System MUST display net prices prominently with VAT shown as separate line item below each product

#### Integration with Checkout
- **FR-011**: System MUST pass VAT calculations to checkout process for order creation
- **FR-012**: System MUST ensure VAT amounts at checkout match final cart VAT calculations
- **FR-013**: System MUST lock VAT rates at order creation with timestamp, allowing recalculation throughout cart and checkout until order record is created

#### Error Handling and Fallbacks
- **FR-014**: System MUST handle rules engine failures gracefully without blocking cart view
- **FR-015**: System MUST default to 0% VAT if country cannot be determined or rules are unavailable
- **FR-016**: System MUST log VAT calculation errors for admin review
- **FR-017**: System MUST display error message with "Recalculate VAT" button when VAT calculation fails, allowing user to retry calculation

#### Performance Requirements
- **FR-018**: System MUST calculate VAT for cart items within 50ms per item (Phase 3 target)
- **FR-019**: System MUST support concurrent VAT calculations for multiple users without degradation
- **FR-020**: System MUST cache VAT calculations between cart modifications to optimize performance (recalculate only on add/remove/quantity/country changes)

#### Data Persistence
- **FR-021**: System MUST store VAT amounts with cart items for audit purposes
- **FR-022**: System MUST preserve VAT calculation metadata (region, rate, rule versions used)
- **FR-023**: System MUST retain historical VAT data for 2 years to meet standard tax audit period requirements

#### Multi-Item Cart Scenarios
- **FR-024**: System MUST handle carts with different product types (Digital, Printed, FlashCard, PBOR, Tutorial)
- **FR-025**: System MUST apply correct VAT rules per product type within same cart
- **FR-026**: System MUST aggregate VAT correctly across mixed product types
- **FR-027**: System MUST [NEEDS CLARIFICATION: handle carts with items requiring different VAT treatments - bundled pricing?]

### Key Entities

- **Cart**: Represents a customer's shopping cart
  - Contains multiple CartItems
  - Has associated User/Customer with country information
  - Tracks total net amount, total VAT amount, total gross amount
  - Maintains VAT calculation timestamp and rule versions used

- **CartItem**: Individual product in a cart
  - References Product and ProductVariation
  - Stores quantity, net price, VAT amount, gross amount
  - Links to VAT calculation result from rules engine
  - Preserves product type for VAT rule matching

- **VAT Calculation Result**: Output from Phase 3 rules engine
  - Contains region, VAT rate, VAT amount, gross amount
  - References rule codes executed (master, regional, product)
  - Includes execution time and success status
  - Stored with cart item for audit trail

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (4 clarifications needed)
- [x] Requirements are testable and unambiguous (where specified)
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (cart VAT integration only)
- [x] Dependencies identified (Phase 3 composite rules)

**WARNINGS**:
1. 4 areas marked with [NEEDS CLARIFICATION] - requires stakeholder input
2. Multi-currency handling not addressed in requirements
3. Refund VAT policy not specified
4. VAT rules update behavior (immediate vs new session) not specified
5. Bundled pricing for mixed VAT treatments not specified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (4 clarifications remain, 5 resolved via Q&A)
- [x] User scenarios defined
- [x] Requirements generated (27 functional requirements)
- [x] Entities identified (Cart, CartItem, VAT Calculation Result)
- [ ] Review checklist passed (pending clarifications)

**Status**: WARN - Spec has uncertainties marked with [NEEDS CLARIFICATION]

---

## Next Steps

1. **Clarification Phase** (/clarify): Resolve 4 marked uncertainties with stakeholders OR proceed to planning with assumptions
2. **Planning Phase** (/plan): Create implementation plan once clarifications resolved
3. **Task Generation** (/tasks): Break down into actionable development tasks
4. **Implementation** (/implement): Execute Phase 4 cart VAT integration

## Dependencies

- **Phase 3**: Composite VAT rules must be complete and tested
- **Rules Engine**: Must support cart_calculate_vat entry point
- **Cart System**: Must expose cart items with product types and user country
- **Checkout System**: Must accept VAT amounts from cart for order creation
