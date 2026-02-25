# Email System Extraction — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the email system from Admin3 into a standalone Docker-deployable service with its own repository, database, and admin UI.

**Architecture:** 4-service Docker Compose stack (Nginx+React, Django+Gunicorn, PostgreSQL, Queue Worker) deployed on Windows Server 2019. Single exposed port (8080) with Nginx reverse proxy. Two API surfaces: admin CRUD (session auth) and integration API (API key auth).

**Tech Stack:** Django 6.0, Django REST Framework, React 19.2, Material-UI v7, PostgreSQL 16, Nginx, Docker Compose, Gunicorn

**Design Doc:** `docs/plans/2026-02-24-email-system-extraction-design.md`

---

## Phase 0: Network Investigation Script

> Run on the Windows Server 2019 before any extraction work begins.
> Results determine whether Phase 4 (deployment) uses online or offline path.

### Task 0.1: Create PowerShell Network Diagnostic Script

**Files:**
- Create: `scripts/network-diagnostic.ps1`

**Step 1: Write the diagnostic script**

```powershell
#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Network diagnostic for Email System Docker deployment.
    Run on target Windows Server 2019 before deployment.
.OUTPUTS
    Console report + results saved to network-diagnostic-results.txt
#>

$results = @()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Log($section, $test, $status, $detail) {
    $entry = [PSCustomObject]@{
        Section = $section
        Test    = $test
        Status  = $status
        Detail  = $detail
    }
    $script:results += $entry
    $color = if ($status -eq 'PASS') { 'Green' } elseif ($status -eq 'WARN') { 'Yellow' } else { 'Red' }
    Write-Host "[$status] $section > $test" -ForegroundColor $color
    if ($detail) { Write-Host "        $detail" -ForegroundColor Gray }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Email System - Network Diagnostic" -ForegroundColor Cyan
Write-Host " $timestamp" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── Section 1: System Requirements ──

$os = Get-CimInstance Win32_OperatingSystem
Log "System" "Windows Version" "INFO" "$($os.Caption) Build $($os.BuildNumber)"

$ram = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
if ($ram -ge 8) { Log "System" "RAM ($($ram)GB)" "PASS" "Minimum 8GB met" }
else { Log "System" "RAM ($($ram)GB)" "FAIL" "Need 8GB+, have $($ram)GB" }

$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGB = [math]::Round($disk.FreeSpace / 1GB, 1)
if ($freeGB -ge 20) { Log "System" "Disk Free ($($freeGB)GB)" "PASS" "Minimum 20GB met" }
else { Log "System" "Disk Free ($($freeGB)GB)" "FAIL" "Need 20GB+, have $($freeGB)GB" }

$hyperv = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -ErrorAction SilentlyContinue
if ($hyperv.State -eq 'Enabled') { Log "System" "Hyper-V" "PASS" "Enabled" }
else { Log "System" "Hyper-V" "WARN" "Not enabled — required for Linux containers" }

$containers = Get-WindowsOptionalFeature -Online -FeatureName Containers -ErrorAction SilentlyContinue
if ($containers.State -eq 'Enabled') { Log "System" "Containers Feature" "PASS" "Enabled" }
else { Log "System" "Containers Feature" "WARN" "Not enabled" }

# ── Section 2: Network Egress (Outbound) ──

$endpoints = @(
    @{ Name = "Docker Hub";     URL = "https://hub.docker.com";      Port = 443 },
    @{ Name = "npm Registry";   URL = "https://registry.npmjs.org";  Port = 443 },
    @{ Name = "PyPI";           URL = "https://pypi.org";            Port = 443 },
    @{ Name = "GitHub";         URL = "https://github.com";          Port = 443 },
    @{ Name = "GitHub Registry";URL = "https://ghcr.io";             Port = 443 }
)

foreach ($ep in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $ep.URL -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        Log "Egress" $ep.Name "PASS" "HTTP $($response.StatusCode)"
    } catch {
        Log "Egress" $ep.Name "FAIL" $_.Exception.Message
    }
}

# SMTP relay
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("10.20.3.4", 25)
    if ($tcp.Connected) { Log "Egress" "SMTP Relay (10.20.3.4:25)" "PASS" "Connected" }
    $tcp.Close()
} catch {
    Log "Egress" "SMTP Relay (10.20.3.4:25)" "FAIL" $_.Exception.Message
}

# Proxy detection
$proxy = [System.Net.WebRequest]::GetSystemWebProxy()
$proxyUri = $proxy.GetProxy("https://github.com")
if ($proxyUri.Host -ne "github.com") {
    Log "Egress" "HTTP Proxy Detected" "WARN" "Proxy: $proxyUri"
} else {
    Log "Egress" "HTTP Proxy" "INFO" "No proxy detected"
}

# ── Section 3: Network Ingress (Inbound) ──

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }).IPAddress
Log "Ingress" "Server IP(s)" "INFO" ($ip -join ", ")

$firewall = Get-NetFirewallProfile | Select-Object Name, Enabled
foreach ($fw in $firewall) {
    $status = if ($fw.Enabled) { "WARN" } else { "INFO" }
    Log "Ingress" "Firewall: $($fw.Name)" $status "Enabled=$($fw.Enabled)"
}

# Test port binding
$testPort = 8080
try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $testPort)
    $listener.Start()
    Log "Ingress" "Port $testPort Bind" "PASS" "Can bind to port $testPort"
    $listener.Stop()
} catch {
    Log "Ingress" "Port $testPort Bind" "FAIL" "Cannot bind: $($_.Exception.Message)"
}

# ── Section 4: Docker Status ──

$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    $version = docker version --format '{{.Server.Version}}' 2>&1
    Log "Docker" "Installed" "PASS" "Version: $version"

    $composeVersion = docker compose version 2>&1
    Log "Docker" "Compose" "PASS" "$composeVersion"

    # Test container run
    $hello = docker run --rm hello-world 2>&1
    if ($LASTEXITCODE -eq 0) { Log "Docker" "Container Run" "PASS" "hello-world succeeded" }
    else { Log "Docker" "Container Run" "FAIL" "hello-world failed: $hello" }

    # Test container→host network (SMTP)
    $smtpTest = docker run --rm alpine sh -c "nc -z -w5 host.docker.internal 25 && echo OK || echo FAIL" 2>&1
    # Note: host.docker.internal may not work on all Docker setups
    Log "Docker" "Container→SMTP" "INFO" "Result: $smtpTest (verify manually if FAIL)"
} else {
    Log "Docker" "Installed" "FAIL" "Docker not found in PATH"
}

# ── Summary ──

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$pass = ($results | Where-Object Status -eq 'PASS').Count
$fail = ($results | Where-Object Status -eq 'FAIL').Count
$warn = ($results | Where-Object Status -eq 'WARN').Count
Write-Host "PASS: $pass  |  WARN: $warn  |  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { 'Red' } else { 'Green' })

# Deployment path recommendation
$hasInternet = ($results | Where-Object { $_.Section -eq 'Egress' -and $_.Test -eq 'Docker Hub' -and $_.Status -eq 'PASS' }).Count -gt 0
$hasDocker = ($results | Where-Object { $_.Section -eq 'Docker' -and $_.Test -eq 'Installed' -and $_.Status -eq 'PASS' }).Count -gt 0

Write-Host "`nRECOMMENDED DEPLOYMENT PATH:" -ForegroundColor Yellow
if ($hasDocker -and $hasInternet) {
    Write-Host "  ONLINE — Docker installed + internet access. Use docker-compose pull." -ForegroundColor Green
} elseif ($hasDocker) {
    Write-Host "  OFFLINE — Docker installed but no internet. Use docker save/load." -ForegroundColor Yellow
} else {
    Write-Host "  INSTALL DOCKER FIRST — Then re-run this script." -ForegroundColor Red
}

# Save results
$outFile = "network-diagnostic-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$results | Format-Table -AutoSize | Out-String | Set-Content $outFile
Write-Host "`nResults saved to: $outFile" -ForegroundColor Gray
```

**Step 2: Commit**

```bash
git add scripts/network-diagnostic.ps1
git commit -m "feat: add network diagnostic script for Windows Server deployment"
```

---

## Phase 1: Backend Extraction

> All tasks in this phase create files in the NEW repository `acted-email-system`.
> Source files are copied from Admin3 at the paths noted, then modified.

### Task 1.1: Scaffold the Django Project

**Files:**
- Create: `backend/manage.py`
- Create: `backend/email_project/__init__.py`
- Create: `backend/email_project/wsgi.py`
- Create: `backend/email_project/settings/__init__.py`
- Create: `backend/email_project/settings/base.py`
- Create: `backend/email_project/settings/development.py`
- Create: `backend/email_project/settings/production.py`
- Create: `backend/requirements.txt`

**Step 1: Create the new repository**

```bash
mkdir -p ../acted-email-system/backend/email_project/settings
cd ../acted-email-system
git init
```

**Step 2: Write `backend/manage.py`**

Standard Django manage.py pointing to `email_project.settings.development`:

```python
#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'email_project.settings.development')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
```

**Step 3: Write `backend/email_project/settings/base.py`**

Core settings shared across environments. Key points:
- `INSTALLED_APPS` includes only: `django.contrib.admin`, `django.contrib.auth`, `django.contrib.contenttypes`, `django.contrib.sessions`, `django.contrib.messages`, `django.contrib.staticfiles`, `rest_framework`, `corsheaders`, `email_system`
- `ROOT_URLCONF = 'email_project.urls'`
- `WSGI_APPLICATION = 'email_project.wsgi.application'`
- `AUTH_PASSWORD_VALIDATORS` standard set
- `REST_FRAMEWORK` default permission: `IsAuthenticated`
- `CORS_ALLOWED_ORIGINS` from env var
- `STATIC_URL = '/static/'`, `STATIC_ROOT = BASE_DIR / 'staticfiles'`
- Database configured from `DATABASE_URL` env var
- `SECRET_KEY` from env var

**Step 4: Write `backend/email_project/settings/development.py`**

```python
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

# Email — Internal SMTP
EMAIL_BACKEND = 'email_system.backends.custom_backends.CramMD5EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', '10.20.3.4')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 25))
EMAIL_USE_TLS = False
EMAIL_USE_SSL = False
EMAIL_TIMEOUT = 30
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''

# Development overrides
DEV_EMAIL_OVERRIDE = True
DEV_EMAIL_RECIPIENTS = os.environ.get('DEV_EMAIL_RECIPIENTS', '').split(',')
EMAIL_BCC_MONITORING = False
EMAIL_BCC_RECIPIENTS = []
EMAIL_ATTACHMENT_UPLOAD_PATH = 'static/documents'
```

**Step 5: Write `backend/email_project/settings/production.py`**

```python
from .base import *

DEBUG = False
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',')

EMAIL_BACKEND = 'email_system.backends.custom_backends.CramMD5EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', '10.20.3.4')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 25))
EMAIL_USE_TLS = False
EMAIL_USE_SSL = False
EMAIL_TIMEOUT = 30

DEV_EMAIL_OVERRIDE = False
EMAIL_BCC_MONITORING = os.environ.get('EMAIL_BCC_MONITORING', 'False') == 'True'
EMAIL_BCC_RECIPIENTS = os.environ.get('EMAIL_BCC_RECIPIENTS', '').split(',')
EMAIL_ATTACHMENT_UPLOAD_PATH = 'static/documents'

# Security
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

**Step 6: Write `backend/requirements.txt`**

```
django>=6.0,<7.0
djangorestframework>=3.15,<4.0
django-cors-headers>=4.0
gunicorn>=23.0
psycopg2-binary>=2.9
python-mjml>=1.0
premailer>=3.10
html2text>=2024.2
dj-database-url>=2.0
```

**Step 7: Write `backend/email_project/wsgi.py`**

```python
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'email_project.settings.production')
application = get_wsgi_application()
```

**Step 8: Commit**

```bash
git add backend/
git commit -m "feat: scaffold Django project structure for email system"
```

---

### Task 1.2: Create the Inline Staff Model

**Files:**
- Create: `backend/email_project/email_system/models/staff.py`
- Test: `backend/email_project/email_system/tests/test_staff_model.py`

**Step 1: Write the failing test**

```python
# test_staff_model.py
from django.test import TestCase
from email_system.models import Staff


class StaffModelTest(TestCase):
    def test_create_staff_member(self):
        staff = Staff.objects.create(
            name="John Smith",
            email="john.smith@example.com",
        )
        self.assertEqual(staff.name, "John Smith")
        self.assertEqual(staff.email, "john.smith@example.com")
        self.assertTrue(staff.is_active)
        self.assertEqual(str(staff), "John Smith")

    def test_staff_inactive(self):
        staff = Staff.objects.create(
            name="Jane Doe",
            email="jane@example.com",
            is_active=False,
        )
        self.assertFalse(staff.is_active)
```

**Step 2: Run test to verify it fails**

Run: `python manage.py test email_system.tests.test_staff_model -v2`
Expected: FAIL — `Staff` model does not exist

**Step 3: Write the Staff model**

```python
# staff.py
from django.db import models


class Staff(models.Model):
    """
    Inline Staff model for email closing salutations.
    Replaces the FK to tutorials.Staff from Admin3.
    """
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'email_staff'
        ordering = ['name']
        verbose_name_plural = 'staff'

    def __str__(self):
        return self.name
```

**Step 4: Run test to verify it passes**

Run: `python manage.py test email_system.tests.test_staff_model -v2`
Expected: PASS

**Step 5: Commit**

```bash
git add email_system/models/staff.py email_system/tests/test_staff_model.py
git commit -m "feat: add inline Staff model for closing salutations"
```

---

### Task 1.3: Copy and Adapt Email Models

**Files:**
- Copy from Admin3: `backend/django_Admin3/email_system/models/` → `backend/email_project/email_system/models/`
- Modify: `closing_salutation.py` line 75 — change `'tutorials.Staff'` → `'email_system.Staff'`
- Modify: `closing_salutation.py` line 43 — change `select_related('staff__user')` → `select_related('staff')`
- Create: `backend/email_project/email_system/models/__init__.py` — add `Staff` to exports

**Step 1: Copy all model files from Admin3**

Copy these files as-is:
- `template.py` (from `backend/django_Admin3/email_system/models/template.py`)
- `queue.py` (from `backend/django_Admin3/email_system/models/queue.py`)
- `log.py` (from `backend/django_Admin3/email_system/models/log.py`)
- `settings.py` (from `backend/django_Admin3/email_system/models/settings.py`)
- `placeholder.py` (from `backend/django_Admin3/email_system/models/placeholder.py`)
- `content_rule.py` (from `backend/django_Admin3/email_system/models/content_rule.py`)

**Step 2: Copy and modify `closing_salutation.py`**

Two changes needed:
1. Line 75: `ForeignKey('tutorials.Staff', ...)` → `ForeignKey('email_system.Staff', ...)`
2. Line 43: `.select_related('staff__user')` → `.select_related('staff')`

**Step 3: Update `__init__.py` exports**

Add `Staff` to the existing exports list:

```python
from .staff import Staff
from .template import EmailTemplate, EmailAttachment, EmailTemplateAttachment
from .queue import EmailQueue
from .log import EmailLog
from .settings import EmailSettings
from .placeholder import EmailContentPlaceholder
from .content_rule import EmailContentRule, EmailTemplateContentRule
from .closing_salutation import ClosingSalutation, ClosingSalutationStaff

__all__ = [
    'Staff',
    'EmailTemplate', 'EmailAttachment', 'EmailTemplateAttachment',
    'EmailQueue', 'EmailLog', 'EmailSettings',
    'EmailContentRule', 'EmailTemplateContentRule',
    'EmailContentPlaceholder',
    'ClosingSalutation', 'ClosingSalutationStaff',
]
```

**Step 4: Commit**

```bash
git add email_system/models/
git commit -m "feat: extract email models with inline Staff FK"
```

---

### Task 1.4: Create Permissions Module

**Files:**
- Create: `backend/email_project/email_system/permissions.py`
- Test: `backend/email_project/email_system/tests/test_permissions.py`

**Step 1: Write the failing test**

```python
# test_permissions.py
from django.test import TestCase, RequestFactory
from django.contrib.auth.models import User
from email_system.permissions import IsSuperUser, HasAPIKey


class IsSuperUserTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.superuser = User.objects.create_superuser('admin', 'admin@test.com', 'pass')
        self.regular_user = User.objects.create_user('user', 'user@test.com', 'pass')

    def test_superuser_allowed(self):
        request = self.factory.get('/')
        request.user = self.superuser
        self.assertTrue(IsSuperUser().has_permission(request, None))

    def test_regular_user_denied(self):
        request = self.factory.get('/')
        request.user = self.regular_user
        self.assertFalse(IsSuperUser().has_permission(request, None))


class HasAPIKeyTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        # Create an API key setting
        from email_system.models import EmailSettings
        EmailSettings.objects.create(
            key='api_key_test_system',
            setting_type='security',
            display_name='Test API Key',
            value='sk-test-key-12345',
            is_active=True,
        )

    def test_valid_api_key(self):
        request = self.factory.get('/', HTTP_X_API_KEY='sk-test-key-12345')
        self.assertTrue(HasAPIKey().has_permission(request, None))

    def test_invalid_api_key(self):
        request = self.factory.get('/', HTTP_X_API_KEY='wrong-key')
        self.assertFalse(HasAPIKey().has_permission(request, None))

    def test_missing_api_key(self):
        request = self.factory.get('/')
        self.assertFalse(HasAPIKey().has_permission(request, None))
```

**Step 2: Run tests to verify they fail**

Run: `python manage.py test email_system.tests.test_permissions -v2`
Expected: FAIL — `IsSuperUser` and `HasAPIKey` not defined

**Step 3: Write permissions**

```python
# permissions.py
from rest_framework.permissions import BasePermission


class IsSuperUser(BasePermission):
    """Allows access only to superusers."""

    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class HasAPIKey(BasePermission):
    """Allows access via X-API-Key header matching an active api_key_* setting."""

    def has_permission(self, request, view):
        api_key = request.META.get('HTTP_X_API_KEY', '')
        if not api_key:
            return False

        from email_system.models import EmailSettings
        return EmailSettings.objects.filter(
            key__startswith='api_key_',
            value=api_key,
            is_active=True,
        ).exists()
```

**Step 4: Run tests to verify they pass**

Run: `python manage.py test email_system.tests.test_permissions -v2`
Expected: PASS

**Step 5: Commit**

```bash
git add email_system/permissions.py email_system/tests/test_permissions.py
git commit -m "feat: add IsSuperUser and HasAPIKey permission classes"
```

---

### Task 1.5: Copy Services Layer

**Files:**
- Copy from Admin3: `backend/django_Admin3/email_system/services/email_service.py` → as-is
- Copy from Admin3: `backend/django_Admin3/email_system/services/queue_service.py` → as-is
- Copy from Admin3: `backend/django_Admin3/email_system/services/content_insertion.py` → as-is
- Copy from Admin3: `backend/django_Admin3/email_system/backends/custom_backends.py` → as-is

**Step 1: Copy all service files unchanged**

These files have zero external app dependencies. All imports reference only:
- Standard library (`logging`, `json`, `hashlib`, `uuid`, `re`)
- Django (`django.core.mail`, `django.template`, `django.conf`, `django.utils`, `django.db`)
- External packages (`premailer`, `mjml`)
- Internal (`email_system.models`)

**Step 2: Copy custom email backend unchanged**

`custom_backends.py` (253 lines) uses only stdlib + Django email backend. No changes needed.

**Step 3: Verify imports**

Run: `python -c "from email_system.services.email_service import EmailService; print('OK')"`
Expected: `OK` (or import errors that reveal remaining dependencies)

**Step 4: Commit**

```bash
git add email_system/services/ email_system/backends/
git commit -m "feat: extract email services and CRAM-MD5 backend"
```

---

### Task 1.6: Copy and Adapt Views + Serializers

**Files:**
- Copy from Admin3: `backend/django_Admin3/email_system/serializers.py`
- Copy from Admin3: `backend/django_Admin3/email_system/views.py`
- Modify: `views.py` line 9 — change `from catalog.permissions import IsSuperUser` → `from email_system.permissions import IsSuperUser`
- Modify: `views.py` line 282-283 — change `staff_members__staff__user` → `staff_members__staff`
- Modify: `serializers.py` line 138 — update `ClosingSalutationStaffSerializer` to use local Staff fields

**Step 1: Copy serializers.py**

Copy as-is. The only change needed is in the `ClosingSalutationStaffSerializer` — update `str(obj.staff)` to use the local Staff model's `__str__` (which returns `name` — compatible).

**Step 2: Copy and modify views.py**

Two changes:
1. Line 9: `from catalog.permissions import IsSuperUser` → `from email_system.permissions import IsSuperUser`
2. Line 282-283: Change prefetch `staff_members__staff__user` → `staff_members__staff`

**Step 3: Commit**

```bash
git add email_system/serializers.py email_system/views.py
git commit -m "feat: extract views and serializers with local permission import"
```

---

### Task 1.7: Build the Integration API (v1 Send/Status/Health)

**Files:**
- Create: `backend/email_project/email_system/views_integration.py`
- Create: `backend/email_project/email_system/tests/test_integration_api.py`

**Step 1: Write the failing tests**

```python
# test_integration_api.py
from django.test import TestCase
from rest_framework.test import APIClient
from email_system.models import EmailSettings, EmailTemplate, EmailQueue


class IntegrationAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create API key
        EmailSettings.objects.create(
            key='api_key_admin3',
            setting_type='security',
            display_name='Admin3 API Key',
            value='sk-test-key-12345',
            is_active=True,
        )
        # Create a template
        self.template = EmailTemplate.objects.create(
            name='order_confirmation',
            template_type='order_confirmation',
            display_name='Order Confirmation',
            subject_template='Order #{{ order_id }}',
            is_active=True,
        )

    def _auth_header(self):
        return {'HTTP_X_API_KEY': 'sk-test-key-12345'}

    def test_send_queues_email(self):
        response = self.client.post('/api/v1/send/', {
            'template': 'order_confirmation',
            'to': ['user@example.com'],
            'context': {'order_id': 'ORD-123'},
            'priority': 'high',
            'tags': ['order-123'],
        }, format='json', **self._auth_header())
        self.assertEqual(response.status_code, 201)
        self.assertIn('queue_id', response.data)
        self.assertEqual(response.data['status'], 'pending')

    def test_send_requires_api_key(self):
        response = self.client.post('/api/v1/send/', {
            'template': 'order_confirmation',
            'to': ['user@example.com'],
        }, format='json')
        self.assertEqual(response.status_code, 403)

    def test_status_by_queue_id(self):
        # Queue an email first
        queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['user@example.com'],
            subject='Test',
            status='sent',
        )
        response = self.client.get(
            f'/api/v1/status/{queue_item.queue_id}/',
            **self._auth_header(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'sent')

    def test_status_by_tag(self):
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['user@example.com'],
            subject='Test',
            tags=['batch-001'],
        )
        response = self.client.get(
            '/api/v1/status/?tag=batch-001',
            **self._auth_header(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)

    def test_health_check(self):
        response = self.client.get('/api/v1/health/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('database', response.data)
        self.assertIn('queue_depth', response.data)
```

**Step 2: Run tests to verify they fail**

Run: `python manage.py test email_system.tests.test_integration_api -v2`
Expected: FAIL

**Step 3: Write the integration views**

```python
# views_integration.py
import socket
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings
from django.db import connection

from email_system.models import EmailTemplate, EmailQueue
from email_system.permissions import HasAPIKey
from email_system.services.queue_service import email_queue_service


@api_view(['POST'])
@permission_classes([HasAPIKey])
def send_email(request):
    """Queue an email for sending. Used by external systems."""
    template_name = request.data.get('template')
    to_emails = request.data.get('to', [])
    context = request.data.get('context', {})
    priority = request.data.get('priority', 'normal')
    tags = request.data.get('tags', [])

    if not template_name:
        return Response({'error': 'template is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not to_emails:
        return Response({'error': 'to is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        template = EmailTemplate.objects.get(name=template_name, is_active=True)
    except EmailTemplate.DoesNotExist:
        return Response({'error': f'Template "{template_name}" not found'}, status=status.HTTP_404_NOT_FOUND)

    queue_item = email_queue_service.queue_email(
        template=template,
        to_emails=to_emails,
        context=context,
        priority=priority,
        tags=tags,
    )

    return Response({
        'queue_id': str(queue_item.queue_id),
        'status': queue_item.status,
        'message': 'Email queued successfully',
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([HasAPIKey])
def email_status(request, queue_id):
    """Check status of a specific queued email."""
    try:
        item = EmailQueue.objects.get(queue_id=queue_id)
    except EmailQueue.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        'queue_id': str(item.queue_id),
        'status': item.status,
        'template': item.template.name if item.template else None,
        'to': item.to_emails,
        'priority': item.priority,
        'created_at': item.created_at,
        'sent_at': item.sent_at,
        'attempts': item.attempts,
        'error_message': item.error_message or None,
        'tags': item.tags,
    })


@api_view(['GET'])
@permission_classes([HasAPIKey])
def email_status_search(request):
    """Search queue items by tag."""
    tag = request.query_params.get('tag')
    if not tag:
        return Response({'error': 'tag parameter required'}, status=status.HTTP_400_BAD_REQUEST)

    items = EmailQueue.objects.filter(tags__contains=[tag]).order_by('-created_at')[:50]
    results = [{
        'queue_id': str(item.queue_id),
        'status': item.status,
        'template': item.template.name if item.template else None,
        'to': item.to_emails,
        'created_at': item.created_at,
        'sent_at': item.sent_at,
    } for item in items]

    return Response({'results': results, 'count': len(results)})


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check — no auth required."""
    # Database check
    db_ok = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_ok = True
    except Exception:
        pass

    # SMTP check
    smtp_ok = False
    try:
        sock = socket.create_connection(
            (getattr(settings, 'EMAIL_HOST', ''), getattr(settings, 'EMAIL_PORT', 25)),
            timeout=5,
        )
        sock.close()
        smtp_ok = True
    except Exception:
        pass

    # Queue stats
    queue_depth = EmailQueue.objects.filter(status__in=['pending', 'retry']).count()
    failed_count = EmailQueue.objects.filter(status='failed').count()

    return Response({
        'status': 'healthy' if (db_ok and smtp_ok) else 'degraded',
        'database': db_ok,
        'smtp': smtp_ok,
        'queue_depth': queue_depth,
        'failed_count': failed_count,
    })
```

**Step 4: Run tests to verify they pass**

Run: `python manage.py test email_system.tests.test_integration_api -v2`
Expected: PASS

**Step 5: Commit**

```bash
git add email_system/views_integration.py email_system/tests/test_integration_api.py
git commit -m "feat: add v1 integration API (send, status, health)"
```

---

### Task 1.8: Wire Up URL Configuration

**Files:**
- Copy and modify: `backend/email_project/email_system/urls.py`
- Create: `backend/email_project/email_project/urls.py`

**Step 1: Write `email_system/urls.py`**

Extends the existing Admin3 URL patterns with v1 integration routes:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from email_system import views
from email_system import views_integration

router = DefaultRouter()
router.register(r'settings', views.EmailSettingsViewSet)
router.register(r'templates', views.EmailTemplateViewSet)
router.register(r'attachments', views.EmailAttachmentViewSet)
router.register(r'template-attachments', views.EmailTemplateAttachmentViewSet)
router.register(r'queue', views.EmailQueueViewSet)
router.register(r'placeholders', views.EmailContentPlaceholderViewSet)
router.register(r'content-rules', views.EmailContentRuleViewSet)
router.register(r'template-content-rules', views.EmailTemplateContentRuleViewSet)
router.register(r'closing-salutations', views.ClosingSalutationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

# Integration API (v1)
integration_urlpatterns = [
    path('send/', views_integration.send_email, name='v1-send'),
    path('status/', views_integration.email_status_search, name='v1-status-search'),
    path('status/<uuid:queue_id>/', views_integration.email_status, name='v1-status'),
    path('health/', views_integration.health_check, name='v1-health'),
]
```

**Step 2: Write `email_project/urls.py`**

```python
from django.contrib import admin
from django.urls import path, include
from email_system.urls import urlpatterns as email_urls, integration_urlpatterns

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/email/', include(email_urls)),
    path('api/v1/', include(integration_urlpatterns)),
]
```

**Step 3: Commit**

```bash
git add email_system/urls.py email_project/urls.py
git commit -m "feat: wire up admin CRUD and v1 integration URL routes"
```

---

### Task 1.9: Copy Admin Interface and Management Command

**Files:**
- Copy from Admin3: `backend/django_Admin3/email_system/admin/__init__.py` → as-is
- Copy from Admin3: `backend/django_Admin3/email_system/management/commands/process_email_queue.py` → as-is

**Step 1: Copy admin configuration**

The Django admin interface has no external dependencies. Copy as-is.

**Step 2: Copy management command**

`process_email_queue.py` imports only from `email_system.services.queue_service`. Copy as-is.

**Step 3: Commit**

```bash
git add email_system/admin/ email_system/management/
git commit -m "feat: extract Django admin config and queue management command"
```

---

### Task 1.10: Create Fresh Migration

**Files:**
- Create: `backend/email_project/email_system/migrations/0001_initial.py`

**Step 1: Generate fresh migration**

```bash
cd backend
python manage.py makemigrations email_system
```

This creates a single `0001_initial.py` with no dependency on `utils.0007` or `tutorials`.

**Step 2: Verify migration applies**

```bash
python manage.py migrate
```

Expected: All tables created successfully in the local dev database.

**Step 3: Commit**

```bash
git add email_system/migrations/
git commit -m "feat: fresh initial migration for standalone email system"
```

---

### Task 1.11: Copy Email Templates (MJML/HTML)

**Files:**
- Copy from Admin3: `backend/django_Admin3/utils/templates/emails/` → `backend/email_project/templates/emails/`

**Step 1: Copy template directory**

```bash
cp -r ../Admin3/backend/django_Admin3/utils/templates/emails/ backend/templates/emails/
```

**Step 2: Update settings TEMPLATES dirs**

In `base.py`, ensure:
```python
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],
    ...
}]
```

**Step 3: Commit**

```bash
git add templates/
git commit -m "feat: extract MJML and HTML email templates"
```

---

## Phase 2: Frontend Extraction

### Task 2.1: Scaffold React App

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/src/index.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/config.ts`
- Create: `frontend/public/index.html`

**Step 1: Initialize React project**

Create a minimal `package.json` with only email-relevant dependencies:

```json
{
  "name": "acted-email-admin",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@mui/material": "^7.3.7",
    "@mui/icons-material": "^7.3.6",
    "@emotion/react": "^11.0.0",
    "@emotion/styled": "^11.0.0",
    "axios": "^1.13.2",
    "mjml-browser": "^4.18.0",
    "moment": "^2.30.1",
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "react-router-dom": "^7.10.0",
    "react-scripts": "5.0.1",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
```

**Step 2: Write `src/config.ts`**

```typescript
const config = {
  apiUrl: process.env.REACT_APP_API_URL || '/api/email',
};

export default config;
```

**Step 3: Write `src/App.tsx`**

```tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import EmailLayout from './components/EmailLayout';

// Email modules (copied from Admin3)
import EmailSettingsList from './components/email/settings/EmailSettingsList';
import EmailTemplateList from './components/email/templates/EmailTemplateList';
import EmailTemplateForm from './components/email/templates/EmailTemplateForm';
import EmailTemplateMjmlEditor from './components/email/templates/EmailTemplateMjmlEditor';
import EmailQueueList from './components/email/queue/EmailQueueList';
import EmailQueueDetail from './components/email/queue/EmailQueueDetail';
import EmailQueueDuplicateForm from './components/email/queue/EmailQueueDuplicateForm';
import EmailAttachmentList from './components/email/attachments/EmailAttachmentList';
import EmailAttachmentForm from './components/email/attachments/EmailAttachmentForm';
import EmailContentRuleList from './components/email/content-rules/EmailContentRuleList';
import EmailContentRuleForm from './components/email/content-rules/EmailContentRuleForm';
import EmailPlaceholderList from './components/email/placeholders/EmailPlaceholderList';
import EmailPlaceholderForm from './components/email/placeholders/EmailPlaceholderForm';
import ClosingSalutationList from './components/email/closing-salutations/ClosingSalutationList';
import ClosingSalutationForm from './components/email/closing-salutations/ClosingSalutationForm';

const theme = createTheme();

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        <Route element={<EmailLayout />}>
          <Route index element={<Navigate to="/settings" replace />} />
          <Route path="/settings" element={<EmailSettingsList />} />
          <Route path="/templates" element={<EmailTemplateList />} />
          <Route path="/templates/new" element={<EmailTemplateForm />} />
          <Route path="/templates/:id/edit" element={<EmailTemplateForm />} />
          <Route path="/templates/:id/mjml" element={<EmailTemplateMjmlEditor />} />
          <Route path="/queue" element={<EmailQueueList />} />
          <Route path="/queue/:id" element={<EmailQueueDetail />} />
          <Route path="/queue/:id/duplicate" element={<EmailQueueDuplicateForm />} />
          <Route path="/attachments" element={<EmailAttachmentList />} />
          <Route path="/attachments/new" element={<EmailAttachmentForm />} />
          <Route path="/attachments/:id/edit" element={<EmailAttachmentForm />} />
          <Route path="/content-rules" element={<EmailContentRuleList />} />
          <Route path="/content-rules/new" element={<EmailContentRuleForm />} />
          <Route path="/content-rules/:id/edit" element={<EmailContentRuleForm />} />
          <Route path="/placeholders" element={<EmailPlaceholderList />} />
          <Route path="/placeholders/new" element={<EmailPlaceholderForm />} />
          <Route path="/placeholders/:id/edit" element={<EmailPlaceholderForm />} />
          <Route path="/closing-salutations" element={<ClosingSalutationList />} />
          <Route path="/closing-salutations/new" element={<ClosingSalutationForm />} />
          <Route path="/closing-salutations/:id/edit" element={<ClosingSalutationForm />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
```

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold React app with email-only routes"
```

---

### Task 2.2: Create Simplified HTTP Service and Email Layout

**Files:**
- Create: `frontend/src/services/httpService.ts`
- Create: `frontend/src/components/EmailLayout.tsx`

**Step 1: Write simplified `httpService.ts`**

Removes CSRF handling and Admin3 auth interceptor. Uses Django session auth (cookie-based) for browser access:

```typescript
import axios from 'axios';

const httpService = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // Send session cookie
});

export default httpService;
```

**Step 2: Write `EmailLayout.tsx`**

Simplified version of Admin3's AdminLayout — email-only sidebar:

```tsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, IconButton, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon, Settings, Description, Queue,
  AttachFile, Rule, Code, People,
} from '@mui/icons-material';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Settings', path: '/settings', icon: <Settings /> },
  { label: 'Templates', path: '/templates', icon: <Description /> },
  { label: 'Queue', path: '/queue', icon: <Queue /> },
  { label: 'Attachments', path: '/attachments', icon: <AttachFile /> },
  { label: 'Content Rules', path: '/content-rules', icon: <Rule /> },
  { label: 'Placeholders', path: '/placeholders', icon: <Code /> },
  { label: 'Salutations', path: '/closing-salutations', icon: <People /> },
];

const EmailLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const drawer = (
    <List>
      {navItems.map((item) => (
        <ListItemButton
          key={item.path}
          selected={location.pathname.startsWith(item.path)}
          onClick={() => { navigate(item.path); setMobileOpen(false); }}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap>Email System</Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        sx={{ width: DRAWER_WIDTH, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, mt: '64px' } }}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px', ml: isMobile ? 0 : `${DRAWER_WIDTH}px` }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default EmailLayout;
```

**Step 3: Commit**

```bash
git add frontend/src/services/httpService.ts frontend/src/components/EmailLayout.tsx
git commit -m "feat: add simplified HTTP service and email layout"
```

---

### Task 2.3: Copy All Email Components, Types, and Service

**Files:**
- Copy from Admin3: `frontend/react-Admin3/src/components/admin/email/` → `frontend/src/components/email/` (all 8 directories, 32 files)
- Copy from Admin3: `frontend/react-Admin3/src/types/email/` → `frontend/src/types/email/`
- Copy from Admin3: `frontend/react-Admin3/src/services/emailService.ts` → as-is
- Copy from Admin3: `frontend/react-Admin3/src/services/paginationHelper.js` → as-is

**Step 1: Copy component directories**

```bash
cp -r ../Admin3/frontend/react-Admin3/src/components/admin/email/* frontend/src/components/email/
```

All 8 module directories: `templates/`, `queue/`, `settings/`, `attachments/`, `content-rules/`, `placeholders/`, `closing-salutations/`, `shared/`

**Step 2: Copy type definitions**

```bash
cp -r ../Admin3/frontend/react-Admin3/src/types/email/* frontend/src/types/email/
```

**Step 3: Copy emailService.ts**

Copy as-is. The `BASE_URL` reference (`config.emailUrl`) needs updating to match new config:

Change line 20 from:
```typescript
const BASE_URL = `${(config as any).emailUrl}`;
```
To:
```typescript
const BASE_URL = `${config.apiUrl}`;
```

**Step 4: Copy paginationHelper.js**

Copy as-is — no external dependencies.

**Step 5: Update component import paths**

The components currently import from `../../hooks/useAuth`. Since the standalone app doesn't have Admin3's auth system, any `useAuth` references in components need to be removed or replaced with a minimal auth hook. The main place is `AdminLayout.tsx` which we've already replaced in Task 2.2.

Check all ViewModels for any `useAuth` imports — if found, replace with a no-op or remove the guard.

**Step 6: Verify build**

```bash
cd frontend && npm run build
```

Fix any remaining import path issues.

**Step 7: Commit**

```bash
git add frontend/src/components/ frontend/src/types/ frontend/src/services/
git commit -m "feat: extract all 32 email components, types, and services"
```

---

## Phase 3: Docker Configuration

### Task 3.1: Write Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

**Step 1: Write Dockerfile**

```dockerfile
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN DJANGO_SETTINGS_MODULE=email_project.settings.production \
    DATABASE_URL=sqlite:///tmp/collectstatic.db \
    python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

CMD ["gunicorn", "email_project.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
```

**Step 2: Write `.dockerignore`**

```
__pycache__
*.pyc
.env
.git
*.md
tests/
```

**Step 3: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat: add backend Dockerfile with Gunicorn"
```

---

### Task 3.2: Write Frontend Dockerfile + Nginx Config

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Create: `frontend/.dockerignore`

**Step 1: Write multi-stage Dockerfile**

```dockerfile
# Stage 1: Build React
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Step 2: Write `nginx.conf`**

```nginx
upstream django {
    server django:8000;
}

server {
    listen 80;
    server_name _;

    # ── IP Whitelist ──
    # Internal networks only — update to match your environment
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    allow 192.168.0.0/16;
    allow 127.0.0.1;
    deny all;

    # ── React SPA ──
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # ── Django API ──
    location /api/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }

    # ── Django Admin ──
    location /django-admin/ {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # ── Django Static (admin CSS/JS) ──
    location /static/ {
        proxy_pass http://django;
    }
}
```

**Step 3: Write `.dockerignore`**

```
node_modules
build
.env
.git
*.md
```

**Step 4: Commit**

```bash
git add frontend/Dockerfile frontend/nginx.conf frontend/.dockerignore
git commit -m "feat: add frontend Dockerfile (multi-stage) and Nginx reverse proxy"
```

---

### Task 3.3: Write Docker Compose Files

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.dev.yml`
- Create: `.env.example`

**Step 1: Write `docker-compose.yml` (production)**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: email_system
      POSTGRES_USER: ${DB_USER:-email_admin}
      POSTGRES_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-email_admin}"]
      interval: 10s
      timeout: 5s
      retries: 5

  django:
    build: ./backend
    command: gunicorn email_project.wsgi:application --bind 0.0.0.0:8000 --workers 3
    environment:
      - DATABASE_URL=postgres://${DB_USER:-email_admin}:${DB_PASSWORD}@postgres:5432/email_system
      - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY:?DJANGO_SECRET_KEY is required}
      - DJANGO_SETTINGS_MODULE=email_project.settings.production
      - DJANGO_ALLOWED_HOSTS=${DJANGO_ALLOWED_HOSTS:-*}
      - EMAIL_HOST=${EMAIL_HOST:-10.20.3.4}
      - EMAIL_PORT=${EMAIL_PORT:-25}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  queue-worker:
    build: ./backend
    command: python manage.py process_email_queue --continuous --interval=30
    environment:
      - DATABASE_URL=postgres://${DB_USER:-email_admin}:${DB_PASSWORD}@postgres:5432/email_system
      - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
      - DJANGO_SETTINGS_MODULE=email_project.settings.production
      - EMAIL_HOST=${EMAIL_HOST:-10.20.3.4}
      - EMAIL_PORT=${EMAIL_PORT:-25}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  nginx:
    build: ./frontend
    ports:
      - "${EXPOSED_PORT:-8080}:80"
    depends_on:
      - django
    restart: unless-stopped

volumes:
  pgdata:
```

**Step 2: Write `docker-compose.dev.yml`**

```yaml
# Usage: docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
services:
  django:
    command: python manage.py runserver 0.0.0.0:8000
    environment:
      - DJANGO_SETTINGS_MODULE=email_project.settings.development
      - DEV_EMAIL_OVERRIDE=True
    volumes:
      - ./backend:/app

  queue-worker:
    environment:
      - DJANGO_SETTINGS_MODULE=email_project.settings.development
    volumes:
      - ./backend:/app
```

**Step 3: Write `.env.example`**

```bash
# ── Database ──
DB_USER=email_admin
DB_PASSWORD=CHANGE_ME_SECURE_PASSWORD

# ── Django ──
DJANGO_SECRET_KEY=CHANGE_ME_GENERATE_A_KEY
DJANGO_ALLOWED_HOSTS=server-hostname,10.20.x.x

# ── SMTP ──
EMAIL_HOST=10.20.3.4
EMAIL_PORT=25

# ── Network ──
EXPOSED_PORT=8080

# ── API Keys (add one per consuming system) ──
# Managed via Django admin > Email Settings
# Setting key: api_key_<system_name>, value: sk-<random>

# ── Development Only ──
# DEV_EMAIL_OVERRIDE=True
# DEV_EMAIL_RECIPIENTS=dev@example.com
```

**Step 4: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml .env.example
git commit -m "feat: add Docker Compose stack (4 services) and env template"
```

---

### Task 3.4: Write Deployment Script

**Files:**
- Create: `scripts/deploy.ps1`

**Step 1: Write PowerShell deploy script**

```powershell
<#
.SYNOPSIS
    Deploy or update the Email System Docker stack on Windows Server.
.PARAMETER Offline
    Use pre-built image tarballs instead of pulling from registry.
.PARAMETER ImagePath
    Path to .tar.gz file containing Docker images (required if -Offline).
.PARAMETER Init
    Run first-time initialization (migrate + create superuser).
#>
param(
    [switch]$Offline,
    [string]$ImagePath,
    [switch]$Init
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Email System - Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check .env exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found. Copy .env.example to .env and configure." -ForegroundColor Red
    exit 1
}

# Load images if offline
if ($Offline) {
    if (-not $ImagePath) {
        Write-Host "ERROR: -ImagePath required with -Offline" -ForegroundColor Red
        exit 1
    }
    Write-Host "Loading images from $ImagePath..." -ForegroundColor Yellow
    docker load -i $ImagePath
}

# Build and start
Write-Host "Building and starting services..." -ForegroundColor Yellow
docker-compose up -d --build --remove-orphans

# Wait for healthy postgres
Write-Host "Waiting for database..." -ForegroundColor Yellow
$attempts = 0
do {
    Start-Sleep -Seconds 2
    $attempts++
    $health = docker-compose ps postgres --format json 2>$null | ConvertFrom-Json
} while ($health.Health -ne 'healthy' -and $attempts -lt 30)

if ($attempts -ge 30) {
    Write-Host "ERROR: Database did not become healthy" -ForegroundColor Red
    docker-compose logs postgres
    exit 1
}

# Run migrations
Write-Host "Running migrations..." -ForegroundColor Yellow
docker-compose exec django python manage.py migrate --noinput

# First-time init
if ($Init) {
    Write-Host "Creating superuser..." -ForegroundColor Yellow
    docker-compose exec -it django python manage.py createsuperuser
}

# Status
Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Deployment Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
docker-compose ps
$port = (Get-Content .env | Select-String 'EXPOSED_PORT=(\d+)').Matches.Groups[1].Value
if (-not $port) { $port = "8080" }
Write-Host "`nAdmin UI:  http://localhost:$port/" -ForegroundColor Cyan
Write-Host "API:       http://localhost:$port/api/v1/health/" -ForegroundColor Cyan
Write-Host "Django Admin: http://localhost:$port/django-admin/" -ForegroundColor Cyan
```

**Step 2: Commit**

```bash
git add scripts/deploy.ps1
git commit -m "feat: add PowerShell deployment script with offline support"
```

---

## Phase 4: CI/CD Pipeline

### Task 4.1: Write GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/build-deploy.yml`

**Step 1: Write the workflow**

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: test_email
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.14'
      - run: pip install -r backend/requirements.txt
      - run: python backend/manage.py test email_system -v2
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test_email
          DJANGO_SECRET_KEY: test-secret-key
          DJANGO_SETTINGS_MODULE: email_project.settings.development

  build-images:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}-backend:latest

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}-frontend:latest

  # Offline artifact (if server can't pull from ghcr.io)
  save-offline:
    needs: build-images
    runs-on: ubuntu-latest
    steps:
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Pull and save images
        run: |
          docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}-backend:latest
          docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}-frontend:latest
          docker pull postgres:16-alpine
          docker save \
            ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}-backend:latest \
            ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}-frontend:latest \
            postgres:16-alpine | gzip > email-system-images.tar.gz
      - uses: actions/upload-artifact@v4
        with:
          name: docker-images
          path: email-system-images.tar.gz
          retention-days: 30
```

**Step 2: Commit**

```bash
git add .github/
git commit -m "feat: add GitHub Actions CI/CD pipeline with offline artifact"
```

---

## Phase 5: Integration Testing & Final Verification

### Task 5.1: Local Docker Compose Smoke Test

**Step 1: Create `.env` from example**

```bash
cp .env.example .env
# Edit .env with real values
```

**Step 2: Build and start**

```bash
docker-compose up -d --build
```

**Step 3: Run migrations and create superuser**

```bash
docker-compose exec django python manage.py migrate
docker-compose exec -it django python manage.py createsuperuser
```

**Step 4: Verify all services**

| Check | Command | Expected |
|-------|---------|----------|
| Services running | `docker-compose ps` | 4 services Up |
| Health endpoint | `curl http://localhost:8080/api/v1/health/` | `{"status": "healthy", "database": true, "smtp": true, ...}` |
| Admin UI loads | Open `http://localhost:8080/` in browser | React app with sidebar |
| Django admin | Open `http://localhost:8080/django-admin/` | Django admin login |
| API key auth | `curl -H "X-API-Key: sk-test" http://localhost:8080/api/v1/send/ -X POST -d '...'` | 201 or 403 |
| Queue processing | Check `docker-compose logs queue-worker` | "Processing pending queue..." |

**Step 5: Commit any fixes**

```bash
git commit -am "fix: integration test fixes"
```

---

### Task 5.2: Write README

**Files:**
- Create: `README.md`

Cover:
1. Quick start (3 commands: clone, `.env`, `docker-compose up`)
2. Architecture diagram (from design doc)
3. API reference (v1 send/status/health)
4. Admin UI access
5. Configuration (`.env` variables)
6. Deployment to Windows Server (online + offline paths)
7. Monitoring and backups

**Commit:**

```bash
git add README.md
git commit -m "docs: add README with setup, API reference, and deployment guide"
```

---

## Execution Order Summary

| Phase | Tasks | Dependencies |
|-------|-------|-------------|
| **0: Network Investigation** | T0.1 | None — run on server independently |
| **1: Backend Extraction** | T1.1–T1.11 | Sequential |
| **2: Frontend Extraction** | T2.1–T2.3 | Can start after T1.8 (needs URL structure) |
| **3: Docker Config** | T3.1–T3.4 | After T1.11 and T2.3 |
| **4: CI/CD Pipeline** | T4.1 | After T3.3 |
| **5: Integration Test** | T5.1–T5.2 | After T3.4 |

**Parallelizable:** Phase 1 (backend) and Phase 2 (frontend) tasks 2.1–2.2 can run in parallel. Phase 0 is completely independent.
