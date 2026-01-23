# Data Model: Utils App Reorganization & Email System Extraction

**Date**: 2026-01-22
**Branch**: `20260115-20260122-util-refactoring`

## Overview

This document describes the model organization after refactoring. **No schema changes** are made - only the organizational structure changes.

---

## Email System Models (New `email_system` App)

### Model: EmailTemplate

**File**: `email_system/models/template.py`
**Table**: `utils_email_template` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `name` | CharField(100) | Unique template identifier |
| `template_type` | CharField(50) | Template category (order_confirmation, password_reset, etc.) |
| `display_name` | CharField(200) | Human-readable name |
| `description` | TextField | Template purpose |
| `subject_template` | CharField(300) | Email subject with variables |
| `content_template_name` | CharField(100) | MJML template filename |
| `use_master_template` | BooleanField | Use master template system |
| `from_email` | EmailField | Override sender email |
| `reply_to_email` | EmailField | Reply-to address |
| `default_priority` | CharField(20) | Queue priority (low/normal/high/urgent) |
| `enable_tracking` | BooleanField | Enable open/click tracking |
| `enable_queue` | BooleanField | Queue instead of immediate send |
| `max_retry_attempts` | IntegerField | Retry limit |
| `retry_delay_minutes` | IntegerField | Delay between retries |
| `enhance_outlook_compatibility` | BooleanField | Apply Outlook fixes |
| `is_active` | BooleanField | Active status |
| `created_at` | DateTimeField | Creation timestamp |
| `updated_at` | DateTimeField | Last update timestamp |
| `created_by` | FK(User) | Creator reference |

**Relationships**:
- `attachments` → EmailTemplateAttachment (reverse)
- `content_rules` → EmailContentRule (M2M through EmailTemplateContentRule)
- `placeholders` → EmailContentPlaceholder (M2M)

---

### Model: EmailAttachment

**File**: `email_system/models/template.py`
**Table**: `utils_email_attachment` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `name` | CharField(200) | Attachment identifier |
| `display_name` | CharField(200) | Filename for recipients |
| `attachment_type` | CharField(20) | Type (static/dynamic/template/external) |
| `file_path` | CharField(500) | Path to static file |
| `file_content` | BinaryField | Binary content (small files) |
| `file_url` | URLField | External URL |
| `mime_type` | CharField(100) | MIME type |
| `file_size` | BigIntegerField | Size in bytes |
| `is_conditional` | BooleanField | Depends on context |
| `condition_rules` | JSONField | Conditional inclusion rules |
| `description` | TextField | Description |
| `is_active` | BooleanField | Active status |

---

### Model: EmailTemplateAttachment

**File**: `email_system/models/template.py`
**Table**: `utils_email_template_attachment` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `template` | FK(EmailTemplate) | Parent template |
| `attachment` | FK(EmailAttachment) | Linked attachment |
| `is_required` | BooleanField | Required for template |
| `order` | PositiveIntegerField | Display order |
| `include_condition` | JSONField | Inclusion conditions |

**Constraints**: Unique together (template, attachment)

---

### Model: EmailQueue

**File**: `email_system/models/queue.py`
**Table**: `utils_email_queue` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `queue_id` | UUIDField | Unique identifier |
| `template` | FK(EmailTemplate) | Source template |
| `to_emails` | JSONField | Recipient list |
| `cc_emails` | JSONField | CC recipients |
| `bcc_emails` | JSONField | BCC recipients |
| `from_email` | EmailField | Sender |
| `reply_to_email` | EmailField | Reply-to |
| `subject` | CharField(300) | Subject line |
| `email_context` | JSONField | Template context |
| `html_content` | TextField | Rendered HTML |
| `text_content` | TextField | Plain text |
| `priority` | CharField(20) | Queue priority |
| `status` | CharField(20) | Processing status |
| `scheduled_at` | DateTimeField | Scheduled send time |
| `process_after` | DateTimeField | Earliest processing time |
| `expires_at` | DateTimeField | Expiration time |
| `attempts` | PositiveIntegerField | Send attempts |
| `max_attempts` | PositiveIntegerField | Maximum attempts |
| `last_attempt_at` | DateTimeField | Last attempt time |
| `next_retry_at` | DateTimeField | Next retry time |
| `sent_at` | DateTimeField | Actual send time |
| `error_message` | TextField | Last error |
| `error_details` | JSONField | Detailed error info |
| `tags` | JSONField | Categorization tags |

**Indexes**: (status, scheduled_at), (priority, status), (process_after), (template, status)

---

### Model: EmailLog

**File**: `email_system/models/log.py`
**Table**: `utils_email_log` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `log_id` | UUIDField | Unique identifier |
| `queue_item` | FK(EmailQueue) | Source queue item |
| `template` | FK(EmailTemplate) | Source template |
| `to_email` | EmailField | Recipient |
| `from_email` | EmailField | Sender |
| `subject` | CharField(300) | Subject |
| `content_hash` | CharField(64) | MD5 for deduplication |
| `attachment_info` | JSONField | Attachment details |
| `total_size_bytes` | BigIntegerField | Total email size |
| `status` | CharField(20) | Delivery status |
| `priority` | CharField(20) | Priority |
| `queued_at` | DateTimeField | Queue time |
| `sent_at` | DateTimeField | Send time |
| `delivered_at` | DateTimeField | Delivery time |
| `opened_at` | DateTimeField | First open time |
| `first_clicked_at` | DateTimeField | First click time |
| `response_code` | CharField(10) | SMTP response code |
| `response_message` | TextField | SMTP response |
| `error_message` | TextField | Error details |
| `open_count` | PositiveIntegerField | Open count |
| `click_count` | PositiveIntegerField | Click count |
| `recipient_info` | JSONField | Recipient metadata |
| `user_agent` | TextField | Tracking user agent |
| `ip_address` | GenericIPAddressField | Tracking IP |
| `esp_message_id` | CharField(200) | ESP message ID |
| `esp_response` | JSONField | ESP response data |
| `email_context` | JSONField | Template context used |
| `metadata` | JSONField | Additional metadata |
| `tags` | JSONField | Categorization tags |
| `processed_by` | CharField(100) | Processing worker |
| `processing_time_ms` | PositiveIntegerField | Processing duration |

**Indexes**: (to_email, -queued_at), (status, -queued_at), (template, -queued_at), (sent_at), (content_hash)

---

### Model: EmailSettings

**File**: `email_system/models/settings.py`
**Table**: `utils_email_settings` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `key` | CharField(100) | Unique setting key |
| `setting_type` | CharField(20) | Category (smtp/queue/tracking/etc.) |
| `display_name` | CharField(200) | Human-readable name |
| `description` | TextField | Setting description |
| `value` | JSONField | Setting value |
| `default_value` | JSONField | Default value |
| `is_required` | BooleanField | Required for operation |
| `is_sensitive` | BooleanField | Contains sensitive data |
| `validation_rules` | JSONField | Validation constraints |
| `is_active` | BooleanField | Active status |
| `updated_by` | FK(User) | Last updater |

**Class Methods**: `get_setting(key, default)`, `set_setting(key, value, ...)`

---

### Model: EmailContentRule

**File**: `email_system/models/content_rule.py`
**Table**: `utils_email_content_rule` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `name` | CharField(200) | Rule name |
| `description` | TextField | Rule description |
| `rule_type` | CharField(30) | Rule category |
| `placeholder` | FK(EmailContentPlaceholder) | Target placeholder |
| `condition_field` | CharField(100) | Field to evaluate |
| `condition_operator` | CharField(20) | Comparison operator |
| `condition_value` | JSONField | Comparison value(s) |
| `additional_conditions` | JSONField | AND/OR conditions |
| `custom_logic` | TextField | Custom Python logic |
| `priority` | IntegerField | Processing priority |
| `is_exclusive` | BooleanField | Stop on match |
| `is_active` | BooleanField | Active status |
| `created_by` | FK(User) | Creator |

**Relationships**: `templates` → EmailTemplate (M2M through EmailTemplateContentRule)

---

### Model: EmailTemplateContentRule

**File**: `email_system/models/content_rule.py`
**Table**: `utils_email_template_content_rule` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `template` | FK(EmailTemplate) | Template reference |
| `content_rule` | FK(EmailContentRule) | Rule reference |
| `is_enabled` | BooleanField | Enabled for template |
| `priority_override` | IntegerField | Override rule priority |
| `content_override` | TextField | Override content template |

**Constraints**: Unique together (template, content_rule)

---

### Model: EmailContentPlaceholder

**File**: `email_system/models/placeholder.py`
**Table**: `utils_email_content_placeholder` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `name` | CharField(100) | Unique placeholder name |
| `display_name` | CharField(200) | Human-readable name |
| `description` | TextField | Placeholder description |
| `default_content_template` | TextField | Default MJML/HTML |
| `content_variables` | JSONField | Available variables |
| `insert_position` | CharField(20) | Insertion method |
| `is_required` | BooleanField | Must be present |
| `allow_multiple_rules` | BooleanField | Multiple rule contributions |
| `content_separator` | CharField(50) | Multi-rule separator |
| `is_active` | BooleanField | Active status |

**Relationships**: `templates` → EmailTemplate (M2M), `content_rules` → EmailContentRule (reverse)

---

## VAT Models (Remain in `utils` App)

### Model: UtilsRegion

**File**: `utils/vat/models.py`
**Table**: `utils_regions` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `code` | CharField(10) | Primary key (UK, IE, EU, SA, ROW) |
| `name` | CharField(100) | Region name |
| `description` | TextField | Region description |
| `active` | BooleanField | Active status |

---

### Model: UtilsCountrys

**File**: `utils/vat/models.py`
**Table**: `utils_countrys` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `code` | CharField(2) | Primary key (ISO country code) |
| `name` | CharField(100) | Country name |
| `vat_percent` | DecimalField(5,2) | VAT percentage |
| `active` | BooleanField | Active status |

---

### Model: UtilsCountryRegion

**File**: `utils/vat/models.py`
**Table**: `utils_country_region` (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `country` | FK(UtilsCountrys) | Country reference |
| `region` | FK(UtilsRegion) | Region reference |
| `effective_from` | DateField | Start date |
| `effective_to` | DateField | End date (nullable) |

**Constraints**: Unique together (country, effective_from)

---

## Entity Relationship Diagram

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        email_system app                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌────────────────────┐    ┌────────────────┐   │
│  │EmailTemplate │────│EmailTemplateAttach │────│EmailAttachment │   │
│  └──────────────┘    └────────────────────┘    └────────────────┘   │
│         │                                                            │
│         │ FK                                                         │
│         ▼                                                            │
│  ┌──────────────┐                                                    │
│  │ EmailQueue   │                                                    │
│  └──────────────┘                                                    │
│         │                                                            │
│         │ FK                                                         │
│         ▼                                                            │
│  ┌──────────────┐                                                    │
│  │  EmailLog    │                                                    │
│  └──────────────┘                                                    │
│                                                                      │
│  ┌──────────────┐    ┌────────────────────┐    ┌──────────────────┐ │
│  │EmailTemplate │────│EmailTemplateContent│────│EmailContentRule  │ │
│  │              │    │       Rule         │    │                  │ │
│  └──────────────┘    └────────────────────┘    └──────────────────┘ │
│         │                                              │             │
│         │ M2M                                          │ FK          │
│         ▼                                              ▼             │
│  ┌──────────────────┐                    ┌──────────────────────┐   │
│  │EmailContent      │◄───────────────────│EmailContentPlaceholder│  │
│  │   Placeholder    │                    │                      │   │
│  └──────────────────┘                    └──────────────────────┘   │
│                                                                      │
│  ┌──────────────┐   (standalone)                                     │
│  │EmailSettings │                                                    │
│  └──────────────┘                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                           utils app                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌────────────────────┐    ┌────────────────┐   │
│  │ UtilsRegion  │◄───│UtilsCountryRegion  │───►│ UtilsCountrys  │   │
│  └──────────────┘    └────────────────────┘    └────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Organization Summary

| Model | Current File | New File |
|-------|--------------|----------|
| EmailTemplate | `utils/models.py` | `email_system/models/template.py` |
| EmailAttachment | `utils/models.py` | `email_system/models/template.py` |
| EmailTemplateAttachment | `utils/models.py` | `email_system/models/template.py` |
| EmailQueue | `utils/models.py` | `email_system/models/queue.py` |
| EmailLog | `utils/models.py` | `email_system/models/log.py` |
| EmailSettings | `utils/models.py` | `email_system/models/settings.py` |
| EmailContentRule | `utils/models.py` | `email_system/models/content_rule.py` |
| EmailTemplateContentRule | `utils/models.py` | `email_system/models/content_rule.py` |
| EmailContentPlaceholder | `utils/models.py` | `email_system/models/placeholder.py` |
| UtilsRegion | `utils/models.py` | `utils/vat/models.py` |
| UtilsCountrys | `utils/models.py` | `utils/vat/models.py` |
| UtilsCountryRegion | `utils/models.py` | `utils/vat/models.py` |
