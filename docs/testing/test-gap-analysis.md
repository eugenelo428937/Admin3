# Test Gap Analysis Management Command

## Problem Statement

Admin3 has 667+ tests across 12+ Django apps, but there is no systematic way to answer: "Which API endpoints have no tests? Which serializer fields are never asserted in any test?" Manual inspection of test files is unreliable and doesn't scale. New endpoints can be added and deployed without anyone noticing that they have zero test coverage.

## What It Does

`test_coverage_audit` is a Django management command that:

1. **Discovers all API endpoints** by walking Django's URL resolver tree
2. **Discovers all serializer fields** by importing and introspecting DRF serializer classes
3. **Scans all test files** for references to those endpoints and fields
4. **Cross-references** to identify what's tested and what's not
5. **Generates a report** in text and/or JSON format

It answers two questions:
- **Endpoint coverage**: Of all registered `/api/` endpoints, which ones appear in test files?
- **Field coverage**: Of all serializer fields, which ones are asserted in response data or used in request bodies?

## Usage

```bash
cd backend/django_Admin3

# Full report (text + JSON output to stdout)
python manage.py test_coverage_audit

# Single app only
python manage.py test_coverage_audit --app=store

# JSON output only
python manage.py test_coverage_audit --format=json

# Text output only
python manage.py test_coverage_audit --format=text

# Save to files (generates report.json and report.txt)
python manage.py test_coverage_audit --output=report

# Skip serializer audit (faster, endpoints only)
python manage.py test_coverage_audit --endpoints-only

# Skip endpoint audit (serializers only)
python manage.py test_coverage_audit --serializers-only
```

## Sample Output

### Text Output

```
============================================================
Test Coverage Audit Report - Admin3
Generated: 2026-01-27T10:30:00.000000
============================================================

ENDPOINT COVERAGE
----------------------------------------
  Total endpoints:   120
  Tested:            45 (37.5%)
  Untested:          75 (62.5%)

UNTESTED ENDPOINTS BY APP:
  store (12 untested of 18):
    [GET   ]  /api/store/products/
    [POST  ]  /api/store/products/
    ...
  tutorials (8 untested of 15):
    [GET   ]  /api/tutorials/events/
    ...

SERIALIZER FIELD COVERAGE
----------------------------------------
  Total fields:      200
  Read-tested:       80 (40.0%)
  Write-tested:      40 (20.0%)
  Untested:          100 (50.0%)

TOP SERIALIZER GAPS:
  cart.CartItemSerializer - 4 untested field(s):
    - metadata
    - product_variation_id
    - price_type_display
    - created_at
  ...
============================================================
```

### JSON Output Structure

```json
{
  "generated_at": "2026-01-27T10:30:00.000000",
  "summary": {
    "total_endpoints": 120,
    "tested_endpoints": 45,
    "untested_endpoints": 75,
    "endpoint_coverage_pct": 37.5,
    "total_serializer_fields": 200,
    "read_tested_fields": 80,
    "write_tested_fields": 40,
    "untested_fields": 100,
    "field_read_coverage_pct": 40.0,
    "field_write_coverage_pct": 20.0
  },
  "endpoint_coverage_by_app": {
    "store": { "total": 18, "tested": 6, "untested": 12 },
    "cart": { "total": 8, "tested": 8, "untested": 0 }
  },
  "untested_endpoints": [
    {
      "path": "/api/store/products/",
      "methods": ["GET", "POST"],
      "view": "store.views.StoreProductViewSet",
      "app": "store",
      "name": "storeproduct-list"
    }
  ],
  "serializer_coverage": {
    "cart.CartItemSerializer": {
      "total_fields": 8,
      "read_tested": ["id", "product_code", "quantity", "actual_price"],
      "write_tested": ["product_id", "quantity"],
      "untested": ["metadata", "product_variation_id"]
    }
  }
}
```

## Architecture

```
utils/management/commands/
  test_coverage_audit.py          # Entry point (Django management command)

utils/audit/
  __init__.py
  endpoint_auditor.py             # URL resolver introspection
  serializer_auditor.py           # Serializer class introspection
  test_file_scanner.py            # Test file regex scanning
  report_generator.py             # JSON + text output formatting
```

### EndpointAuditor

Walks Django's root URL configuration using `django.urls.get_resolver()`. For each `URLPattern`:

1. Converts the pattern to a readable path string (replaces `<int:pk>` with `{pk}`)
2. Filters to only `/api/` paths (skips admin, docs, format suffixes)
3. Detects the app from the URL prefix (e.g., `/api/cart/` -> `cart`)
4. Extracts HTTP methods from ViewSet actions, class-based view attributes, or function decorators
5. Records the view name, namespace, and action for identification

Path detection uses a hardcoded map:

```python
path_app_map = {
    '/api/auth/': 'core_auth',
    '/api/users/': 'users',
    '/api/cart/': 'cart',
    '/api/orders/': 'orders',
    '/api/store/': 'store',
    '/api/catalog/': 'catalog',
    '/api/products/': 'filtering',
    '/api/rules/': 'rules_engine',
    '/api/tutorials/': 'tutorials',
    '/api/markings/': 'marking',
    '/api/marking-vouchers/': 'marking_vouchers',
    '/api/students/': 'students',
    '/api/search/': 'search',
    '/api/utils/': 'utils',
    '/api/countries/': 'misc',
    '/api/health/': 'utils',
}
```

### TestFileScanner

Scans all `test*.py` and `tests.py` files using regex patterns. It detects:

**Endpoint references** (6 patterns):
- `self.client.get('/api/...')` -- direct URL with method
- `self.client.post(reverse('view-name'))` -- reverse lookup with method
- `client.get('/api/...')` -- APIClient() variant
- `reverse('view-name')` -- standalone reverse calls

**Field references** (5 read patterns + 1 write pattern):
- `response.data['field_name']` -- response field assertion
- `response.data.get('field_name')` -- response field access
- `data['field_name']` -- data dict access (including nested)
- `assertIn('field_name', response.data)` -- assertion pattern
- Dict literals near `.post()`/`.put()`/`.patch()` calls -- request body fields

A skip list filters common non-field tokens (`self`, `status`, `detail`, `count`, etc.).

### SerializerAuditor

Imports all serializer classes from a known list of modules:

```python
SERIALIZER_MODULES = [
    'cart.serializers',
    'students.serializers',
    'rules_engine.serializers',
    'users.serializers',
    'tutorials.serializers',
    'marking.serializers',
    'marking_vouchers.serializers',
    'search.serializers',
    'filtering.serializers',
    'misc.products.serializers',
    'misc.subjects.serializers',
    'misc.country.serializers',
]
```

For each serializer class:
1. Instantiates it and calls `get_fields()` to get the resolved field set
2. Falls back to `Meta.fields` + class attribute inspection if instantiation fails
3. Records field type, read_only, write_only, and required flags
4. Cross-references with `TestFileScanner.scan_for_fields()` results

### ReportGenerator

Formats the combined audit results into text and/or JSON. The text format is designed for terminal readability. The JSON format is machine-readable for CI/CD integration.

---

## Maintenance Guide

### Adding a New App to the Audit

When a new Django app with API endpoints is created:

1. **Add URL prefix mapping** in `endpoint_auditor.py`:

   ```python
   # In EndpointAuditor._detect_app()
   path_app_map = {
       # ... existing entries ...
       '/api/new-app/': 'new_app',
   }
   ```

2. **Add serializer module** (if the app has serializers) in `serializer_auditor.py`:

   ```python
   SERIALIZER_MODULES = [
       # ... existing modules ...
       'new_app.serializers',
   ]
   ```

3. Run the audit to verify the new app appears:
   ```bash
   python manage.py test_coverage_audit --app=new_app --format=text
   ```

### Adding New Test Detection Patterns

If your tests use an unconventional pattern that the scanner doesn't recognize (e.g., a custom test client wrapper), add a regex to `test_file_scanner.py`:

```python
# In TestFileScanner class
URL_PATTERNS = [
    # ... existing patterns ...
    re.compile(r'custom_client\.(get|post)\s*\(\s*[\'"]([^\'"]+)[\'"]'),
]
```

### Filtering False Positives

The `_is_likely_field()` method in `test_file_scanner.py` has a skip list for common non-field names. If the audit reports irrelevant fields, add them to the skip set:

```python
def _is_likely_field(self, field):
    skip = {
        'self', 'status', 'detail', 'results', 'count', 'next', 'previous',
        # Add new false positives here:
        'new_false_positive',
    }
    return field not in skip and not field.startswith('_')
```

### Understanding Coverage Numbers

The audit uses **static analysis** (regex matching), not runtime coverage. This means:

- **False positives**: A test might reference `/api/cart/` in a comment, which the scanner counts as "tested"
- **False negatives**: A test might build the URL dynamically (`url = f'/api/{app}/list/'`), which the scanner can't detect
- **Field matching is global**: A field named `email` tested in one serializer counts as "tested" across all serializers

The numbers are directional indicators, not exact measurements. Use them to identify *areas* that need attention, then inspect manually.

### Integrating with CI

The JSON output can be consumed by CI pipelines to enforce coverage thresholds:

```bash
# Generate JSON report
python manage.py test_coverage_audit --format=json --output=coverage-audit

# Example: fail CI if endpoint coverage is below 50%
python -c "
import json
with open('coverage-audit.json') as f:
    data = json.load(f)
pct = data['summary']['endpoint_coverage_pct']
print(f'Endpoint coverage: {pct}%')
assert pct >= 50, f'Coverage {pct}% is below 50% threshold'
"
```

### Key Files

| File | Purpose |
|------|---------|
| [test_coverage_audit.py](../../backend/django_Admin3/utils/management/commands/test_coverage_audit.py) | Management command entry point |
| [endpoint_auditor.py](../../backend/django_Admin3/utils/audit/endpoint_auditor.py) | URL resolver introspection |
| [serializer_auditor.py](../../backend/django_Admin3/utils/audit/serializer_auditor.py) | Serializer class introspection |
| [test_file_scanner.py](../../backend/django_Admin3/utils/audit/test_file_scanner.py) | Regex-based test file scanning |
| [report_generator.py](../../backend/django_Admin3/utils/audit/report_generator.py) | Report formatting and file output |
