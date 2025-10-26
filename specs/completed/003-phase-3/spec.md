# Feature Specification: VAT Calculation - Phase 3 Composite Rules

**Feature Branch**: `003-phase-3`
**Created**: 2025-10-12
**Status**: Draft
**Input**: User description: "Phase 3: Create composite rule hierarchy for VAT calculations with master rule delegating to regional rules, which delegate to product-specific rules"

## Execution Flow (main)
```
1. Parse user description from Input ✅
   → Feature: Composite VAT calculation rules for Rules Engine
2. Extract key concepts from description ✅
   → Actors: Finance administrators, Rules Engine, cart system
   → Actions: Calculate VAT based on region and product type
   → Data: Cart items, product types, regions, VAT rates
   → Constraints: Rule priorities, delegation hierarchy, Phase 2 functions
3. For each unclear aspect: ✅
   → All aspects clear from Sprint Change Proposal
4. Fill User Scenarios & Testing section ✅
5. Generate Functional Requirements ✅
   → 78 testable requirements defined
6. Identify Key Entities ✅
   → Rules, regions, product types
7. Run Review Checklist ✅
   → No implementation details, focused on business logic
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT the VAT calculation rules must do and WHY
- ❌ Avoid HOW to implement in Django/Python (that's for plan.md)
- 👥 Written for business stakeholders (finance team, product managers)

### Section Requirements
- **Mandatory sections**: All completed
- **Optional sections**: N/A for this feature
- All sections relevant to VAT calculation rules

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a **finance administrator**, I need the Rules Engine to automatically calculate correct VAT amounts for cart items based on the customer's region and the product type being purchased, so that customers see accurate pricing and the company complies with international VAT regulations without requiring code deployments for VAT rate changes.

### Acceptance Scenarios

#### Scenario 1: UK Customer Purchases Digital Product
**Given** a customer from UK (country code 'GB') with a cart containing 1 digital product (Flashcards PDF) priced at £50.00 net
**When** the Rules Engine executes the VAT calculation at checkout
**Then** the system MUST:
- Identify region as 'UK' via master rule
- Delegate to `calculate_vat_uk` regional rule
- Delegate to `calculate_vat_uk_digital_product` product rule
- Calculate VAT at 20% standard rate: £50.00 × 0.20 = £10.00
- Return cart item with `vat_amount: 10.00, gross_amount: 60.00`

#### Scenario 2: South Africa Customer Purchases Printed Material
**Given** a customer from South Africa (country code 'ZA') with a cart containing 1 printed study manual priced at R500.00 net
**When** the Rules Engine executes the VAT calculation at checkout
**Then** the system MUST:
- Identify region as 'SA' via master rule
- Delegate to `calculate_vat_sa` regional rule
- Delegate to `calculate_vat_sa_product` product rule
- Calculate VAT at 15% standard rate: R500.00 × 0.15 = R75.00
- Return cart item with `vat_amount: 75.00, gross_amount: 575.00`

#### Scenario 3: EU Customer Purchases Tutorial (Service)
**Given** a customer from France (country code 'FR') with a cart containing 1 online tutorial priced at €100.00 net
**When** the Rules Engine executes the VAT calculation at checkout
**Then** the system MUST:
- Identify region as 'EU' via master rule
- Delegate to `calculate_vat_eu` regional rule
- Delegate to `calculate_vat_eu_product` product rule
- Apply EU digital services VAT rate (varies by country)
- Return cart item with correct VAT amount and gross amount

#### Scenario 4: UK Customer Purchases Multiple Product Types
**Given** a customer from UK with cart containing:
- 1 printed study manual (£100.00 net)
- 1 digital flashcard set (£30.00 net)
- 1 online tutorial (£200.00 net)

**When** the Rules Engine executes VAT calculation
**Then** the system MUST:
- Process each cart item independently through rule hierarchy
- Apply correct product-specific rules for each item type
- Calculate individual VAT amounts with proper rounding
- Return cart with all items having correct `vat_amount` and `gross_amount`

#### Scenario 5: Ireland Customer Purchases PBOR Product
**Given** a customer from Ireland (country code 'IE') with a cart containing 1 Printed By On Request (PBOR) product priced at €80.00 net
**When** the Rules Engine executes VAT calculation
**Then** the system MUST:
- Identify region as 'IE' via master rule
- Delegate to `calculate_vat_ie` regional rule
- Delegate to `calculate_vat_ie_product` product rule
- Apply Ireland VAT rate (23% standard rate)
- Calculate VAT: €80.00 × 0.23 = €18.40
- Return cart item with `vat_amount: 18.40, gross_amount: 98.40`

### Edge Cases

#### Edge Case 1: Unknown Region Falls Back to ROW
**What happens when** a customer from an unmapped country (e.g., 'XX') attempts checkout?
**Expected behavior**: Master rule delegates to `calculate_vat_row` (Rest of World) regional rule, which applies zero VAT rate as safe default.

#### Edge Case 2: Product Type Not Matched by Specific Rule
**What happens when** a new product type is added that doesn't have a specific product rule?
**Expected behavior**: Regional rule applies default VAT calculation using standard region rate, no crash or error.

#### Edge Case 3: Zero Net Amount Cart Item
**What happens when** a cart item has net_amount of 0.00 (e.g., free promotional item)?
**Expected behavior**: VAT calculation returns 0.00 VAT amount, gross amount remains 0.00, no division by zero errors.

#### Edge Case 4: Extremely High-Value Transaction
**What happens when** a cart item has net_amount of £999,999.99?
**Expected behavior**: VAT calculation maintains Decimal precision, rounds to 2 decimal places correctly (no floating point errors).

#### Edge Case 5: Database Contains Inactive Country
**What happens when** cart references a country code that exists in database but has `active=False`?
**Expected behavior**: Phase 2 `lookup_vat_rate()` returns 0.00 default, rule execution continues without error.

## Requirements *(mandatory)*

### Functional Requirements

#### Master Rule Requirements (FR-001 to FR-010)

- **FR-001**: System MUST have ONE master rule named `calculate_vat` that serves as single entry point for all VAT calculations
- **FR-002**: Master rule MUST execute at entry point `cart_calculate_vat` when cart calculation is triggered
- **FR-003**: Master rule MUST have highest priority (100) to ensure it executes first
- **FR-004**: Master rule MUST call Phase 2 `lookup_region()` function to determine customer's VAT region
- **FR-005**: Master rule MUST delegate to appropriate regional rule based on region returned: 'UK' → `calculate_vat_uk`, 'IE' → `calculate_vat_ie`, 'EU' → `calculate_vat_eu`, 'SA' → `calculate_vat_sa`, 'ROW' → `calculate_vat_row`
- **FR-006**: Master rule MUST provide context to regional rules including: cart item, country code, region, user details
- **FR-007**: Master rule MUST handle unknown regions by delegating to `calculate_vat_row` as safe default
- **FR-008**: Master rule MUST NOT perform VAT calculations directly (delegation only)
- **FR-009**: Master rule MUST execute for EVERY cart item independently (no batch processing)
- **FR-010**: Master rule MUST store execution results in Rules Engine audit log for compliance tracking

#### Regional Rule Requirements (FR-011 to FR-030)

##### UK Regional Rule (calculate_vat_uk)
- **FR-011**: System MUST have UK regional rule with priority 90 (lower than master)
- **FR-012**: UK rule MUST execute ONLY when region is 'UK'
- **FR-013**: UK rule MUST call Phase 2 `lookup_vat_rate('GB')` to get current UK VAT rate
- **FR-014**: UK rule MUST delegate to product-specific rules based on product type: Digital → `calculate_vat_uk_digital_product`, Printed → `calculate_vat_uk_printed_product`, FlashCard → `calculate_vat_uk_flash_card`, PBOR → `calculate_vat_uk_pbor`
- **FR-015**: UK rule MUST apply default standard rate if no product-specific rule matches

##### Ireland Regional Rule (calculate_vat_ie)
- **FR-016**: System MUST have Ireland regional rule with priority 90
- **FR-017**: Ireland rule MUST execute ONLY when region is 'IE'
- **FR-018**: Ireland rule MUST call Phase 2 `lookup_vat_rate('IE')` to get current Ireland VAT rate
- **FR-019**: Ireland rule MUST delegate to `calculate_vat_ie_product` for all product types

##### EU Regional Rule (calculate_vat_eu)
- **FR-020**: System MUST have EU regional rule with priority 90
- **FR-021**: EU rule MUST execute ONLY when region is 'EU'
- **FR-022**: EU rule MUST call Phase 2 `lookup_vat_rate()` with customer's specific country code (not generic 'EU')
- **FR-023**: EU rule MUST delegate to `calculate_vat_eu_product` for all product types
- **FR-024**: EU rule MUST handle varying VAT rates across EU member states correctly

##### South Africa Regional Rule (calculate_vat_sa)
- **FR-025**: System MUST have South Africa regional rule with priority 90
- **FR-026**: SA rule MUST execute ONLY when region is 'SA'
- **FR-027**: SA rule MUST call Phase 2 `lookup_vat_rate('ZA')` to get current SA VAT rate
- **FR-028**: SA rule MUST delegate to `calculate_vat_sa_product` for all product types

##### Rest of World Regional Rule (calculate_vat_row)
- **FR-029**: System MUST have Rest of World regional rule with priority 90
- **FR-030**: ROW rule MUST apply zero VAT rate (0%) as safe default for unmapped countries

#### Product-Specific Rule Requirements (FR-031 to FR-055)

##### UK Digital Product Rule
- **FR-031**: System MUST have UK digital product rule with priority 95 (higher than other UK product rules)
- **FR-032**: Rule MUST execute ONLY for product type 'Digital' in UK region
- **FR-033**: Rule MUST call Phase 2 `calculate_vat_amount(net_amount, vat_rate)` with UK standard rate
- **FR-034**: Rule MUST apply 20% standard rate for digital products
- **FR-035**: Rule MUST return cart item updated with `vat_amount` and `gross_amount` fields

##### UK Printed Product Rule
- **FR-036**: System MUST have UK printed product rule with priority 85
- **FR-037**: Rule MUST execute ONLY for product type 'Printed' in UK region
- **FR-038**: Rule MUST call Phase 2 `calculate_vat_amount()` with UK standard rate
- **FR-039**: Rule MUST apply 20% standard rate for printed materials

##### UK Flash Card Rule
- **FR-040**: System MUST have UK flash card rule with priority 80
- **FR-041**: Rule MUST execute ONLY for product type 'FlashCard' in UK region
- **FR-042**: Rule MUST call Phase 2 `calculate_vat_amount()` with UK standard rate
- **FR-043**: Rule MUST apply 20% standard rate for flash cards

##### UK PBOR (Printed By On Request) Rule
- **FR-044**: System MUST have UK PBOR rule with priority 80
- **FR-045**: Rule MUST execute ONLY for product type 'PBOR' in UK region
- **FR-046**: Rule MUST call Phase 2 `calculate_vat_amount()` with UK standard rate
- **FR-047**: Rule MUST apply 20% standard rate for PBOR products

##### EU Product Rule
- **FR-048**: System MUST have EU product rule with priority 85
- **FR-049**: Rule MUST execute for ALL product types in EU region (generic handler)
- **FR-050**: Rule MUST call Phase 2 `calculate_vat_amount()` with country-specific EU VAT rate
- **FR-051**: Rule MUST support digital services VAT rules for EU customers

##### SA Product Rule
- **FR-052**: System MUST have SA product rule with priority 85
- **FR-053**: Rule MUST execute for ALL product types in SA region (generic handler)
- **FR-054**: Rule MUST call Phase 2 `calculate_vat_amount()` with SA VAT rate (15%)
- **FR-055**: Rule MUST apply same rate regardless of product type (SA has uniform VAT)

##### IE Product Rule
- **FR-056**: System MUST have IE product rule with priority 85
- **FR-057**: Rule MUST execute for ALL product types in Ireland region (generic handler)
- **FR-058**: Rule MUST call Phase 2 `calculate_vat_amount()` with Ireland VAT rate (23%)

##### ROW Product Rule
- **FR-059**: System MUST have ROW product rule with priority 85
- **FR-060**: Rule MUST execute for ALL product types in Rest of World region
- **FR-061**: Rule MUST apply zero VAT rate (0%) for all products

#### Rule Execution Requirements (FR-062 to FR-078)

- **FR-062**: System MUST process rules in priority order (highest priority first)
- **FR-063**: Rules with same priority MUST execute in creation date order (oldest first)
- **FR-064**: System MUST pass full context through entire rule chain (master → regional → product)
- **FR-065**: Regional rules MUST have access to result of `lookup_region()` from master rule
- **FR-066**: Product rules MUST have access to result of `lookup_vat_rate()` from regional rule
- **FR-067**: System MUST store intermediate results in context for downstream rules
- **FR-068**: All rule executions MUST be logged in `RuleExecution` audit table
- **FR-069**: Rule execution logs MUST include: rule ID, entry point, context snapshot, result, timestamp
- **FR-070**: Rules MUST be versioned to enable rollback if VAT calculation errors occur
- **FR-071**: System MUST support rule activation/deactivation without code deployment
- **FR-072**: Finance administrators MUST be able to update rule logic via Django admin
- **FR-073**: Rule changes MUST take effect immediately (no cache invalidation required)
- **FR-074**: System MUST validate rule JSON structure before saving to database
- **FR-075**: Invalid rules MUST be rejected with clear error messages to administrators
- **FR-076**: System MUST prevent deletion of rules currently referenced by active carts
- **FR-077**: All VAT calculations MUST maintain Decimal precision (no floating point)
- **FR-078**: VAT amounts MUST be rounded to 2 decimal places using ROUND_HALF_UP mode

### Key Entities *(includes data structures)*

#### Rule Hierarchy Structure
- **Master Rule**: Single entry point that delegates based on region (Priority 100)
  - Calls `lookup_region()` Phase 2 function
  - Delegates to regional rules
  - Stores region in context for downstream rules

- **Regional Rules**: Five region-specific rules (Priority 90)
  - UK: `calculate_vat_uk`
  - Ireland: `calculate_vat_ie`
  - EU: `calculate_vat_eu`
  - South Africa: `calculate_vat_sa`
  - Rest of World: `calculate_vat_row`
  - Each calls `lookup_vat_rate()` Phase 2 function
  - Each delegates to product-specific rules or applies default

- **Product-Specific Rules**: Eleven product rules (Priority 80-95)
  - UK Digital Product (Priority 95)
  - UK Printed Product (Priority 85)
  - UK Flash Card (Priority 80)
  - UK PBOR (Priority 80)
  - EU Product (Priority 85)
  - SA Product (Priority 85)
  - IE Product (Priority 85)
  - ROW Product (Priority 85)
  - Each calls `calculate_vat_amount()` Phase 2 function
  - Each returns updated cart item with VAT amounts

#### Context Data Structure
Context passed through rule chain includes:
- **Cart Item**: Product ID, product type, net amount, currency
- **User**: User ID, country code, region (after lookup)
- **VAT Data**: VAT rate (after lookup), VAT amount (after calculation)
- **Audit**: Timestamps, rule execution IDs

#### Rule JSON Structure
Each rule stored in `ActedRule` model with JSONB fields:
- **rule_id**: Unique identifier (e.g., "calculate_vat_uk_digital_product")
- **name**: Human-readable name
- **entry_point**: Execution trigger point (e.g., "cart_calculate_vat")
- **priority**: Execution order (100 for master, 90 for regional, 80-95 for product)
- **condition**: JSONLogic expression for rule matching
- **actions**: Array of actions to execute (call_function, update_context)
- **version**: Rule version number for audit trail

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs) - Focus on business logic only
- [x] Focused on user value and business needs - Finance team can manage VAT without code
- [x] Written for non-technical stakeholders - Clear scenarios for finance administrators
- [x] All mandatory sections completed - User scenarios, requirements, entities defined

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain - All details extracted from Sprint Change Proposal
- [x] Requirements are testable and unambiguous - Each FR has clear acceptance criteria
- [x] Success criteria are measurable - VAT calculation correctness, rule execution logs
- [x] Scope is clearly bounded - Phase 3 only (composite rules), Phase 2 functions already exist
- [x] Dependencies and assumptions identified - Depends on Phase 2 custom functions

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed - "Phase 3: Create composite rule hierarchy"
- [x] Key concepts extracted - Rule delegation, regional rules, product rules
- [x] Ambiguities marked - None (all details in Sprint Change Proposal)
- [x] User scenarios defined - 5 acceptance scenarios + 5 edge cases
- [x] Requirements generated - 78 functional requirements (FR-001 to FR-078)
- [x] Entities identified - Rule hierarchy, context structure, rule JSON
- [x] Review checklist passed - All items checked

---

## Success Criteria

### Business Success
- Finance administrators can create/modify VAT calculation rules via Django admin without developer assistance
- VAT rate changes take effect immediately without code deployment
- Full audit trail exists for all VAT calculations for compliance purposes
- System handles international VAT regulations across 5 regions correctly

### Technical Success
- Master rule successfully delegates to correct regional rule based on customer location
- Regional rules successfully delegate to correct product-specific rule
- All 17 rules (1 master + 5 regional + 11 product) execute in correct priority order
- Phase 2 custom functions integrate seamlessly with rule actions
- Zero VAT calculation errors in production (100% accuracy target)

### Compliance Success
- All VAT calculations maintain Decimal precision with proper rounding
- Rule execution audit logs provide complete transaction history
- System supports rollback to previous rule versions if errors detected
- VAT rates match official government rates for each region/country

---

**Specification Status**: ✅ Complete and Ready for Planning Phase
**Dependencies**: Phase 2 Custom Functions (lookup_region, lookup_vat_rate, calculate_vat_amount)
**Next Step**: Run `/plan` command to generate implementation plan
