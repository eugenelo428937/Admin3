# API Contracts: New Session Setup Wizard

**Branch**: `20260218-new-session-setup`
**Date**: 2026-02-18

## Existing Endpoints Used (No Changes)

These endpoints already exist and are used by the wizard steps:

### Step 1: Create Exam Session

```
POST /api/catalog/exam-sessions/
Authorization: Bearer <JWT> (superuser)

Request:
{
  "session_code": "2026-09",
  "start_date": "2026-09-01T00:00:00Z",
  "end_date": "2026-12-31T23:59:59Z"
}

Response 201:
{
  "id": 42,
  "session_code": "2026-09",
  "start_date": "2026-09-01T00:00:00Z",
  "end_date": "2026-12-31T23:59:59Z",
  "created_at": "2026-02-18T10:00:00Z",
  "updated_at": "2026-02-18T10:00:00Z"
}

Response 400:
{
  "end_date": ["End date must be after start date."]
}
```

### Step 2: Fetch Active Subjects

```
GET /api/catalog/admin-subjects/?active=true
Authorization: Bearer <JWT> (superuser)

Response 200:
[
  { "id": 1, "code": "CB1", "description": "Business Finance", "active": true },
  { "id": 2, "code": "CB2", "description": "Business Economics", "active": true },
  ...
]
```

### Step 2: Fetch Previous Session's Subjects

```
GET /api/catalog/exam-session-subjects/?exam_session=<prev_session_id>
Authorization: Bearer <JWT> (superuser)

Response 200:
{
  "results": [
    { "id": 101, "exam_session": 41, "subject": 1, "is_active": true },
    { "id": 102, "exam_session": 41, "subject": 2, "is_active": true },
    ...
  ],
  "count": 30
}
```

### Step 2: Create Exam Session Subject (bulk)

```
POST /api/catalog/exam-session-subjects/
Authorization: Bearer <JWT> (superuser)

Request:
{
  "exam_session": 42,
  "subject": 1,
  "is_active": true
}

Response 201:
{
  "id": 201,
  "exam_session": 42,
  "subject": 1,
  "is_active": true
}
```

Note: Step 2 calls this endpoint once per assigned subject.
An alternative is to create a bulk endpoint; decision deferred to
task planning phase.

### Step 2: Fetch Previous Session

```
GET /api/catalog/exam-sessions/?ordering=-id&page_size=2
Authorization: Bearer <JWT> (superuser)

Response 200:
{
  "results": [
    { "id": 42, "session_code": "2026-09", ... },
    { "id": 41, "session_code": "2026-04", ... }
  ],
  "count": 10
}
```

The second result (excluding the newly created session) is the
"previous session".

---

## New Endpoint: Step 3 Copy/Create Operation

### POST /api/catalog/session-setup/copy-products/

Copies products, prices from the previous session and creates bundles
from catalog templates. Executes as an atomic transaction.

**Permission**: `IsSuperUser`

```
POST /api/catalog/session-setup/copy-products/
Authorization: Bearer <JWT> (superuser)
Content-Type: application/json

Request:
{
  "new_exam_session_id": 42,
  "previous_exam_session_id": 41
}

Response 201 (Success):
{
  "products_created": 95,
  "prices_created": 285,
  "bundles_created": 28,
  "bundle_products_created": 142,
  "skipped_subjects": ["SP9"],
  "message": "Successfully created 95 products, 285 prices,
              and 28 bundles for session 2026-09."
}

Response 400 (Validation Error):
{
  "error": "No exam session subjects found for session 42.
            Complete Step 2 first."
}

Response 400 (No Previous Products):
{
  "products_created": 0,
  "prices_created": 0,
  "bundles_created": 0,
  "bundle_products_created": 0,
  "skipped_subjects": [],
  "message": "No active products found in previous session
              2026-04 to copy."
}

Response 500 (Transaction Failure):
{
  "error": "Copy operation failed: [error details].
            All changes have been rolled back.
            You may retry the operation."
}
```

#### Request Validation

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| new_exam_session_id | integer | yes | must exist, must have ESS records |
| previous_exam_session_id | integer | yes | must exist |

#### Business Rules

1. Only active products (`is_active=True`) from previous session
   are copied
2. Tutorial variation types are excluded from the copy
3. Products whose subjects are not assigned to the new session
   are skipped (FR-012)
4. Product codes auto-generate on save (no manual code input)
5. Prices are copied with exact amounts and currency
6. Bundles are created from catalog templates, not copied from
   previous store bundles
7. Entire operation is wrapped in `transaction.atomic()` (FR-017)

#### Idempotency

This endpoint is NOT idempotent. Calling it twice for the same
session will fail on unique constraint violations (ess + ppv for
products, bundle_template + ess for bundles). The frontend should
disable the "Proceed" button after a successful call.

---

## Frontend Service Contract

### sessionSetupService.js

```javascript
const sessionSetupService = {
  /**
   * Get the previous exam session (most recently created
   * before the given session).
   * @param {number} currentSessionId
   * @returns {Promise<Object|null>} Previous session or null
   */
  getPreviousSession: async (currentSessionId) => { },

  /**
   * Copy products, prices, and create bundles from
   * previous session.
   * @param {number} newSessionId
   * @param {number} previousSessionId
   * @returns {Promise<Object>} Summary with counts
   */
  copyProducts: async (newSessionId, previousSessionId) => { },

  /**
   * Get subjects assigned to a specific exam session.
   * @param {number} sessionId
   * @returns {Promise<Array>} List of ESS records
   */
  getSessionSubjects: async (sessionId) => { },
};
```
