# Research: Remove Legacy VAT App

**Date**: 2026-01-21
**Feature**: Remove Legacy VAT App
**Status**: Complete

## Executive Summary

Investigation confirmed the `vat` app contains legacy code that has been superseded by the Rules Engine's Phase 6 database-driven VAT calculation system. All components can be safely removed or relocated.

## Investigation Findings

### 1. map_country_to_region() - REDUNDANT

**Decision**: Remove (replaced by database-driven function)

**Rationale**:
- Legacy function in `vat/context_builder.py` (lines 21-60) uses hardcoded in-memory lookup
- Rules Engine uses `lookup_region()` in `rules_engine/custom_functions.py` (lines 127-172)
- Database query: `UtilsCountryRegion.objects.filter(country=country).select_related('region')`
- Supports date-range effective mappings (legacy doesn't)

**Alternatives Considered**:
- Keep both implementations: Rejected - violates single source of truth principle
- Migrate legacy to call database: Rejected - unnecessary wrapper

**Evidence**:
```python
# custom_functions.py line 253
# Phase 6: Removed legacy Phase 1 functions (get_vat_rate, map_country_to_region)
```

### 2. build_vat_context() - PARTIALLY USED

**Decision**: Replace direct usage with inline profile lookup

**Rationale**:
- Only called from `VATOrchestrator._build_user_context()` (line 155-161)
- Used only to extract `user.address.country` from profile
- Direct UserProfile address lookup is simpler and has no vat app dependency

**Current Flow**:
```python
# vat_orchestrator.py lines 155-166
from vat.context_builder import build_vat_context
context = build_vat_context(cart.user, cart, client_ip)
country = context.get('user', {}).get('address', {}).get('country', DEFAULT_COUNTRY)
```

**Proposed Flow**:
```python
# Direct profile access
country = DEFAULT_COUNTRY
if cart.user and hasattr(cart.user, 'userprofile'):
    home_address = cart.user.userprofile.addresses.filter(address_type='HOME').first()
    if home_address and home_address.country:
        country = home_address.country
```

### 3. build_item_context() - UNUSED

**Decision**: Remove (not used in production)

**Rationale**:
- Function exists in `vat/context_builder.py` (lines 178-228)
- VATOrchestrator has its own `_build_item_context()` method (lines 179-220)
- Only referenced in vat app's own tests

### 4. VATAudit Model - REDUNDANT

**Decision**: Drop table without archival

**Rationale**:
- Created only in `vat_orchestrator.py:438` via `_create_audit_record()`
- `ActedRuleExecution` captures same data:
  - `context_snapshot` = VATAudit.input_context
  - `actions_result` = VATAudit.output_data
  - `execution_time_ms` = VATAudit.duration_ms
- `ActedOrder.calculations_applied` stores VAT result for orders (cart/views.py:827)
- VATAudit has cart/order FKs, but not needed since:
  - Cart-level: `cart.vat_result` JSONB stores calculation
  - Order-level: `calculations_applied` JSONB stores calculation

**Alternatives Considered**:
- Archive to JSON: Rejected - adds complexity, data is redundant
- Migrate to ActedRuleExecution: Rejected - already captured at execution time
- Keep read-only: Rejected - maintenance burden with no benefit

### 5. ip_geolocation.py - RELOCATABLE

**Decision**: Move to `utils/services/ip_geolocation.py`

**Rationale**:
- Generic utility for IP-to-region lookup
- Only external dependency is on `UtilsCountrys` model
- Used for anonymous user region detection
- Fits better in utils app (general utilities)

**Functions to Relocate**:
- `get_region_from_ip(ip_address)`
- `get_country_from_ip(ip_address)`

## Dependencies Analysis

### Files Importing from vat App

| File | Import | Action |
|------|--------|--------|
| `cart/services/vat_orchestrator.py` | `from vat.models import VATAudit` | Remove VATAudit usage |
| `cart/services/vat_orchestrator.py` | `from vat.context_builder import build_vat_context` | Replace with direct lookup |
| `cart/tests/test_vat_*.py` | Various vat imports | Update or remove tests |
| `vat/tests/*.py` | Internal imports | Delete with app |

### Management Commands

| Command | Action |
|---------|--------|
| `cleanup_vat_audit.py` | Delete (no VATAudit to clean) |

### Admin Views

| View | Action |
|------|--------|
| `VATAuditAdmin` | Delete (no model to admin) |

## Database Changes

### Tables to Drop

| Table | Reason |
|-------|--------|
| `vat_audit` | Redundant with ActedRuleExecution |

### Migration Strategy

1. Create final migration in `vat` app before deletion
2. Migration drops `vat_audit` table
3. Remove `vat` from INSTALLED_APPS
4. Delete `vat` app directory

## Verification Checklist

- [x] `lookup_region()` exists in custom_functions.py and uses database
- [x] `lookup_vat_rate()` uses `UtilsCountrys.vat_percent`
- [x] `calculate_vat_amount()` available in custom_functions.py
- [x] `ActedRuleExecution` captures VAT rule executions
- [x] `ActedOrder.calculations_applied` stores VAT results
- [x] `cart.vat_result` JSONB stores cart-level VAT
- [x] IP geolocation has no vat-specific dependencies
