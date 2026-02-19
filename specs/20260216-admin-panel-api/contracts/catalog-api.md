# API Contract: Catalog Admin Endpoints

**Branch**: `20260216-admin-panel-api` | **Base URL**: `/api/catalog/`

All endpoints follow the existing catalog permission pattern:
- **Read (GET)**: `AllowAny`
- **Write (POST/PUT/PATCH/DELETE)**: `IsSuperUser`

---

## `GET /api/catalog/exam-session-subjects/`

List all exam session subject pairings.

**Response 200**:
```json
[
  {
    "id": 1,
    "exam_session": 1,
    "subject": 1,
    "is_active": true,
    "created_at": "2026-02-16T10:00:00Z",
    "updated_at": "2026-02-16T10:00:00Z"
  }
]
```

## `POST /api/catalog/exam-session-subjects/`

Create a new exam session subject pairing.

**Request**:
```json
{
  "exam_session": 1,
  "subject": 1,
  "is_active": true
}
```

**Response 201**: Created object (same as GET item format)
**Response 400**: `{"exam_session": [...], "subject": [...]}` or unique constraint error
**Response 403**: `{"detail": "You do not have permission to perform this action."}`

## `GET /api/catalog/exam-session-subjects/{id}/`

Retrieve a single exam session subject.

**Response 200**: Single object (same as list item format)
**Response 404**: `{"detail": "Not found."}`

## `PUT /api/catalog/exam-session-subjects/{id}/`

Update an exam session subject.

**Request**: Same as POST
**Response 200**: Updated object
**Response 400/403/404**: Standard DRF errors

## `DELETE /api/catalog/exam-session-subjects/{id}/`

Delete an exam session subject.

**Response 204**: No content
**Response 400**: `{"error": "Cannot delete: record has dependent records", "dependents": [...]}`
**Response 403/404**: Standard DRF errors

---

## `GET /api/catalog/product-variations/`

List all product variations.

**Response 200**:
```json
[
  {
    "id": 1,
    "variation_type": "Printed",
    "name": "Standard Print",
    "description": "Full printed study material",
    "description_short": "Printed material",
    "code": "PC"
  }
]
```

## `POST /api/catalog/product-variations/`

**Request**:
```json
{
  "variation_type": "Printed",
  "name": "Standard Print",
  "description": "Full printed study material",
  "description_short": "Printed material",
  "code": "PC"
}
```

**Response 201/400/403**: Standard patterns

## `GET/PUT/DELETE /api/catalog/product-variations/{id}/`

Standard CRUD — same patterns as above.

---

## `GET /api/catalog/product-product-variations/`

List all product-to-variation mappings.

**Response 200**:
```json
[
  {
    "id": 1,
    "product": 1,
    "product_variation": 1
  }
]
```

## `POST /api/catalog/product-product-variations/`

**Request**:
```json
{
  "product": 1,
  "product_variation": 1
}
```

**Response 201/400/403**: Standard patterns

## `GET/PUT/DELETE /api/catalog/product-product-variations/{id}/`

Standard CRUD.

---

## `GET /api/catalog/product-bundles/`

List all product bundles.

**Response 200**:
```json
[
  {
    "id": 1,
    "bundle_name": "CM2 Complete Bundle",
    "subject": 1,
    "bundle_description": "All CM2 study materials",
    "is_featured": true,
    "is_active": true,
    "display_order": 0,
    "created_at": "2026-02-16T10:00:00Z",
    "updated_at": "2026-02-16T10:00:00Z"
  }
]
```

## `POST /api/catalog/product-bundles/`

**Request**:
```json
{
  "bundle_name": "CM2 Complete Bundle",
  "subject": 1,
  "bundle_description": "All CM2 study materials",
  "is_featured": true,
  "is_active": true,
  "display_order": 0
}
```

**Response 201/400/403**: Standard patterns

## `GET/PUT/DELETE /api/catalog/product-bundles/{id}/`

Standard CRUD. DELETE returns 400 if store bundles reference this template.

---

## `GET /api/catalog/bundle-products/`

List bundle products. Supports `?bundle={id}` filter.

**Response 200**:
```json
[
  {
    "id": 1,
    "bundle": 1,
    "product_product_variation": 1,
    "default_price_type": "standard",
    "quantity": 1,
    "sort_order": 0,
    "is_active": true,
    "created_at": "2026-02-16T10:00:00Z",
    "updated_at": "2026-02-16T10:00:00Z"
  }
]
```

## `POST /api/catalog/bundle-products/`

**Request**:
```json
{
  "bundle": 1,
  "product_product_variation": 1,
  "default_price_type": "standard",
  "quantity": 1,
  "sort_order": 0,
  "is_active": true
}
```

**Response 201/400/403**: Standard patterns

## `GET/PUT/DELETE /api/catalog/bundle-products/{id}/`

Standard CRUD.

---

## `GET /api/catalog/recommendations/`

List all product variation recommendations.

**Response 200**:
```json
[
  {
    "id": 1,
    "product_product_variation": 1,
    "recommended_product_product_variation": 2,
    "created_at": "2026-02-16T10:00:00Z",
    "updated_at": "2026-02-16T10:00:00Z"
  }
]
```

## `POST /api/catalog/recommendations/`

**Request**:
```json
{
  "product_product_variation": 1,
  "recommended_product_product_variation": 2
}
```

**Response 201**: Created
**Response 400**: Self-reference error, circular reference error, or unique constraint violation
**Response 403**: Standard

## `GET/PUT/DELETE /api/catalog/recommendations/{id}/`

Standard CRUD with same validation rules.
