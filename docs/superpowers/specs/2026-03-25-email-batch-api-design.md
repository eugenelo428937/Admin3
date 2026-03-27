# Email Batch API Design

**Date**: 2026-03-25
**Status**: Approved

## Overview

External systems need to send bulk emails through Admin3's email infrastructure. This design adds a batch email API that accepts a list of recipients with per-item payloads, queues them through the existing EmailQueue pipeline, tracks batch-level status, and sends a completion notification to the requesting staff member.

## Requirements

- External system authenticates via dedicated API key (`X-Api-Key` header)
- `send_email_batch` endpoint accepts a template ID and list of email items
- Each item specifies: `to_email`, `cc_email` (array), `subject_override` (with payload variable substitution), and `payload`
- Request includes `requested_by` (string) and `notify_email` (completion notification recipient)
- Creates an `EmailBatch` record containing `EmailQueue` entries
- After all batch emails reach a terminal state (sent or failed), a completion notification email is sent to `notify_email`
- `query_email_batch` endpoint returns batch status with sent/error breakdowns
- Batch size is configurable via `EmailSettings`
- Subject override variables resolve from the item's `payload` object (e.g., `{firstname}` pulls from `payload.firstname`)
- CC field supports multiple addresses (array)
- Completion notification uses a customizable `EmailTemplate` (type: `batch_completion_report`)

## Approach

**Approach A (chosen)**: New `EmailBatch` model + optional FK on existing `EmailQueue`. Batch items are regular queue entries processed by the existing `process_email_queue` command. Batch is a grouping layer only — no new processing pipeline.

**Rejected alternatives**:
- *Separate `EmailBatchItem` model*: Duplicates queue/retry/sending logic. Two pipelines to maintain.
- *Tags/metadata on EmailQueue*: No dedicated batch record for status, requester, or notification config. Fragile completion detection.

## Data Models

### `ExternalApiKey`

New model for API key authentication.

| Field | Type | Notes |
|-------|------|-------|
| `key` | UUID | Auto-generated, unique |
| `name` | CharField | Display name (e.g., "Administrate System") |
| `is_active` | BooleanField | Default True |
| `created_at` | DateTimeField | Auto |
| `last_used_at` | DateTimeField | Nullable, updated on each request |

Table: `utils_external_api_key`

### `EmailBatch`

New model for batch tracking.

| Field | Type | Notes |
|-------|------|-------|
| `batch_id` | UUIDField | Primary key, auto-generated |
| `template` | FK → EmailTemplate | The email template used |
| `requested_by` | CharField | Who initiated the batch |
| `notify_email` | EmailField | Completion notification recipient |
| `status` | CharField | `pending`, `processing`, `completed`, `completed_with_errors`, `failed` |
| `total_items` | IntegerField | Total items in batch |
| `sent_count` | IntegerField | Default 0 |
| `error_count` | IntegerField | Default 0 |
| `created_at` | DateTimeField | Auto |
| `completed_at` | DateTimeField | Nullable |
| `api_key` | FK → ExternalApiKey | Which API key was used |

Table: `utils_email_batch`

### `EmailQueue` changes

Add one optional field:

| Field | Type | Notes |
|-------|------|-------|
| `batch` | FK → EmailBatch | null=True, blank=True |

No other changes to the existing EmailQueue model.

### `EmailTemplate` changes

Add `batch_completion_report` to `template_type` choices. A default template is created via data migration.

## API Endpoints

### Authentication

Custom `ExternalApiKeyAuthentication` class:
- Reads `X-Api-Key` header
- Validates against `ExternalApiKey` model (must be active)
- Updates `last_used_at`
- Returns 401 for invalid/inactive keys

### `POST /api/email/batch/send/`

**Auth**: API key required

**Request**:
```json
{
    "template_id": 9,
    "requested_by": "Eugene Lo",
    "notify_email": "eugene@example.com",
    "items": [
        {
            "to_email": "abc123@gmail.com",
            "cc_email": ["abc123999@outlook.com"],
            "subject_override": "Email subject to display {variable_1}",
            "payload": {
                "ref": "12345",
                "firstname": "Eugene",
                "lastname": "Lo"
            }
        }
    ]
}
```

**Response** (200):
```json
{
    "batch": {
        "batch_id": "2f1a0d74-7535-4677-9445-c565daf39526",
        "items": [
            {
                "to_email": "abc123@gmail.com",
                "queue_id": "6c47acbc-2312-4382-9229-acf8ac241f03",
                "is_success": true,
                "error_response": {}
            }
        ]
    }
}
```

**Validation**:
- Invalid `template_id` → 400, reject entire request
- Batch size exceeds configured limit → 400, reject entire request
- Invalid `to_email` format on an item → that item gets `is_success: false`, rest proceed
- Invalid/inactive API key → 401

**Processing**:
1. Validate template exists and is active
2. Validate item count against `batch_max_items` setting
3. Create `EmailBatch` record (status: `pending`)
4. For each item:
   - Validate `to_email` format
   - Resolve `subject_override` variables from `payload`
   - Create `EmailQueue` entry linked to the batch
5. Update batch status to `processing`
6. Return response with per-item results

### `POST /api/email/batch/query/`

**Auth**: API key required

**Request**:
```json
{
    "batch_id": "2f1a0d74-7535-4677-9445-c565daf39526"
}
```

**Response** (200):
```json
{
    "batch_id": "2f1a0d74-7535-4677-9445-c565daf39526",
    "is_success": true,
    "sent_items": ["email1@abc.com", "email2@asdf.com"],
    "error_items": [
        {
            "to_email": "abc123@gmail.com",
            "cc_email": ["abc123999@outlook.com"],
            "attempts": 3,
            "error_response": {
                "error_code": "500",
                "error_message": "some error has occurred"
            }
        }
    ]
}
```

- `is_success` is `true` only when all items sent successfully
- API key can only query batches created with the same key

### URL routing

Both endpoints added to existing `email_system/urls.py` under `/api/email/batch/`.

## Batch Processing & Completion

### Processing

No new processing pipeline. Batch emails are regular `EmailQueue` entries — the existing `process_email_queue` command sends them. The `batch` FK is just a grouping reference.

### Completion Detection

After `process_queue_item()` marks an item as sent or failed, if the item has a `batch` FK, call `_check_batch_completion(batch_id)`:
- Query all queue entries for this batch
- If all are in a terminal state (`sent` or `failed`), trigger completion flow

### Completion Flow

1. Update `EmailBatch.status` to `completed` or `completed_with_errors`
2. Set `sent_count` and `error_count` from batch queue entries
3. Set `completed_at` timestamp
4. Queue a notification email to `notify_email` using the `batch_completion_report` EmailTemplate

### Notification Template Context

The completion notification email receives this context:
- `requested_by`, `batch_id`
- `total_items`, `sent_count`, `error_count`
- `error_items` list (to_email, attempts, error details)

## Error Handling & Edge Cases

### Validation errors at submission
- Invalid `template_id` → reject entire request (400)
- Invalid `to_email` format on an item → that item gets `is_success: false`, rest proceed
- Batch size exceeds configured limit → reject entire request (400)
- Invalid/inactive API key → 401

### Retry behavior
Handled entirely by existing EmailQueue retry logic (`max_attempts`, `schedule_retry()`). No batch-specific retry logic.

### Partial failure
- Some items sent, some failed → batch status: `completed_with_errors`
- All items failed → batch status: `failed`
- Notification email sent regardless with full breakdown

### Duplicate prevention
No uniqueness constraint on batch items. Same email can appear in multiple batches or twice in one batch. The external system is responsible for deduplication.

### Notification email failure
If the completion notification itself fails to send, it goes through normal queue retry. No special handling.

## Configuration & Admin

### EmailSettings
- `batch_max_items` — max items per batch request (default: 500, type: `queue`)

### Django Admin
- **ExternalApiKey**: list view with name, key (masked), is_active, last_used_at. Staff can create/deactivate keys.
- **EmailBatch**: read-only list view with batch_id, template, requested_by, status, total/sent/error counts, created_at, completed_at. Link to filtered EmailQueue entries for that batch.

### New EmailTemplate type
`batch_completion_report` added to template_type choices. Default template created via data migration.

## Staff Laptop Setup Guide

### Prerequisites

- Network access to the Admin3 server (e.g., VPN connected)
- An API key created by a superuser (see below)
- A tool to make HTTP requests: **curl** (built-in), **Postman**, or **Python + requests**

### Step 1: Create an API Key

A Django superuser runs the management command on the server:

```bash
cd backend/django_Admin3
python manage.py create_api_key --name "Staff Laptop - Eugene"
```

Output:
```
API Key created successfully!
Name:   Staff Laptop - Eugene
Active: True
Key:    a1b2c3d4e5f6g7h8i9j0kLmNoPqRsTuVwXyZ_abc1234567890
```

**Save the key immediately** — it is displayed only once and cannot be recovered. If lost, create a new key and deactivate the old one via Django Admin.

To create an initially inactive key (e.g., for pre-provisioning):

```bash
python manage.py create_api_key --name "CI Pipeline" --inactive
```

### Step 2: Send a Batch Email

**With curl:**
```bash
curl -X POST http://SERVER:8888/api/email/batch/send/ \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_KEY_HERE" \
  -d '{
    "template_id": 9,
    "requested_by": "Eugene Lo",
    "notify_email": "eugene@example.com",
    "items": [
      {
        "to_email": "student1@example.com",
        "cc_email": ["manager@example.com"],
        "subject_override": "Hello {firstname}",
        "payload": {"firstname": "Alice", "lastname": "Smith"}
      },
      {
        "to_email": "student2@example.com",
        "payload": {"firstname": "Bob", "lastname": "Jones"}
      }
    ]
  }'
```

**With Python:**
```python
import requests

response = requests.post(
    'http://SERVER:8888/api/email/batch/send/',
    headers={'X-Api-Key': 'YOUR_KEY_HERE'},
    json={
        'template_id': 9,
        'requested_by': 'Eugene Lo',
        'notify_email': 'eugene@example.com',
        'items': [
            {
                'to_email': 'student1@example.com',
                'cc_email': ['manager@example.com'],
                'subject_override': 'Hello {firstname}',
                'payload': {'firstname': 'Alice', 'lastname': 'Smith'},
            },
            {
                'to_email': 'student2@example.com',
                'payload': {'firstname': 'Bob', 'lastname': 'Jones'},
            },
        ],
    },
)
print(response.status_code)  # 201 on success
data = response.json()
print(data['batch']['batch_id'])  # Save this to check status later
```

### Step 3: Check Batch Status

**With curl:**
```bash
curl http://SERVER:8888/api/email/batch/BATCH_ID_HERE/ \
  -H "X-Api-Key: YOUR_KEY_HERE"
```

**With Python:**
```python
status = requests.get(
    f'http://SERVER:8888/api/email/batch/{batch_id}/',
    headers={'X-Api-Key': 'YOUR_KEY_HERE'},
)
print(status.json())
# {'batch_id': '...', 'status': 'completed', 'total_items': 2, 'sent_count': 2, 'error_count': 0, ...}
```

### Step 4: Find Available Template IDs

Staff can browse email templates in Django Admin:
```
http://SERVER:8888/admin/email_system/emailtemplate/
```

Each template has an **ID** (used as `template_id`) and **payload variables** documented in its description.

### Quick Reference

| Item | Value |
|------|-------|
| Auth header | `X-Api-Key: <your-key>` |
| Send endpoint | `POST /api/email/batch/send/` |
| Query endpoint | `GET /api/email/batch/{batch_id}/` |
| Max items per batch | 500 (configurable) |
| Key management | Django Admin → External API Keys |
| Batch monitoring | Django Admin → Email Batches |

### Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| 401 `Invalid API key` | Key not found in database | Verify key was copied correctly; check Django Admin for the key prefix |
| 401 `API key is inactive` | Key has been deactivated | Ask a superuser to reactivate it in Django Admin |
| 400 `Invalid template_id` | Template doesn't exist or is inactive | Check available templates in Django Admin |
| 400 `Batch size exceeds limit` | More than 500 items | Split into multiple batch requests |
| Connection refused | Server not reachable | Check VPN connection and server URL |

### Key Management via Django Admin

Superusers can manage API keys at:
```
http://SERVER:8888/admin/email_system/externalapikey/
```

- **View**: See all keys with name, prefix, active status, and last used timestamp
- **Deactivate**: Uncheck `is_active` to revoke a key without deleting it
- **Audit**: `last_used_at` shows when each key was last used

> **Note**: New keys cannot be created through Django Admin because the raw key is never stored. Always use the `create_api_key` management command.

## Files to Create/Modify

### New files
- `email_system/models/batch.py` — EmailBatch model
- `email_system/models/api_key.py` — ExternalApiKey model
- `email_system/authentication.py` — ExternalApiKeyAuthentication class
- `email_system/services/batch_service.py` — EmailBatchService (send, query, completion check)
- `email_system/serializers/batch_serializers.py` — Request/response serializers
- `email_system/views/batch_views.py` — send_email_batch, query_email_batch views
- Migration file for new models + EmailQueue FK

### Modified files
- `email_system/models/__init__.py` — export new models
- `email_system/models/queue.py` — add optional `batch` FK
- `email_system/models/template.py` — add `batch_completion_report` to template_type choices
- `email_system/urls.py` — add batch endpoints
- `email_system/admin.py` — register ExternalApiKey and EmailBatch
- `email_system/services/queue_service.py` — add `_check_batch_completion()` call after processing
