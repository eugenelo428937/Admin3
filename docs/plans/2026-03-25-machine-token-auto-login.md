# Machine Token Auto-Login Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow admin staff to auto-login to Admin3 by clicking a browser shortcut containing a pre-provisioned machine token, eliminating manual credential entry.

**Architecture:** A `MachineToken` model in `core_auth` stores HMAC-hashed tokens linked to Django users. A new `/api/auth/machine-login/` endpoint validates the token and VPN subnet, then issues JWT tokens. The React frontend reads the token from a URL fragment (`#machine_token=...`), POSTs it to the backend, and stores the resulting JWT — identical to the existing login flow from that point on.

**Tech Stack:** Django 6.0, Django REST Framework (SimpleJWT, throttling), React 19.2, TypeScript, Material-UI v7

**Spec:** `docs/superpowers/specs/2026-03-25-machine-token-auto-login-design.md`

---

## Task 1: MachineToken Model + Migration

**Files:**
- Modify: `backend/django_Admin3/core_auth/models.py`
- Create: `backend/django_Admin3/core_auth/tests/` directory
- Create: `backend/django_Admin3/core_auth/tests/__init__.py`
- Create: `backend/django_Admin3/core_auth/tests/test_models.py`

### Step 1: Create test directory and write failing test

Create `backend/django_Admin3/core_auth/tests/__init__.py` (empty file).

Create `backend/django_Admin3/core_auth/tests/test_models.py`:

```python
import hmac
import hashlib
from django.test import TestCase
from django.contrib.auth.models import User
from django.conf import settings
from core_auth.models import MachineToken


class MachineTokenModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username='admin_test',
            email='admin@bpp.com',
            password='testpass123'
        )

    def test_create_machine_token(self):
        """MachineToken can be created with required fields."""
        token_hash = hmac.new(
            settings.SECRET_KEY.encode(),
            b'test_raw_token',
            hashlib.sha256
        ).hexdigest()

        mt = MachineToken.objects.create(
            token_hash=token_hash,
            user=self.user,
            machine_name='LAPTOP-TEST01'
        )
        self.assertEqual(mt.machine_name, 'LAPTOP-TEST01')
        self.assertEqual(mt.user, self.user)
        self.assertTrue(mt.is_active)
        self.assertIsNone(mt.last_used_at)
        self.assertIsNotNone(mt.created_at)

    def test_str_representation(self):
        """__str__ shows machine_name → user email."""
        mt = MachineToken.objects.create(
            token_hash='abc123',
            user=self.user,
            machine_name='LAPTOP-TEST01'
        )
        self.assertEqual(str(mt), 'LAPTOP-TEST01 → admin@bpp.com')

    def test_token_hash_unique(self):
        """token_hash must be unique."""
        MachineToken.objects.create(
            token_hash='unique_hash_1',
            user=self.user,
            machine_name='LAPTOP-A'
        )
        with self.assertRaises(Exception):
            MachineToken.objects.create(
                token_hash='unique_hash_1',
                user=self.user,
                machine_name='LAPTOP-B'
            )

    def test_db_table_name(self):
        """Model uses acted schema."""
        self.assertEqual(
            MachineToken._meta.db_table,
            '"acted"."machine_tokens"'
        )
```

### Step 2: Run test to verify it fails

```bash
cd backend/django_Admin3
python manage.py test core_auth.tests.test_models -v 2
```

Expected: FAIL — `ImportError: cannot import name 'MachineToken' from 'core_auth.models'`

### Step 3: Write the MachineToken model

Modify `backend/django_Admin3/core_auth/models.py`:

```python
from django.db import models
from django.contrib.auth.models import User


class MachineToken(models.Model):
    """Pre-provisioned authentication token for admin staff machines.

    Tokens are HMAC-SHA256 hashed with SECRET_KEY before storage.
    Raw tokens are shown once during creation and never stored.
    """
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='machine_tokens')
    machine_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = '"acted"."machine_tokens"'

    def __str__(self):
        return f"{self.machine_name} → {self.user.email}"
```

### Step 4: Create and run the migration

```bash
cd backend/django_Admin3
python manage.py makemigrations core_auth
python manage.py migrate core_auth
```

Expected: Migration `0001_initial.py` created and applied successfully.

### Step 5: Run tests to verify they pass

```bash
cd backend/django_Admin3
python manage.py test core_auth.tests.test_models -v 2
```

Expected: 4 tests PASS.

### Step 6: Verify schema placement

```bash
cd backend/django_Admin3
python manage.py verify_schema_placement
```

Expected: `machine_tokens` table is in `acted` schema.

### Step 7: Commit

```bash
git add backend/django_Admin3/core_auth/models.py backend/django_Admin3/core_auth/migrations/ backend/django_Admin3/core_auth/tests/
git commit -m "feat: add MachineToken model for admin auto-login"
```

---

## Task 2: Django Admin Registration

**Files:**
- Modify: `backend/django_Admin3/core_auth/admin.py`

### Step 1: Write the admin registration

Modify `backend/django_Admin3/core_auth/admin.py`:

```python
from django.contrib import admin
from .models import MachineToken


@admin.register(MachineToken)
class MachineTokenAdmin(admin.ModelAdmin):
    list_display = ['machine_name', 'user', 'is_active', 'created_at', 'last_used_at']
    list_filter = ['is_active']
    search_fields = ['machine_name', 'user__email']
    readonly_fields = ['token_hash', 'created_at', 'last_used_at']
```

### Step 2: Verify admin loads without error

```bash
cd backend/django_Admin3
python -c "from core_auth.admin import MachineTokenAdmin; print('OK')"
```

Expected: `OK`

### Step 3: Commit

```bash
git add backend/django_Admin3/core_auth/admin.py
git commit -m "feat: register MachineToken in Django admin"
```

---

## Task 3: Settings + Token Hashing + IP Validation Utilities

**Files:**
- Modify: `backend/django_Admin3/django_Admin3/settings/base.py` (add setting at end of file)
- Create: `backend/django_Admin3/core_auth/utils.py`
- Create: `backend/django_Admin3/core_auth/tests/test_utils.py`

### Step 1: Write failing tests for utilities

Create `backend/django_Admin3/core_auth/tests/test_utils.py`:

```python
from django.test import TestCase, override_settings
from core_auth.utils import hash_token, is_trusted_ip


class HashTokenTest(TestCase):
    def test_hash_is_deterministic(self):
        """Same token produces same hash."""
        h1 = hash_token('my_raw_token')
        h2 = hash_token('my_raw_token')
        self.assertEqual(h1, h2)

    def test_different_tokens_different_hashes(self):
        """Different tokens produce different hashes."""
        h1 = hash_token('token_a')
        h2 = hash_token('token_b')
        self.assertNotEqual(h1, h2)

    def test_hash_length_is_64(self):
        """HMAC-SHA256 hex digest is 64 chars."""
        h = hash_token('any_token')
        self.assertEqual(len(h), 64)

    @override_settings(SECRET_KEY='different_key')
    def test_hash_uses_secret_key(self):
        """Hash depends on SECRET_KEY — different key, different hash."""
        h_different = hash_token('same_token')
        # This hash was computed with 'different_key', so it should
        # differ from one computed with the default test SECRET_KEY
        self.assertEqual(len(h_different), 64)


@override_settings(MACHINE_LOGIN_TRUSTED_SUBNETS=['7.32.0.0/16', '10.0.0.0/8'])
class IsTrustedIpTest(TestCase):
    def test_ip_in_trusted_subnet(self):
        self.assertTrue(is_trusted_ip('7.32.3.4'))

    def test_ip_in_second_subnet(self):
        self.assertTrue(is_trusted_ip('10.1.2.3'))

    def test_ip_not_in_trusted_subnet(self):
        self.assertFalse(is_trusted_ip('192.168.1.1'))

    def test_ip_at_subnet_boundary(self):
        self.assertTrue(is_trusted_ip('7.32.0.0'))
        self.assertTrue(is_trusted_ip('7.32.255.255'))

    @override_settings(MACHINE_LOGIN_TRUSTED_SUBNETS=[])
    def test_empty_subnets_rejects_all(self):
        self.assertFalse(is_trusted_ip('7.32.3.4'))
```

### Step 2: Run tests to verify they fail

```bash
cd backend/django_Admin3
python manage.py test core_auth.tests.test_utils -v 2
```

Expected: FAIL — `ImportError: cannot import name 'hash_token' from 'core_auth.utils'`

### Step 3: Add setting and implement utilities

Append to the end of `backend/django_Admin3/django_Admin3/settings/base.py`:

```python
# Machine Token Auto-Login
# Trusted VPN subnets for machine token authentication
MACHINE_LOGIN_TRUSTED_SUBNETS = ['7.32.0.0/16']
```

Create `backend/django_Admin3/core_auth/utils.py`:

```python
import hmac
import hashlib
import ipaddress
from django.conf import settings


def hash_token(raw_token: str) -> str:
    """HMAC-SHA256 hash a raw token using SECRET_KEY.

    Defense-in-depth: even with full DB access, tokens cannot
    be verified without also knowing SECRET_KEY.
    """
    return hmac.new(
        settings.SECRET_KEY.encode(),
        raw_token.encode(),
        hashlib.sha256
    ).hexdigest()


def is_trusted_ip(client_ip: str) -> bool:
    """Check if client IP is within any trusted VPN subnet."""
    try:
        addr = ipaddress.ip_address(client_ip)
        return any(
            addr in ipaddress.ip_network(subnet)
            for subnet in settings.MACHINE_LOGIN_TRUSTED_SUBNETS
        )
    except (ValueError, TypeError):
        return False
```

### Step 4: Run tests to verify they pass

```bash
cd backend/django_Admin3
python manage.py test core_auth.tests.test_utils -v 2
```

Expected: All 9 tests PASS.

### Step 5: Commit

```bash
git add backend/django_Admin3/django_Admin3/settings/base.py backend/django_Admin3/core_auth/utils.py backend/django_Admin3/core_auth/tests/test_utils.py
git commit -m "feat: add token hashing and IP validation utilities"
```

---

## Task 4: Machine Login Endpoint + Throttle

**Files:**
- Modify: `backend/django_Admin3/core_auth/views.py` (add `machine_login` action + throttle class)
- Modify: `backend/django_Admin3/core_auth/urls.py` (add route)
- Create: `backend/django_Admin3/core_auth/tests/test_machine_login.py`

### Step 1: Write failing tests

Create `backend/django_Admin3/core_auth/tests/test_machine_login.py`:

```python
import secrets
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from core_auth.models import MachineToken
from core_auth.utils import hash_token


@override_settings(MACHINE_LOGIN_TRUSTED_SUBNETS=['7.32.0.0/16'])
class MachineLoginEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/machine-login/'
        self.user = User.objects.create_superuser(
            username='admin_ml',
            email='admin@bpp.com',
            password='testpass123'
        )
        # Create a valid machine token
        self.raw_token = secrets.token_hex(32)
        self.machine_token = MachineToken.objects.create(
            token_hash=hash_token(self.raw_token),
            user=self.user,
            machine_name='LAPTOP-TEST01'
        )

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_valid_token_returns_jwt(self, mock_ip):
        """Valid token + trusted IP returns JWT tokens and user data."""
        response = self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'admin@bpp.com')
        self.assertTrue(response.data['user']['is_superuser'])

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_valid_login_updates_last_used(self, mock_ip):
        """Successful login updates last_used_at."""
        self.assertIsNone(self.machine_token.last_used_at)
        self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')
        self.machine_token.refresh_from_db()
        self.assertIsNotNone(self.machine_token.last_used_at)

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_invalid_token_returns_403(self, mock_ip):
        """Invalid token returns 403 with generic message."""
        response = self.client.post(self.url, {
            'machine_token': 'invalid_token_value'
        }, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['error'], 'Machine login failed')

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_missing_token_returns_403(self, mock_ip):
        """Missing token returns 403 with generic message."""
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['error'], 'Machine login failed')

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_inactive_token_returns_403(self, mock_ip):
        """Inactive (revoked) token returns 403."""
        self.machine_token.is_active = False
        self.machine_token.save()
        response = self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')
        self.assertEqual(response.status_code, 403)

    @patch('core_auth.views.get_client_ip', return_value='192.168.1.1')
    def test_untrusted_ip_returns_403(self, mock_ip):
        """Request from untrusted IP returns 403."""
        response = self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')
        self.assertEqual(response.status_code, 403)

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_non_superuser_returns_403(self, mock_ip):
        """Token linked to non-superuser returns 403."""
        regular_user = User.objects.create_user(
            username='regular',
            email='regular@bpp.com',
            password='testpass123'
        )
        raw = secrets.token_hex(32)
        MachineToken.objects.create(
            token_hash=hash_token(raw),
            user=regular_user,
            machine_name='LAPTOP-REG'
        )
        response = self.client.post(self.url, {
            'machine_token': raw
        }, format='json')
        self.assertEqual(response.status_code, 403)

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_inactive_user_returns_403(self, mock_ip):
        """Token linked to inactive user returns 403."""
        self.user.is_active = False
        self.user.save()
        response = self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')
        self.assertEqual(response.status_code, 403)

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_all_failures_return_same_body(self, mock_ip):
        """All failure modes return identical response body."""
        # Invalid token
        r1 = self.client.post(self.url, {'machine_token': 'wrong'}, format='json')
        # Missing token
        r2 = self.client.post(self.url, {}, format='json')

        self.assertEqual(r1.data, r2.data)
        self.assertEqual(r1.data, {'error': 'Machine login failed'})

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_response_shape_matches_login(self, mock_ip):
        """Response has same top-level keys as /api/auth/login/."""
        response = self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')
        self.assertEqual(response.status_code, 200)
        # Must have token, refresh, user — same as login endpoint
        self.assertIn('token', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        # User must have is_superuser field
        self.assertIn('is_superuser', response.data['user'])
```

### Step 2: Run tests to verify they fail

```bash
cd backend/django_Admin3
python manage.py test core_auth.tests.test_machine_login -v 2
```

Expected: FAIL — 404 on `/api/auth/machine-login/` (endpoint doesn't exist yet).

### Step 3: Implement the endpoint

Add the throttle class and `machine_login` action to `backend/django_Admin3/core_auth/views.py`.

**Add imports** at the top of the file (after existing imports around line 1-24):

```python
from rest_framework.throttling import AnonRateThrottle
from core_auth.models import MachineToken
from core_auth.utils import hash_token, is_trusted_ip
```

**Add throttle class** after the imports (before the `serialize_user_for_email` function around line 27):

```python
class MachineLoginThrottle(AnonRateThrottle):
    scope = 'machine_login'
    rate = '5/min'
```

**Add `machine_login` action** inside the `AuthViewSet` class. Insert after the `login` action (after line 104):

```python
    @action(detail=False, methods=['post'],
            permission_classes=[AllowAny],
            throttle_classes=[MachineLoginThrottle])
    def machine_login(self, request):
        """
        Authenticate via pre-provisioned machine token.
        Validates token + VPN subnet, returns JWT tokens.
        No cart merge — admin users don't browse the store.
        """
        error_response = Response(
            {'error': 'Machine login failed'},
            status=status.HTTP_403_FORBIDDEN
        )

        raw_token = request.data.get('machine_token', '')
        if not raw_token:
            logger.warning('machine_login_failed: ip=%s reason=missing_token',
                           get_client_ip(request))
            return error_response

        # Hash and look up
        token_hash = hash_token(raw_token)
        try:
            machine_token = MachineToken.objects.select_related('user').get(
                token_hash=token_hash
            )
        except MachineToken.DoesNotExist:
            logger.warning('machine_login_failed: ip=%s reason=invalid_token',
                           get_client_ip(request))
            return error_response

        # Check token active
        if not machine_token.is_active:
            logger.warning('machine_login_failed: ip=%s reason=inactive_token',
                           get_client_ip(request))
            return error_response

        # Check trusted network
        client_ip = get_client_ip(request)
        if not is_trusted_ip(client_ip):
            logger.warning('machine_login_failed: ip=%s reason=untrusted_network',
                           client_ip)
            return error_response

        # Check user is active superuser
        user = machine_token.user
        if not user.is_active or not user.is_superuser:
            logger.warning('machine_login_failed: ip=%s reason=user_not_eligible',
                           client_ip)
            return error_response

        # Success — update timestamp and issue JWT
        from django.utils import timezone as tz
        machine_token.last_used_at = tz.now()
        machine_token.save(update_fields=['last_used_at'])

        refresh = RefreshToken.for_user(user)
        serializer = UserRegistrationSerializer(user)

        logger.info('machine_login: user=%s machine=%s ip=%s',
                     user.email, machine_token.machine_name, client_ip)

        return Response({
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': serializer.data
        })
```

**Note:** `get_client_ip` is already imported at line 13 of views.py: `from utils.recaptcha_utils import verify_recaptcha_v3, is_recaptcha_enabled, get_client_ip`

### Step 4: Add the URL route

Modify `backend/django_Admin3/core_auth/urls.py`.

Add after line 51 (after `auth_send_email_verification`):

```python
# Machine token login
auth_machine_login = AuthViewSet.as_view({
    'post': 'machine_login'
})
```

Add to `urlpatterns` list (before the closing `]`):

```python
    # Machine token auto-login
    path('machine-login/', auth_machine_login, name='auth-machine-login'),
```

### Step 5: Run tests to verify they pass

```bash
cd backend/django_Admin3
python manage.py test core_auth.tests.test_machine_login -v 2
```

Expected: All 10 tests PASS.

### Step 6: Run all core_auth tests

```bash
cd backend/django_Admin3
python manage.py test core_auth -v 2
```

Expected: All 23 tests PASS (4 model + 9 utils + 10 endpoint).

### Step 7: Commit

```bash
git add backend/django_Admin3/core_auth/views.py backend/django_Admin3/core_auth/urls.py backend/django_Admin3/core_auth/tests/test_machine_login.py
git commit -m "feat: add machine-login endpoint with throttle and audit logging"
```

---

## Task 5: Management Commands

**Files:**
- Create: `backend/django_Admin3/core_auth/management/__init__.py`
- Create: `backend/django_Admin3/core_auth/management/commands/__init__.py`
- Create: `backend/django_Admin3/core_auth/management/commands/create_machine_token.py`
- Create: `backend/django_Admin3/core_auth/management/commands/revoke_machine_token.py`
- Create: `backend/django_Admin3/core_auth/management/commands/list_machine_tokens.py`
- Create: `backend/django_Admin3/core_auth/tests/test_commands.py`

### Step 1: Write failing tests

Create `backend/django_Admin3/core_auth/tests/test_commands.py`:

```python
import secrets
from io import StringIO
from django.test import TestCase
from django.core.management import call_command
from django.contrib.auth.models import User
from core_auth.models import MachineToken
from core_auth.utils import hash_token


class CreateMachineTokenCommandTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username='admin_cmd',
            email='admin@bpp.com',
            password='testpass123'
        )

    def test_creates_token_for_user(self):
        """Command creates a MachineToken linked to the user."""
        out = StringIO()
        call_command('create_machine_token',
                     '--email', 'admin@bpp.com',
                     '--machine', 'LAPTOP-CMD01',
                     stdout=out)
        self.assertEqual(MachineToken.objects.count(), 1)
        mt = MachineToken.objects.first()
        self.assertEqual(mt.user, self.user)
        self.assertEqual(mt.machine_name, 'LAPTOP-CMD01')
        self.assertTrue(mt.is_active)

    def test_output_contains_token_and_url(self):
        """Command output shows raw token and full URL."""
        out = StringIO()
        call_command('create_machine_token',
                     '--email', 'admin@bpp.com',
                     '--machine', 'LAPTOP-CMD01',
                     stdout=out)
        output = out.getvalue()
        self.assertIn('Token:', output)
        self.assertIn('#machine_token=', output)
        self.assertIn('LAPTOP-CMD01', output)

    def test_nonexistent_user_error(self):
        """Command fails for non-existent email."""
        out = StringIO()
        err = StringIO()
        with self.assertRaises(SystemExit):
            call_command('create_machine_token',
                         '--email', 'noone@bpp.com',
                         '--machine', 'LAPTOP-X',
                         stdout=out, stderr=err)


class RevokeMachineTokenCommandTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username='admin_rev',
            email='admin@bpp.com',
            password='testpass123'
        )
        self.mt = MachineToken.objects.create(
            token_hash='hash_to_revoke',
            user=self.user,
            machine_name='LAPTOP-REV01'
        )

    def test_revoke_by_machine(self):
        """Revoke deactivates all tokens for machine."""
        out = StringIO()
        call_command('revoke_machine_token',
                     '--machine', 'LAPTOP-REV01',
                     '--force',
                     stdout=out)
        self.mt.refresh_from_db()
        self.assertFalse(self.mt.is_active)

    def test_revoke_by_user(self):
        """Revoke by --user deactivates all user tokens."""
        out = StringIO()
        call_command('revoke_machine_token',
                     '--user', 'admin@bpp.com',
                     '--force',
                     stdout=out)
        self.mt.refresh_from_db()
        self.assertFalse(self.mt.is_active)


class ListMachineTokensCommandTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username='admin_list',
            email='admin@bpp.com',
            password='testpass123'
        )
        MachineToken.objects.create(
            token_hash='hash_list_1',
            user=self.user,
            machine_name='LAPTOP-LIST01'
        )

    def test_list_shows_tokens(self):
        """List command shows token details."""
        out = StringIO()
        call_command('list_machine_tokens', stdout=out)
        output = out.getvalue()
        self.assertIn('LAPTOP-LIST01', output)
        self.assertIn('admin@bpp.com', output)

    def test_list_filter_by_user(self):
        """List with --user filters correctly."""
        out = StringIO()
        call_command('list_machine_tokens',
                     '--user', 'admin@bpp.com',
                     stdout=out)
        output = out.getvalue()
        self.assertIn('LAPTOP-LIST01', output)
```

### Step 2: Run tests to verify they fail

```bash
cd backend/django_Admin3
python manage.py test core_auth.tests.test_commands -v 2
```

Expected: FAIL — `No such command 'create_machine_token'`

### Step 3: Create the `__init__.py` files for the management commands directory

Create these empty files:
- `backend/django_Admin3/core_auth/management/__init__.py`
- `backend/django_Admin3/core_auth/management/commands/__init__.py`

### Step 4: Implement `create_machine_token` command

Create `backend/django_Admin3/core_auth/management/commands/create_machine_token.py`:

```python
import secrets
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from core_auth.models import MachineToken
from core_auth.utils import hash_token


class Command(BaseCommand):
    help = 'Create a machine token for admin auto-login'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True, help='User email address')
        parser.add_argument('--machine', required=True, help='Machine name (e.g., LAPTOP-ELO01)')

    def handle(self, *args, **options):
        email = options['email']
        machine_name = options['machine']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f'User with email "{email}" does not exist.')

        if not user.is_superuser:
            raise CommandError(f'User "{email}" is not a superuser.')

        raw_token = secrets.token_hex(32)
        token_hash = hash_token(raw_token)

        MachineToken.objects.create(
            token_hash=token_hash,
            user=user,
            machine_name=machine_name
        )

        self.stdout.write(self.style.SUCCESS(
            f'Machine token created for {email} on {machine_name}'
        ))
        self.stdout.write(f'Token: {raw_token}')
        self.stdout.write(f'URL:   https://7.32.1.138:8443/admin#machine_token={raw_token}')
        self.stdout.write(self.style.WARNING(
            '\nThis token will not be shown again. Save it now.'
        ))
```

### Step 5: Implement `revoke_machine_token` command

Create `backend/django_Admin3/core_auth/management/commands/revoke_machine_token.py`:

```python
from django.core.management.base import BaseCommand, CommandError
from core_auth.models import MachineToken


class Command(BaseCommand):
    help = 'Revoke machine tokens by machine name or user email'

    def add_arguments(self, parser):
        parser.add_argument('--machine', help='Machine name to revoke')
        parser.add_argument('--user', help='User email to revoke all tokens for')
        parser.add_argument('--force', action='store_true',
                            help='Skip confirmation prompt')

    def handle(self, *args, **options):
        machine = options.get('machine')
        user_email = options.get('user')
        force = options.get('force', False)

        if not machine and not user_email:
            raise CommandError('Provide --machine or --user')

        tokens = MachineToken.objects.filter(is_active=True)
        if machine:
            tokens = tokens.filter(machine_name=machine)
        if user_email:
            tokens = tokens.filter(user__email=user_email)

        count = tokens.count()
        if count == 0:
            self.stdout.write('No active tokens found matching criteria.')
            return

        if not force:
            self.stdout.write(f'Will revoke {count} token(s):')
            for t in tokens:
                self.stdout.write(f'  - {t.machine_name} → {t.user.email}')
            confirm = input('Proceed? [y/N] ')
            if confirm.lower() != 'y':
                self.stdout.write('Cancelled.')
                return

        tokens.update(is_active=False)
        self.stdout.write(self.style.SUCCESS(f'Revoked {count} token(s).'))
```

### Step 6: Implement `list_machine_tokens` command

Create `backend/django_Admin3/core_auth/management/commands/list_machine_tokens.py`:

```python
from django.core.management.base import BaseCommand
from core_auth.models import MachineToken


class Command(BaseCommand):
    help = 'List machine tokens with optional filtering'

    def add_arguments(self, parser):
        parser.add_argument('--user', help='Filter by user email')
        parser.add_argument('--machine', help='Filter by machine name')
        parser.add_argument('--all', action='store_true',
                            help='Include inactive tokens')

    def handle(self, *args, **options):
        tokens = MachineToken.objects.select_related('user').all()

        if not options.get('all'):
            tokens = tokens.filter(is_active=True)
        if options.get('user'):
            tokens = tokens.filter(user__email=options['user'])
        if options.get('machine'):
            tokens = tokens.filter(machine_name=options['machine'])

        if not tokens.exists():
            self.stdout.write('No tokens found.')
            return

        self.stdout.write(f'{"Machine":<25} {"User":<30} {"Active":<8} {"Created":<20} {"Last Used":<20}')
        self.stdout.write('-' * 103)

        for t in tokens:
            last_used = t.last_used_at.strftime('%Y-%m-%d %H:%M') if t.last_used_at else 'Never'
            created = t.created_at.strftime('%Y-%m-%d %H:%M')
            self.stdout.write(
                f'{t.machine_name:<25} {t.user.email:<30} {"Yes" if t.is_active else "No":<8} {created:<20} {last_used:<20}'
            )
```

### Step 7: Run tests to verify they pass

```bash
cd backend/django_Admin3
python manage.py test core_auth.tests.test_commands -v 2
```

Expected: All 6 tests PASS.

### Step 8: Run all core_auth tests

```bash
cd backend/django_Admin3
python manage.py test core_auth -v 2
```

Expected: All 29 tests PASS.

### Step 9: Commit

```bash
git add backend/django_Admin3/core_auth/management/ backend/django_Admin3/core_auth/tests/test_commands.py
git commit -m "feat: add create, revoke, list management commands for machine tokens"
```

---

## Task 6: Frontend TypeScript Types + Auth Service Method

**Files:**
- Modify: `frontend/react-Admin3/src/types/auth/auth.types.ts`
- Modify: `frontend/react-Admin3/src/services/authService.ts`
- Create: `frontend/react-Admin3/src/services/__tests__/authService.machineLogin.test.ts`

### Step 1: Write failing test

Create `frontend/react-Admin3/src/services/__tests__/authService.machineLogin.test.ts`:

```typescript
import authService from '../authService';
import httpService from '../httpService';

jest.mock('../httpService');
jest.mock('../loggerService', () => ({
  default: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

const mockedHttpService = httpService as jest.Mocked<typeof httpService>;

describe('authService.machineLogin', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('calls the correct endpoint with the token', async () => {
    mockedHttpService.post.mockResolvedValue({
      status: 200,
      data: {
        token: 'jwt_access',
        refresh: 'jwt_refresh',
        user: {
          id: 1,
          email: 'admin@bpp.com',
          first_name: 'Admin',
          last_name: 'User',
          is_superuser: true,
          is_active: true,
        },
      },
    } as any);

    await authService.machineLogin('my_raw_token');

    expect(mockedHttpService.post).toHaveBeenCalledWith(
      expect.stringContaining('/machine-login/'),
      { machine_token: 'my_raw_token' }
    );
  });

  it('stores JWT tokens on success', async () => {
    mockedHttpService.post.mockResolvedValue({
      status: 200,
      data: {
        token: 'jwt_access',
        refresh: 'jwt_refresh',
        user: {
          id: 1,
          email: 'admin@bpp.com',
          first_name: 'Admin',
          last_name: 'User',
          is_superuser: true,
          is_active: true,
        },
      },
    } as any);

    const result = await authService.machineLogin('my_raw_token');

    expect(result.status).toBe('success');
    expect(localStorage.getItem('token')).toBe('jwt_access');
    expect(localStorage.getItem('refreshToken')).toBe('jwt_refresh');
    expect(localStorage.getItem('isAuthenticated')).toBe('true');
  });

  it('returns error on 403 response', async () => {
    mockedHttpService.post.mockRejectedValue({
      response: {
        status: 403,
        data: { error: 'Machine login failed' },
      },
    });

    const result = await authService.machineLogin('bad_token');

    expect(result.status).toBe('error');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('returns error on network failure', async () => {
    mockedHttpService.post.mockRejectedValue(new Error('Network error'));

    const result = await authService.machineLogin('any_token');

    expect(result.status).toBe('error');
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd frontend/react-Admin3
npx jest --testPathPattern="authService.machineLogin" --no-coverage
```

Expected: FAIL — `authService.machineLogin is not a function`

### Step 3: Add type and implement method

**Add type to** `frontend/react-Admin3/src/types/auth/auth.types.ts`.

Insert after `LoginCredentials` interface (after line 8):

```typescript
export interface MachineLoginCredentials {
  machine_token: string;
}
```

**Add method to** `frontend/react-Admin3/src/services/authService.ts`.

Add `MachineLoginCredentials` to the import from `../types/auth` (line 5-17):

```typescript
import type {
  LoginCredentials,
  MachineLoginCredentials,
  AuthResult,
  ...
```

Add the `machineLogin` method inside the `authService` object, after the `login` method (after line 119):

```typescript
  // ─── Machine Token Login ──────────────────────────────────────
  machineLogin: async (rawToken: string): Promise<AuthResult> => {
    (logger as any).debug("Attempting machine token login");

    // Clear any existing auth data
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("isAuthenticated");

    try {
      const response = await httpService.post(
        `${API_AUTH_URL}/machine-login/`,
        { machine_token: rawToken }
      );

      if (
        response.status === 200 &&
        response.data?.token &&
        response.data?.user
      ) {
        localStorage.setItem("token", response.data.token);
        if (response.data.refresh) {
          localStorage.setItem("refreshToken", response.data.refresh);
        }
        localStorage.setItem("user", JSON.stringify(response.data.user));
        localStorage.setItem("isAuthenticated", "true");

        (logger as any).info("Machine login successful", {
          userId: response.data.user.id,
        });

        return {
          status: "success",
          user: response.data.user,
          message: "Machine login successful",
        };
      }

      return {
        status: "error",
        message: "Invalid response from server",
        code: 500,
      };
    } catch (error: any) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("isAuthenticated");

      (logger as any).error("Machine login failed", {
        status: error.response?.status,
      });

      return {
        status: "error",
        message: "Auto-login failed. Please log in manually.",
        code: error.response?.status || 500,
      };
    }
  },
```

### Step 4: Run test to verify it passes

```bash
cd frontend/react-Admin3
npx jest --testPathPattern="authService.machineLogin" --no-coverage
```

Expected: All 4 tests PASS.

### Step 5: Commit

```bash
git add frontend/react-Admin3/src/types/auth/auth.types.ts frontend/react-Admin3/src/services/authService.ts frontend/react-Admin3/src/services/__tests__/authService.machineLogin.test.ts
git commit -m "feat: add machineLogin method to authService"
```

---

## Task 7: Frontend useAuth Integration

**Files:**
- Modify: `frontend/react-Admin3/src/hooks/useAuth.tsx`
- Create: `frontend/react-Admin3/src/hooks/__tests__/useAuth.machineLogin.test.tsx`

### Step 1: Write failing test

Create `frontend/react-Admin3/src/hooks/__tests__/useAuth.machineLogin.test.tsx`:

```tsx
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../useAuth';
import authService from '../../services/authService';

jest.mock('../../services/authService');
const mockedAuthService = authService as jest.Mocked<typeof authService>;

// Helper component to observe auth state
function AuthStateObserver({ onState }: { onState: (state: any) => void }) {
  const auth = useAuth();
  React.useEffect(() => {
    onState(auth);
  });
  return null;
}

function renderWithAuth(
  initialUrl: string,
  onState: (state: any) => void
) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <AuthProvider>
        <AuthStateObserver onState={onState} />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('useAuth machine token auto-login', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // Mock getUserDetails to not throw
    mockedAuthService.getUserDetails.mockResolvedValue({
      id: 1, email: 'admin@bpp.com', first_name: 'Admin',
      last_name: 'User', is_superuser: true, is_active: true,
    });
    // Default: no hash
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, hash: '' },
    });
    window.history.replaceState = jest.fn();
  });

  it('does not call machineLogin when no fragment present', async () => {
    let lastState: any;
    renderWithAuth('/admin', (s) => { lastState = s; });

    await waitFor(() => {
      expect(lastState.isLoading).toBe(false);
    });

    expect(mockedAuthService.machineLogin).not.toHaveBeenCalled();
  });

  it('calls machineLogin when #machine_token= is in URL', async () => {
    window.location.hash = '#machine_token=abc123';

    mockedAuthService.machineLogin.mockResolvedValue({
      status: 'success',
      user: {
        id: 1, email: 'admin@bpp.com', first_name: 'Admin',
        last_name: 'User', is_superuser: true, is_active: true,
      },
      message: 'Machine login successful',
    });

    let lastState: any;
    renderWithAuth('/admin', (s) => { lastState = s; });

    await waitFor(() => {
      expect(mockedAuthService.machineLogin).toHaveBeenCalledWith('abc123');
    });

    await waitFor(() => {
      expect(lastState.isAuthenticated).toBe(true);
      expect(lastState.isSuperuser).toBe(true);
    });
  });

  it('clears URL fragment after successful login', async () => {
    window.location.hash = '#machine_token=abc123';

    mockedAuthService.machineLogin.mockResolvedValue({
      status: 'success',
      user: {
        id: 1, email: 'admin@bpp.com', first_name: 'Admin',
        last_name: 'User', is_superuser: true, is_active: true,
      },
      message: 'Machine login successful',
    });

    renderWithAuth('/admin', () => {});

    await waitFor(() => {
      expect(window.history.replaceState).toHaveBeenCalled();
    });
  });

  it('sets error on failed machine login', async () => {
    window.location.hash = '#machine_token=bad_token';

    mockedAuthService.machineLogin.mockResolvedValue({
      status: 'error',
      message: 'Auto-login failed. Please log in manually.',
      code: 403,
    });

    let lastState: any;
    renderWithAuth('/admin', (s) => { lastState = s; });

    await waitFor(() => {
      expect(lastState.isAuthenticated).toBe(false);
      expect(lastState.error).toBeTruthy();
    });
  });

  it('clears URL fragment even on failure', async () => {
    window.location.hash = '#machine_token=bad_token';

    mockedAuthService.machineLogin.mockResolvedValue({
      status: 'error',
      message: 'Failed',
      code: 403,
    });

    renderWithAuth('/admin', () => {});

    await waitFor(() => {
      expect(window.history.replaceState).toHaveBeenCalled();
    });
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd frontend/react-Admin3
npx jest --testPathPattern="useAuth.machineLogin" --no-coverage
```

Expected: FAIL — `machineLogin` is never called because `useAuth.tsx` doesn't check for the hash yet.

### Step 3: Modify useAuth.tsx

In `frontend/react-Admin3/src/hooks/useAuth.tsx`, modify the `initializeAuth` function inside the `useEffect` (starting at line 81).

Replace the `initializeAuth` function body (lines 82-107) with:

```typescript
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        // Check for machine token in URL fragment
        const hash = window.location.hash;
        if (hash.includes('machine_token=')) {
          const token = hash.split('machine_token=')[1];
          // Clear fragment immediately — before any network request
          window.history.replaceState({}, '', window.location.pathname);

          if (token) {
            const result = await authService.machineLogin(token);
            if (result.status === 'success' && result.user) {
              setUser(result.user);
              setIsAuthenticated(true);
              updateUserRoles(result.user);
              setIsLoading(false);
              return;
            }
            // Machine login failed — set error, fall through to normal flow
            setError(result.message || 'Auto-login failed. Please log in manually.');
          }
        }

        // Normal auth initialization: check localStorage
        const storedUser = localStorage.getItem("user");
        const storedAuth = localStorage.getItem("isAuthenticated");

        if (storedUser && storedAuth === "true") {
          const userData: AuthUser = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
          updateUserRoles(userData);

          // Verify token is still valid
          try {
            await authService.getUserDetails();
          } catch (e) {
            await clearAuthState();
          }
        }
      } catch (err: any) {
        setError(err.message);
        await clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };
```

**Important:** The `authService` import at line 4 already exists. The `machineLogin` method was added in Task 6, so no new imports are needed.

### Step 4: Run test to verify it passes

```bash
cd frontend/react-Admin3
npx jest --testPathPattern="useAuth.machineLogin" --no-coverage
```

Expected: All 5 tests PASS.

### Step 5: Run existing auth tests to check no regression

```bash
cd frontend/react-Admin3
npx jest --testPathPattern="useAuth" --no-coverage
```

Expected: All existing + new tests PASS.

### Step 6: Commit

```bash
git add frontend/react-Admin3/src/hooks/useAuth.tsx frontend/react-Admin3/src/hooks/__tests__/useAuth.machineLogin.test.tsx
git commit -m "feat: auto-login from URL fragment machine token in useAuth"
```

---

## Task 8: End-to-End Manual Verification

**Files:** None (manual testing only)

### Step 1: Start backend and create a test token

```bash
cd backend/django_Admin3
python manage.py create_machine_token --email <your-email> --machine "DEV-MACHINE"
```

Save the output URL.

### Step 2: Start frontend

```bash
cd frontend/react-Admin3
npm start
```

### Step 3: Test auto-login

Open the URL from Step 1 in the browser (on VPN). Expected: lands directly on admin dashboard without any login form.

### Step 4: Test failure modes

- Open `https://7.32.1.138:8443/admin#machine_token=invalid_token` — should show login form with error
- Open `https://7.32.1.138:8443/admin` (no token) — should show normal login form
- Revoke the token: `python manage.py revoke_machine_token --machine "DEV-MACHINE" --force`
- Re-open the original URL — should show login form with error

### Step 5: Test normal login still works

Open `https://7.32.1.138:8443` and log in with email/password as usual. Expected: works exactly as before.

### Step 6: List tokens

```bash
python manage.py list_machine_tokens
```

Expected: shows the test token (now inactive if revoked).

### Step 7: Commit (if any adjustments were needed)

```bash
git commit -m "fix: adjustments from manual verification"
```

---

## Summary

| Task | What | Tests |
|------|------|-------|
| 1 | MachineToken model + migration | 4 |
| 2 | Django Admin registration | 0 (verified manually) |
| 3 | Settings + utils (hash_token, is_trusted_ip) | 9 |
| 4 | Machine login endpoint + throttle | 10 |
| 5 | Management commands (create, revoke, list) | 6 |
| 6 | Frontend types + authService.machineLogin | 4 |
| 7 | useAuth integration (URL fragment detection) | 5 |
| 8 | End-to-end manual verification | — |
| **Total** | | **38 automated tests** |
