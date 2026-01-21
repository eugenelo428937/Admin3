# Quickstart: Remove Legacy VAT App

**Date**: 2026-01-21
**Estimated Effort**: 4-6 hours
**Risk Level**: Medium (core VAT functionality)

## Prerequisites

- [ ] Backend development environment set up
- [ ] PostgreSQL database accessible
- [ ] All existing tests passing
- [ ] Git branch: `20260114-20260121-remove-legacy-vat`

## Quick Verification Commands

```bash
# Navigate to backend
cd backend/django_Admin3

# Activate virtual environment
.\.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Mac/Linux

# Run VAT tests to establish baseline
python manage.py test cart.tests.test_vat_orchestrator
python manage.py test rules_engine.tests.test_vat_integration

# Check current vat app imports
grep -r "from vat\." --include="*.py" . | grep -v "__pycache__" | grep -v "vat/tests"
```

## Implementation Steps

### Step 1: Relocate IP Geolocation (15 min)

```bash
# Create utils services directory if not exists
mkdir -p utils/services

# Copy ip_geolocation.py
cp vat/ip_geolocation.py utils/services/ip_geolocation.py

# Add __init__.py if needed
touch utils/services/__init__.py
```

Update `utils/services/__init__.py`:
```python
from .ip_geolocation import get_region_from_ip, get_country_from_ip
```

### Step 2: Refactor VATOrchestrator (30 min)

Edit `cart/services/vat_orchestrator.py`:

**Remove imports** (lines 14, 155):
```python
# REMOVE these lines
from vat.models import VATAudit
from vat.context_builder import build_vat_context
```

**Replace `_build_user_context()` method** (lines 145-177):
```python
def _build_user_context(self, cart) -> Dict[str, Any]:
    """
    Build user context for Rules Engine using direct profile lookup.
    """
    from utils.services.ip_geolocation import get_country_from_ip

    user_id = 'anonymous'
    country = DEFAULT_COUNTRY

    if cart.user and cart.user.is_authenticated:
        user_id = str(cart.user.id)

        if hasattr(cart.user, 'userprofile') and cart.user.userprofile:
            profile = cart.user.userprofile
            if hasattr(profile, 'addresses'):
                home_address = profile.addresses.filter(address_type='HOME').first()
                if home_address:
                    # Get country from address
                    country_str = home_address.country
                    if country_str:
                        from country.models import Country
                        from django.db.models import Q
                        try:
                            country_obj = Country.objects.filter(
                                Q(name=country_str) | Q(iso_code=country_str)
                            ).first()
                            if country_obj:
                                country = country_obj.iso_code
                            else:
                                country = country_str
                        except:
                            country = country_str

    return {
        'id': user_id,
        'country_code': country
    }
```

**Remove VATAudit creation** in `_create_audit_record()` (lines 407-454):
```python
def _create_audit_record(self, cart, context, all_results):
    """
    Audit record creation removed - ActedRuleExecution captures this data.
    Keeping method signature for backward compatibility but making it a no-op.
    """
    # ActedRuleExecution already captures rule execution audit trail
    # Cart.vat_result stores the calculation result
    # ActedOrder.calculations_applied stores order-level result
    logger.debug(f"Audit for cart {cart.id} captured via ActedRuleExecution")
```

### Step 3: Run Tests (15 min)

```bash
# Run VAT orchestrator tests
python manage.py test cart.tests.test_vat_orchestrator -v 2

# Run VAT integration tests
python manage.py test rules_engine.tests.test_vat_integration -v 2

# Run full cart test suite
python manage.py test cart -v 2
```

### Step 4: Create Migration (15 min)

```bash
# Create migration to drop VATAudit
python manage.py makemigrations vat --empty --name drop_vat_audit
```

Edit the created migration:
```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('vat', 'XXXX_previous'),  # Update with actual previous migration
    ]

    operations = [
        migrations.DeleteModel(
            name='VATAudit',
        ),
    ]
```

Run migration:
```bash
python manage.py migrate vat
```

### Step 5: Update INSTALLED_APPS (5 min)

Edit `Admin3/settings/base.py`:
```python
INSTALLED_APPS = [
    # ... other apps ...
    # 'vat',  # REMOVED - functionality moved to rules_engine and utils
    # ... other apps ...
]
```

### Step 6: Delete VAT App (5 min)

```bash
# Verify no remaining imports
grep -r "from vat\." --include="*.py" . | grep -v "__pycache__"

# Delete the vat app
rm -rf vat/
```

### Step 7: Update Tests (30-60 min)

Files that may need updates:
- `cart/tests/test_vat_orchestrator.py` - Remove VATAudit assertions
- `cart/tests/test_vat_removal.py` - Update import checks
- `cart/tests/test_e2e_vat_integration.py` - Remove VATAudit imports

For each test file:
1. Remove `from vat.models import VATAudit`
2. Remove assertions checking VATAudit creation
3. Update to check `ActedRuleExecution` instead if needed

### Step 8: Final Verification (15 min)

```bash
# Run all tests
python manage.py test

# Verify no vat imports remain
grep -r "from vat" --include="*.py" . | grep -v "__pycache__"

# Verify no vat directory exists
ls vat/ 2>&1 | grep "No such file"
```

## Rollback Plan

If issues are discovered:

1. **Revert branch**: `git checkout main`
2. **Restore vat app**: Already exists in main
3. **Revert migration**: `python manage.py migrate vat XXXX_previous`

## Success Criteria

- [ ] All existing VAT tests pass (100%)
- [ ] No `from vat.` imports in codebase
- [ ] `vat/` directory deleted
- [ ] `vat_audit` table dropped
- [ ] VAT calculation works for all regions (UK, IE, EU, SA, ROW)
- [ ] IP geolocation works for anonymous users
