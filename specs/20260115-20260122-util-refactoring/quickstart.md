# Quickstart: Utils App Reorganization & Email System Extraction

**Date**: 2026-01-22
**Branch**: `20260115-20260122-util-refactoring`

## Overview

After this refactoring, the codebase has two key changes:

1. **Email system** is now a standalone Django app (`email_system`)
2. **Utils** is reorganized into domain-specific packages

---

## New Import Patterns

### Email System (NEW)

```python
# Models
from email_system.models import (
    EmailTemplate, EmailQueue, EmailLog, EmailSettings,
    EmailAttachment, EmailTemplateAttachment,
    EmailContentRule, EmailTemplateContentRule, EmailContentPlaceholder
)

# Services
from email_system.services import email_service
from email_system.services import EmailService
from email_system.services.queue_service import QueueService
from email_system.services.content_insertion import ContentInsertionService

# Backends
from email_system.backends import CustomEmailBackend
```

### Utils Packages (REORGANIZED)

```python
# VAT functionality
from utils.vat import UtilsRegion, UtilsCountrys, UtilsCountryRegion
from utils.vat import VATService
from utils.vat.service import VATService  # Explicit import

# Address lookup
from utils.address import PostcoderService
from utils.address import AddressCacheService
from utils.address.logger import AddressLookupLogger

# DBF Export
from utils.dbf_export import DBFExportService

# reCAPTCHA
from utils.recaptcha import verify_recaptcha_v3, is_recaptcha_enabled, get_client_ip

# Health checks
from utils.health import health_check

# IP Geolocation
from utils.geolocation import get_location

# Middleware (unchanged)
from utils.middleware import SomeMiddleware
```

---

## Migration Guide

### Before → After: Common Imports

| Before (Old) | After (New) |
|--------------|-------------|
| `from utils.models import EmailTemplate` | `from email_system.models import EmailTemplate` |
| `from utils.models import EmailQueue` | `from email_system.models import EmailQueue` |
| `from utils.models import EmailLog` | `from email_system.models import EmailLog` |
| `from utils.models import EmailSettings` | `from email_system.models import EmailSettings` |
| `from utils.email_service import email_service` | `from email_system.services import email_service` |
| `from utils.email_service import EmailService` | `from email_system.services import EmailService` |
| `from utils.recaptcha_utils import verify_recaptcha_v3` | `from utils.recaptcha import verify_recaptcha_v3` |
| `from utils.services.vat_service import VATService` | `from utils.vat import VATService` |
| `from utils.services.postcoder_service import PostcoderService` | `from utils.address import PostcoderService` |
| `from utils.health_check import health_check` | `from utils.health import health_check` |

### Management Commands

| Before | After |
|--------|-------|
| `python manage.py process_email_queue` | `python manage.py process_email_queue` (unchanged - moved to email_system) |
| `python manage.py export_to_dbf` | `python manage.py export_to_dbf` (unchanged) |

---

## Settings Configuration

Add to `INSTALLED_APPS` in `settings.py`:

```python
INSTALLED_APPS = [
    # ... existing apps ...
    'email_system',  # NEW - add this
    'utils',         # Existing - unchanged
]
```

---

## File Structure Overview

```text
backend/django_Admin3/
├── email_system/           # NEW standalone email app
│   ├── models/
│   │   ├── template.py     # EmailTemplate, EmailAttachment
│   │   ├── queue.py        # EmailQueue
│   │   ├── log.py          # EmailLog
│   │   ├── settings.py     # EmailSettings
│   │   ├── content_rule.py # EmailContentRule
│   │   └── placeholder.py  # EmailContentPlaceholder
│   ├── services/
│   │   ├── email_service.py
│   │   └── queue_service.py
│   ├── admin/
│   └── management/commands/
│       └── process_email_queue.py
│
├── utils/                  # REORGANIZED
│   ├── vat/                # VAT functionality
│   │   ├── models.py       # UtilsRegion, UtilsCountrys
│   │   └── service.py      # VATService
│   ├── address/            # Address lookup
│   │   ├── service.py      # PostcoderService
│   │   └── cache.py        # AddressCacheService
│   ├── recaptcha/          # reCAPTCHA
│   │   └── utils.py
│   ├── health/             # Health checks
│   │   └── checks.py
│   └── dbf_export/         # DBF export
│       └── service.py
```

---

## Testing After Refactoring

```bash
# Run all tests to verify nothing broke
cd backend/django_Admin3
python manage.py test

# Test specific apps
python manage.py test email_system
python manage.py test utils

# Verify email functionality
python manage.py test email_system.tests.test_email_service
python manage.py test core_auth  # Password reset uses email
```

---

## Common Tasks

### Sending an Email

```python
from email_system.services import email_service

# Queue an email (recommended)
email_service.queue_email(
    template_name='order_confirmation',
    to_email='customer@example.com',
    context={'order': order_data}
)

# Send immediately (use sparingly)
email_service.send_email(
    template_name='password_reset',
    to_email='user@example.com',
    context={'reset_link': link}
)
```

### Processing Email Queue

```bash
# Process pending emails
python manage.py process_email_queue

# Process with verbose output
python manage.py process_email_queue --verbosity=2
```

### VAT Calculations

```python
from utils.vat import VATService

vat_service = VATService()
vat_rate = vat_service.get_vat_rate(country_code='GB')
```

### Address Lookup

```python
from utils.address import PostcoderService

postcoder = PostcoderService()
addresses = postcoder.lookup_postcode('SW1A 1AA')
```

---

## Troubleshooting

### "No module named 'email_system'"

Ensure `'email_system'` is in `INSTALLED_APPS` in settings.py.

### "Table does not exist" errors

Run the fake migration:
```bash
python manage.py migrate email_system --fake
```

### Import errors in tests

Update test imports to use new paths. See Migration Guide above.

### Admin models not appearing

Verify `email_system/admin/__init__.py` imports and registers all admin classes.
