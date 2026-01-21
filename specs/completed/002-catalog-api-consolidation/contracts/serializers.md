# Serializer Contracts

**Feature**: Catalog API Consolidation
**Date**: 2026-01-06
**Version**: 1.0

## Overview

This document defines the serializer contracts for the catalog API. These contracts must be maintained for backward compatibility.

---

## SubjectSerializer

**Location**: `catalog/serializers/subject_serializers.py`
**Model**: `catalog.models.Subject`

### Fields

| Field | Type | Required | Read-Only | Source | Description |
|-------|------|----------|-----------|--------|-------------|
| id | integer | No | Yes | auto | Primary key |
| code | string | Yes | No | code | Subject code (e.g., "CM2"), max 10 chars |
| description | string | Yes | No | description | Full subject name, max 255 chars |
| name | string | No | Yes | description | Alias for description (frontend compatibility) |

### Example Output

```json
{
  "id": 1,
  "code": "CM2",
  "description": "Financial Mathematics",
  "name": "Financial Mathematics"
}
```

### Validation Rules

- `code`: Required, unique, max_length=10
- `description`: Required, max_length=255

---

## ExamSessionSerializer

**Location**: `catalog/serializers/exam_session_serializers.py`
**Model**: `catalog.models.ExamSession`

### Fields

| Field | Type | Required | Read-Only | Description |
|-------|------|----------|-----------|-------------|
| id | integer | No | Yes | Primary key |
| session_code | string | Yes | No | Session identifier (e.g., "2026-04") |
| start_date | date | Yes | No | Session start date |
| end_date | date | Yes | No | Session end date |
| create_date | datetime | No | Yes | Auto-set on creation |
| modified_date | datetime | No | Yes | Auto-updated on save |

### Example Output

```json
{
  "id": 1,
  "session_code": "2026-04",
  "start_date": "2026-04-01",
  "end_date": "2026-04-15",
  "create_date": "2025-12-01T10:00:00Z",
  "modified_date": "2025-12-01T10:00:00Z"
}
```

### Validation Rules

- `session_code`: Required, unique
- `start_date`: Required, valid date format
- `end_date`: Required, valid date format, must be >= start_date

---

## ProductVariationSerializer

**Location**: `catalog/serializers/product_serializers.py`
**Model**: `catalog.models.ProductVariation`

### Fields

| Field | Type | Required | Read-Only | Description |
|-------|------|----------|-----------|-------------|
| id | integer | No | Yes | Primary key |
| variation_type | string | Yes | No | Type category (e.g., "digital", "printed") |
| name | string | Yes | No | Variation display name |
| description | string | No | No | Full description |

### Example Output

```json
{
  "id": 1,
  "variation_type": "digital",
  "name": "eBook",
  "description": "Digital eBook format for all devices"
}
```

---

## ProductSerializer

**Location**: `catalog/serializers/product_serializers.py`
**Model**: `catalog.models.Product`

### Fields

| Field | Type | Required | Read-Only | Source | Description |
|-------|------|----------|-----------|--------|-------------|
| id | integer | No | Yes | auto | Primary key |
| fullname | string | Yes | No | fullname | Full product name |
| shortname | string | Yes | No | shortname | Short display name |
| product_name | string | No | Yes | shortname | Alias for shortname |
| description | string | No | No | description | Product description |
| code | string | Yes | No | code | Product code |
| type | string | No | Yes | computed | "Tutorial", "Markings", or "Material" |
| variations | array | No | Yes | computed | List of ProductVariation objects |
| created_at | datetime | No | Yes | created_at | Creation timestamp |
| updated_at | datetime | No | Yes | updated_at | Last update timestamp |
| is_active | boolean | No | No | is_active | Active status |
| buy_both | boolean | No | No | buy_both | Buy-both option flag |

### Example Output

```json
{
  "id": 1,
  "fullname": "CM2 Core Study Materials",
  "shortname": "CM2 Core",
  "product_name": "CM2 Core",
  "description": "Comprehensive study materials for CM2",
  "code": "CM2-CSM",
  "type": "Material",
  "variations": [
    {
      "id": 1,
      "name": "eBook",
      "variation_type": "digital",
      "description": "Digital eBook format",
      "prices": []
    },
    {
      "id": 2,
      "name": "Printed",
      "variation_type": "physical",
      "description": "Printed book format",
      "prices": []
    }
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "is_active": true,
  "buy_both": true
}
```

### Type Computation Logic

```python
def get_type(self, obj):
    group_names = [g.name for g in obj.groups.all()]
    if 'Tutorial' in group_names:
        return 'Tutorial'
    elif 'Marking' in group_names:
        return 'Markings'
    return 'Material'  # Default
```

### Variations Computation Logic

```python
def get_variations(self, obj):
    variations = []
    for variation in obj.product_variations.all():
        variations.append({
            'id': variation.id,
            'name': variation.name,
            'variation_type': variation.variation_type,
            'description': variation.description,
            'prices': []  # Prices loaded separately if needed
        })
    return variations
```

---

## ProductBundleProductSerializer

**Location**: `catalog/serializers/bundle_serializers.py`
**Model**: `catalog.models.ProductBundleProduct`

### Fields

| Field | Type | Required | Read-Only | Source | Description |
|-------|------|----------|-----------|--------|-------------|
| id | integer | No | Yes | auto | Primary key |
| product | object | No | Yes | computed | Nested product info |
| product_variation | object | No | Yes | computed | Nested variation info |
| default_price_type | string | No | No | default_price_type | Default pricing tier |
| quantity | integer | No | No | quantity | Quantity in bundle |
| sort_order | integer | No | No | sort_order | Display order |
| is_active | boolean | No | No | is_active | Active status |

### Nested Product Object

```json
{
  "id": 1,
  "shortname": "CM2 Core",
  "fullname": "CM2 Core Study Materials",
  "code": "CM2-CSM"
}
```

### Nested Product Variation Object

```json
{
  "id": 1,
  "name": "eBook",
  "variation_type": "digital"
}
```

### Example Output

```json
{
  "id": 1,
  "product": {
    "id": 1,
    "shortname": "CM2 Core",
    "fullname": "CM2 Core Study Materials",
    "code": "CM2-CSM"
  },
  "product_variation": {
    "id": 1,
    "name": "eBook",
    "variation_type": "digital"
  },
  "default_price_type": "standard",
  "quantity": 1,
  "sort_order": 1,
  "is_active": true
}
```

---

## ProductBundleSerializer

**Location**: `catalog/serializers/bundle_serializers.py`
**Model**: `catalog.models.ProductBundle`

### Fields

| Field | Type | Required | Read-Only | Source | Description |
|-------|------|----------|-----------|--------|-------------|
| id | integer | No | Yes | auto | Primary key |
| bundle_name | string | Yes | No | bundle_name | Bundle display name |
| bundle_description | string | No | No | bundle_description | Bundle description |
| subject_code | string | No | Yes | subject.code | Related subject code |
| subject_name | string | No | Yes | subject.name | Related subject name |
| is_featured | boolean | No | No | is_featured | Featured flag |
| is_active | boolean | No | No | is_active | Active status |
| display_order | integer | No | No | display_order | Sort order |
| components | array | No | Yes | bundle_products | List of bundle components |
| components_count | integer | No | Yes | computed | Active components count |
| created_at | datetime | No | Yes | created_at | Creation timestamp |
| updated_at | datetime | No | Yes | updated_at | Last update timestamp |

### Example Output

```json
{
  "id": 1,
  "bundle_name": "CM2 Complete Bundle",
  "bundle_description": "All materials for CM2 exam preparation",
  "subject_code": "CM2",
  "subject_name": "Financial Mathematics",
  "is_featured": true,
  "is_active": true,
  "display_order": 1,
  "components": [
    {
      "id": 1,
      "product": {"id": 1, "shortname": "CM2 Core", "fullname": "CM2 Core Study Materials", "code": "CM2-CSM"},
      "product_variation": {"id": 1, "name": "eBook", "variation_type": "digital"},
      "default_price_type": "standard",
      "quantity": 1,
      "sort_order": 1,
      "is_active": true
    }
  ],
  "components_count": 3,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

---

## ExamSessionSubjectBundleProductSerializer

**Location**: `catalog/serializers/bundle_serializers.py`
**Model**: `exam_sessions_subjects_products.models.ExamSessionSubjectBundleProduct`

### Fields

| Field | Type | Read-Only | Source | Description |
|-------|------|-----------|--------|-------------|
| id | integer | Yes | auto | Primary key |
| product | object | Yes | computed | Nested product info |
| product_variation | object | Yes | computed | Nested variation info |
| exam_session_product_code | string | Yes | computed | ESSP variation code |
| exam_session_product_id | integer | Yes | computed | ESSP ID |
| default_price_type | string | No | default_price_type | Default pricing |
| quantity | integer | No | quantity | Quantity |
| sort_order | integer | No | sort_order | Display order |
| is_active | boolean | No | is_active | Active status |
| prices | array | Yes | computed | List of prices |

### Nested Product Object

```json
{
  "id": 1,
  "shortname": "CM2 Core",
  "fullname": "CM2 Core Study Materials",
  "code": "CM2-CSM"
}
```

### Nested Product Variation Object

```json
{
  "id": 1,
  "name": "eBook",
  "variation_type": "digital",
  "description_short": "Digital format"
}
```

### Prices Array

```json
[
  {
    "id": 1,
    "price_type": "standard",
    "amount": "99.99",
    "currency": "GBP"
  },
  {
    "id": 2,
    "price_type": "discounted",
    "amount": "84.99",
    "currency": "GBP"
  }
]
```

---

## ExamSessionSubjectBundleSerializer

**Location**: `catalog/serializers/bundle_serializers.py`
**Model**: `exam_sessions_subjects_products.models.ExamSessionSubjectBundle`

### Fields

| Field | Type | Read-Only | Source | Description |
|-------|------|-----------|--------|-------------|
| id | integer | Yes | auto | Primary key |
| bundle_name | string | Yes | effective_name | Effective bundle name |
| bundle_description | string | Yes | effective_description | Effective description |
| subject_code | string | Yes | exam_session_subject.subject.code | Subject code |
| subject_name | string | Yes | exam_session_subject.subject.name | Subject name |
| exam_session_code | string | Yes | exam_session_subject.exam_session.session_code | Session code |
| master_bundle_id | integer | Yes | bundle.id | Master bundle reference |
| components | array | Yes | bundle_products | Bundle components |
| components_count | integer | Yes | computed | Active count |
| is_featured | boolean | Yes | bundle.is_featured | Featured flag |
| is_active | boolean | No | is_active | Active status |
| display_order | integer | No | display_order | Sort order |
| created_at | datetime | Yes | created_at | Creation timestamp |
| updated_at | datetime | Yes | updated_at | Last update timestamp |

### Example Output

```json
{
  "id": 1,
  "bundle_name": "CM2 April 2026 Bundle",
  "bundle_description": "All materials for CM2 April 2026 exam",
  "subject_code": "CM2",
  "subject_name": "Financial Mathematics",
  "exam_session_code": "2026-04",
  "master_bundle_id": 1,
  "is_featured": true,
  "is_active": true,
  "display_order": 1,
  "components": [...],
  "components_count": 3,
  "created_at": "2025-12-01T00:00:00Z",
  "updated_at": "2025-12-01T00:00:00Z"
}
```

---

## Backward Compatibility Contract

### Import Paths

Legacy import paths MUST continue to work:

```python
# Legacy imports (must work)
from subjects.serializers import SubjectSerializer
from exam_sessions.serializers import ExamSessionSerializer
from products.serializers import ProductSerializer, ProductBundleSerializer

# New canonical imports
from catalog.serializers import SubjectSerializer
from catalog.serializers import ExamSessionSerializer
from catalog.serializers import ProductSerializer, ProductBundleSerializer
```

### Response Format Contract

All API responses MUST maintain identical JSON structure. Use snapshot testing to verify:

```python
def test_subject_response_format_unchanged(self):
    """Verify catalog endpoint returns same format as legacy."""
    legacy_response = self.client.get('/api/subjects/subjects/')
    catalog_response = self.client.get('/api/catalog/subjects/')

    self.assertEqual(legacy_response.json(), catalog_response.json())
```
