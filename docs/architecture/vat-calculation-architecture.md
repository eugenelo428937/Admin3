# VAT Calculation Architecture

**Status**: Current (post cart/orders refactoring)
**Last Updated**: 2026-01-23
**Related Spec**: `specs/20260123-cart-orders-refactoring/plan.md`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Layers](#architecture-layers)
3. [Execution Flow](#execution-flow)
4. [Layer 1: CartService (Coordinator)](#layer-1-cartservice-coordinator)
5. [Layer 2: Rules Engine (Decision Logic)](#layer-2-rules-engine-decision-logic)
6. [Layer 3: VATCalculationService (Math)](#layer-3-vatcalculationservice-math)
7. [Data Flow Diagram](#data-flow-diagram)
8. [Database Dependencies](#database-dependencies)
9. [Rule Structure](#rule-structure)
10. [Product Type Classification](#product-type-classification)
11. [Country Resolution](#country-resolution)
12. [Caching and Invalidation](#caching-and-invalidation)
13. [Error Handling](#error-handling)
14. [Legacy Implementations (Removed)](#legacy-implementations-removed)
15. [Testing Strategy](#testing-strategy)

---

## Overview

The VAT calculation system is a three-layer architecture that determines Value Added Tax for cart items based on:

- **User's country** (derived from home address profile)
- **Product type** (Digital, Printed, Tutorial, Marking)
- **Product code** (for special cases like Flash Cards, PBOR)
- **Regional rules** (UK 20%, Ireland 23%, EU varies, South Africa 15%, ROW 0%)

### Design Principles

1. **Per-item evaluation**: Each cart item is processed individually through the rules engine to support per-product VAT rules
2. **Rules-driven**: VAT rates and conditions are stored in the database (ActedRule model), not hardcoded
3. **Separation of concerns**: Three layers with distinct responsibilities
4. **Decimal precision**: All monetary calculations use Python `Decimal` with `ROUND_HALF_UP`
5. **Audit trail**: All rule executions logged via `ActedRuleExecution` model

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Layer 1: CartService                             │
│                        (Coordinator - "WHAT")                           │
│                                                                         │
│  Responsibilities:                                                      │
│  - Resolve user country from profile address                            │
│  - Detect product type from CartItem metadata/variations                │
│  - Iterate cart items and call rules engine per item                    │
│  - Aggregate per-item VAT into cart totals                             │
│  - Store results in cart.vat_result JSONB                              │
│                                                                         │
│  Location: cart/services/cart_service.py                                │
│  Lines: ~60 (calculate_vat method + private helpers)                   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   │ rule_engine.execute('cart_calculate_vat', context)
                                   │ (called once per cart item)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Layer 2: Rules Engine                             │
│                       (Decision Logic - "HOW")                          │
│                                                                         │
│  Responsibilities:                                                      │
│  - Fetch active rules for 'cart_calculate_vat' entry point             │
│  - Evaluate JSONLogic conditions (region matching, product matching)    │
│  - Dispatch actions: call_function, update                             │
│  - Enrich context with VAT rate, region, amounts                       │
│  - Record execution in ActedRuleExecution audit trail                  │
│                                                                         │
│  Location: rules_engine/services/rule_engine.py                        │
│  Entry Point: 'cart_calculate_vat'                                     │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   │ call_function actions invoke FUNCTION_REGISTRY
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Layer 3: VATCalculationService                        │
│                   (Math - "THE CALCULATION")                            │
│                                                                         │
│  Responsibilities:                                                      │
│  - Look up VAT rate by country code (from UtilsCountrys table)         │
│  - Look up region by country code (from UtilsCountryRegion table)      │
│  - Calculate: vat_amount = net_amount × vat_rate                       │
│  - Calculate: gross_amount = net_amount + vat_amount                   │
│  - Round with ROUND_HALF_UP to 2 decimal places                        │
│                                                                         │
│  Location: utils/services/vat_service.py                               │
│  Registry: rules_engine/custom_functions.py (FUNCTION_REGISTRY)        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Execution Flow

### Step-by-Step: Cart VAT Calculation

```
1. Trigger: CartViewSet calls cart_service.calculate_vat(cart)
   └─ Can be triggered by: GET /api/cart/, POST /api/cart/vat/, cart item changes

2. CartService._resolve_user_country(cart)
   ├─ cart.user.userprofile.addresses.filter(address_type='HOME')
   ├─ home_address.country → Country.objects.filter(Q(name=x) | Q(iso_code=x))
   └─ Returns: {'id': user_id, 'country_code': 'GB'}
   └─ Fallback: 'GB' (if no address found)

3. FOR EACH cart_item in cart.items.all():
   │
   ├─ 3a. CartService._get_product_type(cart_item)
   │   ├─ Priority 1: cart_item.metadata['variationType'] → type mapping
   │   ├─ Priority 2: cart_item.metadata['is_digital'] flag
   │   ├─ Priority 3: product.variations[0].variation_type
   │   └─ Priority 4: Default 'Digital'
   │
   ├─ 3b. Build context:
   │   {
   │     'user': {'id': '123', 'country_code': 'GB'},
   │     'cart_item': {
   │       'id': '456',
   │       'product_type': 'Digital',
   │       'product_code': 'FC',
   │       'net_amount': 50.0
   │     }
   │   }
   │
   ├─ 3c. rule_engine.execute('cart_calculate_vat', context)
   │   ├─ Fetch active rules ordered by priority
   │   ├─ For each rule: evaluate condition → dispatch actions
   │   ├─ Actions enrich context:
   │   │   - context['vat']['region'] = 'UK'
   │   │   - context['vat']['rate'] = '0.2000'
   │   │   - context['cart_item']['vat_amount'] = 10.0
   │   │   - context['cart_item']['gross_amount'] = 60.0
   │   └─ Return enriched context merged with execution metadata
   │
   └─ 3d. Collect result: {id, product_type, net_amount, vat_amount, gross_amount, vat_region, vat_rate}

4. CartService._aggregate_vat(items_results)
   ├─ Sum: total_net, total_vat, total_gross
   ├─ Round each to 2 decimal places (ROUND_HALF_UP)
   └─ Returns: {status, region, totals: {net, vat, gross}, items: [...]}

5. CartService._store_vat_result(cart, aggregated)
   ├─ cart.vat_result = aggregated (JSONB)
   ├─ cart.vat_last_calculated_at = now()
   └─ cart.save(update_fields=['vat_result', 'vat_last_calculated_at'])
```

---

## Layer 1: CartService (Coordinator)

### Public Interface

```python
class CartService:
    def calculate_vat(self, cart) -> dict:
        """
        Calculate VAT for all cart items via rules engine.

        Returns:
            {
                'status': 'calculated',
                'region': 'UK',
                'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
                'items': [
                    {
                        'id': '1',
                        'product_type': 'Digital',
                        'net_amount': '50.00',
                        'vat_region': 'UK',
                        'vat_rate': '0.2000',
                        'vat_amount': '10.00',
                        'gross_amount': '60.00',
                        'applied_rule': 'vat_uk_standard'
                    }
                ],
                'execution_id': 'exec_1706012400',
                'timestamp': '2026-01-23T14:00:00Z'
            }
        """
```

### Private Helpers

| Method | Lines | Purpose |
|--------|-------|---------|
| `_resolve_user_country(cart)` | ~15 | Profile → HOME address → Country ISO code |
| `_get_product_type(cart_item)` | ~20 | Metadata/variation chain → product type string |
| `_get_product_code(cart_item)` | ~5 | Extract product.product.code for special rules |
| `_aggregate_vat(results)` | ~20 | Sum per-item results, round, format |
| `_store_vat_result(cart, data)` | ~5 | Write JSONB, update timestamp |

### When VAT Is Triggered

| Trigger | Where | Method |
|---------|-------|--------|
| Cart item added | CartViewSet.create_item | Via signal → cache invalidation → recalc on next GET |
| Cart item updated | CartViewSet.update_item | Via signal → cache invalidation |
| Cart item removed | CartViewSet.destroy_item | Via signal → cache invalidation |
| Manual recalculate | POST /api/cart/vat/ | Direct call to calculate_vat() |
| Cart GET (if stale) | CartSerializer.get_vat_totals() | Recalculate if vat_result is None |
| Checkout | CheckoutOrchestrator._calculate_vat() | Fresh calculation before order creation |

---

## Layer 2: Rules Engine (Decision Logic)

### Entry Point

- **Code**: `cart_calculate_vat`
- **Model**: `RuleEntryPoint` (choices field)
- **Migration**: `rules_engine/migrations/0009_add_cart_calculate_vat_entry_point.py`

### Context Schema (Input)

The rules engine validates incoming context against `ActedRulesFields` JSON Schema:

```json
{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "country_code": { "type": "string", "pattern": "^[A-Z]{2}$" }
      },
      "required": ["id", "country_code"]
    },
    "cart_item": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "product_type": { "type": "string", "enum": ["Digital", "Printed", "Tutorial", "Marking", "Fee"] },
        "product_code": { "type": "string" },
        "net_amount": { "type": "number", "minimum": 0 }
      },
      "required": ["id", "product_type", "net_amount"]
    }
  },
  "required": ["user", "cart_item"]
}
```

### Context Enrichment (Output)

After rule execution, the context is enriched with:

```json
{
  "user": { "id": "123", "country_code": "GB" },
  "cart_item": {
    "id": "456",
    "product_type": "Digital",
    "product_code": "FC",
    "net_amount": 50.0,
    "vat_amount": 10.0,
    "gross_amount": 60.0
  },
  "vat": {
    "region": "UK",
    "rate": "0.2000"
  }
}
```

### Rule Execution Order

Rules execute in **priority order** (lower number = higher priority):

| Priority | Rule Type | Example | Purpose |
|----------|-----------|---------|---------|
| 80-86 | Product-specific | Flash Cards, PBOR | Override VAT for specific products |
| 90 | Regional | UK, IE, EU, SA, ROW | Set VAT rate by region |
| 100 | Master/Default | Base calculation | Default VAT calculation |

Each rule can set `stop_processing: true` to short-circuit remaining rules.

### Action Types Used for VAT

| Action Type | Purpose | Example |
|-------------|---------|---------|
| `call_function` | Invoke FUNCTION_REGISTRY | `lookup_region(country_code)` |
| `update` | Set values in context | `cart_item.vat_amount = 10.0` |

---

## Layer 3: VATCalculationService (Math)

### Location

`utils/services/vat_service.py`

### Interface

```python
class VATCalculationService:
    def calculate_vat(self, country_code: str, net_amount: Decimal) -> dict:
        """
        Calculate VAT for a single amount.

        Returns: {country_code, vat_rate, net_amount, vat_amount, gross_amount}
        """

    def calculate_vat_for_cart(self, country_code: str, cart_items: list) -> dict:
        """
        Calculate VAT for multiple items (bulk).

        Returns: {country_code, vat_rate, total_net_amount, total_vat_amount,
                  total_gross_amount, items: [...]}
        """
```

### FUNCTION_REGISTRY (Rules Engine Integration)

The rules engine invokes these functions via `call_function` actions:

```python
# rules_engine/custom_functions.py
FUNCTION_REGISTRY = {
    "lookup_region": lookup_region,           # Country code → Region (UK, IE, EU, SA, ROW)
    "lookup_vat_rate": lookup_vat_rate,       # Country code → Decimal rate (0.20)
    "calculate_vat_amount": calculate_vat_amount,  # net × rate → vat amount
    "add_decimals": add_decimals,             # Helper for decimal addition
}
```

### Function Details

#### `lookup_region(country_code: str) -> str`

```python
# Queries: UtilsCountryRegion → UtilsRegion
# Returns: 'UK', 'IE', 'EU', 'SA', or 'ROW'
# Fallback: 'ROW' if country not found
```

#### `lookup_vat_rate(country_code: str) -> Decimal`

```python
# Queries: UtilsCountrys.objects.get(code=country_code).vat_percent
# Converts: percentage (20.00) → decimal fraction (0.20)
# Fallback: Decimal('0.00') if country not found
```

#### `calculate_vat_amount(net_amount: Decimal, vat_rate: Decimal) -> Decimal`

```python
# Calculation: net_amount × vat_rate
# Rounding: ROUND_HALF_UP to 2 decimal places
# Example: Decimal('50.00') × Decimal('0.20') = Decimal('10.00')
```

---

## Data Flow Diagram

```
                    ┌─────────────┐
                    │  Frontend    │
                    │  GET /cart/  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ CartViewSet  │
                    │   .list()   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │  CartSerializer  │
                    │ .get_vat_totals()│
                    └──────┬──────────┘
                           │ if cart.vat_result is None
                           ▼
              ┌────────────────────────┐
              │     CartService        │
              │  .calculate_vat(cart)   │
              └────────────┬───────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │ _resolve_    │ │ For each │ │ _aggregate_  │
    │ user_country │ │ cart_item │ │ vat()        │
    └──────┬───────┘ └────┬─────┘ └──────────────┘
           │               │
           │               ▼
           │     ┌──────────────────┐
           │     │  rule_engine     │
           │     │  .execute(       │
           └────▶│  'cart_calculate_│
                 │   vat', context) │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ FUNCTION_REGISTRY│
                 │                  │
                 │ lookup_region()  │
                 │ lookup_vat_rate()│
                 │ calculate_vat_  │
                 │ amount()        │
                 └────────┬────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Database Tables  │
                 │                  │
                 │ utils_countrys   │
                 │ utils_country_   │
                 │ region           │
                 │ utils_region     │
                 └─────────────────┘
```

---

## Database Dependencies

### Tables Used for VAT Lookup

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `utils_countrys` | Country definitions + VAT rates | `code` (ISO-2), `vat_percent` |
| `utils_region` | Region definitions | `code` (UK, IE, EU, SA, ROW), `name` |
| `utils_country_region` | Country → Region mapping | `country_id`, `region_id`, `effective_from` |

### Tables Used for Storage

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `acted_carts` | Cart aggregate | `vat_result` (JSONB), `vat_last_calculated_at` |
| `acted_cart_items` | Per-item VAT | `vat_region`, `vat_rate`, `vat_amount`, `gross_amount` |
| `acted_rule_execution` | Audit trail | `entry_point`, `context`, `result`, `created_at` |

### Tables Used for Rules

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `acted_rules_engine` | VAT rules | `entry_point`, `condition` (JSONB), `actions` (JSONB), `priority` |
| `acted_rules_fields` | Context schema | `schema` (JSON Schema for validation) |

---

## Rule Structure

### Example: UK Standard VAT Rule

```json
{
  "rule_code": "vat_uk_standard",
  "name": "UK Standard VAT Rate",
  "entry_point": "cart_calculate_vat",
  "priority": 90,
  "active": true,
  "version": 1,
  "condition": {
    "==": [{ "var": "vat.region" }, "UK"]
  },
  "actions": [
    {
      "type": "call_function",
      "function": "lookup_vat_rate",
      "args": [{ "var": "user.country_code" }],
      "store_result_in": "vat.rate"
    },
    {
      "type": "call_function",
      "function": "calculate_vat_amount",
      "args": [
        { "var": "cart_item.net_amount" },
        { "var": "vat.rate" }
      ],
      "store_result_in": "cart_item.vat_amount"
    },
    {
      "type": "update",
      "target": "cart_item.gross_amount",
      "operation": "set",
      "value": { "+": [{ "var": "cart_item.net_amount" }, { "var": "cart_item.vat_amount" }] }
    }
  ],
  "stop_processing": true
}
```

### Example: Flash Cards Product Override

```json
{
  "rule_code": "vat_flash_cards_zero",
  "name": "Flash Cards Zero-Rate VAT",
  "entry_point": "cart_calculate_vat",
  "priority": 85,
  "active": true,
  "condition": {
    "==": [{ "var": "cart_item.product_code" }, "FC"]
  },
  "actions": [
    {
      "type": "update",
      "target": "vat.rate",
      "operation": "set",
      "value": 0.0
    },
    {
      "type": "update",
      "target": "cart_item.vat_amount",
      "operation": "set",
      "value": 0.0
    },
    {
      "type": "update",
      "target": "cart_item.gross_amount",
      "operation": "set",
      "value": { "var": "cart_item.net_amount" }
    }
  ],
  "stop_processing": true
}
```

### Rule Execution Chain (Typical)

```
1. Master Rule (priority 100):
   - Condition: always true
   - Actions: lookup_region(country_code) → store in vat.region

2. Regional Rule (priority 90):
   - Condition: vat.region == 'UK' (or 'IE', 'EU', etc.)
   - Actions: lookup_vat_rate → calculate_vat_amount → set gross_amount
   - stop_processing: true

3. Product Override (priority 85, if applicable):
   - Condition: cart_item.product_code == 'FC'
   - Actions: Override vat_amount to 0
   - stop_processing: true (evaluated BEFORE regional rule due to lower priority number)
```

---

## Product Type Classification

### Priority-Based Detection

The `CartService._get_product_type()` method determines product type using a priority chain:

```
Priority 1: CartItem.metadata['variationType']
  └─ Direct mapping: eBook→Digital, Hub→Digital, Printed→Printed, Tutorial→Tutorial, Marking→Marking

Priority 2: CartItem.metadata['is_digital'] flag
  ├─ True → 'Digital'
  ├─ metadata['is_tutorial'] → 'Tutorial'
  ├─ metadata['is_marking'] → 'Marking'
  └─ False → 'Printed'

Priority 3: product.variations[0].product_product_variation.product_variation.variation_type
  └─ Same mapping as Priority 1 (legacy fallback)

Priority 4: Default → 'Digital'
```

### Variation Type → Product Type Mapping

| Variation Type | Product Type | VAT Treatment |
|----------------|-------------|---------------|
| eBook | Digital | Standard rate (region-based) |
| Hub | Digital | Standard rate |
| Printed | Printed | Standard rate |
| Tutorial | Tutorial | Standard rate |
| Marking | Marking | Standard rate |
| Fee | Fee | Typically exempt (0%) |

---

## Country Resolution

### CartService._resolve_user_country(cart) Flow

```python
def _resolve_user_country(self, cart) -> dict:
    """
    Resolve user's country for VAT purposes.

    Priority:
    1. User's HOME address country
    2. Fallback: 'GB' (UK)

    Returns: {'id': user_id, 'country_code': 'XX'}
    """
    user_id = 'anonymous'
    country = 'GB'  # Default

    if cart.user and cart.user.is_authenticated:
        user_id = str(cart.user.id)

        # Query user profile for HOME address
        profile = getattr(cart.user, 'userprofile', None)
        if profile:
            home_address = profile.addresses.filter(address_type='HOME').first()
            if home_address and home_address.country:
                # Resolve country string to ISO code
                from country.models import Country
                country_obj = Country.objects.filter(
                    Q(name=home_address.country) | Q(iso_code=home_address.country)
                ).first()
                if country_obj:
                    country = country_obj.iso_code
                else:
                    country = home_address.country  # Assume already ISO

    return {'id': user_id, 'country_code': country}
```

### Regional Mapping

| Country Code | Region | VAT Rate |
|--------------|--------|----------|
| GB | UK | 20% |
| IE | IE | 23% |
| FR, DE, ES, IT, ... | EU | Varies by country |
| ZA | SA | 15% |
| US, AU, JP, ... | ROW | 0% |

---

## Caching and Invalidation

### Cache Strategy

VAT results are cached in the `cart.vat_result` JSONB field to avoid recalculation on every request.

### Invalidation Signals

```python
# cart/signals.py

@receiver(post_save, sender=CartItem)
def invalidate_vat_cache_on_item_save(sender, instance, created, **kwargs):
    """Clear VAT cache when cart item is created or updated."""
    # Skip if this save is updating VAT fields (prevent infinite loop)
    if kwargs.get('update_fields') and 'vat_amount' in kwargs['update_fields']:
        return

    cart = instance.cart
    cart.vat_result = None
    cart.vat_last_calculated_at = None
    cart.vat_calculation_error = False
    cart.vat_calculation_error_message = None
    cart.save(update_fields=['vat_result', 'vat_last_calculated_at',
                             'vat_calculation_error', 'vat_calculation_error_message'])

@receiver(post_delete, sender=CartItem)
def invalidate_vat_cache_on_item_delete(sender, instance, **kwargs):
    """Clear VAT cache when cart item is deleted."""
    cart = instance.cart
    cart.vat_result = None
    cart.save(update_fields=['vat_result'])
```

### Recalculation Triggers

1. **Lazy**: On `GET /api/cart/` — serializer checks if `vat_result` is None, recalculates
2. **Eager**: On `POST /api/cart/vat/` — explicit user-triggered recalculation
3. **Checkout**: `CheckoutOrchestrator` always calculates fresh (ignores cache)

---

## Error Handling

### CartService.calculate_vat() Error Cases

| Error | Handling | Result |
|-------|----------|--------|
| No user profile/address | Fallback to `country_code='GB'` | UK VAT applied |
| Rules engine fails | Catch exception, set `cart.vat_calculation_error=True` | Zero VAT fallback |
| No rules for entry point | Rules engine returns `success=True` with no enrichment | Zero VAT |
| Country not in database | `lookup_vat_rate` returns `Decimal('0.00')` | ROW (0%) |
| Cart has no items | Return empty result with zero totals | No calculation |

### Error Result Structure

```python
# On error, cart fields are set:
cart.vat_calculation_error = True
cart.vat_calculation_error_message = "Rules Engine execution failed: ..."
cart.vat_result = None  # Force recalculation on next request
```

### Checkout Error Handling

During checkout, VAT calculation failure does NOT block the order:

```python
# In CheckoutOrchestrator._calculate_vat():
try:
    vat_result = cart_service.calculate_vat(cart)
except Exception as e:
    logger.error(f"VAT calculation failed: {e}")
    # Fallback: zero VAT, order proceeds
    vat_result = {'totals': {'net': '0', 'vat': '0', 'gross': '0'}, 'items': []}
```

---

## Legacy Implementations (Removed)

The following implementations existed before this refactoring and have been consolidated:

### 1. Cart.calculate_vat() — Phase 2 (REMOVED)

- Called `VATCalculationService` directly, bypassing the rules engine
- No per-product rules support
- Country had to be passed as parameter

### 2. Cart.calculate_vat_for_all_items() — Phase 4 (REMOVED)

- Called `rule_engine.execute('cart_calculate_vat', ...)` per item
- Country had to be passed as parameter
- Updated CartItem fields directly (vat_region, vat_rate, etc.)
- Simpler product type detection (variation chain only, no metadata)

### 3. VATOrchestrator — Phase 5 (REMOVED)

- 566-line class in `cart/services/vat_orchestrator.py`
- Same as Phase 4 but with:
  - User country resolution from profile addresses
  - Metadata-based product type detection
  - JSONB storage of aggregated results
  - Execution ID tracking
- Exported as singleton: `vat_orchestrator`

### Why They Were Consolidated

| Problem | Solution |
|---------|----------|
| Three implementations doing the same thing | Single `CartService.calculate_vat()` method |
| 780+ lines of redundant code | ~60 lines in CartService |
| Phase 2 bypassed rules engine | Deleted (rules engine is authoritative) |
| Phase 4 required country as parameter | CartService resolves country automatically |
| Phase 5 was overengineered (566 lines for a thin adapter) | Simplified to essential logic |

---

## Testing Strategy

### Unit Tests

| Test File | What It Tests |
|-----------|---------------|
| `cart/tests/test_cart_service.py` | CartService.calculate_vat() + private helpers |
| `rules_engine/tests/test_custom_functions_vat.py` | FUNCTION_REGISTRY functions |
| `utils/tests/test_vat_service.py` | VATCalculationService math |

### Integration Tests

| Test | Scope |
|------|-------|
| UK single digital product | Full pipeline: CartService → Rules Engine → VATCalculationService |
| Multiple items, different types | Aggregation across Digital + Printed + Tutorial |
| Zero-VAT country (US) | ROW region, 0% rate |
| Product-specific override (FC) | Priority 85 rule overrides regional rule |
| Anonymous user | Fallback to 'GB' country |
| Empty cart | Returns zero totals without calling rules engine |

### Performance

- Average per-item calculation: < 50ms
- Cache hit (JSONB read): < 1ms
- Full cart recalculation (10 items): < 500ms
- Signal-based invalidation: < 5ms

---

## Configuration

### Settings

```python
# No VAT-specific settings required.
# VAT rates are database-driven (UtilsCountrys.vat_percent).
# Rules are database-driven (ActedRule model).
# Default country fallback is hardcoded: 'GB'
```

### Database Fixtures

VAT rules are managed via Django admin or management commands. There are no fixture files — rules are created and versioned in the database with full audit trail.

### Adding a New VAT Rule

1. Create `ActedRule` via Django admin with:
   - `entry_point = 'cart_calculate_vat'`
   - `condition` = JSONLogic expression
   - `actions` = array of action definitions
   - `priority` = appropriate level (lower = evaluated first)
2. Rules are immediately active (cached rules invalidated on save)
3. Test via dry-run: `POST /api/rules/engine/execute/` with test context
