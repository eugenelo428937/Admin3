# Utils App Reorganization & Email System Extraction

**Date:** 2025-01-21
**Status:** Draft
**Author:** Claude Code

---

## 1. Overview

Reorganize the monolithic `utils` app into logical Python packages while extracting the email system into a separate top-level Django app.

### Goals

1. **Improve code organization** - Group related functionality into discoverable packages
2. **Extract email system** - Create independent `email_system` app for better separation of concerns
3. **Maintain backward compatibility** - Existing imports should continue working during transition
4. **Clean migration strategy** - Fresh migrations for new app with data migration script

---

## 2. Current State Analysis

### utils/ App Contents

| Domain | Files | Models | Lines (approx) |
|--------|-------|--------|----------------|
| **Email** | email_service.py, email_backends.py, email_testing.py, services/queue_service.py, services/content_insertion_service.py | EmailTemplate, EmailAttachment, EmailTemplateAttachment, EmailQueue, EmailLog, EmailSettings, EmailContentRule, EmailTemplateContentRule, EmailContentPlaceholder | ~800 |
| **VAT** | services/vat_service.py | UtilsRegion, UtilsCountrys, UtilsCountryRegion | ~100 |
| **Address** | services/postcoder_service.py, services/address_cache_service.py, services/address_lookup_logger.py | None | ~300 |
| **DBF Export** | services/dbf_export_service.py, management/commands/export_*.py | None | ~200 |
| **Other** | recaptcha_utils.py, health_check.py, middleware.py | None | ~150 |

### External Dependencies on Email Models

| App | File | Usage |
|-----|------|-------|
| core_auth | views.py | `EmailSettings.get_setting()` for password reset/verification timeouts |

---

## 3. Target Architecture

### 3.1 New email_system App (Top-Level)

```
backend/django_Admin3/
├── email_system/                    # NEW top-level app
│   ├── __init__.py
│   ├── apps.py                      # EmailSystemConfig
│   ├── models/
│   │   ├── __init__.py              # Export all models
│   │   ├── template.py              # EmailTemplate, EmailAttachment, EmailTemplateAttachment
│   │   ├── queue.py                 # EmailQueue
│   │   ├── log.py                   # EmailLog
│   │   ├── settings.py              # EmailSettings
│   │   ├── content_rule.py          # EmailContentRule, EmailTemplateContentRule
│   │   └── placeholder.py           # EmailContentPlaceholder
│   ├── admin/
│   │   ├── __init__.py
│   │   ├── template_admin.py
│   │   ├── queue_admin.py
│   │   └── log_admin.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── email_service.py         # Main EmailService class
│   │   ├── queue_service.py         # Queue processing
│   │   └── content_insertion.py     # Dynamic content insertion
│   ├── backends/
│   │   ├── __init__.py
│   │   └── custom_backends.py       # Custom email backends
│   ├── management/
│   │   └── commands/
│   │       └── process_email_queue.py
│   ├── migrations/
│   │   └── 0001_initial.py          # Fresh migration
│   ├── templates/
│   │   └── emails/                  # Move email templates here
│   ├── tests/
│   │   └── ...
│   └── urls.py                      # If any email-related endpoints
```

### 3.2 Reorganized utils App

```
utils/
├── __init__.py
├── apps.py
├── models.py                        # Imports from vat/models.py
├── admin.py                         # Imports from vat/admin.py
├── migrations/                      # Existing migrations (VAT models only)
├── urls.py
├── views.py
│
├── vat/                             # VAT domain package
│   ├── __init__.py
│   ├── models.py                    # UtilsRegion, UtilsCountrys, UtilsCountryRegion
│   ├── admin.py
│   └── service.py                   # VATService
│
├── address/                         # Address lookup package
│   ├── __init__.py
│   ├── service.py                   # PostcoderService
│   ├── cache.py                     # AddressCacheService
│   └── logger.py                    # AddressLookupLogger
│
├── dbf_export/                      # DBF export package
│   ├── __init__.py
│   └── service.py                   # DBFExportService
│
├── recaptcha/                       # reCAPTCHA package
│   ├── __init__.py
│   └── utils.py
│
├── health/                          # Health check package
│   ├── __init__.py
│   └── checks.py
│
├── middleware.py                    # Keep at root level
│
├── management/
│   └── commands/
│       ├── export_to_dbf.py
│       └── export_orders_to_dbf.py
│
└── tests/
    └── ...                          # Reorganize tests by package
```

---

## 4. Migration Strategy

### 4.1 Phase 1: Create email_system App (Clean Slate)

1. Create new `email_system` app structure
2. Copy model definitions (update table names if desired, or keep existing)
3. Create fresh `0001_initial.py` migration with `managed = False` temporarily
4. Add `email_system` to `INSTALLED_APPS`

### 4.2 Phase 2: Data Migration

```python
# email_system/migrations/0002_migrate_data.py

def migrate_email_data(apps, schema_editor):
    """
    Migrate data from utils email tables to email_system.
    Since we're keeping the same table names, this may just be
    updating Django's internal tracking.
    """
    # Option A: Same table names - just update django_content_type
    # Option B: New table names - copy data then update FKs
    pass
```

**Recommended: Keep same table names** (`utils_email_*`) to avoid data migration complexity. The new app will simply take ownership of existing tables.

### 4.3 Phase 3: Update References

| File | Change |
|------|--------|
| `core_auth/views.py` | `from utils.models import EmailSettings` → `from email_system.models import EmailSettings` |
| `settings.py` | Add `'email_system'` to `INSTALLED_APPS` |
| Any admin imports | Update to `email_system.admin` |

### 4.4 Phase 4: Remove Email from utils

1. Delete email-related files from `utils/`
2. Remove email models from `utils/models.py`
3. Create migration to remove email models from utils app's migration history

### 4.5 Phase 5: Reorganize Remaining utils

1. Create package directories (vat/, address/, dbf_export/, etc.)
2. Move files into packages
3. Update imports in root `models.py` and `admin.py`
4. Update all internal imports

---

## 5. Database Considerations

### Table Ownership Strategy

**Keep existing table names** - The `email_system` app will use the same `db_table` values:

```python
# email_system/models/template.py
class EmailTemplate(models.Model):
    class Meta:
        db_table = 'utils_email_template'  # Keep existing table name
```

This means:
- No data migration required
- No FK updates in database
- Only Django's `django_content_type` table needs updating

### Migration Coordination

```python
# email_system/migrations/0001_initial.py
class Migration(migrations.Migration):
    initial = True

    operations = [
        migrations.CreateModel(
            name='EmailTemplate',
            # ... field definitions ...
            options={
                'db_table': 'utils_email_template',
                'managed': True,  # Django manages this table
            },
        ),
        # ... other models ...
    ]
```

**Important:** Run a `--fake` migration for the initial email_system migration since tables already exist.

---

## 6. Backward Compatibility

### Deprecation Shim (Optional)

To maintain backward compatibility during transition:

```python
# utils/email/__init__.py (temporary shim)
import warnings
from email_system.models import (
    EmailTemplate, EmailQueue, EmailLog, EmailSettings,
    # ... all email models
)

warnings.warn(
    "Importing from utils.email is deprecated. Use email_system instead.",
    DeprecationWarning,
    stacklevel=2
)

__all__ = ['EmailTemplate', 'EmailQueue', 'EmailLog', 'EmailSettings', ...]
```

---

## 7. Import Patterns After Reorganization

### email_system App

```python
# Models
from email_system.models import EmailTemplate, EmailQueue, EmailLog, EmailSettings

# Services
from email_system.services import EmailService
from email_system.services.queue_service import QueueService
```

### utils App (Reorganized)

```python
# VAT
from utils.vat.models import UtilsRegion, UtilsCountrys
from utils.vat.service import VATService

# Address
from utils.address.service import PostcoderService
from utils.address.cache import AddressCacheService

# DBF Export
from utils.dbf_export.service import DBFExportService

# reCAPTCHA
from utils.recaptcha.utils import verify_recaptcha

# Health
from utils.health.checks import health_check
```

---

## 8. Files to Create/Modify

### New Files

| Path | Description |
|------|-------------|
| `email_system/__init__.py` | App package init |
| `email_system/apps.py` | EmailSystemConfig |
| `email_system/models/__init__.py` | Model exports |
| `email_system/models/template.py` | EmailTemplate, EmailAttachment, EmailTemplateAttachment |
| `email_system/models/queue.py` | EmailQueue |
| `email_system/models/log.py` | EmailLog |
| `email_system/models/settings.py` | EmailSettings |
| `email_system/models/content_rule.py` | EmailContentRule, EmailTemplateContentRule |
| `email_system/models/placeholder.py` | EmailContentPlaceholder |
| `email_system/admin/__init__.py` | Admin exports |
| `email_system/services/__init__.py` | Service exports |
| `email_system/services/email_service.py` | Main EmailService |
| `email_system/migrations/0001_initial.py` | Fresh migration |
| `utils/vat/__init__.py` | VAT package init |
| `utils/vat/models.py` | VAT models |
| `utils/vat/service.py` | VATService |
| `utils/address/__init__.py` | Address package init |
| `utils/address/service.py` | PostcoderService |
| `utils/dbf_export/__init__.py` | DBF package init |
| `utils/recaptcha/__init__.py` | reCAPTCHA package init |
| `utils/health/__init__.py` | Health package init |

### Modified Files

| Path | Changes |
|------|---------|
| `settings.py` | Add `'email_system'` to INSTALLED_APPS |
| `core_auth/views.py` | Update EmailSettings import |
| `utils/models.py` | Remove email models, import from vat/ |
| `utils/admin.py` | Remove email admin, import from vat/ |

### Deleted Files (After Migration)

| Path | Reason |
|------|--------|
| `utils/email_service.py` | Moved to email_system |
| `utils/email_backends.py` | Moved to email_system |
| `utils/email_testing.py` | Moved to email_system |
| `utils/services/queue_service.py` | Moved to email_system |
| `utils/services/content_insertion_service.py` | Moved to email_system |
| `utils/management/commands/process_email_queue.py` | Moved to email_system |

---

## 9. Testing Strategy

1. **Before migration:** Run full test suite, document baseline
2. **After email_system creation:** Verify all email tests pass with new imports
3. **After utils reorganization:** Verify all utils tests pass with new imports
4. **Integration tests:** Verify email sending still works end-to-end
5. **Admin tests:** Verify Django admin still works for all models

---

## 10. Rollback Plan

If issues arise:

1. Remove `email_system` from INSTALLED_APPS
2. Revert import changes in `core_auth/views.py`
3. Email models remain in `utils` (unchanged in database)
4. No data loss since we're using same table names

---

## 11. Open Questions

1. **Email templates location:** Should MJML templates move to `email_system/templates/` or stay in current location?
2. **URL routing:** Does email system need any API endpoints? If so, add to `email_system/urls.py`
3. **Celery tasks:** If using Celery for email queue processing, update task imports

---

## 12. Implementation Order

1. [ ] Create `email_system` app structure
2. [ ] Copy email models with same `db_table` names
3. [ ] Create initial migration (fake-apply since tables exist)
4. [ ] Copy email services and admin
5. [ ] Update INSTALLED_APPS
6. [ ] Update `core_auth/views.py` import
7. [ ] Run tests - verify email functionality
8. [ ] Create utils subpackages (vat/, address/, etc.)
9. [ ] Move files to subpackages
10. [ ] Update utils models.py and admin.py imports
11. [ ] Run tests - verify utils functionality
12. [ ] Remove email files from utils
13. [ ] Final test suite run
14. [ ] Remove deprecation shims (if used)
