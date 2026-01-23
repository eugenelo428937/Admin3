# Research: Cart and Orders Domain Separation

**Created**: 2026-01-23
**Status**: Complete (no NEEDS CLARIFICATION items)
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## R-001: Service Layer Pattern vs Fat Models

**Decision**: Service Layer pattern (CartService, CheckoutOrchestrator)

**Rationale**:
- Current 700+ line ViewSet mixes HTTP concerns with business logic
- Django "fat models" pattern breaks down at this complexity level
- Services enable independent unit testing without HTTP request context
- Constitution Principle II (Modular Architecture) requires clear separation

**Alternatives Rejected**:
- **Fat Models**: Current approach — models already have too many methods (calculate_vat, calculate_vat_for_all_items, etc.)
- **Domain Events**: Over-engineering for this scale (single deployment, single database)
- **CQRS**: Unnecessary complexity — read/write patterns are straightforward

---

## R-002: VAT Consolidation Strategy

**Decision**: Replace 3 redundant VAT implementations with single `CartService.calculate_vat()` (~60 lines)

**Rationale**:
- Three implementations exist from incremental development (Phases 2, 4, 5)
- Only Phase 5 (VATOrchestrator) correctly uses Rules Engine
- CartService extracts the essential orchestration logic (country resolution, per-item iteration, aggregation)
- Rules Engine and VATCalculationService (math layer) remain unchanged

**Alternatives Rejected**:
- **Keep VATOrchestrator as-is**: 566 lines of over-abstraction for a ~60 line task
- **Merge into Rules Engine**: Rules Engine is a generic evaluator; cart-domain concerns (user country, product type detection, JSONB storage) don't belong there
- **Keep all three**: Technical debt accumulates, confusing for future developers

---

## R-003: Database Migration Strategy

**Decision**: No schema changes — use `Meta.db_table` to point new models at existing tables

**Rationale**:
- All 10 tables (`acted_carts`, `acted_cart_items`, `acted_cart_fees`, `acted_orders`, etc.) remain unchanged
- Only the Django model location changes (from `cart` app to `cart`/`orders` apps)
- Zero migration risk — database layer is untouched
- `managed = False` during transition prevents Django from attempting schema changes

**Alternatives Rejected**:
- **Full migration with new table names**: Risk of data loss, requires downtime
- **Django ContentType-based migration**: Unnecessary complexity for app reorganization
- **Dual-write migration**: Over-engineering for a refactoring that doesn't change data

---

## R-004: Payment Gateway Pattern

**Decision**: Strategy pattern with abstract `PaymentGateway` base class

**Rationale**:
- Current code uses if/else + settings-based service selection
- Strategy pattern enables adding new providers without modifying existing code (SC-008)
- Factory function `get_payment_gateway(method)` encapsulates selection logic
- Each gateway is independently testable

**Alternatives Rejected**:
- **Keep if/else**: Violates Open/Closed principle, harder to add providers
- **Plugin system**: Over-engineering — only 3 providers (Opayo, Invoice, Dummy)
- **Event-driven payment**: Adds async complexity without clear benefit

---

## R-005: Checkout Pipeline Pattern

**Decision**: CheckoutOrchestrator with named pipeline steps

**Rationale**:
- Current checkout is a 550-line monolithic method
- Pipeline steps are self-documenting and independently testable
- Each step has clear pre/post conditions
- Failed steps can return clear error messages

**Alternatives Rejected**:
- **Chain of Responsibility**: Steps have strict ordering, not conditional routing
- **State Machine**: Over-complex for a linear flow
- **Saga pattern**: No need for compensating transactions (single DB, no microservices)

---

## R-006: Frontend API Migration Strategy

**Decision**: Single coordinated change — update all Axios calls in one commit

**Rationale**:
- No backward compatibility required (spec assumption)
- RESTful URL patterns replace action-based URLs
- CartContext and cartService.js are the only integration points
- Small surface area (~8 API calls to update)

**Alternatives Rejected**:
- **API versioning**: Over-engineering for internal-only API
- **Gradual migration with proxy**: Adds complexity for a small number of endpoints
- **Backend compatibility layer**: Spec explicitly states no backward compatibility needed

---

## R-007: Model Naming Convention

**Decision**: Drop `Acted` prefix — `ActedOrder` → `Order`, `ActedOrderItem` → `OrderItem`

**Rationale**:
- `Acted` prefix is legacy naming from original schema
- Clean names improve readability and follow Django conventions
- `db_table` meta preserves actual table names
- No database changes required

**Alternatives Rejected**:
- **Keep Acted prefix**: Inconsistent with Django conventions, confusing for new developers
- **Rename database tables too**: Unnecessary risk, no benefit

---

## R-008: Cross-App Import Direction

**Decision**: Cart knows nothing about Orders. Orders imports from Cart (unidirectional).

**Rationale**:
- Cart is the ephemeral state; Orders is the persistent record
- Checkout reads from Cart to create Orders — natural dependency direction
- Prevents circular imports
- Cart can be developed/tested independently of Orders

**Alternatives Rejected**:
- **Shared models package**: Adds a third package with minimal benefit
- **Event-based decoupling**: Over-engineering for same-process communication
- **Bidirectional with lazy imports**: Technical debt, fragile

---

## R-009: Cart Type Flags Maintenance

**Decision**: CartService._update_cart_flags() updates `has_marking`, `has_digital`, `has_tutorial`, `has_material` on every item change

**Rationale**:
- Flags are used by frontend for conditional UI (e.g., marking-specific messaging)
- Current implementation in ViewSet helper methods works but is scattered
- Moving to CartService consolidates the logic in one place
- Flags are denormalized for query performance (avoids JOINs to check item types)

**Alternatives Rejected**:
- **Remove flags, compute on read**: Adds JOIN overhead to every cart read
- **Database triggers**: Moves business logic out of application layer
- **Signals only**: Less explicit than service method, harder to test

---

## R-010: Tutorial Merge Handling

**Decision**: CartService._handle_tutorial_merge() consolidates tutorial items when same product is added with different location/choices

**Rationale**:
- Tutorial products can have multiple locations with different choices
- Adding same tutorial product should merge choices, not create duplicate items
- Current logic is embedded in the `add()` view method
- Moving to CartService makes it testable and reusable

**Alternatives Rejected**:
- **Separate TutorialCartService**: Over-segmentation for one method
- **Frontend deduplication**: Backend must be authoritative for data integrity
- **Allow duplicates**: Poor UX, confusing order records
