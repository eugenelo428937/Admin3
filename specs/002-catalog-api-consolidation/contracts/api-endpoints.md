# API Endpoint Contracts

**Feature**: Catalog API Consolidation
**Date**: 2026-01-06
**Version**: 1.0

## Overview

This document defines the API endpoint contracts for the consolidated catalog API. All endpoints support both new `/api/catalog/` prefix and backward-compatible legacy paths.

---

## Subject Endpoints

### List Subjects

```
GET /api/catalog/subjects/
GET /api/subjects/subjects/  (legacy, delegates to catalog)
```

**Permission**: AllowAny

**Query Parameters**: None

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "code": "CM2",
    "description": "Financial Mathematics",
    "name": "Financial Mathematics"
  }
]
```

**Caching**: 5 minutes (`subjects_list_v1`)

**Notes**:
- Only returns `active=True` subjects
- Ordered by `code` ascending
- `name` field is alias for `description` (frontend compatibility)

---

### Retrieve Subject

```
GET /api/catalog/subjects/{id}/
GET /api/subjects/subjects/{id}/  (legacy)
```

**Permission**: AllowAny

**Response**: `200 OK`
```json
{
  "id": 1,
  "code": "CM2",
  "description": "Financial Mathematics",
  "name": "Financial Mathematics"
}
```

---

### Create Subject

```
POST /api/catalog/subjects/
```

**Permission**: IsSuperUser

**Request Body**:
```json
{
  "code": "CM3",
  "description": "Risk Modelling",
  "active": true
}
```

**Response**: `201 Created`
```json
{
  "id": 42,
  "code": "CM3",
  "description": "Risk Modelling",
  "name": "Risk Modelling"
}
```

**Validation**:
- `code`: Required, unique, max 10 chars
- `description`: Required, max 255 chars

---

### Update Subject

```
PUT /api/catalog/subjects/{id}/
PATCH /api/catalog/subjects/{id}/
```

**Permission**: IsSuperUser

**Response**: `200 OK`

---

### Delete Subject

```
DELETE /api/catalog/subjects/{id}/
```

**Permission**: IsSuperUser

**Response**: `204 No Content`

---

### Bulk Import Subjects

```
POST /api/catalog/subjects/bulk-import/
POST /api/subjects/subjects/bulk-import/  (legacy)
```

**Permission**: AllowAny (existing behavior)

**Request Body**:
```json
{
  "subjects": [
    {"code": "CM3", "description": "Risk Modelling"},
    {"code": "CM4", "description": "Actuarial Practice"}
  ]
}
```

**Response**: `201 Created` (if any created) or `400 Bad Request` (if all failed)
```json
{
  "message": "Successfully imported 2 subjects",
  "created": [
    {"id": 42, "code": "CM3", "description": "Risk Modelling", "name": "Risk Modelling"},
    {"id": 43, "code": "CM4", "description": "Actuarial Practice", "name": "Actuarial Practice"}
  ],
  "errors": []
}
```

---

## Exam Session Endpoints

### List Exam Sessions

```
GET /api/catalog/exam-sessions/
GET /api/exam-sessions/  (legacy)
```

**Permission**: AllowAny

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "session_code": "2026-04",
    "start_date": "2026-04-01",
    "end_date": "2026-04-15",
    "create_date": "2025-12-01T10:00:00Z",
    "modified_date": "2025-12-01T10:00:00Z"
  }
]
```

---

### Retrieve Exam Session

```
GET /api/catalog/exam-sessions/{id}/
GET /api/exam-sessions/{id}/  (legacy)
```

**Permission**: AllowAny

**Response**: `200 OK`
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

---

### Create/Update/Delete Exam Session

```
POST /api/catalog/exam-sessions/
PUT /api/catalog/exam-sessions/{id}/
PATCH /api/catalog/exam-sessions/{id}/
DELETE /api/catalog/exam-sessions/{id}/
```

**Permission**: IsSuperUser

---

## Product Endpoints

### List Products

```
GET /api/catalog/products/
GET /api/products/products/  (legacy)
```

**Permission**: AllowAny

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `group` | int/str | Filter by group ID or name |
| `tutorial_format` | str | Filter by tutorial format group name |
| `variation` | int | Filter by variation ID |
| `distance_learning` | bool | Filter to distance learning groups |
| `tutorial` | bool | Filter to tutorial products (excludes Online Classroom) |

**Response**: `200 OK`
```json
[
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
      }
    ],
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
    "is_active": true,
    "buy_both": false
  }
]
```

---

### Retrieve Product

```
GET /api/catalog/products/{id}/
GET /api/products/products/{id}/  (legacy)
```

**Permission**: AllowAny

---

### Create/Update/Delete Product

```
POST /api/catalog/products/
PUT /api/catalog/products/{id}/
PATCH /api/catalog/products/{id}/
DELETE /api/catalog/products/{id}/
```

**Permission**: IsSuperUser

---

### Bulk Import Products

```
POST /api/catalog/products/bulk-import/
POST /api/products/products/bulk-import/  (legacy)
```

**Permission**: AllowAny (existing behavior)

**Request Body**:
```json
{
  "products": [
    {
      "fullname": "CM2 Core Study Materials",
      "shortname": "CM2 Core",
      "code": "CM2-CSM",
      "is_active": true
    }
  ]
}
```

**Response**: `201 Created` or `400 Bad Request`
```json
{
  "created": [...],
  "errors": [...]
}
```

---

### Get Bundle Contents

```
GET /api/catalog/products/{bundle_id}/bundle-contents/
GET /api/products/products/{bundle_id}/bundle-contents/  (legacy)
```

**Permission**: AllowAny

**Response**: `200 OK`
```json
{
  "bundle_product": {
    "id": 1,
    "name": "CM2 Complete Bundle",
    "subject_code": "CM2",
    "metadata": {
      "estimated_savings_percentage": "15.00",
      "estimated_savings_amount": "50.00",
      "bundle_description": "All CM2 materials",
      "marketing_tagline": "Save 15%",
      "is_featured": true
    }
  },
  "components": [
    {
      "id": 1,
      "fullname": "CM2 Core Study Materials",
      "shortname": "CM2 Core",
      "bundle_info": {
        "default_price_type": "standard",
        "quantity": 1,
        "sort_order": 1,
        "variation_id": 1,
        "variation_name": "eBook"
      }
    }
  ],
  "total_components": 3
}
```

---

### Get Bundles

```
GET /api/catalog/products/bundles/
GET /api/products/products/bundles/  (legacy)
```

**Permission**: AllowAny

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `subject` | str | Filter by subject code |
| `exam_session` | str | Filter by exam session code |
| `type` | str | "master", "exam_session", or "all" (default) |
| `featured` | bool | Only featured bundles |

**Response**: `200 OK`
```json
{
  "results": [
    {
      "id": 1,
      "bundle_name": "CM2 Complete Bundle",
      "bundle_description": "All materials for CM2",
      "subject_code": "CM2",
      "subject_name": "Financial Mathematics",
      "is_featured": true,
      "is_active": true,
      "display_order": 1,
      "components": [...],
      "components_count": 3,
      "bundle_type": "master",
      "exam_session_code": null
    }
  ],
  "count": 1,
  "filters_applied": {
    "subject_code": null,
    "exam_session": null,
    "bundle_type": "all",
    "featured_only": false
  }
}
```

---

## Bundle Endpoints (ExamSessionSubjectBundle)

### List Bundles

```
GET /api/catalog/bundles/
GET /api/products/bundles/  (legacy)
```

**Permission**: AllowAny

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `exam_session` | str | Filter by exam session code |
| `subject` | str | Filter by subject code |

**Response**: `200 OK`
```json
{
  "results": [
    {
      "id": 1,
      "bundle_id": 1,
      "bundle_name": "CM2 April 2026 Bundle",
      "subject_code": "CM2",
      "exam_session_code": "2026-04",
      "bundle_description": "All materials for CM2 April 2026",
      "is_featured": true,
      "display_order": 1,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

---

### Retrieve Bundle

```
GET /api/catalog/bundles/{id}/
GET /api/products/bundles/{id}/  (legacy)
```

**Permission**: AllowAny

**Response**: `200 OK`
```json
{
  "bundle_product": {
    "id": 1,
    "bundle_id": 1,
    "name": "CM2 April 2026 Bundle",
    "subject_code": "CM2",
    "exam_session_code": "2026-04",
    "metadata": {
      "bundle_description": "All materials for CM2 April 2026",
      "is_featured": true,
      "exam_session_code": "2026-04"
    }
  },
  "components": [
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
        "variation_type": "digital",
        "description_short": "Digital format"
      },
      "exam_session_product_code": "CM2-CSM-2026-04",
      "exam_session_product_id": 123,
      "default_price_type": "standard",
      "quantity": 1,
      "sort_order": 1,
      "is_active": true,
      "prices": [
        {
          "id": 1,
          "price_type": "standard",
          "amount": "99.99",
          "currency": "GBP"
        }
      ]
    }
  ],
  "total_components": 3
}
```

---

## Navigation Endpoints

### Navigation Data (Combined)

```
GET /api/catalog/navigation-data/
GET /api/products/navigation-data/  (legacy)
```

**Permission**: AllowAny

**Response**: `200 OK`
```json
{
  "subjects": [
    {"id": 1, "code": "CM2", "description": "Financial Mathematics", "name": "Financial Mathematics", "active": true}
  ],
  "navbar_product_groups": {
    "results": [
      {"id": 1, "name": "Core Study Materials", "products": [...]}
    ]
  },
  "distance_learning_dropdown": {
    "results": [
      {"id": 1, "name": "Core Study Materials", "products": [...]}
    ]
  },
  "tutorial_dropdown": {
    "results": {
      "Location": {"left": [...], "right": [...]},
      "Format": [...],
      "Online Classroom": [...]
    }
  }
}
```

**Caching**: 5 minutes (`navigation_data_v2`)

---

## Search Endpoints

### Fuzzy Search

```
GET /api/catalog/search/?q={query}
GET /api/products/search/?q={query}  (legacy)
```

**Permission**: AllowAny

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | str | Yes | Search query |

**Response**: `200 OK`
```json
{
  "suggested_filters": {
    "subjects": [...],
    "product_groups": [...],
    "variations": [...],
    "products": [...]
  },
  "suggested_products": [...],
  "query": "CM2",
  "total_matches": {
    "subjects": 1,
    "product_groups": 0,
    "variations": 0,
    "products": 5
  }
}
```

---

### Advanced Product Search

```
GET /api/catalog/advanced-search/
GET /api/products/advanced-search/  (legacy)
```

**Permission**: AllowAny

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | str | Search query |
| `subjects` | list | Subject codes |
| `groups` | list | Group IDs |
| `variations` | list | Variation IDs |
| `products` | list | Product IDs |
| `page` | int | Page number (default: 1) |
| `page_size` | int | Items per page (default: 20) |

**Response**: `200 OK`
```json
{
  "results": [...],
  "count": 100,
  "page": 1,
  "page_size": 20,
  "has_next": true,
  "has_previous": false,
  "query": "materials",
  "applied_filters": {
    "subjects": ["CM2"],
    "groups": [],
    "variations": [],
    "products": []
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "code": ["This field is required."],
  "description": ["This field may not be blank."]
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process request: {error_message}"
}
```
