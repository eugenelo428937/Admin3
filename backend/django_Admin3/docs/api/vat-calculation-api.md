# VAT Calculation API Documentation

**Phase 5 - Entry Point Integration**
**Version**: 1.0
**Last Updated**: 2025-10-16

---

## Overview

The VAT Calculation API provides automated VAT calculation through the Rules Engine. All VAT calculations are performed by the Rules Engine with **zero hardcoded Python logic**, ensuring business rules can be updated without code deployments.

### Key Features

- **Automatic Calculation**: VAT calculated at cart operations (add, update, remove)
- **Multi-Region Support**: UK, Ireland, EU, South Africa, Rest of World
- **Product-Specific Rules**: Different VAT rates based on product types
- **Audit Trail**: Complete history of all VAT calculations
- **JSONB Storage**: Fast retrieval with structured cart.vat_result field

---

## Architecture

### Calculation Flow

```
User Action (Add/Update/Remove Item)
         ↓
    CartViewSet
         ↓
   VAT Orchestrator
         ↓
   Rules Engine (calculate_vat entry point)
         ↓
  cart.vat_result (JSONB storage)
         ↓
   CartSerializer
         ↓
    API Response
```

### Entry Points

VAT calculation is triggered automatically at these entry points:

1. **`add_to_cart`** - When items are added to cart
2. **`checkout_start`** - When checkout process begins
3. **`checkout_payment`** - Before payment processing

---

## API Endpoints

### 1. Add Item to Cart

**Endpoint**: `POST /api/cart/add/`

**Triggers**: VAT calculation for entire cart

**Request Body**:
```json
{
  "item_type": "product",
  "product_id": 123,
  "quantity": 1,
  "price_type": "standard"
}
```

**Response** (200 OK):
```json
{
  "id": 456,
  "user": 789,
  "items": [
    {
      "id": 1,
      "product_name": "Study Materials - Printed",
      "quantity": 1,
      "actual_price": "100.00",
      "net_amount": "100.00",
      "vat_region": "UK",
      "vat_rate": "0.2000",
      "vat_amount": "20.00",
      "gross_amount": "120.00"
    }
  ],
  "vat_totals": {
    "status": "calculated",
    "region": "UK",
    "totals": {
      "net": "100.00",
      "vat": "20.00",
      "gross": "120.00"
    },
    "items": [
      {
        "id": "1",
        "actual_price": "100.00",
        "quantity": 1,
        "vat_amount": "20.00",
        "vat_rate": "0.2000",
        "vat_region": "UK",
        "gross_amount": "120.00"
      }
    ],
    "execution_id": "exec_20251016_123456",
    "rules_executed": ["calculate_vat", "calculate_vat_uk"],
    "timestamp": "2025-10-16T12:34:56.789Z"
  },
  "vat_last_calculated_at": "2025-10-16T12:34:56.789Z",
  "vat_calculation_error": false,
  "vat_calculation_error_message": null
}
```

---

### 2. Update Cart Item

**Endpoint**: `PATCH /api/cart/update_item/`

**Triggers**: VAT recalculation for entire cart

**Request Body**:
```json
{
  "item_id": 1,
  "quantity": 3
}
```

**Response** (200 OK):
```json
{
  "id": 456,
  "items": [
    {
      "id": 1,
      "quantity": 3,
      "actual_price": "100.00",
      "net_amount": "300.00",
      "vat_amount": "60.00",
      "gross_amount": "360.00"
    }
  ],
  "vat_totals": {
    "status": "calculated",
    "totals": {
      "net": "300.00",
      "vat": "60.00",
      "gross": "360.00"
    }
  }
}
```

---

### 3. Remove Cart Item

**Endpoint**: `DELETE /api/cart/remove/`

**Triggers**: VAT recalculation for remaining items

**Request Body**:
```json
{
  "item_id": 1
}
```

**Response** (204 No Content)

Cart is updated, subsequent GET will show recalculated VAT.

---

### 4. Get Cart

**Endpoint**: `GET /api/cart/list/`

**Returns**: Current cart with VAT calculations from JSONB storage

**Response** (200 OK):
```json
{
  "id": 456,
  "user": 789,
  "items": [...],
  "vat_totals": {
    "status": "calculated",
    "region": "UK",
    "totals": {
      "net": "250.00",
      "vat": "50.00",
      "gross": "300.00"
    },
    "items": [...],
    "execution_id": "exec_20251016_123456",
    "rules_executed": ["calculate_vat", "calculate_vat_uk"],
    "timestamp": "2025-10-16T12:34:56.789Z"
  },
  "vat_last_calculated_at": "2025-10-16T12:34:56.789Z",
  "vat_calculation_error": false,
  "vat_calculation_error_message": null
}
```

---

## Data Structures

### cart.vat_result (JSONB)

The `vat_result` field stores the complete VAT calculation result:

```json
{
  "status": "calculated",
  "region": "UK",
  "totals": {
    "net": "250.00",
    "vat": "50.00",
    "gross": "300.00"
  },
  "items": [
    {
      "id": "1",
      "actual_price": "100.00",
      "quantity": 1,
      "vat_amount": "20.00",
      "vat_rate": "0.2000",
      "vat_region": "UK",
      "gross_amount": "120.00"
    },
    {
      "id": "2",
      "actual_price": "150.00",
      "quantity": 1,
      "vat_amount": "30.00",
      "vat_rate": "0.2000",
      "vat_region": "UK",
      "gross_amount": "180.00"
    }
  ],
  "execution_id": "exec_20251016_123456",
  "rules_executed": [
    "calculate_vat",
    "calculate_vat_uk",
    "calculate_vat_uk_printed"
  ],
  "timestamp": "2025-10-16T12:34:56.789Z"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Calculation status: `calculated`, `not_calculated`, `error` |
| `region` | string | VAT region: `UK`, `IE`, `EU`, `SA`, `ROW` |
| `totals.net` | string | Total before VAT (decimal as string) |
| `totals.vat` | string | Total VAT amount (decimal as string) |
| `totals.gross` | string | Total including VAT (decimal as string) |
| `items` | array | Per-item VAT breakdown |
| `items[].id` | string | Cart item ID |
| `items[].vat_amount` | string | VAT for this line item |
| `items[].vat_rate` | string | VAT rate applied (e.g., "0.2000" = 20%) |
| `items[].vat_region` | string | Region used for this item |
| `items[].gross_amount` | string | Line total including VAT |
| `execution_id` | string | Unique execution identifier for audit trail |
| `rules_executed` | array | List of rule IDs executed |
| `timestamp` | string | ISO 8601 timestamp of calculation |

---

## Regional VAT Rates

### Current Rates (as of 2025-10-16)

| Region | Standard Rate | Digital Products | Physical Products | Notes |
|--------|---------------|------------------|-------------------|-------|
| **UK** | 20% | 0% (post-2020) | 20% | eBook exemption from May 1, 2020 |
| **Ireland** | 23% | 23% | 23% | Standard VAT applies to all |
| **EU** | 0% | 0% | 0% | B2B reverse charge |
| **South Africa** | 15% | 15% | 15% | All products taxed |
| **ROW** | 0% | 0% | 0% | No VAT charged |

### Special Cases

- **Switzerland**: Treated as ROW (0% VAT)
- **Guernsey**: Treated as ROW (0% VAT)
- **UK Digital eBooks**: 0% VAT (effective May 1, 2020)

---

## Error Handling

### VAT Calculation Errors

When VAT calculation fails, the cart is still usable but VAT fields indicate the error:

**Response** (200 OK - Cart saved, VAT failed):
```json
{
  "id": 456,
  "items": [...],
  "vat_totals": null,
  "vat_last_calculated_at": null,
  "vat_calculation_error": true,
  "vat_calculation_error_message": "Rules Engine connection failed"
}
```

### Error States

| Field | Value When Error |
|-------|-----------------|
| `vat_totals` | `null` |
| `vat_last_calculated_at` | `null` |
| `vat_calculation_error` | `true` |
| `vat_calculation_error_message` | Error description string |

### Common Error Messages

- `"Rules Engine connection failed"` - Cannot connect to Rules Engine service
- `"Country not found in VAT database"` - User country not in utils_countrys
- `"Invalid cart context"` - Missing required fields for calculation
- `"Rule execution timeout"` - Calculation took too long (>5s)

---

## Execution Metadata

### Audit Trail

Every VAT calculation creates a `VATAudit` record:

```python
VATAudit.objects.filter(cart=cart).order_by('-execution_timestamp')
```

**Fields**:
- `cart`: Foreign key to Cart
- `order`: Foreign key to Order (null for cart calculations)
- `rule_id`: Primary rule executed
- `input_context`: Complete input context (JSON)
- `output_data`: Complete Rules Engine response (JSON)
- `execution_timestamp`: When calculation occurred

### Execution ID Format

`exec_YYYYMMDD_HHMMSS` (e.g., `exec_20251016_123456`)

Used for:
- Linking cart.vat_result to VATAudit records
- Debugging calculation issues
- Performance monitoring

---

## Performance Metrics

### Target Performance

- **Calculation Time**: < 50ms per cart (99th percentile)
- **API Response Time**: < 200ms total (including VAT)
- **Uptime**: 99.9% availability

### Monitoring

VAT calculation performance is logged:

```python
logger.info(f"VAT calculation completed for cart {cart.id} in {duration}ms")
```

Check logs for:
- Slow calculations (>50ms)
- Error rates
- Rules executed per calculation

---

## Integration Examples

### Frontend Integration

```javascript
// Add item to cart with automatic VAT calculation
const response = await fetch('/api/cart/add/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    product_id: 123,
    quantity: 1,
    price_type: 'standard'
  })
});

const cartData = await response.json();

// Access VAT totals
const vatTotals = cartData.vat_totals;
console.log(`VAT Region: ${vatTotals.region}`);
console.log(`Total VAT: £${vatTotals.totals.vat}`);
console.log(`Gross Total: £${vatTotals.totals.gross}`);

// Check for calculation errors
if (cartData.vat_calculation_error) {
  console.error(`VAT Error: ${cartData.vat_calculation_error_message}`);
}
```

### Backend Integration

```python
from cart.services.vat_orchestrator import vat_orchestrator

# Manual VAT calculation trigger
result = vat_orchestrator.execute_vat_calculation(
    cart=cart,
    entry_point='calculate_vat'
)

# Access results
print(f"VAT Region: {result['region']}")
print(f"Total VAT: {result['totals']['vat']}")
print(f"Rules Executed: {result['rules_executed']}")

# Check cart.vat_result JSONB
cart.refresh_from_db()
print(cart.vat_result)  # Full JSONB data
```

---

## Cache Invalidation

### Automatic Invalidation

VAT cache (`cart.vat_result`) is automatically cleared when:

1. **Cart item added** - Signal triggers on `CartItem.post_save`
2. **Cart item updated** - Quantity or price changes
3. **Cart item removed** - Signal triggers on `CartItem.post_delete`

### Manual Recalculation

Force VAT recalculation:

```python
from cart.services.vat_orchestrator import vat_orchestrator

# Recalculate VAT
vat_orchestrator.execute_vat_calculation(cart)
```

---

## Migration Notes

### Phase 4 → Phase 5 Migration

**Phase 4** (Deprecated):
- `get_vat_calculations()` - Calculated VAT on every GET request
- No JSONB storage
- Limited audit trail

**Phase 5** (Current):
- VAT calculated at cart operations, stored in JSONB
- `get_vat_totals()` - Returns stored vat_result
- Complete audit trail via VATAudit

### Legacy Support

`vat_calculations` field is still available but deprecated:

```json
{
  "vat_calculations": { ... },  // DEPRECATED - redirects to vat_totals
  "vat_totals": { ... }           // USE THIS
}
```

---

## Testing

### Test VAT Calculation

```bash
# Run VAT integration tests
python manage.py test cart.tests.test_e2e_vat_integration --keepdb

# Run specific test
python manage.py test cart.tests.test_e2e_vat_integration.VATEndToEndIntegrationTests.test_regional_vat_variations_uk
```

### Sample Test Data

```python
# UK customer - 20% VAT on printed materials
user.country = Country.objects.get(code='GB')
cart_item.product_type = 'printed'
# Expected: vat_rate = 0.2000, vat_amount = 20.00 (for £100 item)

# UK customer - 0% VAT on digital eBooks
cart_item.product_type = 'digital'
cart_item.metadata = {'product_subtype': 'ebook'}
# Expected: vat_rate = 0.0000, vat_amount = 0.00

# SA customer - 15% VAT on all products
user.country = Country.objects.get(code='ZA')
# Expected: vat_rate = 0.1500, vat_amount = 15.00 (for £100 item)
```

---

## Troubleshooting

### VAT Not Calculating

**Symptom**: `vat_totals` is `null`

**Possible Causes**:
1. User country not in `utils_countrys` table
2. Rules Engine service unavailable
3. Cart item missing `product_type` or `metadata`

**Solution**:
```python
# Check user country
user.country  # Should exist in utils_countrys

# Check Rules Engine
from rules_engine.services.rule_engine import rule_engine
rule_engine.execute('calculate_vat', test_context)

# Check cart item data
cart_item.product_type  # Should not be null
cart_item.metadata  # Should be valid JSON
```

### Wrong VAT Rate Applied

**Symptom**: VAT rate doesn't match expected region rate

**Possible Causes**:
1. Country mapped to wrong region in `utils_country_region`
2. Product type not recognized by rules
3. Rule priority issues

**Solution**:
```python
# Check country-region mapping
from utils.models import CountryRegion
mapping = CountryRegion.objects.get(country=user.country)
print(mapping.region.code)  # Should be UK, IE, EU, SA, or ROW

# Check Rules Engine execution
cart.vat_result['rules_executed']  # List of rules executed
cart.vat_result['region']  # Region determined by Rules Engine
```

### Performance Issues

**Symptom**: VAT calculation takes >50ms

**Possible Causes**:
1. Too many cart items (>50)
2. Complex Rules Engine conditions
3. Database query optimization needed

**Solution**:
```python
# Profile VAT calculation
import time
start = time.time()
vat_orchestrator.execute_vat_calculation(cart)
duration = (time.time() - start) * 1000
print(f"Duration: {duration}ms")

# Check number of items
cart.items.count()  # Should be <50 for optimal performance

# Check Rules Engine performance
# See rules_engine logs for execution time
```

---

## Security Considerations

### Input Validation

- All cart operations validate user ownership
- Product prices validated against database
- Quantity limits enforced (max 99 per item)

### Audit Trail

- All VAT calculations logged to `VATAudit`
- Immutable audit records (no updates/deletes)
- 7-year retention for tax compliance

### Error Handling

- VAT calculation errors don't block cart operations
- Graceful degradation when Rules Engine unavailable
- Error messages sanitized (no sensitive data)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-16 | Initial Phase 5 API documentation |

---

## Support

**Documentation**: `docs/api/vat-calculation-api.md`
**Tests**: `cart/tests/test_e2e_vat_integration.py`
**Source**: `cart/services/vat_orchestrator.py`

For issues or questions, see project documentation or contact the development team.
