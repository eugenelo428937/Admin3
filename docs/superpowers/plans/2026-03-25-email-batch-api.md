# Email Batch API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add batch email API for external systems to send bulk emails through Admin3's existing email queue pipeline.

**Architecture:** New `ExternalApiKey` and `EmailBatch` models with an optional FK from `EmailQueue` to `EmailBatch`. Two API endpoints (send + query) authenticated via API key. Batch completion detected in existing `process_queue_item()` flow, triggering a notification email.

**Tech Stack:** Python 3.14, Django 6.0, Django REST Framework, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-25-email-batch-api-design.md`

---

### Task 1: ExternalApiKey Model

**Files:**
- Create: `backend/django_Admin3/email_system/models/api_key.py`
- Modify: `backend/django_Admin3/email_system/models/__init__.py`
- Test: `backend/django_Admin3/email_system/tests/test_batch_models.py`

- [ ] **Step 1: Write failing test for ExternalApiKey model**

```python
# test_batch_models.py
import hashlib
import secrets
from django.test import TestCase
from email_system.models import ExternalApiKey


class ExternalApiKeyModelTest(TestCase):
    def test_create_api_key(self):
        raw_key = secrets.token_urlsafe(32)
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        api_key = ExternalApiKey.objects.create(
            key_hash=key_hash,
            key_prefix=raw_key[:8],
            name='Test System',
        )
        self.assertEqual(api_key.name, 'Test System')
        self.assertTrue(api_key.is_active)
        self.assertIsNotNone(api_key.created_at)
        self.assertIsNone(api_key.last_used_at)

    def test_str_representation(self):
        api_key = ExternalApiKey.objects.create(
            key_hash='a' * 64,
            key_prefix='abcd1234',
            name='Test System',
        )
        self.assertIn('Test System', str(api_key))

    def test_inactive_key(self):
        api_key = ExternalApiKey.objects.create(
            key_hash='b' * 64,
            key_prefix='efgh5678',
            name='Disabled System',
            is_active=False,
        )
        self.assertFalse(api_key.is_active)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_models.py::ExternalApiKeyModelTest -v`
Expected: ImportError — ExternalApiKey does not exist

- [ ] **Step 3: Create ExternalApiKey model**

```python
# backend/django_Admin3/email_system/models/api_key.py
import uuid
from django.db import models


class ExternalApiKey(models.Model):
    id = models.AutoField(primary_key=True)
    key_hash = models.CharField(max_length=64, unique=True, help_text='SHA-256 hash of the API key')
    key_prefix = models.CharField(max_length=8, help_text='First 8 chars for admin identification')
    name = models.CharField(max_length=200, help_text='Display name for this API key')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'utils_external_api_key'
        verbose_name = 'External API Key'
        verbose_name_plural = 'External API Keys'

    def __str__(self):
        return f'{self.name} ({self.key_prefix}...)'
```

- [ ] **Step 4: Export from `models/__init__.py`**

Add to `backend/django_Admin3/email_system/models/__init__.py`:
```python
from .api_key import ExternalApiKey
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_models.py::ExternalApiKeyModelTest -v`
Expected: 3 passed

- [ ] **Step 6: Commit**

```bash
git add email_system/models/api_key.py email_system/models/__init__.py email_system/tests/test_batch_models.py
git commit -m "feat(email): add ExternalApiKey model for batch API authentication"
```

---

### Task 2: EmailBatch Model

**Files:**
- Create: `backend/django_Admin3/email_system/models/batch.py`
- Modify: `backend/django_Admin3/email_system/models/__init__.py`
- Test: `backend/django_Admin3/email_system/tests/test_batch_models.py`

- [ ] **Step 1: Write failing test for EmailBatch model**

```python
# Append to test_batch_models.py
from email_system.models import EmailBatch, EmailTemplate


class EmailBatchModelTest(TestCase):
    def setUp(self):
        self.template = EmailTemplate.objects.create(
            name='test_template',
            display_name='Test Template',
            subject_template='Test Subject',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash='c' * 64,
            key_prefix='test1234',
            name='Test System',
        )

    def test_create_batch(self):
        batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='Test User',
            notify_email='test@example.com',
            total_items=5,
            api_key=self.api_key,
        )
        self.assertIsNotNone(batch.batch_id)
        self.assertEqual(batch.status, 'pending')
        self.assertEqual(batch.sent_count, 0)
        self.assertEqual(batch.error_count, 0)
        self.assertIsNone(batch.completed_at)

    def test_status_choices(self):
        batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='Test User',
            notify_email='test@example.com',
            total_items=1,
            api_key=self.api_key,
            status='processing',
        )
        self.assertEqual(batch.status, 'processing')

    def test_str_representation(self):
        batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='Test User',
            notify_email='test@example.com',
            total_items=3,
            api_key=self.api_key,
        )
        self.assertIn('pending', str(batch))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_models.py::EmailBatchModelTest -v`
Expected: ImportError — EmailBatch does not exist

- [ ] **Step 3: Create EmailBatch model**

```python
# backend/django_Admin3/email_system/models/batch.py
import uuid
from django.db import models


class EmailBatch(models.Model):
    BATCH_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('completed_with_errors', 'Completed with Errors'),
        ('failed', 'Failed'),
    ]

    batch_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        'email_system.EmailTemplate',
        on_delete=models.PROTECT,
        related_name='batches',
    )
    requested_by = models.CharField(max_length=200)
    notify_email = models.EmailField()
    status = models.CharField(max_length=30, choices=BATCH_STATUS_CHOICES, default='pending')
    total_items = models.IntegerField(default=0)
    sent_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    api_key = models.ForeignKey(
        'email_system.ExternalApiKey',
        on_delete=models.PROTECT,
        related_name='batches',
    )

    class Meta:
        db_table = 'utils_email_batch'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['api_key', 'created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'Batch {self.batch_id} ({self.status}) - {self.total_items} items'
```

- [ ] **Step 4: Export from `models/__init__.py`**

Add to `backend/django_Admin3/email_system/models/__init__.py`:
```python
from .batch import EmailBatch
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_models.py -v`
Expected: 6 passed (3 ExternalApiKey + 3 EmailBatch)

- [ ] **Step 6: Commit**

```bash
git add email_system/models/batch.py email_system/models/__init__.py email_system/tests/test_batch_models.py
git commit -m "feat(email): add EmailBatch model for batch tracking"
```

---

### Task 3: EmailQueue Batch FK + EmailTemplate Type Choice

**Files:**
- Modify: `backend/django_Admin3/email_system/models/queue.py` (add `batch` FK)
- Modify: `backend/django_Admin3/email_system/models/template.py` (add `batch_completion_report` choice)
- Test: `backend/django_Admin3/email_system/tests/test_batch_models.py`

- [ ] **Step 1: Write failing test for queue batch FK**

```python
# Append to test_batch_models.py
from email_system.models import EmailQueue


class EmailQueueBatchFKTest(TestCase):
    def setUp(self):
        self.template = EmailTemplate.objects.create(
            name='test_template_q',
            display_name='Test Template',
            subject_template='Test Subject',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash='d' * 64,
            key_prefix='qtest123',
            name='Test System',
        )
        self.batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='Test User',
            notify_email='test@example.com',
            total_items=1,
            api_key=self.api_key,
        )

    def test_queue_item_with_batch(self):
        queue_item = EmailQueue.objects.create(
            to_emails=['test@example.com'],
            subject='Test',
            template=self.template,
            batch=self.batch,
        )
        self.assertEqual(queue_item.batch, self.batch)

    def test_queue_item_without_batch(self):
        queue_item = EmailQueue.objects.create(
            to_emails=['test@example.com'],
            subject='Test',
        )
        self.assertIsNone(queue_item.batch)

    def test_batch_queue_items_related_name(self):
        EmailQueue.objects.create(
            to_emails=['a@example.com'],
            subject='Test 1',
            template=self.template,
            batch=self.batch,
        )
        EmailQueue.objects.create(
            to_emails=['b@example.com'],
            subject='Test 2',
            template=self.template,
            batch=self.batch,
        )
        self.assertEqual(self.batch.queue_items.count(), 2)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_models.py::EmailQueueBatchFKTest -v`
Expected: FAIL — EmailQueue has no field 'batch'

- [ ] **Step 3: Add batch FK to EmailQueue model**

In `backend/django_Admin3/email_system/models/queue.py`, add after the `duplicated_from` field (around line 79):

```python
    batch = models.ForeignKey(
        'email_system.EmailBatch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='queue_items',
        help_text='Batch this email belongs to, if any',
    )
```

- [ ] **Step 4: Add `batch_completion_report` to EmailTemplate TEMPLATE_TYPES**

In `backend/django_Admin3/email_system/models/template.py`, add to `TEMPLATE_TYPES` list (line 14):

```python
    ('batch_completion_report', 'Batch Completion Report'),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_models.py -v`
Expected: 9 passed

- [ ] **Step 6: Commit**

```bash
git add email_system/models/queue.py email_system/models/template.py email_system/tests/test_batch_models.py
git commit -m "feat(email): add batch FK to EmailQueue and batch_completion_report template type"
```

---

### Task 4: ExternalApiKeyAuthentication

**Files:**
- Create: `backend/django_Admin3/email_system/authentication.py`
- Test: `backend/django_Admin3/email_system/tests/test_batch_auth.py`

- [ ] **Step 1: Write failing tests for API key authentication**

```python
# backend/django_Admin3/email_system/tests/test_batch_auth.py
import hashlib
import secrets
from django.test import TestCase, RequestFactory
from rest_framework.exceptions import AuthenticationFailed
from email_system.authentication import ExternalApiKeyAuthentication
from email_system.models import ExternalApiKey


class ExternalApiKeyAuthenticationTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.auth = ExternalApiKeyAuthentication()
        self.raw_key = secrets.token_urlsafe(32)
        self.key_hash = hashlib.sha256(self.raw_key.encode()).hexdigest()
        self.api_key = ExternalApiKey.objects.create(
            key_hash=self.key_hash,
            key_prefix=self.raw_key[:8],
            name='Test System',
        )

    def test_valid_key_authenticates(self):
        request = self.factory.get('/', HTTP_X_API_KEY=self.raw_key)
        result = self.auth.authenticate(request)
        self.assertIsNotNone(result)
        self.assertEqual(result[1], self.api_key)

    def test_missing_header_returns_none(self):
        request = self.factory.get('/')
        result = self.auth.authenticate(request)
        self.assertIsNone(result)

    def test_invalid_key_raises(self):
        request = self.factory.get('/', HTTP_X_API_KEY='invalid-key')
        with self.assertRaises(AuthenticationFailed):
            self.auth.authenticate(request)

    def test_inactive_key_raises(self):
        self.api_key.is_active = False
        self.api_key.save()
        request = self.factory.get('/', HTTP_X_API_KEY=self.raw_key)
        with self.assertRaises(AuthenticationFailed):
            self.auth.authenticate(request)

    def test_updates_last_used_at(self):
        request = self.factory.get('/', HTTP_X_API_KEY=self.raw_key)
        self.auth.authenticate(request)
        self.api_key.refresh_from_db()
        self.assertIsNotNone(self.api_key.last_used_at)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_auth.py -v`
Expected: ImportError — authentication module does not exist

- [ ] **Step 3: Implement ExternalApiKeyAuthentication**

```python
# backend/django_Admin3/email_system/authentication.py
import hashlib
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ExternalApiKeyAuthentication(BaseAuthentication):
    """Authenticates requests using X-Api-Key header against ExternalApiKey model."""

    def authenticate(self, request):
        raw_key = request.META.get('HTTP_X_API_KEY')
        if not raw_key:
            return None

        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        from email_system.models import ExternalApiKey
        try:
            api_key = ExternalApiKey.objects.get(key_hash=key_hash)
        except ExternalApiKey.DoesNotExist:
            raise AuthenticationFailed('Invalid API key.')

        if not api_key.is_active:
            raise AuthenticationFailed('API key is inactive.')

        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=['last_used_at'])

        return (None, api_key)

    def authenticate_header(self, request):
        return 'X-Api-Key'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_auth.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add email_system/authentication.py email_system/tests/test_batch_auth.py
git commit -m "feat(email): add ExternalApiKeyAuthentication for batch API"
```

---

### Task 5: EmailBatchService — send_batch

**Files:**
- Create: `backend/django_Admin3/email_system/services/batch_service.py`
- Test: `backend/django_Admin3/email_system/tests/test_batch_service.py`

- [ ] **Step 1: Write failing tests for send_batch**

```python
# backend/django_Admin3/email_system/tests/test_batch_service.py
import hashlib
import secrets
from django.test import TestCase
from email_system.models import ExternalApiKey, EmailBatch, EmailQueue, EmailTemplate
from email_system.services.batch_service import EmailBatchService


class SendBatchTest(TestCase):
    def setUp(self):
        self.service = EmailBatchService()
        self.template = EmailTemplate.objects.create(
            name='batch_test_template',
            display_name='Batch Test',
            subject_template='Default Subject {{ firstname }}',
        )
        self.raw_key = secrets.token_urlsafe(32)
        self.api_key = ExternalApiKey.objects.create(
            key_hash=hashlib.sha256(self.raw_key.encode()).hexdigest(),
            key_prefix=self.raw_key[:8],
            name='Test System',
        )

    def test_send_batch_creates_batch_and_queue_items(self):
        items = [
            {
                'to_email': 'user1@example.com',
                'cc_email': [],
                'payload': {'firstname': 'Alice'},
            },
            {
                'to_email': 'user2@example.com',
                'cc_email': ['cc@example.com'],
                'payload': {'firstname': 'Bob'},
            },
        ]
        result = self.service.send_batch(
            template_id=self.template.id,
            requested_by='Test User',
            notify_email='admin@example.com',
            items=items,
            api_key=self.api_key,
        )
        self.assertIn('batch_id', result)
        self.assertEqual(len(result['items']), 2)
        self.assertTrue(all(item['is_success'] for item in result['items']))

        batch = EmailBatch.objects.get(batch_id=result['batch_id'])
        self.assertEqual(batch.status, 'processing')
        self.assertEqual(batch.total_items, 2)
        self.assertEqual(batch.queue_items.count(), 2)

    def test_send_batch_with_subject_override(self):
        items = [
            {
                'to_email': 'user@example.com',
                'cc_email': [],
                'subject_override': 'Hello {{ firstname }}',
                'payload': {'firstname': 'Charlie'},
            },
        ]
        result = self.service.send_batch(
            template_id=self.template.id,
            requested_by='Test User',
            notify_email='admin@example.com',
            items=items,
            api_key=self.api_key,
        )
        queue_item = EmailQueue.objects.get(queue_id=result['items'][0]['queue_id'])
        self.assertEqual(queue_item.subject, 'Hello Charlie')

    def test_send_batch_invalid_email_partial_failure(self):
        items = [
            {
                'to_email': 'valid@example.com',
                'cc_email': [],
                'payload': {},
            },
            {
                'to_email': 'not-an-email',
                'cc_email': [],
                'payload': {},
            },
        ]
        result = self.service.send_batch(
            template_id=self.template.id,
            requested_by='Test User',
            notify_email='admin@example.com',
            items=items,
            api_key=self.api_key,
        )
        self.assertTrue(result['items'][0]['is_success'])
        self.assertFalse(result['items'][1]['is_success'])

        batch = EmailBatch.objects.get(batch_id=result['batch_id'])
        self.assertEqual(batch.total_items, 1)

    def test_send_batch_invalid_template_raises(self):
        with self.assertRaises(ValueError):
            self.service.send_batch(
                template_id=99999,
                requested_by='Test User',
                notify_email='admin@example.com',
                items=[{'to_email': 'a@b.com', 'cc_email': [], 'payload': {}}],
                api_key=self.api_key,
            )

    def test_send_batch_exceeds_max_items_raises(self):
        with self.assertRaises(ValueError):
            self.service.send_batch(
                template_id=self.template.id,
                requested_by='Test User',
                notify_email='admin@example.com',
                items=[{'to_email': f'u{i}@example.com', 'cc_email': [], 'payload': {}} for i in range(501)],
                api_key=self.api_key,
                max_items=500,
            )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_service.py::SendBatchTest -v`
Expected: ImportError — batch_service module does not exist

- [ ] **Step 3: Implement EmailBatchService.send_batch()**

```python
# backend/django_Admin3/email_system/services/batch_service.py
import re
from django.db import transaction
from django.template import Template, Context
from django.utils import timezone
from email_system.models import EmailBatch, EmailQueue, EmailTemplate, ExternalApiKey
from email_system.models.settings import EmailSettings


EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


class EmailBatchService:

    def send_batch(self, template_id, requested_by, notify_email, items, api_key, max_items=None):
        # Validate template
        try:
            template = EmailTemplate.objects.get(id=template_id, is_active=True)
        except EmailTemplate.DoesNotExist:
            raise ValueError(f'Template with id {template_id} not found or inactive.')

        # Validate batch size
        if max_items is None:
            max_items = EmailSettings.get_setting('batch_max_items', 500)
            if isinstance(max_items, str):
                max_items = int(max_items)
        if len(items) > max_items:
            raise ValueError(f'Batch size {len(items)} exceeds maximum of {max_items}.')

        result_items = []
        created_queue_ids = []

        with transaction.atomic():
            batch = EmailBatch.objects.create(
                template=template,
                requested_by=requested_by,
                notify_email=notify_email,
                total_items=0,
                api_key=api_key,
                status='pending',
            )

            for item in items:
                to_email = item['to_email']
                cc_email = item.get('cc_email', [])
                subject_override = item.get('subject_override')
                payload = item.get('payload', {})

                # Validate email
                if not EMAIL_REGEX.match(to_email):
                    result_items.append({
                        'to_email': to_email,
                        'queue_id': None,
                        'is_success': False,
                        'error_response': {'error': f'Invalid email address: {to_email}'},
                    })
                    continue

                # Resolve subject
                if subject_override:
                    try:
                        subject = Template(subject_override).render(Context(payload))
                    except Exception:
                        subject = subject_override
                else:
                    try:
                        subject = Template(template.subject_template).render(Context(payload))
                    except Exception:
                        subject = template.subject_template

                # Create queue entry
                queue_item = EmailQueue.objects.create(
                    to_emails=[to_email],
                    cc_emails=cc_email if cc_email else [],
                    subject=subject,
                    email_context=payload,
                    template=template,
                    batch=batch,
                    priority=template.default_priority or 'normal',
                )

                created_queue_ids.append(queue_item.queue_id)
                result_items.append({
                    'to_email': to_email,
                    'queue_id': str(queue_item.queue_id),
                    'is_success': True,
                    'error_response': {},
                })

            # Update batch with final counts
            success_count = sum(1 for r in result_items if r['is_success'])
            batch.total_items = success_count
            batch.status = 'processing'
            batch.save(update_fields=['total_items', 'status'])

        return {
            'batch_id': str(batch.batch_id),
            'status': batch.status,
            'total_items': batch.total_items,
            'items': result_items,
        }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_service.py::SendBatchTest -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add email_system/services/batch_service.py email_system/tests/test_batch_service.py
git commit -m "feat(email): implement EmailBatchService.send_batch()"
```

---

### Task 6: EmailBatchService — query_batch

**Files:**
- Modify: `backend/django_Admin3/email_system/services/batch_service.py`
- Test: `backend/django_Admin3/email_system/tests/test_batch_service.py`

- [ ] **Step 1: Write failing tests for query_batch**

```python
# Append to test_batch_service.py
class QueryBatchTest(TestCase):
    def setUp(self):
        self.service = EmailBatchService()
        self.template = EmailTemplate.objects.create(
            name='query_test_template',
            display_name='Query Test',
            subject_template='Test',
        )
        self.raw_key = secrets.token_urlsafe(32)
        self.api_key = ExternalApiKey.objects.create(
            key_hash=hashlib.sha256(self.raw_key.encode()).hexdigest(),
            key_prefix=self.raw_key[:8],
            name='Test System',
        )
        self.batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='Test User',
            notify_email='admin@example.com',
            total_items=2,
            api_key=self.api_key,
            status='completed',
            sent_count=1,
            error_count=1,
        )
        # Sent item
        EmailQueue.objects.create(
            to_emails=['sent@example.com'],
            subject='Test',
            template=self.template,
            batch=self.batch,
            status='sent',
        )
        # Failed item
        EmailQueue.objects.create(
            to_emails=['failed@example.com'],
            cc_emails=['cc@example.com'],
            subject='Test',
            template=self.template,
            batch=self.batch,
            status='failed',
            attempts=3,
            error_message='SMTP error',
            error_details={'error_code': '500', 'error_message': 'SMTP error'},
        )

    def test_query_batch_success(self):
        result = self.service.query_batch(str(self.batch.batch_id), self.api_key)
        self.assertEqual(result['batch_id'], str(self.batch.batch_id))
        self.assertFalse(result['is_success'])
        self.assertIn('sent@example.com', result['sent_items'])
        self.assertEqual(len(result['error_items']), 1)
        self.assertEqual(result['error_items'][0]['to_email'], 'failed@example.com')

    def test_query_batch_not_found(self):
        result = self.service.query_batch('00000000-0000-0000-0000-000000000000', self.api_key)
        self.assertIsNone(result)

    def test_query_batch_wrong_api_key(self):
        other_key = ExternalApiKey.objects.create(
            key_hash='e' * 64,
            key_prefix='other123',
            name='Other System',
        )
        result = self.service.query_batch(str(self.batch.batch_id), other_key)
        self.assertIsNone(result)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_service.py::QueryBatchTest -v`
Expected: AttributeError — EmailBatchService has no method query_batch

- [ ] **Step 3: Implement EmailBatchService.query_batch()**

Add to `batch_service.py`:

```python
    def query_batch(self, batch_id, api_key):
        try:
            batch = EmailBatch.objects.get(batch_id=batch_id, api_key=api_key)
        except EmailBatch.DoesNotExist:
            return None

        queue_items = batch.queue_items.all()

        sent_items = [
            qi.to_emails[0]
            for qi in queue_items
            if qi.status == 'sent' and qi.to_emails
        ]

        error_items = []
        for qi in queue_items:
            if qi.status in ('failed', 'cancelled'):
                error_items.append({
                    'to_email': qi.to_emails[0] if qi.to_emails else '',
                    'cc_email': qi.cc_emails or [],
                    'attempts': qi.attempts,
                    'error_response': qi.error_details or {'error_message': qi.error_message or ''},
                })

        is_success = batch.status == 'completed'

        return {
            'batch_id': str(batch.batch_id),
            'status': batch.status,
            'is_success': is_success,
            'total_items': batch.total_items,
            'sent_count': batch.sent_count,
            'error_count': batch.error_count,
            'sent_items': sent_items,
            'error_items': error_items,
        }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_service.py -v`
Expected: 8 passed

- [ ] **Step 5: Commit**

```bash
git add email_system/services/batch_service.py email_system/tests/test_batch_service.py
git commit -m "feat(email): implement EmailBatchService.query_batch()"
```

---

### Task 7: Batch Completion Detection

**Files:**
- Modify: `backend/django_Admin3/email_system/services/batch_service.py` (add check_batch_completion)
- Modify: `backend/django_Admin3/email_system/services/queue_service.py` (hook after process_queue_item)
- Test: `backend/django_Admin3/email_system/tests/test_batch_service.py`

- [ ] **Step 1: Write failing tests for completion detection**

```python
# Append to test_batch_service.py
from unittest.mock import patch


class BatchCompletionTest(TestCase):
    def setUp(self):
        self.service = EmailBatchService()
        self.template = EmailTemplate.objects.create(
            name='completion_test_template',
            display_name='Completion Test',
            subject_template='Test',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash='f' * 64,
            key_prefix='comp1234',
            name='Test System',
        )

    def _create_batch_with_items(self, statuses):
        batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='Test User',
            notify_email='admin@example.com',
            total_items=len(statuses),
            api_key=self.api_key,
            status='processing',
        )
        for i, status in enumerate(statuses):
            EmailQueue.objects.create(
                to_emails=[f'user{i}@example.com'],
                subject='Test',
                template=self.template,
                batch=batch,
                status=status,
            )
        return batch

    @patch('email_system.services.batch_service.EmailBatchService._send_completion_notification')
    def test_all_sent_completes_batch(self, mock_notify):
        batch = self._create_batch_with_items(['sent', 'sent'])
        self.service.check_batch_completion(batch.batch_id)
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'completed')
        self.assertEqual(batch.sent_count, 2)
        self.assertEqual(batch.error_count, 0)
        self.assertIsNotNone(batch.completed_at)
        mock_notify.assert_called_once()

    @patch('email_system.services.batch_service.EmailBatchService._send_completion_notification')
    def test_mixed_results_completed_with_errors(self, mock_notify):
        batch = self._create_batch_with_items(['sent', 'failed'])
        self.service.check_batch_completion(batch.batch_id)
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'completed_with_errors')
        self.assertEqual(batch.sent_count, 1)
        self.assertEqual(batch.error_count, 1)

    @patch('email_system.services.batch_service.EmailBatchService._send_completion_notification')
    def test_all_failed_sets_failed(self, mock_notify):
        batch = self._create_batch_with_items(['failed', 'cancelled'])
        self.service.check_batch_completion(batch.batch_id)
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'failed')

    def test_not_all_terminal_does_not_complete(self):
        batch = self._create_batch_with_items(['sent', 'pending'])
        self.service.check_batch_completion(batch.batch_id)
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'processing')

    @patch('email_system.services.batch_service.EmailBatchService._send_completion_notification')
    def test_already_completed_is_noop(self, mock_notify):
        batch = self._create_batch_with_items(['sent', 'sent'])
        batch.status = 'completed'
        batch.save()
        self.service.check_batch_completion(batch.batch_id)
        mock_notify.assert_not_called()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_service.py::BatchCompletionTest -v`
Expected: AttributeError — no check_batch_completion method

- [ ] **Step 3: Implement check_batch_completion and _send_completion_notification**

Add to `batch_service.py`:

```python
    TERMINAL_STATUSES = ('sent', 'failed', 'cancelled')

    def check_batch_completion(self, batch_id):
        from django.db import transaction

        with transaction.atomic():
            try:
                batch = EmailBatch.objects.select_for_update().get(batch_id=batch_id)
            except EmailBatch.DoesNotExist:
                return

            # Already terminal — no-op
            if batch.status in ('completed', 'completed_with_errors', 'failed'):
                return

            queue_items = batch.queue_items.all()
            statuses = list(queue_items.values_list('status', flat=True))

            # Check if all items are in terminal state
            if not all(s in self.TERMINAL_STATUSES for s in statuses):
                return

            sent_count = statuses.count('sent')
            error_count = len(statuses) - sent_count

            if error_count == 0:
                batch.status = 'completed'
            elif sent_count == 0:
                batch.status = 'failed'
            else:
                batch.status = 'completed_with_errors'

            batch.sent_count = sent_count
            batch.error_count = error_count
            batch.completed_at = timezone.now()
            batch.save(update_fields=['status', 'sent_count', 'error_count', 'completed_at'])

        self._send_completion_notification(batch)

    def _send_completion_notification(self, batch):
        error_items = []
        for qi in batch.queue_items.filter(status__in=('failed', 'cancelled')):
            error_items.append({
                'to_email': qi.to_emails[0] if qi.to_emails else '',
                'attempts': qi.attempts,
                'error_response': qi.error_details or {'error_message': qi.error_message or ''},
            })

        context = {
            'requested_by': batch.requested_by,
            'batch_id': str(batch.batch_id),
            'total_items': batch.total_items,
            'sent_count': batch.sent_count,
            'error_count': batch.error_count,
            'error_items': error_items,
        }

        from email_system.services.queue_service import email_queue_service
        try:
            email_queue_service.queue_email(
                template_name='batch_completion_report',
                to_emails=batch.notify_email,
                context=context,
            )
        except Exception:
            pass  # Notification failure should not block batch completion
```

- [ ] **Step 4: Hook into queue_service.process_queue_item()**

In `backend/django_Admin3/email_system/services/queue_service.py`, after the status update block in `process_queue_item()` (around line 233, after the failed/retry/sent logic), add:

```python
        # Check batch completion if this item belongs to a batch
        if queue_item.batch_id:
            from email_system.services.batch_service import email_batch_service
            email_batch_service.check_batch_completion(queue_item.batch_id)
```

- [ ] **Step 5: Add global instance to batch_service.py**

At the bottom of `batch_service.py`:

```python
email_batch_service = EmailBatchService()
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_service.py -v`
Expected: 13 passed

- [ ] **Step 7: Commit**

```bash
git add email_system/services/batch_service.py email_system/services/queue_service.py email_system/tests/test_batch_service.py
git commit -m "feat(email): add batch completion detection with notification"
```

---

### Task 8: Serializers

**Files:**
- Create: `backend/django_Admin3/email_system/serializers/batch_serializers.py`
- Test: `backend/django_Admin3/email_system/tests/test_batch_serializers.py`

Note: The existing `serializers.py` is a single file. Create a `serializers/` directory only if one already exists, otherwise create `batch_serializers.py` alongside the existing `serializers.py`.

- [ ] **Step 1: Write failing tests for batch serializers**

```python
# backend/django_Admin3/email_system/tests/test_batch_serializers.py
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from email_system.batch_serializers import SendBatchRequestSerializer, BatchItemSerializer


class BatchItemSerializerTest(TestCase):
    def test_valid_item(self):
        data = {
            'to_email': 'user@example.com',
            'cc_email': ['cc@example.com'],
            'payload': {'firstname': 'Test'},
        }
        s = BatchItemSerializer(data=data)
        self.assertTrue(s.is_valid())

    def test_to_email_required(self):
        data = {'cc_email': [], 'payload': {}}
        s = BatchItemSerializer(data=data)
        self.assertFalse(s.is_valid())

    def test_cc_email_defaults_to_empty(self):
        data = {'to_email': 'user@example.com', 'payload': {}}
        s = BatchItemSerializer(data=data)
        self.assertTrue(s.is_valid())
        self.assertEqual(s.validated_data.get('cc_email', []), [])


class SendBatchRequestSerializerTest(TestCase):
    def test_valid_request(self):
        data = {
            'template_id': 1,
            'requested_by': 'Test User',
            'notify_email': 'admin@example.com',
            'items': [
                {'to_email': 'user@example.com', 'payload': {}},
            ],
        }
        s = SendBatchRequestSerializer(data=data)
        self.assertTrue(s.is_valid())

    def test_template_id_required(self):
        data = {
            'requested_by': 'Test User',
            'notify_email': 'admin@example.com',
            'items': [{'to_email': 'a@b.com', 'payload': {}}],
        }
        s = SendBatchRequestSerializer(data=data)
        self.assertFalse(s.is_valid())

    def test_items_required(self):
        data = {
            'template_id': 1,
            'requested_by': 'Test',
            'notify_email': 'a@b.com',
        }
        s = SendBatchRequestSerializer(data=data)
        self.assertFalse(s.is_valid())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_serializers.py -v`
Expected: ImportError

- [ ] **Step 3: Implement batch serializers**

```python
# backend/django_Admin3/email_system/batch_serializers.py
from rest_framework import serializers


class BatchItemSerializer(serializers.Serializer):
    to_email = serializers.EmailField()
    cc_email = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        default=list,
    )
    subject_override = serializers.CharField(required=False, allow_blank=True)
    payload = serializers.DictField(required=False, default=dict)


class SendBatchRequestSerializer(serializers.Serializer):
    template_id = serializers.IntegerField()
    requested_by = serializers.CharField(max_length=200)
    notify_email = serializers.EmailField()
    items = BatchItemSerializer(many=True)


class BatchItemResponseSerializer(serializers.Serializer):
    to_email = serializers.CharField()
    queue_id = serializers.CharField(allow_null=True)
    is_success = serializers.BooleanField()
    error_response = serializers.DictField()


class SendBatchResponseSerializer(serializers.Serializer):
    batch_id = serializers.CharField()
    status = serializers.CharField()
    total_items = serializers.IntegerField()
    items = BatchItemResponseSerializer(many=True)


class QueryBatchResponseSerializer(serializers.Serializer):
    batch_id = serializers.CharField()
    status = serializers.CharField()
    is_success = serializers.BooleanField()
    total_items = serializers.IntegerField()
    sent_count = serializers.IntegerField()
    error_count = serializers.IntegerField()
    sent_items = serializers.ListField(child=serializers.CharField())
    error_items = serializers.ListField(child=serializers.DictField())
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_serializers.py -v`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add email_system/batch_serializers.py email_system/tests/test_batch_serializers.py
git commit -m "feat(email): add batch API serializers"
```

---

### Task 9: API Views

**Files:**
- Create: `backend/django_Admin3/email_system/batch_views.py`
- Test: `backend/django_Admin3/email_system/tests/test_batch_views.py`

- [ ] **Step 1: Write failing tests for batch API views**

```python
# backend/django_Admin3/email_system/tests/test_batch_views.py
import hashlib
import secrets
from django.test import TestCase
from rest_framework.test import APIClient
from email_system.models import ExternalApiKey, EmailTemplate, EmailBatch, EmailQueue


class SendBatchViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.raw_key = secrets.token_urlsafe(32)
        self.api_key = ExternalApiKey.objects.create(
            key_hash=hashlib.sha256(self.raw_key.encode()).hexdigest(),
            key_prefix=self.raw_key[:8],
            name='Test System',
        )
        self.template = EmailTemplate.objects.create(
            name='view_test_template',
            display_name='View Test',
            subject_template='Test Subject',
        )

    def test_send_batch_success(self):
        response = self.client.post(
            '/api/email/batch/send/',
            data={
                'template_id': self.template.id,
                'requested_by': 'Test User',
                'notify_email': 'admin@example.com',
                'items': [
                    {'to_email': 'user@example.com', 'payload': {'name': 'Test'}},
                ],
            },
            format='json',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn('batch', response.data)
        self.assertIn('batch_id', response.data['batch'])

    def test_send_batch_no_auth(self):
        response = self.client.post(
            '/api/email/batch/send/',
            data={'template_id': 1, 'requested_by': 'X', 'notify_email': 'a@b.com', 'items': []},
            format='json',
        )
        self.assertEqual(response.status_code, 401)

    def test_send_batch_invalid_template(self):
        response = self.client.post(
            '/api/email/batch/send/',
            data={
                'template_id': 99999,
                'requested_by': 'Test',
                'notify_email': 'a@b.com',
                'items': [{'to_email': 'u@b.com', 'payload': {}}],
            },
            format='json',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 400)


class QueryBatchViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.raw_key = secrets.token_urlsafe(32)
        self.api_key = ExternalApiKey.objects.create(
            key_hash=hashlib.sha256(self.raw_key.encode()).hexdigest(),
            key_prefix=self.raw_key[:8],
            name='Test System',
        )
        self.template = EmailTemplate.objects.create(
            name='query_view_template',
            display_name='Query View Test',
            subject_template='Test',
        )
        self.batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='Test User',
            notify_email='admin@example.com',
            total_items=1,
            api_key=self.api_key,
            status='completed',
            sent_count=1,
        )
        EmailQueue.objects.create(
            to_emails=['sent@example.com'],
            subject='Test',
            template=self.template,
            batch=self.batch,
            status='sent',
        )

    def test_query_batch_success(self):
        response = self.client.get(
            f'/api/email/batch/{self.batch.batch_id}/',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['batch_id'], str(self.batch.batch_id))

    def test_query_batch_not_found(self):
        response = self.client.get(
            '/api/email/batch/00000000-0000-0000-0000-000000000000/',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 404)

    def test_query_batch_no_auth(self):
        response = self.client.get(f'/api/email/batch/{self.batch.batch_id}/')
        self.assertEqual(response.status_code, 401)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_views.py -v`
Expected: ImportError or 404

- [ ] **Step 3: Implement batch views**

```python
# backend/django_Admin3/email_system/batch_views.py
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from email_system.authentication import ExternalApiKeyAuthentication
from email_system.batch_serializers import SendBatchRequestSerializer
from email_system.services.batch_service import email_batch_service


class ApiKeyIsAuthenticated(IsAuthenticated):
    """Permission that checks the request was authenticated via API key."""
    def has_permission(self, request, view):
        return request.auth is not None and hasattr(request.auth, 'key_hash')


@api_view(['POST'])
@authentication_classes([ExternalApiKeyAuthentication])
@permission_classes([ApiKeyIsAuthenticated])
def send_batch(request):
    serializer = SendBatchRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    api_key = request.auth

    try:
        result = email_batch_service.send_batch(
            template_id=data['template_id'],
            requested_by=data['requested_by'],
            notify_email=data['notify_email'],
            items=data['items'],
            api_key=api_key,
        )
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'batch': result}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([ExternalApiKeyAuthentication])
@permission_classes([ApiKeyIsAuthenticated])
def query_batch(request, batch_id):
    api_key = request.auth
    result = email_batch_service.query_batch(batch_id, api_key)

    if result is None:
        return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)

    return Response(result, status=status.HTTP_200_OK)
```

- [ ] **Step 4: Add URL routing**

In `backend/django_Admin3/email_system/urls.py`, add imports and URL patterns:

```python
from email_system import batch_views

# Add to urlpatterns (before or after the router.urls include):
urlpatterns = [
    path('batch/send/', batch_views.send_batch, name='email-batch-send'),
    path('batch/<uuid:batch_id>/', batch_views.query_batch, name='email-batch-query'),
] + router.urls
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_views.py -v`
Expected: 6 passed

- [ ] **Step 6: Commit**

```bash
git add email_system/batch_views.py email_system/urls.py email_system/tests/test_batch_views.py
git commit -m "feat(email): add batch send and query API endpoints"
```

---

### Task 10: Django Admin Registration

**Files:**
- Modify: `backend/django_Admin3/email_system/admin.py`
- Test: `backend/django_Admin3/email_system/tests/test_batch_admin.py`

- [ ] **Step 1: Write failing test for admin registration**

```python
# backend/django_Admin3/email_system/tests/test_batch_admin.py
from django.test import TestCase
from django.contrib.admin.sites import site
from email_system.models import ExternalApiKey, EmailBatch


class BatchAdminTest(TestCase):
    def test_external_api_key_registered(self):
        self.assertIn(ExternalApiKey, site._registry)

    def test_email_batch_registered(self):
        self.assertIn(EmailBatch, site._registry)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_admin.py -v`
Expected: AssertionError — models not in admin registry

- [ ] **Step 3: Register models in admin**

Add to `backend/django_Admin3/email_system/admin.py`:

```python
from email_system.models import ExternalApiKey, EmailBatch


@admin.register(ExternalApiKey)
class ExternalApiKeyAdmin(admin.ModelAdmin):
    list_display = ('name', 'key_prefix', 'is_active', 'created_at', 'last_used_at')
    list_filter = ('is_active',)
    readonly_fields = ('key_hash', 'key_prefix', 'created_at', 'last_used_at')
    search_fields = ('name', 'key_prefix')


@admin.register(EmailBatch)
class EmailBatchAdmin(admin.ModelAdmin):
    list_display = ('batch_id', 'template', 'requested_by', 'status', 'total_items', 'sent_count', 'error_count', 'created_at', 'completed_at')
    list_filter = ('status', 'template')
    readonly_fields = ('batch_id', 'template', 'requested_by', 'notify_email', 'status', 'total_items', 'sent_count', 'error_count', 'created_at', 'completed_at', 'api_key')
    search_fields = ('batch_id', 'requested_by', 'notify_email')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_admin.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add email_system/admin.py email_system/tests/test_batch_admin.py
git commit -m "feat(email): register ExternalApiKey and EmailBatch in Django admin"
```

---

### Task 11: Service Exports + Migration

**Files:**
- Modify: `backend/django_Admin3/email_system/services/__init__.py`
- Create: Migration file (auto-generated)

- [ ] **Step 1: Export batch service from services/__init__.py**

Add to `backend/django_Admin3/email_system/services/__init__.py`:
```python
from .batch_service import EmailBatchService, email_batch_service
```

- [ ] **Step 2: Generate migration**

Run: `cd backend/django_Admin3 && python manage.py makemigrations email_system`

This generates a single migration for:
- New `ExternalApiKey` model
- New `EmailBatch` model
- New `batch` FK on `EmailQueue`
- Updated `template_type` choices on `EmailTemplate`

- [ ] **Step 3: Verify migration file is correct**

Review the generated migration file to ensure it includes all four changes.

- [ ] **Step 4: Run existing tests to ensure no regressions**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/ -v --tb=short`
Expected: All batch tests pass, existing tests unaffected

- [ ] **Step 5: Commit**

```bash
git add email_system/services/__init__.py email_system/migrations/
git commit -m "feat(email): add batch service exports and database migration"
```

---

### Task 12: Data Migration for Default Notification Template

**Files:**
- Create: Data migration file

- [ ] **Step 1: Create data migration**

Run: `cd backend/django_Admin3 && python manage.py makemigrations email_system --empty -n create_batch_completion_template`

- [ ] **Step 2: Edit migration with template creation logic**

```python
from django.db import migrations


def create_batch_completion_template(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    EmailTemplate.objects.get_or_create(
        name='batch_completion_report',
        defaults={
            'display_name': 'Batch Completion Report',
            'template_type': 'batch_completion_report',
            'subject_template': 'Email Batch {{ batch_id }} - {{ sent_count }}/{{ total_items }} sent',
            'is_active': True,
            'enable_queue': True,
            'use_master_template': False,
            'basic_mode_content': (
                '# Email Batch Report\n\n'
                '**Requested by:** {{ requested_by }}\n\n'
                '**Batch ID:** {{ batch_id }}\n\n'
                '**Results:** {{ sent_count }} sent, {{ error_count }} errors out of {{ total_items }} total\n\n'
                '{% if error_items %}## Errors\n\n'
                '{% for item in error_items %}'
                '- **{{ item.to_email }}** — {{ item.attempts }} attempts — {{ item.error_response.error_message }}\n'
                '{% endfor %}{% endif %}'
            ),
        },
    )


def reverse_migration(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    EmailTemplate.objects.filter(name='batch_completion_report').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('email_system', 'PREVIOUS_MIGRATION'),  # Replace with actual previous migration name
    ]

    operations = [
        migrations.RunPython(create_batch_completion_template, reverse_migration),
    ]
```

- [ ] **Step 3: Run all batch tests**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_models.py email_system/tests/test_batch_auth.py email_system/tests/test_batch_service.py email_system/tests/test_batch_serializers.py email_system/tests/test_batch_views.py email_system/tests/test_batch_admin.py -v`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add email_system/migrations/
git commit -m "feat(email): add data migration for batch completion report template"
```

---

### Task 13: Integration Test — Full Batch Lifecycle

**Files:**
- Test: `backend/django_Admin3/email_system/tests/test_batch_integration.py`

- [ ] **Step 1: Write integration test**

```python
# backend/django_Admin3/email_system/tests/test_batch_integration.py
import hashlib
import secrets
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from email_system.models import ExternalApiKey, EmailTemplate, EmailBatch, EmailQueue
from email_system.services.batch_service import email_batch_service


class BatchLifecycleIntegrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.raw_key = secrets.token_urlsafe(32)
        self.api_key = ExternalApiKey.objects.create(
            key_hash=hashlib.sha256(self.raw_key.encode()).hexdigest(),
            key_prefix=self.raw_key[:8],
            name='Integration Test System',
        )
        self.template = EmailTemplate.objects.create(
            name='integration_template',
            display_name='Integration Test',
            subject_template='Hello {{ firstname }}',
        )

    def test_full_lifecycle(self):
        """Test: send batch -> process items -> completion detection -> query status"""
        # 1. Send batch
        response = self.client.post(
            '/api/email/batch/send/',
            data={
                'template_id': self.template.id,
                'requested_by': 'Integration Tester',
                'notify_email': 'notify@example.com',
                'items': [
                    {'to_email': 'user1@example.com', 'payload': {'firstname': 'Alice'}},
                    {'to_email': 'user2@example.com', 'payload': {'firstname': 'Bob'}},
                ],
            },
            format='json',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 201)
        batch_id = response.data['batch']['batch_id']

        # 2. Verify batch is processing
        batch = EmailBatch.objects.get(batch_id=batch_id)
        self.assertEqual(batch.status, 'processing')
        self.assertEqual(batch.queue_items.count(), 2)

        # 3. Simulate queue processing: mark items as sent
        for qi in batch.queue_items.all():
            qi.status = 'sent'
            qi.save()

        # 4. Trigger completion detection
        with patch.object(email_batch_service, '_send_completion_notification'):
            email_batch_service.check_batch_completion(batch_id)

        # 5. Verify batch completed
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'completed')
        self.assertEqual(batch.sent_count, 2)
        self.assertEqual(batch.error_count, 0)

        # 6. Query batch status
        response = self.client.get(
            f'/api/email/batch/{batch_id}/',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_success'])
        self.assertEqual(len(response.data['sent_items']), 2)
```

- [ ] **Step 2: Run integration test**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_integration.py -v`
Expected: 1 passed

- [ ] **Step 3: Run full test suite to verify no regressions**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/ -v --tb=short`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add email_system/tests/test_batch_integration.py
git commit -m "test(email): add batch lifecycle integration test"
```
