# Epic 3 Phase 5: VAT Rules Creation - Task Breakdown

**Phase Goal**: Create VAT calculation rules in the Rules Engine following the master rule architecture with entry points at `checkout_start` and `checkout_payment`.

**Phase Overview**: Implement the complete VAT rules hierarchy with a master orchestrator rule that coordinates region determination, per-item calculations, aggregation, and result storage. All VAT logic will be rule-driven with no hardcoded calculations.

---

## Architecture Overview

### Master Rule Flow
```
checkout_start/checkout_payment entry point
    ↓
calculate_vat_master (priority 100)
    ↓
    ├─→ determine_vat_region (sets user_address.region)
    ├─→ calculate_vat_per_item (for each cart item)
    │   ├─→ vat_standard_default
    │   ├─→ uk_ebook_zero_vat
    │   ├─→ row_digital_zero_vat
    │   ├─→ sa_special_vat
    │   └─→ live_tutorial_vat_override
    ├─→ Aggregate totals (cart.total_vat)
    └─→ Store vat_result (cart.vat_result)
```

### Rule Hierarchy
1. **Master Rule**: `calculate_vat_master` - Orchestrates entire VAT flow
2. **Region Rule**: `determine_vat_region` - Maps country to VAT region
3. **Per-Item Orchestrator**: `calculate_vat_per_item` - Calls all item-level rules
4. **Item-Level Rules**:
   - `vat_standard_default` - Default VAT rates by region
   - `uk_ebook_zero_vat` - UK eBook exemption (post-2020)
   - `row_digital_zero_vat` - ROW digital product exemption
   - `sa_special_vat` - South Africa 15% VAT
   - `live_tutorial_vat_override` - Live tutorial special handling

---

## Task List

### TASK-046: Create RulesFields Schema for VAT Context (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** Phase 4 complete

**Description:**
Create ActedRulesFields JSON Schema definition for VAT calculation context validation.

**Schema Structure:**
```json
{
  "id": "rf_vat_calculation_context",
  "name": "VAT Calculation Context Schema",
  "schema": {
    "type": "object",
    "properties": {
      "user_address": {
        "type": "object",
        "properties": {
          "country": {"type": "string"},
          "region": {"type": "string"},
          "postcode": {"type": "string"}
        },
        "required": ["country"]
      },
      "cart": {
        "type": "object",
        "properties": {
          "id": {"type": "integer"},
          "items": {"type": "array"},
          "total_net": {"type": "string"},
          "total_vat": {"type": "string"}
        },
        "required": ["id", "items"]
      },
      "settings": {
        "type": "object",
        "properties": {
          "effective_date": {"type": "string"},
          "context_version": {"type": "string"}
        }
      }
    },
    "required": ["user_address", "cart", "settings"]
  }
}
```

**File:** Django admin or database seed script
**Tests:** Validation tests for schema compliance

**Acceptance Criteria:**
- Schema created in ActedRulesFields table
- Schema validates VAT context structure
- Schema enforces required fields

---

### TASK-047: Create Master VAT Rule - calculate_vat_master (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 1.5 hours
**Status:** Pending
**Dependencies:** TASK-046

**Description:**
Create master orchestrator rule that coordinates entire VAT calculation flow.

**Rule Specification:**
```json
{
  "rule_id": "calculate_vat_master",
  "name": "Master VAT Calculation Rule",
  "entry_point": ["checkout_start", "checkout_payment"],
  "priority": 100,
  "active": true,
  "version": 1,
  "rules_fields_id": "rf_vat_calculation_context",
  "condition": {
    "type": "jsonlogic",
    "expr": {"==": [1, 1]}
  },
  "actions": [
    {
      "type": "call_rule",
      "rule_id": "determine_vat_region",
      "pass_context": true
    },
    {
      "type": "call_rule",
      "rule_id": "calculate_vat_per_item",
      "pass_context": true
    },
    {
      "type": "update",
      "target": "cart.total_vat",
      "operation": "calculate_sum",
      "source": "cart.items[].vat_amount"
    },
    {
      "type": "update",
      "target": "cart.vat_result",
      "operation": "set",
      "value": {
        "items": {"var": "cart.items"},
        "totals": {
          "total_net": {"var": "cart.total_net"},
          "total_vat": {"var": "cart.total_vat"},
          "total_gross": {"+": [{"var": "cart.total_net"}, {"var": "cart.total_vat"}]}
        },
        "region_info": {
          "country": {"var": "user_address.country"},
          "region": {"var": "user_address.region"},
          "vat_treatment": "standard"
        }
      }
    }
  ],
  "stop_processing": false
}
```

**File:** Django admin or database seed script
**Tests:** Integration tests for master rule execution

**Acceptance Criteria:**
- Master rule created in ActedRule table
- Rule validates against RulesFields schema
- Rule calls all sub-rules correctly
- Rule aggregates totals correctly

---

### TASK-048: Create Region Determination Rule (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 45 minutes
**Status:** Pending
**Dependencies:** TASK-047

**Description:**
Create rule that determines VAT region from country code.

**Rule Specification:**
```json
{
  "rule_id": "determine_vat_region",
  "name": "Determine VAT Region",
  "entry_point": ["checkout_start", "checkout_payment"],
  "priority": 90,
  "active": true,
  "version": 1,
  "rules_fields_id": "rf_vat_calculation_context",
  "condition": {"==": [1, 1]},
  "actions": [
    {
      "type": "update",
      "target": "user_address.region",
      "operation": "set",
      "value": {
        "function": "map_country_to_region",
        "params": {"country": {"var": "user_address.country"}}
      }
    }
  ],
  "stop_processing": false
}
```

**Integration:**
- Uses Phase 1's `map_country_to_region()` function
- Must be registered in FunctionRegistry

**Acceptance Criteria:**
- Rule created successfully
- Rule calls `map_country_to_region()` function
- Region set correctly in context

---

### TASK-049: Create Per-Item Orchestrator Rule (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 45 minutes
**Status:** Pending
**Dependencies:** TASK-048

**Description:**
Create orchestrator rule that calls all item-level VAT calculation rules.

**Rule Specification:**
```json
{
  "rule_id": "calculate_vat_per_item",
  "name": "Calculate VAT Per Item",
  "entry_point": ["calculate_vat_per_item"],
  "priority": 50,
  "active": true,
  "version": 1,
  "rules_fields_id": "rf_vat_calculation_context",
  "condition": {"==": [1, 1]},
  "actions": [
    {
      "type": "call_rule",
      "rule_id": "vat_standard_default",
      "pass_context": true
    },
    {
      "type": "call_rule",
      "rule_id": "uk_ebook_zero_vat",
      "pass_context": true
    },
    {
      "type": "call_rule",
      "rule_id": "row_digital_zero_vat",
      "pass_context": true
    },
    {
      "type": "call_rule",
      "rule_id": "sa_special_vat",
      "pass_context": true
    },
    {
      "type": "call_rule",
      "rule_id": "live_tutorial_vat_override",
      "pass_context": true
    }
  ],
  "stop_processing": false
}
```

**Acceptance Criteria:**
- Orchestrator rule created
- Rule calls all 5 item-level rules
- Rules execute in correct priority order

---

### TASK-050: Create Standard Default VAT Rule (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-049

**Description:**
Create rule that applies standard VAT rates by region (UK: 20%, EU: 0%, ROW: 0%, SA: 15%).

**Rule Specification:**
```json
{
  "rule_id": "vat_standard_default",
  "name": "Standard Default VAT Rates",
  "entry_point": ["calculate_vat_per_item"],
  "priority": 10,
  "active": true,
  "version": 1,
  "rules_fields_id": "rf_vat_calculation_context",
  "condition": {"==": [1, 1]},
  "actions": [
    {
      "type": "update",
      "target": "item.vat_rate",
      "operation": "set",
      "value": {
        "function": "get_vat_rate",
        "params": {
          "region": {"var": "user_address.region"},
          "classification": {"var": "item.classification"}
        }
      }
    },
    {
      "type": "update",
      "target": "item.vat_amount",
      "operation": "set",
      "value": {
        "function": "calculate_vat_amount",
        "params": {
          "net_amount": {"var": "item.net_amount"},
          "vat_rate": {"var": "item.vat_rate"}
        }
      }
    },
    {
      "type": "update",
      "target": "item.vat_rule_applied",
      "operation": "set",
      "value": "vat_standard_default:v1"
    }
  ],
  "stop_processing": false
}
```

**Integration:**
- Uses Phase 1's `get_vat_rate()` function
- Uses Phase 1's `calculate_vat_amount()` function
- Must be registered in FunctionRegistry

**Acceptance Criteria:**
- Rule created successfully
- Rule applies standard VAT rates correctly
- Functions called correctly

---

### TASK-051: Create UK eBook Zero VAT Rule (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-050

**Description:**
Create rule for UK eBook zero-rating (post-2020).

**Rule Specification:**
```json
{
  "rule_id": "uk_ebook_zero_vat",
  "name": "UK eBook Zero VAT (Post-2020)",
  "entry_point": ["calculate_vat_per_item"],
  "priority": 20,
  "active": true,
  "version": 1,
  "rules_fields_id": "rf_vat_calculation_context",
  "condition": {
    "type": "jsonlogic",
    "expr": {
      "and": [
        {"==": [{"var": "user_address.region"}, "UK"]},
        {"==": [{"var": "item.classification.is_ebook"}, true]},
        {">=": [{"var": "settings.effective_date"}, "2020-05-01"]}
      ]
    }
  },
  "actions": [
    {
      "type": "update",
      "target": "item.vat_rate",
      "operation": "set",
      "value": "0.00"
    },
    {
      "type": "update",
      "target": "item.vat_amount",
      "operation": "set",
      "value": "0.00"
    },
    {
      "type": "update",
      "target": "item.vat_rule_applied",
      "operation": "set",
      "value": "uk_ebook_zero_vat:v1"
    },
    {
      "type": "update",
      "target": "item.exemption_reason",
      "operation": "set",
      "value": "UK eBook post-2020"
    }
  ],
  "stop_processing": true
}
```

**Acceptance Criteria:**
- Rule created successfully
- Condition evaluates correctly (UK + ebook + post-2020)
- 0% VAT applied correctly
- stop_processing prevents further rules

---

### TASK-052: Create ROW Digital Zero VAT Rule (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 45 minutes
**Status:** Pending
**Dependencies:** TASK-051

**Description:**
Create rule for ROW digital product zero-rating.

**Rule Specification:**
```json
{
  "rule_id": "row_digital_zero_vat",
  "name": "ROW Digital Products Zero VAT",
  "entry_point": ["calculate_vat_per_item"],
  "priority": 15,
  "active": true,
  "version": 1,
  "rules_fields_id": "rf_vat_calculation_context",
  "condition": {
    "type": "jsonlogic",
    "expr": {
      "and": [
        {"==": [{"var": "user_address.region"}, "ROW"]},
        {"==": [{"var": "item.classification.is_digital"}, true]}
      ]
    }
  },
  "actions": [
    {
      "type": "update",
      "target": "item.vat_rate",
      "operation": "set",
      "value": "0.00"
    },
    {
      "type": "update",
      "target": "item.vat_amount",
      "operation": "set",
      "value": "0.00"
    },
    {
      "type": "update",
      "target": "item.vat_rule_applied",
      "operation": "set",
      "value": "row_digital_zero_vat:v1"
    },
    {
      "type": "update",
      "target": "item.exemption_reason",
      "operation": "set",
      "value": "ROW digital products"
    }
  ],
  "stop_processing": true
}
```

**Acceptance Criteria:**
- Rule created successfully
- Condition evaluates correctly (ROW + digital)
- 0% VAT applied correctly

---

### TASK-053: Create SA Special VAT Rule (TDD RED)
**Priority:** Medium
**TDD Stage:** RED
**Estimate:** 45 minutes
**Status:** Pending
**Dependencies:** TASK-052

**Description:**
Create rule for South Africa 15% VAT.

**Rule Specification:**
```json
{
  "rule_id": "sa_special_vat",
  "name": "South Africa 15% VAT",
  "entry_point": ["calculate_vat_per_item"],
  "priority": 18,
  "active": true,
  "version": 1,
  "rules_fields_id": "rf_vat_calculation_context",
  "condition": {
    "type": "jsonlogic",
    "expr": {"==": [{"var": "user_address.region"}, "SA"]}
  },
  "actions": [
    {
      "type": "update",
      "target": "item.vat_rate",
      "operation": "set",
      "value": "0.15"
    },
    {
      "type": "update",
      "target": "item.vat_amount",
      "operation": "set",
      "value": {
        "function": "calculate_vat_amount",
        "params": {
          "net_amount": {"var": "item.net_amount"},
          "vat_rate": "0.15"
        }
      }
    },
    {
      "type": "update",
      "target": "item.vat_rule_applied",
      "operation": "set",
      "value": "sa_special_vat:v1"
    }
  ],
  "stop_processing": true
}
```

**Acceptance Criteria:**
- Rule created successfully
- 15% VAT applied for SA region
- Calculation uses Phase 1 function

---

### TASK-054: Create Live Tutorial VAT Override Rule (TDD RED)
**Priority:** Medium
**TDD Stage:** RED
**Estimate:** 45 minutes
**Status:** Pending
**Dependencies:** TASK-053

**Description:**
Create rule for live tutorial special VAT handling.

**Rule Specification:**
```json
{
  "rule_id": "live_tutorial_vat_override",
  "name": "Live Tutorial VAT Override",
  "entry_point": ["calculate_vat_per_item"],
  "priority": 25,
  "active": true,
  "version": 1,
  "rules_fields_id": "rf_vat_calculation_context",
  "condition": {
    "type": "jsonlogic",
    "expr": {"==": [{"var": "item.classification.is_live_tutorial"}, true]}
  },
  "actions": [
    {
      "type": "update",
      "target": "item.vat_rate",
      "operation": "set",
      "value": {
        "function": "get_vat_rate",
        "params": {
          "region": {"var": "user_address.region"},
          "classification": {"var": "item.classification"}
        }
      }
    },
    {
      "type": "update",
      "target": "item.vat_amount",
      "operation": "set",
      "value": {
        "function": "calculate_vat_amount",
        "params": {
          "net_amount": {"var": "item.net_amount"},
          "vat_rate": {"var": "item.vat_rate"}
        }
      }
    },
    {
      "type": "update",
      "target": "item.vat_rule_applied",
      "operation": "set",
      "value": "live_tutorial_vat_override:v1"
    }
  ],
  "stop_processing": true
}
```

**Acceptance Criteria:**
- Rule created successfully
- Live tutorials handled correctly
- Uses standard VAT rate for region

---

### TASK-055: Register VAT Functions in FunctionRegistry (TDD GREEN)
**Priority:** High
**TDD Stage:** GREEN
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-054

**Description:**
Register all Phase 1 VAT functions in Rules Engine FunctionRegistry for use in rules.

**Functions to Register:**
```python
FUNCTION_REGISTRY = {
    "map_country_to_region": map_country_to_region,
    "get_vat_rate": get_vat_rate,
    "calculate_vat_amount": calculate_vat_amount,
}
```

**File:** `backend/django_Admin3/rules_engine/custom_functions.py`

**Tests:**
- Test function registration
- Test function calls from rules
- Test parameter passing

**Acceptance Criteria:**
- All 3 functions registered in FunctionRegistry
- Functions callable from rules
- Tests verify function execution

---

### TASK-056: Create Integration Tests for Master VAT Flow (TDD REFACTOR)
**Priority:** High
**TDD Stage:** REFACTOR
**Estimate:** 2 hours
**Status:** Pending
**Dependencies:** TASK-055

**Description:**
Create comprehensive integration tests for complete master VAT rule flow.

**Test Scenarios:**
1. UK user with mixed cart (ebook + material)
2. EU user with material products
3. ROW user with digital products
4. SA user with materials
5. Anonymous user (ROW treatment)
6. Empty cart
7. Single item edge cases
8. Multiple quantities
9. Mixed regions (should not happen but test graceful handling)
10. Effective date changes (pre/post 2020 for UK ebooks)

**File:** `backend/django_Admin3/vat/tests/test_vat_rules_integration.py`

**Test Structure:**
```python
def test_checkout_start_uk_mixed_cart():
    """Test checkout_start with UK user, mixed ebook + material."""
    response = api_client.post('/api/rules/engine/execute/', {
        'entryPoint': 'checkout_start',
        'context': {...}
    })

    assert response.status_code == 200
    assert 'vat_calculations' in response.data
    # Verify ebook has 0% VAT
    # Verify material has 20% VAT
    # Verify totals aggregated correctly
```

**Acceptance Criteria:**
- Minimum 10 integration tests
- All test scenarios covered
- Tests verify complete flow from entry point to result
- Tests verify rules_executed tracking

---

### TASK-057: Create Test Matrix Documentation (TDD REFACTOR)
**Priority:** Medium
**TDD Stage:** REFACTOR
**Estimate:** 1.5 hours
**Status:** Pending
**Dependencies:** TASK-056

**Description:**
Create comprehensive test matrix documenting all VAT rule scenarios and expected outcomes.

**Matrix Structure:**
| Region | Product Type | VAT Rate | Rule Applied | Exemption Reason |
|--------|--------------|----------|--------------|------------------|
| UK | Material | 20% | vat_standard_default:v1 | - |
| UK | eBook | 0% | uk_ebook_zero_vat:v1 | UK eBook post-2020 |
| UK | Digital | 20% | vat_standard_default:v1 | - |
| EU | Material | 0% | vat_standard_default:v1 | Non-UK customer |
| ROW | Digital | 0% | row_digital_zero_vat:v1 | ROW digital products |
| SA | Material | 15% | sa_special_vat:v1 | - |

**File:** `docs/testing/vat-rule-test-matrix.md`

**Acceptance Criteria:**
- Matrix covers all region + product type combinations
- Matrix includes expected VAT rates
- Matrix includes rule IDs
- Matrix includes exemption reasons
- Matrix includes Pytest test references
- Matrix includes React test references (for future frontend tests)

---

### TASK-058: Create Rules Setup Script (TDD GREEN)
**Priority:** High
**TDD Stage:** GREEN
**Estimate:** 1.5 hours
**Status:** Pending
**Dependencies:** TASK-057

**Description:**
Create Django management command to set up all VAT rules in database.

**Command:** `python manage.py setup_vat_rules`

**Script Actions:**
1. Create RulesFields schema (rf_vat_calculation_context)
2. Create all 7 VAT rules:
   - calculate_vat_master
   - determine_vat_region
   - calculate_vat_per_item
   - vat_standard_default
   - uk_ebook_zero_vat
   - row_digital_zero_vat
   - sa_special_vat
   - live_tutorial_vat_override
3. Verify all rules created successfully
4. Run validation tests

**File:** `backend/django_Admin3/vat/management/commands/setup_vat_rules.py`

**Acceptance Criteria:**
- Command creates all rules successfully
- Command is idempotent (can run multiple times)
- Command validates rule structure
- Command prints success/failure messages
- Command supports --dry-run flag

---

### TASK-059: Create API Endpoint Tests (TDD REFACTOR)
**Priority:** High
**TDD Stage:** REFACTOR
**Estimate:** 1.5 hours
**Status:** Pending
**Dependencies:** TASK-058

**Description:**
Create API contract tests for VAT calculation endpoints.

**Endpoints to Test:**
- `POST /api/rules/engine/execute/` with `entryPoint=checkout_start`
- `POST /api/rules/engine/execute/` with `entryPoint=checkout_payment`

**Test Cases:**
1. Valid context returns VAT calculations
2. Invalid context returns validation error
3. Missing required fields returns error
4. Response includes vat_calculations structure
5. Response includes rules_executed array
6. Response includes execution_id
7. Response includes execution_time_ms
8. Audit trail created in vat_audit table
9. Cart.vat_result persisted correctly

**File:** `backend/django_Admin3/vat/tests/test_vat_api.py`

**Acceptance Criteria:**
- Minimum 9 API tests
- Tests verify request/response contracts
- Tests verify database persistence
- Tests verify audit trail creation
- All tests pass

---

### TASK-060: Create Phase 5 Completion Documentation
**Priority:** Medium
**TDD Stage:** REFACTOR
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-059

**Description:**
Create comprehensive Phase 5 completion documentation.

**Content:**
- Implementation summary
- All 7 rules created with specifications
- FunctionRegistry integration
- Test results (integration + API)
- Test matrix reference
- Setup script usage
- Success criteria validation
- Next phase readiness (Phase 6: Entry Point Integration)

**File:** `docs/qa/phase-5-vat-rules-creation-completion.md`

**Acceptance Criteria:**
- Document includes all rule specifications
- Document includes test statistics
- Document includes setup instructions
- Document includes troubleshooting guide
- Document formatted in Markdown

---

## Phase 5 Summary

**Total Tasks:** 15 (TASK-046 through TASK-060)
**Estimated Time:** 16 hours
**TDD Breakdown:**
- RED Phase: 10 tasks (rule creation + schema)
- GREEN Phase: 3 tasks (function registry + setup script)
- REFACTOR Phase: 2 tasks (integration tests + documentation)

**Key Deliverables:**
1. RulesFields schema (rf_vat_calculation_context)
2. 7 VAT calculation rules (master + 6 supporting)
3. FunctionRegistry integration
4. Comprehensive integration tests
5. Test matrix documentation
6. Rules setup management command
7. API contract tests
8. Phase 5 completion documentation

**Rule Hierarchy Created:**
```
calculate_vat_master (priority 100)
  ├─→ determine_vat_region (priority 90)
  └─→ calculate_vat_per_item (priority 50)
       ├─→ live_tutorial_vat_override (priority 25)
       ├─→ uk_ebook_zero_vat (priority 20)
       ├─→ sa_special_vat (priority 18)
       ├─→ row_digital_zero_vat (priority 15)
       └─→ vat_standard_default (priority 10)
```

**Benefits of This Architecture:**
- ✅ **Frontend simplicity**: Single entry point (`checkout_start`)
- ✅ **Modular rules**: Easy to toggle/modify individual rules
- ✅ **Audit-ready**: `rules_executed` logs which rules fired
- ✅ **Versionable**: Each rule evolves independently
- ✅ **Testable**: Clear separation of concerns
- ✅ **Maintainable**: No hardcoded VAT logic

**Success Criteria:**
- ✅ All 7 rules created and active
- ✅ Master rule orchestrates complete flow
- ✅ Functions registered in FunctionRegistry
- ✅ Integration tests pass (10+ scenarios)
- ✅ API tests pass (9+ tests)
- ✅ Setup script runs successfully
- ✅ Test matrix complete
- ✅ Documentation complete
- ✅ 100% TDD compliance maintained
