# Email Closing Salutation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reusable `ClosingSalutation` model so email templates pull their "Kind Regards, BPP Actuarial (ActEd)" block from the database instead of hardcoding it in MJML files, with full admin UI and MJML preview integration.

**Architecture:** Separate `ClosingSalutation` model with FK from `EmailTemplate`. Two signature types: team name or ordered staff members from `tutorials.Staff`. The MJML shell gains a `<!-- SIGNATURE_PLACEHOLDER -->` between content and footer. Backend generates signature MJML; frontend injects it during preview compilation.

**Tech Stack:** Django 6.0 + DRF (backend), React 19.2 + MUI v7 + TypeScript (frontend), mjml-browser (client-side preview), CodeMirror 6 (editor)

---

## Task 1: Create ClosingSalutation and ClosingSalutationStaff Models

**Files:**
- Create: `backend/django_Admin3/email_system/models/closing_salutation.py`
- Modify: `backend/django_Admin3/email_system/models/__init__.py`
- Modify: `backend/django_Admin3/email_system/models/template.py`

**Step 1: Create the model file**

Create `backend/django_Admin3/email_system/models/closing_salutation.py`:

```python
from django.db import models


class ClosingSalutation(models.Model):
    """Reusable closing salutation block for email templates."""

    SIGNATURE_TYPE_CHOICES = [
        ('team', 'Team'),
        ('staff', 'Staff'),
    ]

    STAFF_NAME_FORMAT_CHOICES = [
        ('full_name', 'Full Name'),
        ('first_name', 'First Name Only'),
    ]

    name = models.CharField(max_length=100, unique=True, help_text="Salutation identifier")
    display_name = models.CharField(max_length=200, help_text="Human-readable name")
    sign_off_text = models.CharField(max_length=200, default='Kind Regards', help_text="Sign-off line, e.g. 'Kind Regards'")
    signature_type = models.CharField(max_length=10, choices=SIGNATURE_TYPE_CHOICES, default='team')
    team_signature = models.CharField(max_length=200, blank=True, help_text="Team name when signature_type is 'team'")
    staff_name_format = models.CharField(max_length=20, choices=STAFF_NAME_FORMAT_CHOICES, default='full_name', help_text="How staff names are displayed")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_email_closing_salutation'
        ordering = ['name']
        verbose_name = 'Closing Salutation'
        verbose_name_plural = 'Closing Salutations'

    def __str__(self):
        return f"{self.display_name} ({self.signature_type})"

    def render_mjml(self):
        """Generate the MJML snippet for this closing salutation."""
        if self.signature_type == 'team':
            name_lines = f'<b>{self.team_signature}</b><br/>' if self.team_signature else ''
        else:
            staff_entries = self.staff_members.select_related('staff__user').order_by('display_order')
            lines = []
            for entry in staff_entries:
                user = entry.staff.user
                if self.staff_name_format == 'first_name':
                    name = user.first_name
                else:
                    name = user.get_full_name() or user.username
                lines.append(f'<b>{name}</b><br/>')
            name_lines = '\n      '.join(lines)

        return (
            '<mj-section background-color="#ffffff">\n'
            '  <mj-column width="100%" padding="0" background-color="#ffffff">\n'
            '    <mj-text align="left" css-class="signature-section" padding="12px 24px">\n'
            f'      {self.sign_off_text},<br/>\n'
            f'      {name_lines}\n'
            '    </mj-text>\n'
            '  </mj-column>\n'
            '</mj-section>'
        )


class ClosingSalutationStaff(models.Model):
    """Ordered staff members for a closing salutation."""

    closing_salutation = models.ForeignKey(
        ClosingSalutation,
        on_delete=models.CASCADE,
        related_name='staff_members',
    )
    staff = models.ForeignKey(
        'tutorials.Staff',
        on_delete=models.CASCADE,
        related_name='closing_salutations',
    )
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'utils_email_closing_salutation_staff'
        unique_together = ['closing_salutation', 'staff']
        ordering = ['display_order']
        verbose_name = 'Closing Salutation Staff'
        verbose_name_plural = 'Closing Salutation Staff'

    def __str__(self):
        return f"{self.closing_salutation.name} - {self.staff}"
```

**Step 2: Add closing_salutation FK to EmailTemplate**

In `backend/django_Admin3/email_system/models/template.py`, add after the `is_master` field (line 54):

```python
    # Closing salutation
    closing_salutation = models.ForeignKey(
        'email_system.ClosingSalutation',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='templates',
        help_text="Closing salutation block for this template",
    )
```

**Step 3: Update models/__init__.py**

Add to `backend/django_Admin3/email_system/models/__init__.py`:

```python
from .closing_salutation import ClosingSalutation, ClosingSalutationStaff
```

And add `'ClosingSalutation'` and `'ClosingSalutationStaff'` to `__all__`.

**Step 4: Create and run migration**

Run:
```bash
cd backend/django_Admin3 && python manage.py makemigrations email_system
```

Expected: Creates migration `0005_closingsalutation_closingsalutationstaff_emailtemplate_closing_salutation.py` (or similar).

Run:
```bash
cd backend/django_Admin3 && python manage.py migrate
```

Expected: `Applying email_system.0005_... OK`

**Step 5: Commit**

```bash
git add backend/django_Admin3/email_system/models/closing_salutation.py \
        backend/django_Admin3/email_system/models/template.py \
        backend/django_Admin3/email_system/models/__init__.py \
        backend/django_Admin3/email_system/migrations/0005_*
git commit -m "feat(email): add ClosingSalutation model with staff through table and FK on EmailTemplate"
```

---

## Task 2: Seed Default Salutation and Assign to Templates

**Files:**
- Create: `backend/django_Admin3/email_system/migrations/0006_seed_default_closing_salutation.py`

**Step 1: Create data migration**

```python
"""Seed the default ActEd closing salutation and assign to all non-master templates."""

from django.db import migrations


def seed_default_salutation(apps, schema_editor):
    ClosingSalutation = apps.get_model('email_system', 'ClosingSalutation')
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')

    salutation, _ = ClosingSalutation.objects.get_or_create(
        name='acted_default',
        defaults={
            'display_name': 'ActEd',
            'sign_off_text': 'Kind Regards',
            'signature_type': 'team',
            'team_signature': 'BPP Actuarial (ActEd)',
            'staff_name_format': 'full_name',
            'is_active': True,
        },
    )

    EmailTemplate.objects.filter(is_master=False).update(
        closing_salutation=salutation,
    )


def remove_default_salutation(apps, schema_editor):
    ClosingSalutation = apps.get_model('email_system', 'ClosingSalutation')
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')

    EmailTemplate.objects.filter(
        closing_salutation__name='acted_default',
    ).update(closing_salutation=None)

    ClosingSalutation.objects.filter(name='acted_default').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('email_system', '0005_closingsalutation_closingsalutationstaff_emailtemplate_closing_salutation'),
    ]

    operations = [
        migrations.RunPython(seed_default_salutation, remove_default_salutation),
    ]
```

Note: The `0005` dependency name above is a placeholder — use the actual migration filename generated in Task 1.

**Step 2: Run migration**

```bash
cd backend/django_Admin3 && python manage.py migrate
```

**Step 3: Verify**

```bash
cd backend/django_Admin3 && python manage.py shell -c "
from email_system.models import ClosingSalutation, EmailTemplate
s = ClosingSalutation.objects.get(name='acted_default')
print(f'Salutation: {s.display_name} - {s.team_signature}')
print(f'Templates assigned: {EmailTemplate.objects.filter(closing_salutation=s).count()}')
print(f'Master templates (null): {EmailTemplate.objects.filter(is_master=True, closing_salutation__isnull=True).count()}')
"
```

Expected: Salutation created, all non-master templates assigned, master templates have null.

**Step 4: Commit**

```bash
git add backend/django_Admin3/email_system/migrations/0006_*
git commit -m "feat(email): seed default ActEd closing salutation and assign to templates"
```

---

## Task 3: Remove Hardcoded Signatures from MJML Files

**Files:**
- Modify: `backend/django_Admin3/utils/templates/emails/mjml/order_confirmation_content.mjml:214-221`
- Modify: `backend/django_Admin3/utils/templates/emails/mjml/password_reset_content.mjml:65-72`
- Modify: `backend/django_Admin3/utils/templates/emails/mjml/password_reset_completed_content.mjml:53-60`
- Modify: `backend/django_Admin3/utils/templates/emails/mjml/email_verification_content.mjml:65-72`
- Modify: `backend/django_Admin3/utils/templates/emails/mjml/account_activation_content.mjml:55-58`

**Step 1: Remove signature blocks**

From `order_confirmation_content.mjml`, delete lines 214-221 (the `<mj-section>` containing "Kind Regards" signature).

From `password_reset_content.mjml`, delete lines 65-72.

From `password_reset_completed_content.mjml`, delete lines 53-60.

From `email_verification_content.mjml`, delete lines 65-72.

From `account_activation_content.mjml`, delete lines 55-58 (the `<mj-text>` containing "Welcome aboard! / The ActEd Team"). Keep the closing `</mj-column></mj-section>` tags.

**Step 2: Verify MJML files are still valid**

Each file should end with just the content `</mj-column></mj-section>` (with possible trailing whitespace) — no signature block.

**Step 3: Commit**

```bash
git add backend/django_Admin3/utils/templates/emails/mjml/order_confirmation_content.mjml \
        backend/django_Admin3/utils/templates/emails/mjml/password_reset_content.mjml \
        backend/django_Admin3/utils/templates/emails/mjml/password_reset_completed_content.mjml \
        backend/django_Admin3/utils/templates/emails/mjml/email_verification_content.mjml \
        backend/django_Admin3/utils/templates/emails/mjml/account_activation_content.mjml
git commit -m "refactor(email): remove hardcoded signature blocks from MJML content templates"
```

---

## Task 4: Backend Serializers for ClosingSalutation

**Files:**
- Modify: `backend/django_Admin3/email_system/serializers.py`

**Step 1: Write failing test**

Create `backend/django_Admin3/email_system/tests/test_closing_salutation_serializers.py`:

```python
from django.test import TestCase
from email_system.models import ClosingSalutation
from email_system.serializers import ClosingSalutationSerializer, ClosingSalutationListSerializer


class ClosingSalutationSerializerTest(TestCase):
    def setUp(self):
        self.salutation = ClosingSalutation.objects.create(
            name='test_salutation',
            display_name='Test',
            sign_off_text='Best regards',
            signature_type='team',
            team_signature='The Test Team',
        )

    def test_list_serializer_fields(self):
        serializer = ClosingSalutationListSerializer(self.salutation)
        data = serializer.data
        self.assertEqual(data['name'], 'test_salutation')
        self.assertEqual(data['sign_off_text'], 'Best regards')
        self.assertEqual(data['signature_type'], 'team')
        self.assertNotIn('staff_members', data)

    def test_detail_serializer_includes_staff_members(self):
        serializer = ClosingSalutationSerializer(self.salutation)
        data = serializer.data
        self.assertIn('staff_members', data)
        self.assertEqual(data['staff_members'], [])

    def test_detail_serializer_create(self):
        data = {
            'name': 'new_salutation',
            'display_name': 'New',
            'sign_off_text': 'Cheers',
            'signature_type': 'team',
            'team_signature': 'New Team',
        }
        serializer = ClosingSalutationSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.name, 'new_salutation')
```

**Step 2: Run test to verify it fails**

```bash
cd backend/django_Admin3 && python manage.py test email_system.tests.test_closing_salutation_serializers -v2
```

Expected: `ImportError` — serializers don't exist yet.

**Step 3: Add serializers**

Add to `backend/django_Admin3/email_system/serializers.py`:

```python
from email_system.models import (
    # ... existing imports ...,
    ClosingSalutation, ClosingSalutationStaff,
)

# ---------------------------------------------------------------------------
# ClosingSalutation
# ---------------------------------------------------------------------------

class ClosingSalutationStaffSerializer(serializers.ModelSerializer):
    """Serializer for staff entries within a closing salutation."""
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = ClosingSalutationStaff
        fields = ['id', 'staff', 'display_name', 'display_order']

    def get_display_name(self, obj):
        return str(obj.staff)


class ClosingSalutationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for salutation list views."""

    class Meta:
        model = ClosingSalutation
        fields = [
            'id', 'name', 'display_name', 'sign_off_text',
            'signature_type', 'team_signature', 'staff_name_format',
            'is_active', 'created_at', 'updated_at',
        ]


class ClosingSalutationSerializer(serializers.ModelSerializer):
    """Full serializer for salutation detail, create, and update views."""
    staff_members = ClosingSalutationStaffSerializer(many=True, read_only=True)

    class Meta:
        model = ClosingSalutation
        fields = [
            'id', 'name', 'display_name', 'sign_off_text',
            'signature_type', 'team_signature', 'staff_name_format',
            'staff_members',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
```

Also update `EmailTemplateSerializer` and `EmailTemplateListSerializer` to include `closing_salutation`:

In `EmailTemplateListSerializer.Meta.fields`, add `'closing_salutation'`.

In `EmailTemplateSerializer`, add a read-only nested field:

```python
class EmailTemplateSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    closing_salutation_detail = ClosingSalutationListSerializer(
        source='closing_salutation', read_only=True
    )

    class Meta:
        model = EmailTemplate
        fields = [
            # ... existing fields ...,
            'closing_salutation', 'closing_salutation_detail',
        ]
```

**Step 4: Run test to verify it passes**

```bash
cd backend/django_Admin3 && python manage.py test email_system.tests.test_closing_salutation_serializers -v2
```

Expected: All 3 tests PASS.

**Step 5: Commit**

```bash
git add backend/django_Admin3/email_system/serializers.py \
        backend/django_Admin3/email_system/tests/test_closing_salutation_serializers.py
git commit -m "feat(email): add ClosingSalutation serializers and update template serializers"
```

---

## Task 5: Backend ViewSet and URL Registration

**Files:**
- Modify: `backend/django_Admin3/email_system/views.py`
- Modify: `backend/django_Admin3/email_system/urls.py`

**Step 1: Write failing test**

Create `backend/django_Admin3/email_system/tests/test_closing_salutation_views.py`:

```python
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status as http_status
from email_system.models import ClosingSalutation, EmailTemplate


class ClosingSalutationViewSetTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin', 'admin@test.com', 'pass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.salutation = ClosingSalutation.objects.create(
            name='test_sal',
            display_name='Test',
            sign_off_text='Best',
            signature_type='team',
            team_signature='Test Team',
        )

    def test_list_salutations(self):
        response = self.client.get('/api/email/closing-salutations/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_create_salutation(self):
        data = {
            'name': 'new_sal',
            'display_name': 'New',
            'sign_off_text': 'Cheers',
            'signature_type': 'team',
            'team_signature': 'New Team',
        }
        response = self.client.post('/api/email/closing-salutations/', data, format='json')
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)

    def test_retrieve_salutation(self):
        response = self.client.get(f'/api/email/closing-salutations/{self.salutation.id}/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'test_sal')

    def test_update_salutation(self):
        response = self.client.patch(
            f'/api/email/closing-salutations/{self.salutation.id}/',
            {'sign_off_text': 'Warm regards'},
            format='json',
        )
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.salutation.refresh_from_db()
        self.assertEqual(self.salutation.sign_off_text, 'Warm regards')

    def test_signature_mjml_endpoint(self):
        template = EmailTemplate.objects.create(
            name='test_tmpl',
            display_name='Test Template',
            subject_template='Test',
            content_template_name='test',
            closing_salutation=self.salutation,
        )
        response = self.client.get(f'/api/email/templates/{template.id}/signature-mjml/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIn('signature_mjml', response.data)
        self.assertIn('Best,', response.data['signature_mjml'])
        self.assertIn('Test Team', response.data['signature_mjml'])

    def test_signature_mjml_returns_empty_when_no_salutation(self):
        template = EmailTemplate.objects.create(
            name='no_sal_tmpl',
            display_name='No Salutation',
            subject_template='Test',
            content_template_name='test',
        )
        response = self.client.get(f'/api/email/templates/{template.id}/signature-mjml/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data['signature_mjml'], '')

    def test_non_superuser_denied(self):
        regular = User.objects.create_user('regular', 'reg@test.com', 'pass')
        client = APIClient()
        client.force_authenticate(user=regular)
        response = client.get('/api/email/closing-salutations/')
        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)
```

**Step 2: Run test to verify it fails**

```bash
cd backend/django_Admin3 && python manage.py test email_system.tests.test_closing_salutation_views -v2
```

Expected: 404s — endpoint not registered yet.

**Step 3: Add ViewSet**

Add to `backend/django_Admin3/email_system/views.py`:

```python
from email_system.models import (
    # ... existing imports ...,
    ClosingSalutation, ClosingSalutationStaff,
)
from email_system.serializers import (
    # ... existing imports ...,
    ClosingSalutationSerializer, ClosingSalutationListSerializer,
)


class ClosingSalutationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing closing salutations."""

    queryset = ClosingSalutation.objects.prefetch_related(
        'staff_members__staff__user'
    ).all()
    permission_classes = [IsSuperUser]

    def get_serializer_class(self):
        if self.action == 'list':
            return ClosingSalutationListSerializer
        return ClosingSalutationSerializer
```

Add `signature_mjml` action to the existing `EmailTemplateViewSet`:

```python
    @action(detail=True, methods=['get'], url_path='signature-mjml')
    def signature_mjml(self, request, pk=None):
        """Return the MJML snippet for this template's closing salutation."""
        instance = self.get_object()
        if instance.closing_salutation:
            mjml = instance.closing_salutation.render_mjml()
        else:
            mjml = ''
        return Response({'signature_mjml': mjml})
```

**Step 4: Register URL**

In `backend/django_Admin3/email_system/urls.py`, add:

```python
router.register(r'closing-salutations', views.ClosingSalutationViewSet)
```

**Step 5: Run test to verify it passes**

```bash
cd backend/django_Admin3 && python manage.py test email_system.tests.test_closing_salutation_views -v2
```

Expected: All 7 tests PASS.

**Step 6: Commit**

```bash
git add backend/django_Admin3/email_system/views.py \
        backend/django_Admin3/email_system/urls.py \
        backend/django_Admin3/email_system/tests/test_closing_salutation_views.py
git commit -m "feat(email): add ClosingSalutation ViewSet, signature-mjml endpoint, and URL registration"
```

---

## Task 6: Update MJML Shell with Signature Placeholder

**Files:**
- Modify: `backend/django_Admin3/email_system/views.py` (mjml_shell action)

**Step 1: Write failing test**

Add to `backend/django_Admin3/email_system/tests/test_closing_salutation_views.py`:

```python
    def test_mjml_shell_includes_signature_placeholder(self):
        response = self.client.get('/api/email/templates/mjml-shell/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIn('<!-- SIGNATURE_PLACEHOLDER -->', response.data['shell'])
        # Verify ordering: content before signature before footer
        shell = response.data['shell']
        content_pos = shell.index('<!-- CONTENT_PLACEHOLDER -->')
        sig_pos = shell.index('<!-- SIGNATURE_PLACEHOLDER -->')
        footer_pos = shell.index('Mctimoney House')  # footer content
        self.assertLess(content_pos, sig_pos)
        self.assertLess(sig_pos, footer_pos)
```

**Step 2: Run test to verify it fails**

```bash
cd backend/django_Admin3 && python manage.py test email_system.tests.test_closing_salutation_views.ClosingSalutationViewSetTest.test_mjml_shell_includes_signature_placeholder -v2
```

Expected: FAIL — placeholder not in shell yet.

**Step 3: Update mjml_shell action**

In `backend/django_Admin3/email_system/views.py`, modify the `mjml_shell` action. Change line 113:

```python
            '      <!-- CONTENT_PLACEHOLDER -->\n'
```

to:

```python
            '      <!-- CONTENT_PLACEHOLDER -->\n'
            '      <!-- SIGNATURE_PLACEHOLDER -->\n'
```

**Step 4: Run test to verify it passes**

```bash
cd backend/django_Admin3 && python manage.py test email_system.tests.test_closing_salutation_views.ClosingSalutationViewSetTest.test_mjml_shell_includes_signature_placeholder -v2
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/django_Admin3/email_system/views.py \
        backend/django_Admin3/email_system/tests/test_closing_salutation_views.py
git commit -m "feat(email): add SIGNATURE_PLACEHOLDER to MJML shell between content and footer"
```

---

## Task 7: Run Full Backend Test Suite

**Step 1: Run all email_system tests**

```bash
cd backend/django_Admin3 && python manage.py test email_system -v2
```

Expected: All tests pass (including existing template/queue/settings tests plus new closing salutation tests).

**Step 2: Run full backend suite**

```bash
cd backend/django_Admin3 && python manage.py test -v2
```

Expected: No regressions from these changes (pre-existing failures in fuzzy search are acceptable).

**Step 3: Commit if any test-driven fixes were needed**

---

## Task 8: Frontend Types for ClosingSalutation

**Files:**
- Create: `frontend/react-Admin3/src/types/email/closingSalutation.types.ts`
- Modify: `frontend/react-Admin3/src/types/email/emailTemplate.types.ts`
- Modify: `frontend/react-Admin3/src/types/email/index.ts`

**Step 1: Create type file**

Create `frontend/react-Admin3/src/types/email/closingSalutation.types.ts`:

```typescript
export type SignatureType = 'team' | 'staff';
export type StaffNameFormat = 'full_name' | 'first_name';

export interface ClosingSalutationStaffEntry {
    id: number;
    staff: number;
    display_name: string;
    display_order: number;
}

export interface ClosingSalutation {
    id: number;
    name: string;
    display_name: string;
    sign_off_text: string;
    signature_type: SignatureType;
    team_signature: string;
    staff_name_format: StaffNameFormat;
    staff_members: ClosingSalutationStaffEntry[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ClosingSalutationList {
    id: number;
    name: string;
    display_name: string;
    sign_off_text: string;
    signature_type: SignatureType;
    team_signature: string;
    staff_name_format: StaffNameFormat;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface SignatureMjmlResponse {
    signature_mjml: string;
}
```

**Step 2: Update EmailTemplate type**

In `frontend/react-Admin3/src/types/email/emailTemplate.types.ts`, add to `EmailTemplate`:

```typescript
  closing_salutation: number | null;
  closing_salutation_detail?: ClosingSalutationList | null;
```

Add import at top: `import type { ClosingSalutationList } from './closingSalutation.types';`

**Step 3: Update index.ts**

Add to `frontend/react-Admin3/src/types/email/index.ts`:

```typescript
export * from './closingSalutation.types';
```

**Step 4: Commit**

```bash
git add frontend/react-Admin3/src/types/email/closingSalutation.types.ts \
        frontend/react-Admin3/src/types/email/emailTemplate.types.ts \
        frontend/react-Admin3/src/types/email/index.ts
git commit -m "feat(email): add ClosingSalutation TypeScript types and update EmailTemplate type"
```

---

## Task 9: Frontend emailService Methods

**Files:**
- Modify: `frontend/react-Admin3/src/services/emailService.ts`

**Step 1: Add closing salutation service methods**

Add imports at top:

```typescript
import type {
    // ... existing imports ...,
    ClosingSalutation,
    SignatureMjmlResponse,
} from "../types/email";
```

Add to the `emailService` object:

```typescript
    // ─── Closing Salutations ──────────────────────────────────
    getClosingSalutations: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/closing-salutations/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getClosingSalutationById: async (id: number): Promise<ClosingSalutation> => {
        const response = await httpService.get(`${BASE_URL}/closing-salutations/${id}/`);
        return response.data;
    },

    createClosingSalutation: async (data: Partial<ClosingSalutation>): Promise<ClosingSalutation> => {
        const response = await httpService.post(`${BASE_URL}/closing-salutations/`, data);
        return response.data;
    },

    updateClosingSalutation: async (id: number, data: Partial<ClosingSalutation>): Promise<ClosingSalutation> => {
        const response = await httpService.put(`${BASE_URL}/closing-salutations/${id}/`, data);
        return response.data;
    },

    patchClosingSalutation: async (id: number, data: Partial<ClosingSalutation>): Promise<ClosingSalutation> => {
        const response = await httpService.patch(`${BASE_URL}/closing-salutations/${id}/`, data);
        return response.data;
    },

    deleteClosingSalutation: async (id: number): Promise<void> => {
        await httpService.delete(`${BASE_URL}/closing-salutations/${id}/`);
    },

    getSignatureMjml: async (templateId: number): Promise<SignatureMjmlResponse> => {
        const response = await httpService.get(`${BASE_URL}/templates/${templateId}/signature-mjml/`);
        return response.data;
    },
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/services/emailService.ts
git commit -m "feat(email): add closing salutation service methods and getSignatureMjml"
```

---

## Task 10: Closing Salutation List Component

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/email/closing-salutations/useClosingSalutationListVM.ts`
- Create: `frontend/react-Admin3/src/components/admin/email/closing-salutations/ClosingSalutationList.tsx`

**Step 1: Create VM**

Follow the exact same pattern as `useEmailTemplateListVM.ts`. The VM should:
- Fetch salutations via `emailService.getClosingSalutations`
- Handle pagination, loading, error states
- Handle delete with confirmation

**Step 2: Create List component**

Follow `EmailTemplateList.tsx` pattern. Table columns: Name, Display Name, Sign-off, Type (Chip: team/staff), Active (Chip), Actions (Edit, Delete).

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/closing-salutations/
git commit -m "feat(email): add ClosingSalutationList component with VM"
```

---

## Task 11: Closing Salutation Form Component

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/email/closing-salutations/useClosingSalutationFormVM.ts`
- Create: `frontend/react-Admin3/src/components/admin/email/closing-salutations/ClosingSalutationForm.tsx`

**Step 1: Create VM**

Follow `useEmailTemplateFormVM.ts` pattern:
- Detect create vs edit via `useParams`
- Fetch by ID for edit mode via `emailService.getClosingSalutationById`
- Save via `createClosingSalutation` / `updateClosingSalutation`
- Navigate back to list on success

**Step 2: Create Form component**

Fields:
- `name` — TextField
- `display_name` — TextField
- `sign_off_text` — TextField (default "Kind Regards")
- `signature_type` — ToggleButtonGroup or Select (team / staff)
- Conditional section:
  - If `team`: `team_signature` — TextField
  - If `staff`: `staff_name_format` — Select (Full Name / First Name) + Staff multi-select (Autocomplete). Staff list from a new `emailService.getStaff()` call or existing staff endpoint. Drag-to-reorder is nice-to-have; start with simple numbered ordering.
- `is_active` — Switch

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/closing-salutations/
git commit -m "feat(email): add ClosingSalutationForm component with team/staff signature support"
```

---

## Task 12: Register Routes and Sidebar

**Files:**
- Modify: `frontend/react-Admin3/src/App.js`
- Modify: `frontend/react-Admin3/src/components/admin/AdminSidebar.tsx`

**Step 1: Add routes in App.js**

Add imports:

```javascript
import ClosingSalutationList from "./components/admin/email/closing-salutations/ClosingSalutationList";
import ClosingSalutationForm from "./components/admin/email/closing-salutations/ClosingSalutationForm";
```

Add routes alongside existing email routes:

```jsx
<Route path="/admin/email/closing-salutations" element={<ClosingSalutationList />} />
<Route path="/admin/email/closing-salutations/new" element={<ClosingSalutationForm />} />
<Route path="/admin/email/closing-salutations/:id/edit" element={<ClosingSalutationForm />} />
```

**Step 2: Add sidebar item**

In `AdminSidebar.tsx`, add to the Email System section items array:

```typescript
{ label: 'Salutations', path: '/admin/email/closing-salutations', icon: <CreateIcon fontSize="small" /> },
```

(Use `CreateIcon` from `@mui/icons-material/Create` or similar — a pen/signature icon.)

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/App.js \
        frontend/react-Admin3/src/components/admin/AdminSidebar.tsx
git commit -m "feat(email): register closing salutation routes and sidebar navigation"
```

---

## Task 13: Add Closing Salutation Dropdown to Template Edit Form

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/email/templates/useEmailTemplateFormVM.ts`
- Modify: `frontend/react-Admin3/src/components/admin/email/templates/EmailTemplateForm.tsx`

**Step 1: Update VM**

In `useEmailTemplateFormVM.ts`:
- Add state for `salutations` list: `const [salutations, setSalutations] = useState<ClosingSalutationList[]>([]);`
- Fetch salutations on mount: `emailService.getClosingSalutations()` and store in state
- Ensure `formData` includes `closing_salutation` (number | null)
- Handle changes to `closing_salutation` field

**Step 2: Update Form**

In `EmailTemplateForm.tsx`, on the General tab, add a "Closing Salutation" section:
- `Select` / `Autocomplete` dropdown populated from `vm.salutations`
- Display option label as `display_name` with `sign_off_text` preview
- "None" option clears the FK
- Only shown for non-master templates (hide when `is_master` is checked)

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/templates/useEmailTemplateFormVM.ts \
        frontend/react-Admin3/src/components/admin/email/templates/EmailTemplateForm.tsx
git commit -m "feat(email): add closing salutation dropdown to template edit form"
```

---

## Task 14: Update MJML Editor VM for Signature Preview

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/email/templates/useEmailTemplateMjmlEditorVM.ts`

**Step 1: Update VM**

Changes to `useEmailTemplateMjmlEditorVM.ts`:

1. Add new constant: `const SIGNATURE_PLACEHOLDER = '<!-- SIGNATURE_PLACEHOLDER -->';`

2. Add `signatureRef`:
   ```typescript
   const signatureRef = useRef<string>('');
   ```

3. Add `templateId` to the shell fetch effect — also fetch signature MJML:
   ```typescript
   const { signature_mjml } = await emailService.getSignatureMjml(templateId);
   signatureRef.current = signature_mjml;
   ```

4. Update `compileMjml` to replace both placeholders:
   ```typescript
   fullMjml = shellRef.current
       .replace(CONTENT_PLACEHOLDER, content)
       .replace(SIGNATURE_PLACEHOLDER, signatureRef.current);
   ```

5. Add a method to refresh signature when the closing salutation changes on the template form:
   ```typescript
   const refreshSignature = useCallback(async () => {
       try {
           const { signature_mjml } = await emailService.getSignatureMjml(templateId);
           signatureRef.current = signature_mjml;
           if (mjmlContent) compileMjml(mjmlContent);
       } catch (err) {
           console.error('Error fetching signature MJML:', err);
       }
   }, [templateId, mjmlContent, compileMjml]);
   ```

6. Export `refreshSignature` from the VM interface.

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/templates/useEmailTemplateMjmlEditorVM.ts
git commit -m "feat(email): update MJML editor VM to inject signature placeholder in preview"
```

---

## Task 15: Frontend Integration Test

**Step 1: Run frontend build**

```bash
cd frontend/react-Admin3 && npm run build
```

Expected: No TypeScript compilation errors.

**Step 2: Run existing frontend tests**

```bash
cd frontend/react-Admin3 && npm test -- --watchAll=false
```

Expected: All existing tests pass.

**Step 3: Commit any fixes if needed**

---

## Task 16: Final Backend Test Suite Run

**Step 1: Run full backend test suite**

```bash
cd backend/django_Admin3 && python manage.py test -v2
```

Expected: All tests pass. New closing salutation tests included.

**Step 2: Run pact tests**

```bash
cd frontend/react-Admin3 && npm test -- --testPathPattern=pact --watchAll=false
```

Note: Pact tests may need state handler updates if they reference the template serializer. If so, update `backend/django_Admin3/pact_tests/state_handlers.py` to include the new `closing_salutation` field.

**Step 3: Commit any fixes**

```bash
git commit -m "fix(email): resolve any test regressions from closing salutation feature"
```
