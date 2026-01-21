# Data Model: Remove Legacy VAT App

**Date**: 2026-01-21
**Feature**: Remove Legacy VAT App

## Overview

This feature involves removing one model (`VATAudit`) and documenting the existing models that replace its functionality. No new models are created.

## Models to Remove

### VATAudit (vat.models)

**Status**: TO BE DROPPED

**Table**: `vat_audit`

| Field | Type | Description |
|-------|------|-------------|
| id | AutoField | Primary key |
| execution_id | CharField(100) | Unique execution identifier |
| cart | ForeignKey(Cart) | Link to cart (nullable) |
| order | ForeignKey(ActedOrder) | Link to order (nullable) |
| rule_id | CharField(100) | ID of VAT rule applied |
| rule_version | IntegerField | Version of rule applied |
| input_context | JSONField | Context sent to rules engine |
| output_data | JSONField | VAT calculation results |
| duration_ms | IntegerField | Execution time in milliseconds |
| created_at | DateTimeField | Record creation timestamp |

**Indexes**:
- `execution_id` (db_index)
- `cart` (db_index)
- `order` (db_index)
- `rule_id` (db_index)
- `created_at` (db_index)

**Reason for Removal**: Redundant with `ActedRuleExecution` and `ActedOrder.calculations_applied`

## Replacement Models (Existing)

### ActedRuleExecution (rules_engine.models)

**Status**: EXISTING - captures all rule executions including VAT

**Table**: `acted_rule_executions`

| Field | Type | Maps to VATAudit |
|-------|------|------------------|
| execution_seq_no | CharField(100) | → execution_id |
| rule_code | CharField(100) | → rule_id |
| context_snapshot | JSONField | → input_context |
| actions_result | JSONField | → output_data |
| execution_time_ms | FloatField | → duration_ms |
| created_at | DateTimeField | → created_at |
| condition_result | BooleanField | (new capability) |
| success | BooleanField | (new capability) |
| outcome | CharField(50) | (new capability) |
| error_message | TextField | (new capability) |

**Key Difference**: No direct cart/order FK. Cart/order context is captured in `context_snapshot`.

### ActedOrder.calculations_applied (cart.models)

**Status**: EXISTING - stores VAT result at order level

**Field**: `calculations_applied` (JSONField)

**Structure**:
```json
{
  "vat_result": {
    "totals": {
      "net": "100.00",
      "vat": "20.00",
      "gross": "120.00"
    },
    "items": [
      {
        "item_id": "123",
        "vat_amount": "20.00",
        "vat_rate": "0.20",
        "region": "UK"
      }
    ],
    "region": "UK"
  }
}
```

**Populated at**: `cart/views.py:827` during order creation

### Cart.vat_result (cart.models)

**Status**: EXISTING - stores VAT result at cart level

**Field**: `vat_result` (JSONField)

**Populated at**: `cart/services/vat_orchestrator.py:402`

## Supporting Models (No Changes)

### UtilsCountrys (utils.models)

**Table**: `utils_countrys`

| Field | Type | Description |
|-------|------|-------------|
| code | CharField(2) PK | ISO country code |
| name | CharField(100) | Country name |
| vat_percent | DecimalField(5,2) | VAT rate percentage |
| active | BooleanField | Active status |

### UtilsRegion (utils.models)

**Table**: `utils_regions`

| Field | Type | Description |
|-------|------|-------------|
| code | CharField(10) PK | Region code (UK, IE, EU, SA, ROW) |
| name | CharField(100) | Region name |
| description | TextField | Region description |
| active | BooleanField | Active status |

### UtilsCountryRegion (utils.models)

**Table**: `utils_country_region`

| Field | Type | Description |
|-------|------|-------------|
| id | AutoField | Primary key |
| country | ForeignKey(UtilsCountrys) | Country reference |
| region | ForeignKey(UtilsRegion) | Region reference |
| effective_from | DateField | Start date for mapping |
| effective_to | DateField | End date (nullable) |

**Unique Constraint**: (country, effective_from)

## Migration Plan

### Step 1: Create Migration in vat App

```python
# vat/migrations/000X_drop_vat_audit.py
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('vat', 'previous_migration'),
    ]

    operations = [
        migrations.DeleteModel(
            name='VATAudit',
        ),
    ]
```

### Step 2: Run Migration

```bash
python manage.py migrate vat
```

### Step 3: Remove vat from INSTALLED_APPS

```python
# settings/base.py
INSTALLED_APPS = [
    # ...
    # 'vat',  # REMOVED
    # ...
]
```

### Step 4: Delete vat App Directory

```bash
rm -rf backend/django_Admin3/vat/
```

## Data Flow (After Removal)

```
Cart → VATOrchestrator
         │
         ├─ Get country from UserProfile.addresses
         │
         └─ rule_engine.execute('cart_calculate_vat', context)
              │
              ├─ lookup_region() → UtilsCountryRegion
              ├─ lookup_vat_rate() → UtilsCountrys.vat_percent
              ├─ calculate_vat_amount()
              │
              └─ Creates ActedRuleExecution record (automatic)
         │
         ├─ Store result in cart.vat_result (JSONB)
         │
         └─ (On order creation) Store in order.calculations_applied
```
