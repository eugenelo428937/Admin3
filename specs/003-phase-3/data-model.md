# Data Model: VAT Calculation - Phase 3 Composite Rules

**Feature**: Phase 3 Composite Rule Hierarchy for VAT Calculation
**Date**: 2025-10-12
**Status**: Design Complete

## Overview

This phase implements 17 composite rules stored as JSONB in the ActedRule database model. Rules form a three-tier hierarchy: 1 master rule delegates to 5 regional rules, which delegate to 11 product-specific rules. All rules execute from the same entry point (`cart_calculate_vat`) with priority-based ordering.

## Rule Entities (stored in ActedRule model)

### 1. Master Rule: `calculate_vat`

**Purpose**: Single entry point that determines customer's VAT region and delegates to appropriate regional rule

**Rule Schema**:
```python
{
    "rule_id": "calculate_vat",
    "name": "Master VAT Calculation Rule",
    "entry_point": "cart_calculate_vat",
    "priority": 100,  # Highest priority
    "active": True,
    "version": 1,
    "condition": {"!=": [{"var": "user.country_code"}, null]},
    "actions": [
        {
            "type": "call_function",
            "function": "lookup_region",
            "args": [{"var": "user.country_code"}],
            "store_result_in": "vat.region"
        }
    ],
    "stop_processing": False  # Allow regional rules to execute
}
```

**Relationships**:
- Calls: `lookup_region()` Phase 2 function
- Delegates to: 5 regional rules (priority 90)
- Updates: `vat.region` in context

### 2. Regional Rules (5 rules, priority 90)

#### UK Regional Rule: `calculate_vat_uk`

**Purpose**: Handle VAT calculations for UK region, delegate to UK product-specific rules

**Rule Schema**:
```python
{
    "rule_id": "calculate_vat_uk",
    "name": "UK VAT Calculation",
    "entry_point": "cart_calculate_vat",
    "priority": 90,
    "condition": {"==": [{"var": "vat.region"}, "UK"]},
    "actions": [
        {
            "type": "call_function",
            "function": "lookup_vat_rate",
            "args": ["GB"],
            "store_result_in": "vat.rate"
        }
    ],
    "stop_processing": False
}
```

**Relationships**:
- Condition: `vat.region == "UK"` (set by master rule)
- Calls: `lookup_vat_rate('GB')` Phase 2 function
- Delegates to: 4 UK product rules (priority 80-95)

#### Ireland Regional Rule: `calculate_vat_ie`

**Rule Schema**: Similar to UK, condition `vat.region == "IE"`, calls `lookup_vat_rate('IE')`

**Delegates to**: 1 IE product rule (priority 85)

#### EU Regional Rule: `calculate_vat_eu`

**Rule Schema**: Condition `vat.region == "EU"`, calls `lookup_vat_rate(user.country_code)` with actual country

**Delegates to**: 1 EU product rule (priority 85)

#### South Africa Regional Rule: `calculate_vat_sa`

**Rule Schema**: Condition `vat.region == "SA"`, calls `lookup_vat_rate('ZA')`

**Delegates to**: 1 SA product rule (priority 85)

#### Rest of World Regional Rule: `calculate_vat_row`

**Rule Schema**: Condition `vat.region == "ROW"`, calls `lookup_vat_rate()` (returns 0.00 default)

**Delegates to**: 1 ROW product rule (priority 85)

### 3. Product-Specific Rules (11 rules, priority 80-95)

#### UK Digital Product: `calculate_vat_uk_digital_product` (Priority 95)

**Purpose**: Calculate VAT for UK digital products at 20% standard rate

**Rule Schema**:
```python
{
    "rule_id": "calculate_vat_uk_digital_product",
    "name": "UK Digital Product VAT",
    "entry_point": "cart_calculate_vat",
    "priority": 95,  # Higher priority = more specific
    "condition": {
        "and": [
            {"==": [{"var": "vat.region"}, "UK"]},
            {"==": [{"var": "cart_item.product_type"}, "Digital"]}
        ]
    },
    "actions": [
        {
            "type": "call_function",
            "function": "calculate_vat_amount",
            "args": [
                {"var": "cart_item.net_amount"},
                {"var": "vat.rate"}
            ],
            "store_result_in": "vat.amount"
        },
        {
            "type": "update_context",
            "path": "cart_item.vat_amount",
            "value": {"var": "vat.amount"}
        },
        {
            "type": "update_context",
            "path": "cart_item.gross_amount",
            "value": {"sum": [{"var": "cart_item.net_amount"}, {"var": "vat.amount"}]}
        }
    ],
    "stop_processing": True  # VAT calculated, stop
}
```

**Relationships**:
- Condition: `vat.region == "UK"` AND `product_type == "Digital"`
- Calls: `calculate_vat_amount()` Phase 2 function
- Updates: `cart_item.vat_amount` and `cart_item.gross_amount`

#### Remaining Product Rules (10 rules):

1. **UK Printed Product** (`calculate_vat_uk_printed_product`, Priority 85): Printed materials
2. **UK Flash Card** (`calculate_vat_uk_flash_card`, Priority 80): Flash card products
3. **UK PBOR** (`calculate_vat_uk_pbor`, Priority 80): Printed By On Request products
4. **IE Product** (`calculate_vat_ie_product`, Priority 85): All Ireland product types
5. **EU Product** (`calculate_vat_eu_product`, Priority 85): All EU product types
6. **SA Product** (`calculate_vat_sa_product`, Priority 85): All South Africa product types
7. **ROW Product** (`calculate_vat_row_product`, Priority 85): All Rest of World product types
8-11. *Additional product rules per region as needed*

All product rules follow same schema pattern with different conditions.

## Context Data Structure

### Input Context (provided by cart system)

```python
context = {
    "cart_item": {
        "id": "item_abc123",
        "product_type": "Digital",  # Enum: Digital, Printed, FlashCard, PBOR, Tutorial
        "net_amount": Decimal("100.00")
    },
    "user": {
        "id": "user_xyz789",
        "country_code": "GB"  # ISO 3166-1 alpha-2
    },
    "vat": {}  # Empty, enriched by rules
}
```

### Context After Master Rule Execution

```python
context = {
    # ... cart_item and user unchanged
    "vat": {
        "region": "UK"  # Set by master rule via lookup_region()
    }
}
```

### Context After Regional Rule Execution

```python
context = {
    # ... previous fields unchanged
    "vat": {
        "region": "UK",
        "rate": Decimal("0.20")  # Set by regional rule via lookup_vat_rate()
    }
}
```

### Context After Product Rule Execution (Final)

```python
context = {
    "cart_item": {
        "id": "item_abc123",
        "product_type": "Digital",
        "net_amount": Decimal("100.00"),
        "vat_amount": Decimal("20.00"),       # Set by product rule
        "gross_amount": Decimal("120.00")     # Set by product rule
    },
    "user": {
        "id": "user_xyz789",
        "country_code": "GB"
    },
    "vat": {
        "region": "UK",
        "rate": Decimal("0.20"),
        "amount": Decimal("20.00")            # Set by product rule
    }
}
```

## Database Models (Existing from Rules Engine)

### ActedRule Model

**Purpose**: Store rule definitions as JSONB

**Fields**:
- `rule_id` (str, unique): Rule identifier
- `name` (str): Human-readable name
- `entry_point` (str, indexed): Execution trigger point
- `priority` (int, indexed): Execution order (higher first)
- `active` (bool, indexed): Is rule active
- `version` (int): Rule version number
- `rules_fields_id` (FK): References context schema
- `condition` (JSONB): JSONLogic condition
- `actions` (JSONB): Array of actions
- `stop_processing` (bool): Stop after this rule
- `metadata` (JSONB): Additional info

**Indexes**:
- PRIMARY KEY on `rule_id`
- Index on `(entry_point, priority, active)` for efficient retrieval
- Index on `active` for filtering

### ActedRulesFields Model

**Purpose**: Define JSON Schema for context validation

**Fields**:
- `id` (str, PK): Schema identifier
- `name` (str): Schema name
- `schema` (JSONB): JSON Schema definition

**Schema for VAT Context**:
```python
{
    "id": "cart_vat_context_schema",
    "name": "Cart VAT Calculation Context",
    "schema": {
        "type": "object",
        "properties": {
            "cart_item": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "product_type": {"type": "string", "enum": ["Digital", "Printed", "FlashCard", "PBOR", "Tutorial"]},
                    "net_amount": {"type": "number"},
                    "vat_amount": {"type": "number"},
                    "gross_amount": {"type": "number"}
                },
                "required": ["id", "product_type", "net_amount"]
            },
            "user": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "country_code": {"type": "string", "pattern": "^[A-Z]{2}$"}
                },
                "required": ["id", "country_code"]
            },
            "vat": {"type": "object"}
        },
        "required": ["cart_item", "user"]
    }
}
```

### RuleExecution Model (Audit Trail)

**Purpose**: Log all rule executions for compliance

**Fields**:
- `id` (PK): Execution ID
- `rule` (FK to ActedRule): Which rule executed
- `entry_point` (str): Entry point used
- `context_snapshot` (JSONB): Full context at execution time
- `result` (JSONB): Rule execution result
- `success` (bool): Did rule execute successfully
- `error_message` (text): Error if failed
- `executed_at` (timestamp): Execution time
- `execution_duration_ms` (int): How long rule took

**Used For**:
- Audit trail for VAT calculations
- Debugging rule execution issues
- Performance monitoring
- Compliance reporting

## Data Flow Example: UK Digital Product

```
1. Cart system triggers: RuleEngine.execute("cart_calculate_vat", context)
   Context: {cart_item: {product_type: "Digital", net_amount: 100.00}, user: {country_code: "GB"}}

2. Rules Engine retrieves all rules at entry_point="cart_calculate_vat", ordered by priority DESC

3. Master Rule (priority 100) executes:
   - Condition: user.country_code != null → TRUE
   - Action: call lookup_region("GB") → "UK"
   - Updates: context.vat.region = "UK"
   - stop_processing: False → Continue

4. UK Regional Rule (priority 90) executes:
   - Condition: vat.region == "UK" → TRUE
   - Action: call lookup_vat_rate("GB") → Decimal("0.20")
   - Updates: context.vat.rate = Decimal("0.20")
   - stop_processing: False → Continue

5. UK Digital Product Rule (priority 95) executes:
   - Condition: vat.region == "UK" AND product_type == "Digital" → TRUE
   - Actions:
     a) call calculate_vat_amount(100.00, 0.20) → Decimal("20.00")
     b) update context.cart_item.vat_amount = Decimal("20.00")
     c) update context.cart_item.gross_amount = 100.00 + 20.00 = Decimal("120.00")
   - stop_processing: True → STOP

6. Rules Engine returns final context to cart system

7. RuleExecution records created for all 3 rule executions with context snapshots
```

## Rule Hierarchy Visualization

```
Entry Point: cart_calculate_vat
│
├─ Master Rule: calculate_vat (Priority 100)
│  └─ Calls: lookup_region() → sets vat.region
│
├─ Regional Rules (Priority 90)
│  ├─ calculate_vat_uk (if region == UK)
│  │  └─ Calls: lookup_vat_rate('GB') → sets vat.rate
│  ├─ calculate_vat_ie (if region == IE)
│  │  └─ Calls: lookup_vat_rate('IE') → sets vat.rate
│  ├─ calculate_vat_eu (if region == EU)
│  │  └─ Calls: lookup_vat_rate(country_code) → sets vat.rate
│  ├─ calculate_vat_sa (if region == SA)
│  │  └─ Calls: lookup_vat_rate('ZA') → sets vat.rate
│  └─ calculate_vat_row (if region == ROW)
│     └─ Calls: lookup_vat_rate() → sets vat.rate (0.00)
│
└─ Product Rules (Priority 80-95)
   ├─ UK Product Rules (if region == UK)
   │  ├─ calculate_vat_uk_digital_product (Priority 95, if product_type == Digital)
   │  ├─ calculate_vat_uk_printed_product (Priority 85, if product_type == Printed)
   │  ├─ calculate_vat_uk_flash_card (Priority 80, if product_type == FlashCard)
   │  └─ calculate_vat_uk_pbor (Priority 80, if product_type == PBOR)
   ├─ IE Product Rule (if region == IE)
   │  └─ calculate_vat_ie_product (Priority 85, all product types)
   ├─ EU Product Rule (if region == EU)
   │  └─ calculate_vat_eu_product (Priority 85, all product types)
   ├─ SA Product Rule (if region == SA)
   │  └─ calculate_vat_sa_product (Priority 85, all product types)
   └─ ROW Product Rule (if region == ROW)
      └─ calculate_vat_row_product (Priority 85, all product types)
```

## Performance Characteristics

### Rule Execution Times

| Rule Type | Latency | Operations |
|-----------|---------|------------|
| Master Rule | 3-5ms | DB lookup (lookup_region) + context update |
| Regional Rule | 1-3ms | DB lookup (lookup_vat_rate) + context update |
| Product Rule | 0.5-2ms | Decimal calculation + context updates |

**Total per cart item**: 5-10ms (rule retrieval) + 5-10ms (execution) = 10-20ms

### Scaling Considerations

**Current Implementation**:
- Sequential execution (one rule after another)
- One database query per rule retrieval
- Synchronous audit logging

**Future Optimizations** (not in Phase 3):
- Batch rule retrieval (single query for all matching rules)
- Parallel product rule execution (if multiple items)
- Async audit logging
- Rule result caching (if context unchanged)

## Dependencies & Relationships

### Upstream Dependencies

**Phase 2 Custom Functions** (must exist):
- `lookup_region(country_code, effective_date=None) -> str`
- `lookup_vat_rate(country_code) -> Decimal`
- `calculate_vat_amount(net_amount, vat_rate) -> Decimal`

**Rules Engine Infrastructure** (must exist):
- ActedRule model with JSONB fields
- ActedRulesFields model for schema validation
- RuleExecution model for audit trail
- RuleEngine service for rule orchestration
- JSONLogic condition evaluator

### Downstream Consumers

**Phase 4 Cart Integration** (will use these rules):
- Cart views: trigger Rules Engine with cart context
- Checkout views: verify VAT calculated before order creation
- Order creation: store VAT amounts from rule execution

## Migration & Rollout

### Database Changes

**None required**. All models already exist in Rules Engine.

### Code Changes

**New File**: `backend/django_Admin3/rules_engine/management/commands/setup_vat_composite_rules.py`
**New File**: `backend/django_Admin3/rules_engine/tests/test_composite_vat_rules.py`
**New File**: `backend/django_Admin3/rules_engine/tests/test_vat_integration.py`

### Rollout Strategy

1. Deploy management command code (no immediate impact)
2. Run management command in staging: `python manage.py setup_vat_composite_rules`
3. Verify 17 rules created in database
4. Run integration tests
5. Run quickstart verification script
6. Deploy to production
7. Monitor RuleExecution logs for issues

No data migration needed. No user-facing changes in this phase (rules exist but not yet triggered by cart).

---

**Data Model Complete**: 2025-10-12
**Ready for Contract Creation**: ✅
