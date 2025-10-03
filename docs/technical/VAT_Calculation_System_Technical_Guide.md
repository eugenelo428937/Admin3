# VAT Calculation System - Technical Guide

**Document Version:** 1.0
**Created:** 2025-10-03
**Based on:** Epic 3 - Dynamic VAT Calculation System
**Status:** Complete Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Step-by-Step Execution Flow](#step-by-step-execution-flow)
4. [File Structure](#file-structure)
5. [VAT Rate Updates](#vat-rate-updates)
6. [Product-Specific VAT Rules](#product-specific-vat-rules)
7. [Code Examples](#code-examples)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Admin3 VAT calculation system is a **rules-driven, per-item evaluation architecture** that automatically calculates Value Added Tax (VAT) for all cart items during checkout. The system replaces all legacy hardcoded VAT logic with configurable rules stored in the database.

### Key Features

- ✅ **Per-item VAT calculation** - Each cart item evaluated individually
- ✅ **Rules-based system** - VAT rules stored in database (ActedRule model)
- ✅ **Decimal precision** - All calculations use Python Decimal with ROUND_HALF_UP
- ✅ **Full audit trail** - Complete execution history stored in VATAudit table
- ✅ **Multi-region support** - UK, Ireland, EU, South Africa, Rest of World
- ✅ **Product classification** - Digital, eBook, physical, tutorial, marking
- ✅ **Anonymous user support** - IP geolocation for anonymous users

### Core Design Principles

1. **Per-Item Rule Evaluation**: Rules execute per cart item for simplicity and testability
2. **Decimal Precision**: All monetary calculations use Python `Decimal` with ROUND_HALF_UP
3. **Jurisdictional Rounding**: Per-line VAT rounding with configurable strategy
4. **Audit Trail**: Complete execution history with rule IDs, versions, inputs, outputs
5. **Function Registry**: Whitelisted server-side functions (no arbitrary code execution)
6. **Versioned VAT Rates**: Database-stored rates with effective dates

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cart / Checkout Flow                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Trigger checkout_start
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              cart/views.py::CartViewSet.create_order            │
│              Line 625-664: Calculate VAT for cart                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Call calculate_vat_for_cart()
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│            vat/service.py::calculate_vat_for_cart()             │
│            Lines 139-231: Orchestrate per-item VAT calc         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Build context
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│          vat/context_builder.py::build_vat_context()            │
│          Lines 14-125: Build user + cart + settings context     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ For each cart item
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           vat/service.py::calculate_vat_for_item()              │
│           Lines 14-77: Calculate VAT for single item            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Get VAT rate
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           country/vat_rates.py::get_vat_rate()                  │
│           Lines 62-107: Retrieve VAT rate by region             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Calculate VAT amount
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│      rules_engine/custom_functions.py::calculate_vat_amount()   │
│      Lines 264-282: Calculate with ROUND_HALF_UP                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Store results
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         cart.vat_result (JSONB) + vat/models.py::VATAudit       │
│         Complete VAT calculation stored for audit trail         │
└─────────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

| **Module** | **Responsibility** | **Location** |
|------------|-------------------|--------------|
| `country.vat_rates` | VAT rate registry with region mapping | `backend/django_Admin3/country/vat_rates.py` |
| `vat.context_builder` | Build VAT context from user/cart data | `backend/django_Admin3/vat/context_builder.py` |
| `vat.service` | Per-item VAT calculation orchestration | `backend/django_Admin3/vat/service.py` |
| `vat.product_classifier` | Product classification (digital/ebook/etc) | `backend/django_Admin3/vat/product_classifier.py` |
| `rules_engine.custom_functions` | Function registry for VAT calculations | `backend/django_Admin3/rules_engine/custom_functions.py` |
| `vat.models` | VAT audit trail models | `backend/django_Admin3/vat/models.py` |
| `cart.models` | Cart with vat_result JSONB field | `backend/django_Admin3/cart/models.py` |
| `cart.serializers` | Cart serialization with VAT data | `backend/django_Admin3/cart/serializers.py` |

---

## Step-by-Step Execution Flow

### 1. Checkout Start (Entry Point)

**File:** `backend/django_Admin3/cart/views.py`
**Function:** `CartViewSet.create_order()`
**Lines:** 625-664

```python
# cart/views.py:625-634
with transaction.atomic():
    # Get VAT calculations from cart
    from vat.service import calculate_vat_for_cart
    from vat.utils import decimal_to_string
    from decimal import Decimal

    try:
        vat_result = calculate_vat_for_cart(user, cart)
        vat_calcs = vat_result.get('vat_calculations', {})
        vat_totals = vat_calcs.get('totals', {})
        vat_items = vat_calcs.get('items', [])
```

**What happens:**
- User clicks "Place Order" or "Checkout"
- `create_order()` method is triggered
- `calculate_vat_for_cart()` is called to calculate VAT for all cart items

---

### 2. VAT Calculation Orchestration

**File:** `backend/django_Admin3/vat/service.py`
**Function:** `calculate_vat_for_cart(user, cart, client_ip=None)`
**Lines:** 139-231

```python
# vat/service.py:139-194
def calculate_vat_for_cart(user, cart, client_ip=None):
    from vat.context_builder import build_vat_context
    import time

    # Start execution timer
    start_time = time.time()

    # Generate unique execution ID
    execution_id = f"exec_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    # Build full context using Phase 3 (with client_ip for anonymous users)
    full_context = build_vat_context(user, cart, client_ip=client_ip)

    # Calculate VAT for each item
    vat_items = []
    rules_executed = []

    for item in full_context['cart']['items']:
        # Build per-item context with user + item + settings
        item_context = {
            'user': full_context['user'],
            'item': item,
            'settings': full_context['settings']
        }

        # Calculate VAT for this item
        item_result = calculate_vat_for_item(item_context)
        vat_items.append(item_result)
```

**What happens:**
- Generates unique execution ID for audit trail
- Builds VAT context from user and cart data
- Iterates through each cart item
- Calculates VAT for each item individually
- Aggregates totals
- Returns structured VAT result

---

### 3. Build VAT Context

**File:** `backend/django_Admin3/vat/context_builder.py`
**Function:** `build_vat_context(user, cart, client_ip=None)`
**Lines:** 14-125

```python
# vat/context_builder.py:14-95
def build_vat_context(user, cart, client_ip=None):
    from country.vat_rates import map_country_to_region
    from .ip_geolocation import get_region_from_ip, get_country_from_ip

    # Build user section
    if user is None or not user.is_authenticated:
        # Anonymous user - use IP geolocation if available
        region = None
        address = {}

        if client_ip:
            region = get_region_from_ip(client_ip)
            country_code = get_country_from_ip(client_ip)
            if country_code:
                address['country'] = country_code

        user_context = {
            'id': None,
            'region': region,
            'address': address
        }
    else:
        # Authenticated user - extract region from profile
        # ... (extract HOME address from UserProfileAddress)
        if country_code:
            region = map_country_to_region(country_code)
```

**What happens:**
- Extracts user information (authenticated or anonymous)
- For authenticated users: gets HOME address from UserProfile
- For anonymous users: uses IP geolocation to determine country
- Maps country code to VAT region (UK, IE, EU, SA, ROW)
- Builds cart items with product classification
- Returns structured context for VAT calculation

---

### 4. Product Classification

**File:** `backend/django_Admin3/vat/product_classifier.py`
**Function:** `classify_product(product)`
**Lines:** 12-108

```python
# vat/product_classifier.py:12-73
def classify_product(product):
    """
    Classify product based on product code patterns.

    Returns:
        dict: Classification with flags:
            - is_digital: True for digital products
            - is_ebook: True for eBooks specifically
            - is_material: True for physical materials
            - is_live_tutorial: True for live tutorials
            - is_marking: True for marking products
    """
    # Check for eBook (takes precedence)
    if 'EBOOK' in product_code_upper or 'E-BOOK' in product_code_upper:
        return {
            'is_digital': True,
            'is_ebook': True,
            'is_material': False,
            'is_live_tutorial': False,
            'is_marking': False,
            'product_type': 'ebook'
        }
```

**What happens:**
- Analyzes product code to determine product type
- Sets classification flags (is_digital, is_ebook, etc.)
- Used by VAT rate determination logic

---

### 5. Per-Item VAT Calculation

**File:** `backend/django_Admin3/vat/service.py`
**Function:** `calculate_vat_for_item(item_context)`
**Lines:** 14-77

```python
# vat/service.py:14-77
def calculate_vat_for_item(item_context):
    # Extract region and item data
    region = item_context.get('user', {}).get('region')
    item = item_context.get('item', {})

    net_amount = Decimal(item.get('net_amount', '0.00'))
    classification = item.get('classification', {})

    # Get VAT rate from Phase 1 function
    vat_rate = get_vat_rate(region, classification)

    # Calculate VAT amount with proper rounding
    vat_amount = (net_amount * vat_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    # Determine rule applied and exemption reason
    vat_rule_applied = _determine_vat_rule(region, classification, vat_rate)

    return {
        'item_id': item_id,
        'net_amount': net_amount,
        'vat_amount': vat_amount,
        'vat_rate': vat_rate,
        'vat_rule_applied': vat_rule_applied
    }
```

**What happens:**
- Extracts region and item data from context
- Calls `get_vat_rate()` to retrieve appropriate VAT rate
- Calculates VAT amount with ROUND_HALF_UP precision
- Determines which VAT rule was applied
- Returns VAT calculation result for item

---

### 6. VAT Rate Retrieval

**File:** `backend/django_Admin3/country/vat_rates.py`
**Function:** `get_vat_rate(region, classification)`
**Lines:** 62-107

```python
# country/vat_rates.py:62-107
def get_vat_rate(region: str, classification: dict = None) -> Decimal:
    """
    Get VAT rate based on region and product classification.

    Rules:
    - UK eBooks: 0% (post-2020 rule)
    - ROW digital: 0%
    - SA products: 15%
    - Standard: region default rate
    """
    if classification is None:
        classification = {}

    # UK eBooks get 0% VAT (post-2020 rule)
    if region == "UK" and classification.get("is_ebook", False):
        return Decimal("0.00")

    # ROW digital products get 0% VAT
    if region == "ROW" and classification.get("is_digital", False):
        return Decimal("0.00")

    # SA products get 15% VAT
    if region == "SA":
        return Decimal("0.15")

    # Return region default rate
    return VAT_RATES.get(region, Decimal("0.00"))
```

**What happens:**
- Checks product classification for special rules
- UK eBooks: 0% VAT (post-2020)
- ROW digital products: 0% VAT
- South Africa: 15% VAT
- Otherwise returns default rate for region

**Current VAT Rates:**
```python
# country/vat_rates.py:10-17
VAT_RATES = {
    "UK": Decimal("0.20"),   # United Kingdom - 20%
    "IE": Decimal("0.23"),   # Ireland - 23%
    "SA": Decimal("0.15"),   # South Africa - 15%
    "ROW": Decimal("0.00"),  # Rest of World - 0%
    "CH": Decimal("0.00"),   # Switzerland - 0%
    "GG": Decimal("0.00"),   # Guernsey - 0%
}
```

---

### 7. VAT Amount Calculation

**File:** `backend/django_Admin3/rules_engine/custom_functions.py`
**Function:** `calculate_vat_amount(net_amount, vat_rate)`
**Lines:** 264-282

```python
# rules_engine/custom_functions.py:264-282
def calculate_vat_amount(net_amount, vat_rate):
    """
    Calculate VAT amount with proper rounding (ROUND_HALF_UP to 2 decimal places).

    Examples:
        >>> calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
        Decimal('20.00')
        >>> calculate_vat_amount('50.555', '0.20')
        Decimal('10.11')
    """
    amount = Decimal(str(net_amount)) * Decimal(str(vat_rate))
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
```

**What happens:**
- Multiplies net amount by VAT rate
- Uses ROUND_HALF_UP rounding to 2 decimal places
- Returns precise VAT amount as Decimal

---

### 8. Result Storage

**File:** `backend/django_Admin3/vat/service.py`
**Function:** `save_vat_result_to_cart(cart, vat_result)`
**Lines:** 234-255

```python
# vat/service.py:234-255
def save_vat_result_to_cart(cart, vat_result):
    """Save VAT calculation result to cart.vat_result field."""
    from vat.utils import decimal_to_string

    if cart is None:
        return False

    try:
        cart.vat_result = decimal_to_string(vat_result)
        cart.save(update_fields=['vat_result'])
        return True
    except Exception:
        return False
```

**What happens:**
- Converts Decimal values to strings for JSON storage
- Saves complete VAT calculation result to `cart.vat_result` JSONB field
- Returns success/failure status

**Result Structure:**
```json
{
  "status": "success",
  "execution_id": "exec_20251003_120000_abc123",
  "vat_calculations": {
    "items": [
      {
        "item_id": 1,
        "net_amount": "50.00",
        "vat_amount": "0.00",
        "vat_rate": "0.00",
        "vat_rule_applied": "vat_uk_ebook_zero:v1",
        "exemption_reason": "UK eBook post-2020"
      }
    ],
    "totals": {
      "subtotal": "50.00",
      "total_vat": "0.00",
      "total_gross": "50.00",
      "effective_vat_rate": "0.00"
    },
    "region_info": {
      "country": "GB",
      "region": "UK"
    }
  },
  "rules_executed": ["vat_uk_ebook_zero:v1"],
  "execution_time_ms": 15,
  "created_at": "2025-10-03T12:00:00Z"
}
```

---

### 9. Audit Trail Creation

**File:** `backend/django_Admin3/vat/service.py`
**Function:** `create_vat_audit_record()`
**Lines:** 258-305

```python
# vat/service.py:258-305
def create_vat_audit_record(execution_id, cart, vat_result, duration_ms, order=None):
    """Create audit trail record for VAT calculation."""
    from vat.models import VATAudit

    audit = VATAudit.objects.create(
        execution_id=execution_id,
        cart=cart,
        order=order,
        rule_id='calculate_vat_per_item',
        rule_version=1,
        input_context=decimal_to_string(input_context),
        output_data=decimal_to_string(vat_result),
        duration_ms=duration_ms
    )

    return audit
```

**What happens:**
- Creates VATAudit record in database
- Stores complete input context and output data
- Records execution duration for performance monitoring
- Links to cart and order (if available)

---

### 10. Frontend Serialization

**File:** `backend/django_Admin3/cart/serializers.py`
**Function:** `CartSerializer.get_vat_calculations()`
**Lines:** 127-169

```python
# cart/serializers.py:127-152
def get_vat_calculations(self, obj):
    """Calculate and return VAT calculations for cart"""
    from vat.service import calculate_vat_for_cart
    from vat.utils import decimal_to_float

    # Get user from request context
    request = self.context.get('request')
    user = request.user if request and hasattr(request, 'user') and request.user.is_authenticated else None

    # Extract client IP for anonymous users
    client_ip = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            client_ip = x_forwarded_for.split(',')[0].strip()
        else:
            client_ip = request.META.get('REMOTE_ADDR')

    try:
        # Calculate VAT for cart
        vat_result = calculate_vat_for_cart(user, obj, client_ip=client_ip)

        # Return only the vat_calculations portion
        return decimal_to_float(vat_result.get('vat_calculations', {}))
    except Exception as e:
        # Return empty structure on error
        return { ... }
```

**What happens:**
- Called when cart is serialized for API response
- Triggers full VAT calculation
- Converts Decimals to floats for JSON serialization
- Returns VAT data to frontend React application

---

## File Structure

### Core VAT Files

```
backend/django_Admin3/
├── country/
│   ├── vat_rates.py                    # VAT rate registry (EDIT HERE for rate changes)
│   └── tests/
│       └── test_vat_rates.py           # Unit tests for VAT rates
├── vat/
│   ├── models.py                       # VATAudit model for audit trail
│   ├── service.py                      # Main VAT calculation orchestration
│   ├── context_builder.py              # Build VAT context from user/cart
│   ├── product_classifier.py           # Product classification logic
│   ├── utils.py                        # Utility functions (Decimal conversion)
│   ├── ip_geolocation.py               # IP-based region detection
│   └── tests/
│       ├── test_service.py             # VAT service tests
│       ├── test_context_builder.py     # Context builder tests
│       └── test_product_classifier.py  # Product classifier tests
├── rules_engine/
│   ├── custom_functions.py             # VAT calculation functions (FUNCTION_REGISTRY)
│   └── tests/
│       └── test_custom_functions_vat.py
├── cart/
│   ├── views.py                        # Checkout entry point (line 625)
│   ├── models.py                       # Cart model with vat_result JSONB field
│   ├── serializers.py                  # Cart serialization with VAT data
│   └── tests/
│       └── test_vat_result_field.py
└── vat/management/commands/
    └── setup_vat_rules.py              # Setup VAT rules in database (RULES SETUP)
```

---

## VAT Rate Updates

### Scenario: UK VAT Rate Change from 20% to 23%

**Location to Update:** `backend/django_Admin3/country/vat_rates.py`

**File:** `country/vat_rates.py`
**Lines:** 10-17

#### Before (Current):
```python
VAT_RATES = {
    "UK": Decimal("0.20"),   # United Kingdom - 20%
    "IE": Decimal("0.23"),   # Ireland - 23%
    "SA": Decimal("0.15"),   # South Africa - 15%
    "ROW": Decimal("0.00"),  # Rest of World - 0%
    "CH": Decimal("0.00"),   # Switzerland - 0%
    "GG": Decimal("0.00"),   # Guernsey - 0%
}
```

#### After (Updated):
```python
VAT_RATES = {
    "UK": Decimal("0.23"),   # United Kingdom - 23% (UPDATED 2025-10-03)
    "IE": Decimal("0.23"),   # Ireland - 23%
    "SA": Decimal("0.15"),   # South Africa - 15%
    "ROW": Decimal("0.00"),  # Rest of World - 0%
    "CH": Decimal("0.00"),   # Switzerland - 0%
    "GG": Decimal("0.00"),   # Guernsey - 0%
}
```

### Steps to Update VAT Rate:

1. **Edit the VAT_RATES dictionary** in `country/vat_rates.py`
2. **Update the rate value** using Decimal format: `Decimal("0.23")`
3. **Add a comment** indicating the change date
4. **Run tests** to ensure no breakage:
   ```bash
   cd backend/django_Admin3
   python manage.py test country.tests.test_vat_rates -v 2
   python manage.py test vat.tests.test_service -v 2
   ```
5. **Restart the Django server** for changes to take effect
6. **No database migration required** - changes are immediate

### Important Notes:

- ✅ **No code deployment required** - simple file edit
- ✅ **No database changes needed** - rates stored in Python file
- ✅ **Changes take effect immediately** on server restart
- ✅ **Always use Decimal** - never use float for monetary values
- ✅ **Update tests** if expected values change

---

## Product-Specific VAT Rules

### Scenario: Combine Materials Pack eBook for SP1
**Requirement:** 40% VAT for UK, 30% VAT for Singapore

There are **two approaches** to implement product-specific VAT rules:

---

### Approach 1: Modify VAT Rate Registry (Simple, Hardcoded)

**File:** `country/vat_rates.py`
**Function:** `get_vat_rate()`
**Lines:** 62-107

**Add product-specific logic** to the `get_vat_rate()` function:

```python
def get_vat_rate(region: str, classification: dict = None) -> Decimal:
    """
    Get VAT rate based on region and product classification.
    """
    if classification is None:
        classification = {}

    # === NEW: Product-Specific Rules ===
    product_code = classification.get('product_code', '')

    # Combine Materials Pack eBook SP1 - Special VAT rates
    if 'CM' in product_code and classification.get('is_ebook', False) and 'SP1' in product_code:
        if region == 'UK':
            return Decimal("0.40")  # 40% VAT for UK
        elif region == 'SG':  # Singapore (if mapped to region)
            return Decimal("0.30")  # 30% VAT for Singapore
    # === END Product-Specific Rules ===

    # UK eBooks get 0% VAT (post-2020 rule)
    if region == "UK" and classification.get("is_ebook", False):
        return Decimal("0.00")

    # ... rest of existing logic
```

**Steps:**

1. **Edit** `country/vat_rates.py`
2. **Add Singapore to REGION_MAP** if not already present:
   ```python
   REGION_MAP = {
       # ... existing entries
       'SG': {'SG'},  # Singapore
   }
   ```
3. **Add product-specific check** in `get_vat_rate()` function
4. **Test the changes**:
   ```bash
   python manage.py test country.tests.test_vat_rates -v 2
   python manage.py test vat.tests.test_vat_rules -v 2
   ```
5. **Restart server**

**Pros:**
- ✅ Simple and fast to implement
- ✅ No database changes required
- ✅ Immediate effect on restart

**Cons:**
- ❌ Hardcoded logic (not configurable via admin)
- ❌ Requires code deployment for changes
- ❌ Less flexible than rules-based approach

---

### Approach 2: Create Database-Driven VAT Rules (Recommended, Flexible)

**File:** `vat/management/commands/setup_vat_rules.py`
**Lines:** Add new rule function

**Create a new VAT rule** that can be configured via Django admin:

#### Step 1: Add Rule to setup_vat_rules.py

Add a new function to generate the rule:

```python
def get_cm_ebook_sp1_uk_special_rule(self):
    """Combine Materials Pack eBook SP1 - UK 40% VAT special rule."""
    return {
        'rule_code': 'cm_ebook_sp1_uk_special_vat',
        'name': 'CM eBook SP1 UK Special VAT (40%)',
        'description': 'Special 40% VAT rate for Combine Materials Pack eBook SP1 for UK customers',
        'entry_point': 'calculate_vat_per_item',
        'priority': 30,  # Higher priority than standard UK eBook rule
        'active': True,
        'version': 1,
        'rules_fields_code': 'rf_vat_calculation_context',
        'condition': {
            'and': [
                {'==': [{'var': 'user_address.region'}, 'UK']},
                {'==': [{'var': 'item.classification.is_ebook'}, True]},
                {'in': ['CM', {'var': 'item.product_code'}]},
                {'in': ['SP1', {'var': 'item.product_code'}]}
            ]
        },
        'actions': [
            {'type': 'update', 'target': 'item.vat_rate', 'operation': 'set', 'value': '0.40'},
            {
                'type': 'update',
                'target': 'item.vat_amount',
                'operation': 'set',
                'value': {
                    'function': 'calculate_vat_amount',
                    'params': {
                        'net_amount': {'var': 'item.net_amount'},
                        'vat_rate': '0.40'
                    }
                }
            },
            {'type': 'update', 'target': 'item.vat_rule_applied', 'operation': 'set', 'value': 'cm_ebook_sp1_uk_special_vat:v1'},
            {'type': 'update', 'target': 'item.exemption_reason', 'operation': 'set', 'value': 'CM eBook SP1 UK Special Rate'}
        ],
        'stop_processing': True,  # Don't apply other rules after this
        'metadata': {
            'epic': 'Epic 3 - Dynamic VAT Calculation',
            'phase': 'Product-Specific Rules',
            'regulation': 'Business requirement for CM SP1'
        }
    }

def get_cm_ebook_sp1_sg_special_rule(self):
    """Combine Materials Pack eBook SP1 - Singapore 30% VAT special rule."""
    return {
        'rule_code': 'cm_ebook_sp1_sg_special_vat',
        'name': 'CM eBook SP1 Singapore Special VAT (30%)',
        'description': 'Special 30% VAT rate for Combine Materials Pack eBook SP1 for Singapore customers',
        'entry_point': 'calculate_vat_per_item',
        'priority': 30,
        'active': True,
        'version': 1,
        'rules_fields_code': 'rf_vat_calculation_context',
        'condition': {
            'and': [
                {'==': [{'var': 'user_address.region'}, 'SG']},
                {'==': [{'var': 'item.classification.is_ebook'}, True]},
                {'in': ['CM', {'var': 'item.product_code'}]},
                {'in': ['SP1', {'var': 'item.product_code'}]}
            ]
        },
        'actions': [
            {'type': 'update', 'target': 'item.vat_rate', 'operation': 'set', 'value': '0.30'},
            {
                'type': 'update',
                'target': 'item.vat_amount',
                'operation': 'set',
                'value': {
                    'function': 'calculate_vat_amount',
                    'params': {
                        'net_amount': {'var': 'item.net_amount'},
                        'vat_rate': '0.30'
                    }
                }
            },
            {'type': 'update', 'target': 'item.vat_rule_applied', 'operation': 'set', 'value': 'cm_ebook_sp1_sg_special_vat:v1'}
        ],
        'stop_processing': True,
        'metadata': {
            'epic': 'Epic 3 - Dynamic VAT Calculation',
            'phase': 'Product-Specific Rules'
        }
    }
```

#### Step 2: Register Rules in create_vat_rules()

```python
def create_vat_rules(self, dry_run, force):
    """Create all VAT calculation rules."""
    rules = [
        self.get_master_vat_rule(),
        self.get_determine_region_rule(),
        self.get_per_item_orchestrator_rule(),
        self.get_standard_default_rule(),
        self.get_uk_ebook_zero_rule(),
        self.get_row_digital_zero_rule(),
        self.get_sa_special_rule(),
        self.get_live_tutorial_override_rule(),
        # === NEW RULES ===
        self.get_cm_ebook_sp1_uk_special_rule(),
        self.get_cm_ebook_sp1_sg_special_rule(),
    ]
    # ... rest of method
```

#### Step 3: Add Singapore to Region Map

**File:** `country/vat_rates.py`
**Lines:** 19-29

```python
REGION_MAP = {
    'UK': {'GB', 'UK'},
    'IE': {'IE'},
    'EU': {'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE',
           'GR', 'HU', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
           'RO', 'SK', 'SI', 'ES', 'SE'},
    'SA': {'ZA'},
    'CH': {'CH'},
    'GG': {'GG'},
    'SG': {'SG'}  # NEW: Singapore
}
```

#### Step 4: Run Setup Command

```bash
cd backend/django_Admin3
python manage.py setup_vat_rules --dry-run  # Preview changes
python manage.py setup_vat_rules --force    # Create rules
```

#### Step 5: Verify Rules in Django Admin

1. Navigate to: `/admin/rules_engine/actedrule/`
2. Find rules: `cm_ebook_sp1_uk_special_vat` and `cm_ebook_sp1_sg_special_vat`
3. Verify they are **active** and have correct **priority** (30)

**Pros:**
- ✅ Configurable via Django admin (no code changes)
- ✅ Versioned and auditable
- ✅ Can be enabled/disabled without code deployment
- ✅ Full audit trail in VATAudit table
- ✅ Supports complex conditions and actions

**Cons:**
- ❌ More complex initial setup
- ❌ Requires database migration
- ❌ Requires understanding of rule structure

---

### Rule Priority System

Rules are executed in **priority order** (higher priority = executed first):

```
Priority 100: calculate_vat_master         (Master orchestrator)
Priority 90:  determine_vat_region         (Region determination)
Priority 50:  calculate_vat_per_item       (Per-item orchestrator)

=== Per-Item Rules (executed in order) ===
Priority 30:  cm_ebook_sp1_uk_special_vat  (Product-specific UK)
Priority 30:  cm_ebook_sp1_sg_special_vat  (Product-specific SG)
Priority 25:  live_tutorial_vat_override   (Live tutorials)
Priority 20:  uk_ebook_zero_vat            (UK eBooks general)
Priority 18:  sa_special_vat               (South Africa)
Priority 15:  row_digital_zero_vat         (ROW digital)
Priority 10:  vat_standard_default         (Default fallback)
```

**Key Points:**
- Product-specific rules should have **higher priority** than general rules
- Use `stop_processing: true` to prevent subsequent rules from executing
- General rules (like `uk_ebook_zero_vat`) should have lower priority

---

## Code Examples

### Example 1: Calculate VAT for Cart (Python)

```python
from vat.service import calculate_vat_for_cart
from cart.models import Cart

# Get cart
cart = Cart.objects.get(id=1)
user = cart.user  # or None for anonymous

# Calculate VAT
vat_result = calculate_vat_for_cart(user, cart)

print(vat_result)
# Output:
# {
#   'status': 'success',
#   'execution_id': 'exec_20251003_120000_abc123',
#   'vat_calculations': {
#     'items': [...],
#     'totals': {'subtotal': 100.00, 'total_vat': 20.00, ...}
#   },
#   'rules_executed': ['vat_uk_standard:v1'],
#   'execution_time_ms': 15
# }
```

### Example 2: Get VAT Rate for Product (Python)

```python
from country.vat_rates import get_vat_rate, map_country_to_region

# Map country to region
region = map_country_to_region('GB')  # Returns 'UK'

# Get VAT rate for UK eBook
classification = {'is_ebook': True, 'is_digital': True}
vat_rate = get_vat_rate(region, classification)

print(vat_rate)  # Output: Decimal('0.00') - UK eBooks are 0%

# Get VAT rate for UK physical material
classification = {'is_ebook': False, 'is_material': True}
vat_rate = get_vat_rate(region, classification)

print(vat_rate)  # Output: Decimal('0.20') - UK standard rate 20%
```

### Example 3: Classify Product (Python)

```python
from vat.product_classifier import classify_product

# Classify eBook
product = {'product_code': 'CM001-EBOOK'}
classification = classify_product(product)

print(classification)
# Output:
# {
#   'is_digital': True,
#   'is_ebook': True,
#   'is_material': False,
#   'is_live_tutorial': False,
#   'is_marking': False,
#   'product_type': 'ebook'
# }

# Classify live tutorial
product = {'product_code': 'LIVE-TUT-001'}
classification = classify_product(product)

print(classification)
# Output:
# {
#   'is_digital': False,
#   'is_ebook': False,
#   'is_material': False,
#   'is_live_tutorial': True,
#   'is_marking': False,
#   'product_type': 'live_tutorial'
# }
```

### Example 4: Frontend API Call (React/JavaScript)

```javascript
// Fetch cart with VAT calculations
const fetchCart = async () => {
  const response = await fetch('/api/cart/current/', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  console.log('VAT Calculations:', data.vat_calculations);
  // Output:
  // {
  //   items: [
  //     {
  //       item_id: 1,
  //       net_amount: 50.00,
  //       vat_amount: 0.00,
  //       vat_rate: 0.00,
  //       vat_rule_applied: 'vat_uk_ebook_zero:v1',
  //       exemption_reason: 'UK eBook post-2020'
  //     }
  //   ],
  //   totals: {
  //     subtotal: 50.00,
  //     total_vat: 0.00,
  //     total_gross: 50.00,
  //     effective_vat_rate: 0.00
  //   },
  //   region_info: {
  //     country: 'GB',
  //     region: 'UK'
  //   }
  // }
};
```

---

## Troubleshooting

### Issue: VAT Not Calculated Correctly

**Symptoms:**
- Incorrect VAT rate applied
- VAT amount is wrong
- Exemption not applied

**Diagnosis:**
1. Check VATAudit table for execution history:
   ```sql
   SELECT * FROM vat_audit
   WHERE cart_id = 123
   ORDER BY created_at DESC
   LIMIT 1;
   ```
2. Examine `input_context` to see what data was provided
3. Examine `output_data` to see what VAT was calculated
4. Check which rule was applied: `rule_id` field

**Common Causes:**
- User address not set → region defaults to ROW
- Product classification incorrect → wrong VAT rate applied
- Rule priority conflict → higher priority rule overrides
- VAT rate not updated in `country/vat_rates.py`

**Solution:**
- Verify user has HOME address set in UserProfile
- Check product_code matches classification patterns
- Review rule priorities in Django admin
- Update VAT_RATES dictionary as needed

---

### Issue: Anonymous User VAT Incorrect

**Symptoms:**
- Anonymous users always get ROW (0%) VAT
- IP geolocation not working

**Diagnosis:**
1. Check if `client_ip` is being passed to `calculate_vat_for_cart()`
2. Verify IP geolocation service is working
3. Check `vat/ip_geolocation.py` implementation

**Common Causes:**
- `client_ip` parameter not passed
- IP geolocation API failure
- IP address not resolvable

**Solution:**
- Ensure `cart/serializers.py::get_vat_calculations()` extracts IP
- Verify IP geolocation service is accessible
- Consider fallback to default region (ROW)

---

### Issue: VAT Rules Not Executing

**Symptoms:**
- New VAT rules not applied
- Expected rule not found in `rules_executed` list

**Diagnosis:**
1. Check if rule is active in Django admin:
   ```
   /admin/rules_engine/actedrule/
   ```
2. Verify rule `entry_point` matches (`calculate_vat_per_item`)
3. Check rule condition matches item context
4. Review rule priority

**Common Causes:**
- Rule not active (`active = False`)
- Wrong entry point
- Condition never evaluates to true
- Lower priority rule executed first with `stop_processing: true`

**Solution:**
- Set `active = True` in Django admin
- Ensure `entry_point = 'calculate_vat_per_item'`
- Test rule condition with actual cart context
- Adjust priority to execute before conflicting rules

---

### Issue: Performance Degradation

**Symptoms:**
- Slow checkout process
- VAT calculation takes > 100ms

**Diagnosis:**
1. Check `execution_time_ms` in VATAudit table:
   ```sql
   SELECT AVG(duration_ms), MAX(duration_ms)
   FROM vat_audit
   WHERE created_at > NOW() - INTERVAL '1 hour';
   ```
2. Profile VAT calculation with Django Debug Toolbar
3. Check number of database queries

**Common Causes:**
- N+1 query problem (fetching cart items individually)
- Inefficient rule condition evaluation
- Too many rules executing

**Solution:**
- Use `select_related()` and `prefetch_related()` in context builder
- Optimize rule conditions (avoid complex JSONLogic)
- Consider caching VAT rates in memory

---

## Summary

The Admin3 VAT calculation system is a **production-ready, rules-driven architecture** that:

1. ✅ **Calculates VAT per-item** with region-specific rules
2. ✅ **Supports multiple regions** (UK, IE, EU, SA, ROW, CH, GG)
3. ✅ **Classifies products** (digital, eBook, material, tutorial, marking)
4. ✅ **Stores audit trail** (VATAudit table with full context)
5. ✅ **Uses Decimal precision** (ROUND_HALF_UP for accuracy)
6. ✅ **Configurable via database** (ActedRule model)

### Key Takeaways:

| **Task** | **Location** | **Action** |
|----------|--------------|------------|
| Update VAT rate | `country/vat_rates.py` | Edit `VAT_RATES` dictionary |
| Add product-specific rule | `vat/management/commands/setup_vat_rules.py` | Create new rule function |
| Enable/disable rule | Django Admin `/admin/rules_engine/actedrule/` | Toggle `active` flag |
| Debug VAT calculation | Database table `vat_audit` | Query by `cart_id` or `execution_id` |
| Test VAT calculation | `python manage.py test vat.tests` | Run all VAT tests |

---

**Document Maintained By:** Technical Team
**Last Updated:** 2025-10-03
**Next Review:** When VAT regulations change or new product types added
