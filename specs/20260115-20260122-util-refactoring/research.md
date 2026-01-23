# Research: Utils App Reorganization & Email System Extraction

**Date**: 2026-01-22
**Branch**: `20260115-20260122-util-refactoring`

## 1. Django App Extraction Best Practices

### Decision: Create New App with Same Table Names

**Rationale**: Django's ORM allows models to specify their `db_table` in `Meta` options. By creating a new `email_system` app that uses the existing `utils_*` table names, we avoid any data migration while gaining clean app boundaries.

**Alternatives Considered**:

| Alternative | Rejected Because |
|-------------|------------------|
| Rename tables to `email_system_*` | Requires data migration, FK updates, and risk of data loss |
| Keep email models in utils with new facade | Doesn't improve modularity; still have one large models.py |
| Use Django's `MIGRATION_MODULES` | Too complex; doesn't solve the organizational problem |

### Implementation Pattern

```python
# email_system/models/template.py
class EmailTemplate(models.Model):
    # ... field definitions unchanged ...

    class Meta:
        db_table = 'utils_email_template'  # Keep existing table
        app_label = 'email_system'          # New app owns the model
```

---

## 2. Migration Strategy

### Decision: Fresh Migrations with `--fake`

**Rationale**: Since we're keeping the same table names and schema, the new app's initial migration describes the existing schema. We apply it with `--fake` to tell Django "these tables already exist."

**Sequence**:

1. Create `email_system` app with models specifying existing `db_table` values
2. Generate fresh migration: `python manage.py makemigrations email_system`
3. Fake-apply migration: `python manage.py migrate email_system --fake`
4. Update `django_content_type` table to point models to new app (automatic)
5. Remove email models from `utils/models.py`
6. Create migration in utils to remove the models: `python manage.py makemigrations utils`
7. Fake-apply utils migration: `python manage.py migrate utils --fake`

**Alternatives Considered**:

| Alternative | Rejected Because |
|-------------|------------------|
| `managed = False` | Loses Django's migration tracking; complicates future schema changes |
| SQL-level table rename | Requires downtime; risks FK integrity |
| Custom migration operations | Over-engineered for this use case |

### Content Type Update

Django automatically updates `django_content_type` when models move between apps:

```sql
-- Django handles this automatically, but for reference:
UPDATE django_content_type
SET app_label = 'email_system'
WHERE app_label = 'utils'
  AND model IN ('emailtemplate', 'emailqueue', 'emaillog', ...);
```

---

## 3. Deprecation Shim Pattern

### Decision: Shim for Email Imports Only (Optional)

**Rationale**: Based on codebase analysis, only `core_auth/views.py` imports from utils email modules. Since this is a single file with direct control, we can update it directly without a deprecation shim. The shim is optional for safety during transition.

**If Shim Needed**:

```python
# utils/email_shim.py (OPTIONAL - not implemented unless needed)
import warnings
from email_system.models import (
    EmailTemplate, EmailQueue, EmailLog, EmailSettings,
    EmailAttachment, EmailTemplateAttachment,
    EmailContentRule, EmailTemplateContentRule, EmailContentPlaceholder
)
from email_system.services import EmailService

warnings.warn(
    "Importing from utils.email_* is deprecated. Use email_system instead.",
    DeprecationWarning,
    stacklevel=2
)

__all__ = [
    'EmailTemplate', 'EmailQueue', 'EmailLog', 'EmailSettings',
    'EmailAttachment', 'EmailTemplateAttachment',
    'EmailContentRule', 'EmailTemplateContentRule', 'EmailContentPlaceholder',
    'EmailService'
]
```

**Alternatives Considered**:

| Alternative | Rejected Because |
|-------------|------------------|
| No shim at all | Risk if unknown imports exist |
| Full backward compatibility forever | Creates maintenance burden; defeats purpose of refactoring |
| Automatic import rewriting tool | Over-engineered; manual updates are straightforward |

---

## 4. Package Organization for Utils

### Decision: Domain-Specific Subpackages

**Rationale**: Group related functionality into discoverable packages. Each package has clear responsibility and can be imported independently.

**Package Structure**:

| Package | Contents | Import Pattern |
|---------|----------|----------------|
| `utils.vat` | UtilsRegion, UtilsCountrys, UtilsCountryRegion, VATService | `from utils.vat import VATService` |
| `utils.address` | PostcoderService, AddressCacheService, AddressLookupLogger | `from utils.address import PostcoderService` |
| `utils.dbf_export` | DBFExportService | `from utils.dbf_export import DBFExportService` |
| `utils.recaptcha` | verify_recaptcha_v3, is_recaptcha_enabled | `from utils.recaptcha import verify_recaptcha_v3` |
| `utils.health` | health_check | `from utils.health import health_check` |
| `utils.geolocation` | IP geolocation service | `from utils.geolocation import get_location` |

**Package `__init__.py` Pattern**:

```python
# utils/vat/__init__.py
from .models import UtilsRegion, UtilsCountrys, UtilsCountryRegion
from .service import VATService

__all__ = ['UtilsRegion', 'UtilsCountrys', 'UtilsCountryRegion', 'VATService']
```

---

## 5. Test Strategy

### Decision: Update Import Paths, Keep Test Logic

**Rationale**: Tests validate behavior, not import paths. The refactoring changes WHERE code lives, not WHAT it does.

**Test Updates Required**:

| Test File | Changes |
|-----------|---------|
| `utils/tests/test_models.py` | Update imports for email models → `email_system.models` |
| `utils/tests/test_admin.py` | Update imports for email admin → `email_system.admin` |
| `core_auth/tests/*` | Update imports for email_service |

**No Logic Changes**: All assertions, fixtures, and test scenarios remain identical.

---

## 6. Identified Dependencies

### Files Importing from Utils

| File | Import | New Import |
|------|--------|------------|
| `core_auth/views.py` | `from utils.email_service import email_service` | `from email_system.services import email_service` |
| `core_auth/views.py` | `from utils.recaptcha_utils import verify_recaptcha_v3` | `from utils.recaptcha import verify_recaptcha_v3` |
| `rules_engine/custom_functions.py` | Various utils imports | Review and update |
| `cart/models.py` | Possible utils imports | Review and update |

### Management Commands

| Command | Current Location | New Location |
|---------|------------------|--------------|
| `process_email_queue` | `utils/management/commands/` | `email_system/management/commands/` |
| `export_to_dbf` | `utils/management/commands/` | `utils/management/commands/` (unchanged) |
| `export_orders_to_dbf` | `utils/management/commands/` | `utils/management/commands/` (unchanged) |

---

## 7. Rollback Strategy

### Immediate Rollback (< 5 minutes)

1. Remove `email_system` from `INSTALLED_APPS`
2. Revert import changes in `core_auth/views.py`
3. Restore `utils/models.py` (email models still reference existing tables)
4. No data loss - tables unchanged

### Post-Migration Rollback

If issues discovered after migrations applied:

1. Fake-reverse the utils migration: `python manage.py migrate utils 0006 --fake`
2. Remove `email_system` from INSTALLED_APPS
3. Restore original `utils/models.py`
4. Run: `python manage.py migrate utils --fake` to resync state

---

## 8. Summary of Decisions

| Topic | Decision | Confidence |
|-------|----------|------------|
| Table ownership | Same `db_table` names in new app | High |
| Migration approach | Fresh migrations with `--fake` | High |
| Deprecation shim | Optional, direct cutover preferred | Medium |
| Utils organization | Domain-specific subpackages | High |
| Test strategy | Update imports, keep logic | High |
| Rollback plan | Remove from INSTALLED_APPS | High |
