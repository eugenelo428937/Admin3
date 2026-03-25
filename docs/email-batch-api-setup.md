# Email Batch API — Setup Guide

## Overview

The Email Batch API allows external systems to send bulk emails through Admin3's email infrastructure. This guide covers how to create API keys, configure the external system, and use the API.

## 1. Create an API Key

### Via Django Admin

1. Log in to Django Admin at `https://<server>:8443/admin/`
2. Navigate to **Email System > External API Keys**
3. You cannot create keys from the admin UI directly (the key hash must be generated). Use the Django shell instead.

### Via Django Shell

```bash
cd backend/django_Admin3
python manage.py shell
```

```python
import secrets
import hashlib
from email_system.models import ExternalApiKey

# Generate a new API key
raw_key = secrets.token_urlsafe(32)
key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

# Save to database
api_key = ExternalApiKey.objects.create(
    key_hash=key_hash,
    key_prefix=raw_key[:8],
    name='Administrate System',  # Give it a descriptive name
)

# IMPORTANT: Copy this key now — it cannot be retrieved later
print(f'API Key: {raw_key}')
print(f'Key ID: {api_key.id}')
```

Save the printed API key securely. It is hashed in the database and cannot be recovered.

### Deactivate a Key

```python
from email_system.models import ExternalApiKey

# Find the key by name or prefix
key = ExternalApiKey.objects.get(name='Administrate System')
key.is_active = False
key.save()
```

## 2. Configure the External System

The external system needs:

| Setting | Value |
|---------|-------|
| Base URL | `https://<server>:8443/api/email/` |
| Auth Header | `X-Api-Key: <your-api-key>` |
| Content-Type | `application/json` |

## 3. API Endpoints

### Send a Batch

**`POST /api/email/batch/send/`**

```bash
curl -X POST https://<server>:8443/api/email/batch/send/ \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <your-api-key>" \
  -d '{
    "template_id": 9,
    "requested_by": "Eugene Lo",
    "notify_email": "eugene@example.com",
    "items": [
      {
        "to_email": "recipient1@example.com",
        "cc_email": ["cc@example.com"],
        "subject_override": "Hello {{ firstname }}",
        "payload": {
          "firstname": "Alice",
          "ref": "12345"
        }
      },
      {
        "to_email": "recipient2@example.com",
        "cc_email": [],
        "payload": {
          "firstname": "Bob",
          "ref": "67890"
        }
      }
    ]
  }'
```

**Request fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `template_id` | Yes | ID of the email template in Django admin |
| `requested_by` | Yes | Name of the person/system initiating the batch |
| `notify_email` | Yes | Email address to receive the completion report |
| `items` | Yes | Array of email items (max 500 by default) |
| `items[].to_email` | Yes | Recipient email address |
| `items[].cc_email` | No | Array of CC email addresses (default: []) |
| `items[].subject_override` | No | Custom subject line (supports `{{ variable }}` syntax from payload) |
| `items[].payload` | No | Key-value pairs for template variable substitution |

**Response (201 Created):**

```json
{
  "batch": {
    "batch_id": "2f1a0d74-7535-4677-9445-c565daf39526",
    "status": "processing",
    "total_items": 2,
    "items": [
      {
        "to_email": "recipient1@example.com",
        "queue_id": "6c47acbc-2312-4382-9229-acf8ac241f03",
        "is_success": true,
        "error_response": {}
      },
      {
        "to_email": "recipient2@example.com",
        "queue_id": "a1b2c3d4-5678-9012-3456-789012345678",
        "is_success": true,
        "error_response": {}
      }
    ]
  }
}
```

Items with invalid email addresses will have `is_success: false` but will not block the rest of the batch.

### Query Batch Status

**`GET /api/email/batch/<batch_id>/`**

```bash
curl https://<server>:8443/api/email/batch/2f1a0d74-7535-4677-9445-c565daf39526/ \
  -H "X-Api-Key: <your-api-key>"
```

**Response (200 OK):**

```json
{
  "batch_id": "2f1a0d74-7535-4677-9445-c565daf39526",
  "status": "completed_with_errors",
  "is_success": false,
  "total_items": 2,
  "sent_count": 1,
  "error_count": 1,
  "sent_items": ["recipient2@example.com"],
  "error_items": [
    {
      "to_email": "recipient1@example.com",
      "cc_email": ["cc@example.com"],
      "attempts": 3,
      "error_response": {
        "error_code": "500",
        "error_message": "SMTP connection timeout"
      }
    }
  ]
}
```

**Batch status values:**

| Status | Meaning |
|--------|---------|
| `processing` | Emails are being sent |
| `completed` | All emails sent successfully |
| `completed_with_errors` | Some emails sent, some failed |
| `failed` | All emails failed |

`is_success` is `true` only when status is `completed`.

## 4. Email Templates

The external system references templates by `template_id`. To find available templates:

1. Go to Django Admin > **Email System > Email Templates**
2. Note the **ID** column for the template you want to use
3. Template variables (e.g., `{{ firstname }}`) must match keys in the `payload` object

### Subject Line Variables

If `subject_override` is provided, variables are resolved from `payload`:
- `"subject_override": "Order confirmation for {{ firstname }}"` + `"payload": {"firstname": "Alice"}` = `"Order confirmation for Alice"`

If `subject_override` is omitted, the template's default `subject_template` is used with the same variable resolution.

## 5. Completion Notifications

After all emails in a batch finish (sent, failed, or expired), a notification email is automatically sent to the `notify_email` address. The notification includes:

- Batch ID
- Who requested it
- Number sent vs. failed
- Error details for each failed email

The notification template can be customized in Django Admin under **Email Templates** > `batch_completion_report`.

## 6. Batch Size Limit

Default maximum: **500 items per batch**. Configurable in Django Admin:

1. Go to **Email System > Email Settings**
2. Find or create the setting with key `batch_max_items`
3. Set the value to your desired limit

## 7. Error Codes

| HTTP Code | Meaning |
|-----------|---------|
| 201 | Batch created successfully |
| 200 | Batch query successful |
| 400 | Validation error (invalid template, batch too large, bad request body) |
| 401 | Missing or invalid API key |
| 403 | API key is inactive |
| 404 | Batch not found (or belongs to a different API key) |

## 8. Processing

Batch emails are processed by the existing email queue. Ensure the queue processor is running:

```bash
# Process once
python manage.py process_email_queue

# Run continuously (checks every 30 seconds)
python manage.py process_email_queue --continuous --interval 30
```

## 9. Monitoring

### Django Admin

- **Email System > Email Batches** — view batch status, counts, timestamps
- **Email System > Email Queue** — view individual email status and errors
- **Email System > External API Keys** — view key usage (`last_used_at`)

### Programmatic

The external system can poll `GET /api/email/batch/<batch_id>/` to check batch progress. The `status` field transitions from `processing` to a terminal state once all emails are handled.
