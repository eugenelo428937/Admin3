# Feature Specification: Cart and Orders Domain Separation

**Feature Branch**: `20260123-cart-orders-refactoring`
**Created**: 2026-01-23
**Status**: Draft
**Input**: Refactor monolithic cart app into separate cart (ephemeral shopping state) and orders (persistent business records) domains

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shopping Cart Management (Priority: P1)

A customer browses the online store, adds actuarial study materials to their cart, adjusts quantities, removes unwanted items, and views their cart total including applicable VAT before proceeding to checkout.

**Why this priority**: The shopping cart is the primary revenue-generating user flow. Without a functioning cart, no orders can be placed.

**Independent Test**: Can be fully tested by adding products to cart, updating quantities, removing items, and verifying totals including VAT calculation — delivers complete pre-checkout shopping experience.

**Acceptance Scenarios**:

1. **Given** a customer is browsing products, **When** they add a product to the cart, **Then** the cart reflects the new item with correct price and quantity
2. **Given** a cart contains items, **When** the customer updates an item's quantity, **Then** the cart total and VAT are recalculated
3. **Given** a cart contains items, **When** the customer removes an item, **Then** the item is removed and totals are updated
4. **Given** a cart contains items, **When** the customer clears the cart, **Then** all items are removed and totals reset to zero
5. **Given** a cart contains items, **When** the customer views the cart, **Then** they see per-item VAT and a total including VAT based on their home country
6. **Given** a guest customer adds items to cart then logs in, **When** they have an existing cart, **Then** the guest cart items are merged into their authenticated cart

---

### User Story 2 - Checkout and Order Creation (Priority: P1)

An authenticated customer proceeds to checkout from their cart, confirms their details, accepts terms and conditions, selects a payment method (card or invoice), and receives an order confirmation.

**Why this priority**: Checkout directly generates revenue. This is the conversion step that turns cart activity into business transactions.

**Independent Test**: Can be tested end-to-end by completing checkout with both card and invoice payment methods, verifying order creation, payment processing, and confirmation email delivery.

**Acceptance Scenarios**:

1. **Given** an authenticated customer with cart items, **When** they initiate checkout with valid card payment details, **Then** an order is created, payment is processed, and a confirmation is returned
2. **Given** an authenticated customer, **When** they initiate checkout with invoice payment, **Then** an order is created with pending payment status and confirmation is returned
3. **Given** a customer at checkout, **When** payment processing fails, **Then** the order is marked failed and the customer receives an appropriate error message
4. **Given** checkout requires terms acceptance, **When** the customer has not accepted required terms, **Then** checkout is blocked with a clear message
5. **Given** successful checkout, **When** the order is created, **Then** the cart is cleared and an order confirmation email is sent
6. **Given** checkout is in progress, **When** VAT calculation fails, **Then** the order still proceeds with zero VAT applied (not blocked)

---

### User Story 3 - Order History (Priority: P2)

An authenticated customer views their past orders, including order details, items purchased, payment status, and VAT breakdown.

**Why this priority**: Provides customer self-service for order lookup, reducing support burden. Less critical than purchasing flow.

**Independent Test**: Can be tested by creating orders and then listing/viewing them via the order history interface.

**Acceptance Scenarios**:

1. **Given** an authenticated customer with past orders, **When** they request their order history, **Then** they see a list of orders with date, total, and status
2. **Given** an authenticated customer, **When** they view a specific order, **Then** they see all items, quantities, prices, VAT breakdown, and payment status
3. **Given** an authenticated customer, **When** they view order history, **Then** they only see their own orders (not other customers' orders)

---

### User Story 4 - VAT Calculation Accuracy (Priority: P2)

The system correctly calculates VAT for each cart item based on the customer's home country, product type, and applicable regional/product-specific rules, displaying accurate totals to the customer.

**Why this priority**: Legal compliance requirement. Incorrect VAT calculation has financial and regulatory consequences, but this operates transparently behind the scenes.

**Independent Test**: Can be tested by configuring customers with different home countries and verifying correct VAT rates, regions, and amounts are applied per item.

**Acceptance Scenarios**:

1. **Given** a UK customer, **When** they add a digital product to cart, **Then** 20% VAT is calculated and displayed
2. **Given** an Ireland customer, **When** they add items to cart, **Then** 23% VAT is applied
3. **Given** a US customer (Rest of World), **When** they add items to cart, **Then** 0% VAT is applied
4. **Given** a customer adds Flash Cards (product code FC), **When** VAT is calculated, **Then** zero-rate VAT is applied regardless of region
5. **Given** a cart with multiple items of different product types, **When** VAT is calculated, **Then** each item receives its own VAT calculation and the total aggregates correctly
6. **Given** an anonymous user, **When** VAT is calculated, **Then** UK (20%) is used as the default fallback

---

### User Story 5 - Payment Processing (Priority: P2)

The system processes payments through multiple providers (card via Opayo, invoice) and provides appropriate feedback for successful and failed transactions.

**Why this priority**: Payment diversity supports different customer segments (corporate invoice, individual card). Critical for revenue but dependent on checkout flow.

**Independent Test**: Can be tested by processing card payments (success and failure scenarios) and invoice payments independently.

**Acceptance Scenarios**:

1. **Given** a customer pays by card, **When** the payment is approved, **Then** the order is marked as completed with a transaction reference
2. **Given** a customer pays by card, **When** the payment is declined, **Then** the order is marked as failed with an error message
3. **Given** a customer selects invoice payment, **When** checkout completes, **Then** the order is created with pending payment status
4. **Given** the system is in development mode, **When** a payment is processed, **Then** a test gateway simulates success/failure without real charges

---

### Edge Cases

- What happens when a cart item's product becomes unavailable during checkout?
- How does the system handle concurrent checkout attempts for the same cart?
- What happens when the VAT rules database has no matching rule for a country/product combination?
- How does the system handle a cart with zero-priced items (e.g., promotional products)?
- What happens when an authenticated user's home address has no recognizable country?
- How does the system handle extremely large cart quantities?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow customers to add products and marking vouchers to a shopping cart
- **FR-002**: System MUST allow customers to update item quantities in their cart
- **FR-003**: System MUST allow customers to remove individual items or clear all items from their cart
- **FR-004**: System MUST calculate VAT per cart item based on customer's home country and product type
- **FR-005**: System MUST support per-product VAT rule overrides (e.g., zero-rate for specific product codes)
- **FR-006**: System MUST default to UK VAT rate (20%) when customer country cannot be determined
- **FR-007**: System MUST recalculate VAT automatically when cart contents change
- **FR-008**: System MUST convert a cart into a persistent order during checkout
- **FR-009**: System MUST transfer all cart items, fees, and VAT calculations to the created order
- **FR-010**: System MUST process card payments through an external payment provider
- **FR-011**: System MUST support invoice-based payment (deferred payment, no immediate charge)
- **FR-012**: System MUST validate that required terms and conditions are accepted before allowing checkout
- **FR-013**: System MUST send order confirmation notifications after successful checkout
- **FR-014**: System MUST clear the cart after successful order creation
- **FR-015**: System MUST provide authenticated customers access to their order history
- **FR-016**: System MUST maintain a complete audit trail of VAT rule executions
- **FR-017**: System MUST support merging guest cart items into an authenticated user's cart on login
- **FR-018**: System MUST store per-order contact details and delivery information
- **FR-019**: System MUST record customer acknowledgments and preferences at order time
- **FR-020**: System MUST support a development/testing payment mode that simulates transactions without real charges

### Key Entities

- **Cart**: An ephemeral shopping session containing items a customer intends to purchase, with calculated VAT totals. Belongs to a user or session.
- **Cart Item**: A product or marking voucher added to a cart, with quantity, price, and per-item VAT calculation.
- **Cart Fee**: An additional fee applied to a cart (e.g., delivery charges).
- **Order**: A persistent business record created from a cart at checkout, containing all items, VAT details, and payment information.
- **Order Item**: A line item within an order, preserving the product, quantity, price, and VAT from the original cart item.
- **Payment**: A record of payment processing for an order, including method (card/invoice), status, transaction references, and gateway response details.
- **Order Acknowledgment**: A record of terms and conditions accepted by the customer during checkout.
- **Order Preference**: Customer preferences captured during the order process.
- **Order Contact**: Customer contact details associated with an order.
- **Order Delivery**: Delivery information and instructions for an order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cart operations (add, update, remove, clear) complete within 1 second from user action to updated display
- **SC-002**: VAT calculation for a cart with up to 10 items completes within 500 milliseconds
- **SC-003**: Checkout process (from submission to confirmation) completes within 10 seconds including payment processing
- **SC-004**: Order history page loads within 2 seconds for customers with up to 100 past orders
- **SC-005**: VAT calculations are accurate to 2 decimal places using correct rounding
- **SC-006**: All cart and order operations maintain data integrity — no partial orders or orphaned records
- **SC-007**: The separation enables independent testing of cart operations and order operations without cross-contamination
- **SC-008**: New payment providers can be added without modifying existing payment processing logic
- **SC-009**: VAT rules can be updated by staff through admin interface without code changes
- **SC-010**: Cart state is preserved across browser sessions for authenticated users

## Assumptions

- All existing database tables remain unchanged — only the application layer is restructured
- No backward compatibility with the old monolithic cart API is required
- The rules engine and its database rules remain unchanged
- The VAT calculation utility functions (lookup_region, lookup_vat_rate, calculate_vat_amount) remain unchanged
- Frontend will be updated in a single coordinated change to use new API endpoints
- The Opayo payment gateway integration contract remains unchanged
- User profile addresses with type "HOME" are the authoritative source for VAT country determination
- The existing database schema and table names are preserved (no migration needed)
