# Staff App Extraction & Salutation Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract `Staff` model from `tutorials` into a dedicated `staff` app, add `Team` and `TeamStaff` models, and redesign `ClosingSalutation` to reference proper Team/Staff models.

**Architecture:** Create a new `staff` Django app in the `acted` schema. Use `SeparateDatabaseAndState` migrations to move Staff without touching the existing database table. Add three new columns to Staff (`job_title`, `name_format`, `show_job_title`). Create `Team` and `TeamStaff` tables. Revise `ClosingSalutation` to FK to Team instead of storing a string, and remove `staff_name_format` (now on Staff).

**Tech Stack:** Python 3.14, Django 6.0, PostgreSQL (`acted` schema), Django REST Framework

---

## Task 1: Create the `staff` app scaffolding

**Files:**
- Create: `backend/django_Admin3/staff/__init__.py`
- Create: `backend/django_Admin3/staff/apps.py`
- Create: `backend/django_Admin3/staff/models/__init__.py`
- Create: `backend/django_Admin3/staff/admin.py`
- Create: `backend/django_Admin3/staff/migrations/__init__.py`

**Step 1: Create app directory and files**

```python
# staff/__init__.py
# (empty)
```

```python
# staff/apps.py
from django.apps import AppConfig


class StaffConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'staff'
    verbose_name = 'Staff'
```

```python
# staff/models/__init__.py
from .staff import Staff
from .team import Team
from .team_staff import TeamStaff
```

```python
# staff/admin.py
from django.contrib import admin
from .models import Staff, Team, TeamStaff
```

```python
# staff/migrations/__init__.py
# (empty)
```

**Step 2: Register in INSTALLED_APPS**

Modify: `backend/django_Admin3/django_Admin3/settings/base.py:126`

Add `'staff.apps.StaffConfig',` **before** `'tutorials',` (tutorials will depend on staff):

```python
    'students',
    'staff.apps.StaffConfig',  # Staff, Team, TeamStaff (acted schema)
    'tutorials',
```

**Step 3: Commit**

```bash
git add backend/django_Admin3/staff/ backend/django_Admin3/django_Admin3/settings/base.py
git commit -m "feat(staff): create staff app scaffolding and register in INSTALLED_APPS"
```

---

## Task 2: Create Staff model in new app

**Files:**
- Create: `backend/django_Admin3/staff/models/staff.py`

**Step 1: Write the failing test**

Create: `backend/django_Admin3/staff/tests/__init__.py` (empty)
Create: `backend/django_Admin3/staff/tests/test_models.py`

```python
from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError, connection


class StaffModelTest(TestCase):
    """Tests for staff.Staff model."""

    def test_create_staff_with_new_fields(self):
        """Staff should have job_title, name_format, show_job_title fields."""
        from staff.models import Staff
        user = User.objects.create_user(
            username='staff_new_1', password='testpass123',
            first_name='John', last_name='Smith',
        )
        staff = Staff.objects.create(
            user=user,
            job_title='Senior Tutor',
            name_format='first_name',
            show_job_title=True,
        )
        staff.refresh_from_db()
        self.assertEqual(staff.job_title, 'Senior Tutor')
        self.assertEqual(staff.name_format, 'first_name')
        self.assertTrue(staff.show_job_title)

    def test_default_field_values(self):
        """New fields should have sensible defaults."""
        from staff.models import Staff
        user = User.objects.create_user(username='staff_defaults', password='testpass123')
        staff = Staff.objects.create(user=user)
        self.assertEqual(staff.job_title, '')
        self.assertEqual(staff.name_format, 'full_name')
        self.assertFalse(staff.show_job_title)

    def test_str_with_full_name(self):
        from staff.models import Staff
        user = User.objects.create_user(
            username='staff_str', password='testpass123',
            first_name='Jane', last_name='Doe',
        )
        staff = Staff.objects.create(user=user)
        self.assertEqual(str(staff), 'Jane Doe')

    def test_str_username_fallback(self):
        from staff.models import Staff
        user = User.objects.create_user(username='jdoe_fb', password='testpass123')
        staff = Staff.objects.create(user=user)
        self.assertEqual(str(staff), 'jdoe_fb')

    def test_one_to_one_constraint(self):
        from staff.models import Staff
        user = User.objects.create_user(username='staff_uniq', password='testpass123')
        Staff.objects.create(user=user)
        with self.assertRaises(IntegrityError):
            Staff.objects.create(user=user)

    def test_db_table_name(self):
        from staff.models import Staff
        self.assertEqual(Staff._meta.db_table, '"acted"."staff"')

    def test_app_label(self):
        from staff.models import Staff
        self.assertEqual(Staff._meta.app_label, 'staff')

    def test_schema_placement(self):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = %s AND table_name = %s",
                ['acted', 'staff'],
            )
            self.assertIsNotNone(cursor.fetchone())
```

**Step 2: Run test to verify it fails**

```bash
cd backend/django_Admin3 && python manage.py test staff.tests.test_models -v2
```

Expected: FAIL — `staff.models.Staff` does not exist yet.

**Step 3: Write the Staff model**

```python
# staff/models/staff.py
"""
Staff model.

Links Django auth_user to the internal staff system.
Represents an internal staff member who may serve various roles
(tutorial instructor, email signatory, team member, etc.).
"""
from django.conf import settings
from django.db import models


class Staff(models.Model):
    NAME_FORMAT_CHOICES = [
        ('full_name', 'Full Name'),
        ('first_name', 'First Name Only'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
    )
    job_title = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="e.g. 'Senior Tutor'",
    )
    name_format = models.CharField(
        max_length=20,
        choices=NAME_FORMAT_CHOICES,
        default='full_name',
        help_text="How this staff member's name appears in salutations",
    )
    show_job_title = models.BooleanField(
        default=False,
        help_text="Whether to display job title in email salutations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'staff'
        db_table = '"acted"."staff"'
        verbose_name = 'Staff'
        verbose_name_plural = 'Staff'

    def __str__(self):
        full_name = self.user.get_full_name()
        return full_name if full_name else self.user.username
```

**Step 4: Run test to verify it passes**

```bash
cd backend/django_Admin3 && python manage.py test staff.tests.test_models -v2
```

Expected: All 8 tests PASS (tests will fail until migrations are created — see Task 3).

**Step 5: Commit**

```bash
git add backend/django_Admin3/staff/
git commit -m "feat(staff): add Staff model with job_title, name_format, show_job_title fields"
```

---

## Task 3: Create SeparateDatabaseAndState migration to move Staff

**Files:**
- Create: `backend/django_Admin3/staff/migrations/0001_initial.py`
- Create: `backend/django_Admin3/tutorials/migrations/0011_remove_staff_model.py`

This is the critical migration. The `acted.staff` table already exists from tutorials. We need to:
1. Tell Django's state that `staff.Staff` now owns this table
2. Tell Django's state that `tutorials.Staff` no longer exists
3. Actually add the 3 new columns to the database

**Step 1: Create staff app initial migration**

```python
# staff/migrations/0001_initial.py
"""
Move Staff model from tutorials to staff app + add new fields.

The acted.staff table already exists (created by tutorials/0004).
We use SeparateDatabaseAndState to:
- State: create the Staff model in the staff app (with new fields)
- Database: only add the 3 new columns (table already exists)
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tutorials', '0010_move_instructors_to_sessions'),
    ]

    operations = [
        # 1. State-only: register Staff model in staff app
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='Staff',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('user', models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
                        ('job_title', models.CharField(blank=True, default='', help_text="e.g. 'Senior Tutor'", max_length=200)),
                        ('name_format', models.CharField(choices=[('full_name', 'Full Name'), ('first_name', 'First Name Only')], default='full_name', help_text="How this staff member's name appears in salutations", max_length=20)),
                        ('show_job_title', models.BooleanField(default=False, help_text='Whether to display job title in email salutations')),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                    ],
                    options={
                        'verbose_name': 'Staff',
                        'verbose_name_plural': 'Staff',
                        'db_table': '"acted"."staff"',
                    },
                ),
            ],
            database_operations=[],
        ),
        # 2. Database-only: add the 3 new columns
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.RunSQL(
                    sql='ALTER TABLE "acted"."staff" ADD COLUMN IF NOT EXISTS "job_title" varchar(200) NOT NULL DEFAULT \'\';',
                    reverse_sql='ALTER TABLE "acted"."staff" DROP COLUMN IF EXISTS "job_title";',
                ),
                migrations.RunSQL(
                    sql='ALTER TABLE "acted"."staff" ADD COLUMN IF NOT EXISTS "name_format" varchar(20) NOT NULL DEFAULT \'full_name\';',
                    reverse_sql='ALTER TABLE "acted"."staff" DROP COLUMN IF EXISTS "name_format";',
                ),
                migrations.RunSQL(
                    sql='ALTER TABLE "acted"."staff" ADD COLUMN IF NOT EXISTS "show_job_title" boolean NOT NULL DEFAULT false;',
                    reverse_sql='ALTER TABLE "acted"."staff" DROP COLUMN IF EXISTS "show_job_title";',
                ),
            ],
        ),
    ]
```

**Step 2: Create tutorials migration to remove Staff from state**

```python
# tutorials/migrations/0011_remove_staff_model.py
"""
Remove Staff model from tutorials app state.

The table stays in the database — staff app now owns it.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tutorials', '0010_move_instructors_to_sessions'),
        ('staff', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.DeleteModel(name='Staff'),
            ],
            database_operations=[],
        ),
    ]
```

**Step 3: Run migrations**

```bash
cd backend/django_Admin3 && python manage.py migrate
```

Expected: Both migrations apply without errors.

**Step 4: Run staff tests**

```bash
cd backend/django_Admin3 && python manage.py test staff.tests.test_models -v2
```

Expected: All 8 tests PASS.

**Step 5: Commit**

```bash
git add backend/django_Admin3/staff/migrations/ backend/django_Admin3/tutorials/migrations/
git commit -m "feat(staff): SeparateDatabaseAndState migration to move Staff from tutorials to staff app"
```

---

## Task 4: Create Team and TeamStaff models

**Files:**
- Create: `backend/django_Admin3/staff/models/team.py`
- Create: `backend/django_Admin3/staff/models/team_staff.py`
- Modify: `backend/django_Admin3/staff/models/__init__.py`

**Step 1: Write the failing tests**

Add to `backend/django_Admin3/staff/tests/test_models.py`:

```python
class TeamModelTest(TestCase):
    """Tests for staff.Team model."""

    def test_create_team(self):
        from staff.models import Team
        team = Team.objects.create(
            name='acted_main',
            display_name='THE ACTUARIAL EDUCATION COMPANY (ActEd)',
            default_sign_off_text='Kind Regards',
        )
        team.refresh_from_db()
        self.assertEqual(team.name, 'acted_main')
        self.assertEqual(team.display_name, 'THE ACTUARIAL EDUCATION COMPANY (ActEd)')
        self.assertEqual(team.default_sign_off_text, 'Kind Regards')
        self.assertTrue(team.is_active)

    def test_unique_name(self):
        from staff.models import Team
        Team.objects.create(name='unique_team', display_name='Team A')
        with self.assertRaises(IntegrityError):
            Team.objects.create(name='unique_team', display_name='Team B')

    def test_str(self):
        from staff.models import Team
        team = Team.objects.create(name='t1', display_name='My Team')
        self.assertEqual(str(team), 'My Team')

    def test_db_table_name(self):
        from staff.models import Team
        self.assertEqual(Team._meta.db_table, '"acted"."team"')

    def test_schema_placement(self):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = %s AND table_name = %s",
                ['acted', 'team'],
            )
            self.assertIsNotNone(cursor.fetchone())


class TeamStaffModelTest(TestCase):
    """Tests for staff.TeamStaff model."""

    def test_create_team_staff(self):
        from staff.models import Staff, Team, TeamStaff
        user = User.objects.create_user(username='ts_user', password='testpass123')
        staff_member = Staff.objects.create(user=user)
        team = Team.objects.create(name='ts_team', display_name='Test Team')
        ts = TeamStaff.objects.create(team=team, staff=staff_member)
        self.assertEqual(ts.team, team)
        self.assertEqual(ts.staff, staff_member)
        self.assertTrue(ts.is_active)

    def test_unique_together(self):
        from staff.models import Staff, Team, TeamStaff
        user = User.objects.create_user(username='ts_uniq', password='testpass123')
        staff_member = Staff.objects.create(user=user)
        team = Team.objects.create(name='ts_uniq_team', display_name='Team')
        TeamStaff.objects.create(team=team, staff=staff_member)
        with self.assertRaises(IntegrityError):
            TeamStaff.objects.create(team=team, staff=staff_member)

    def test_str(self):
        from staff.models import Staff, Team, TeamStaff
        user = User.objects.create_user(
            username='ts_str', password='testpass123',
            first_name='Alice', last_name='Brown',
        )
        staff_member = Staff.objects.create(user=user)
        team = Team.objects.create(name='ts_str_team', display_name='My Team')
        ts = TeamStaff.objects.create(team=team, staff=staff_member)
        self.assertEqual(str(ts), 'My Team - Alice Brown')

    def test_db_table_name(self):
        from staff.models import TeamStaff
        self.assertEqual(TeamStaff._meta.db_table, '"acted"."team_staff"')

    def test_schema_placement(self):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = %s AND table_name = %s",
                ['acted', 'team_staff'],
            )
            self.assertIsNotNone(cursor.fetchone())
```

**Step 2: Run tests to verify they fail**

```bash
cd backend/django_Admin3 && python manage.py test staff.tests.test_models -v2
```

Expected: FAIL — Team and TeamStaff models don't exist.

**Step 3: Write the models**

```python
# staff/models/team.py
"""
Team model.

Represents an organizational group of staff members (e.g., department, team).
Teams can have a default sign-off text for email salutations.
"""
from django.db import models


class Team(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique identifier slug, e.g. 'acted_main'",
    )
    display_name = models.CharField(
        max_length=200,
        help_text="External-facing name, e.g. 'THE ACTUARIAL EDUCATION COMPANY (ActEd)'",
    )
    default_sign_off_text = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="Default sign-off for salutations, e.g. 'Kind Regards'",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'staff'
        db_table = '"acted"."team"'
        verbose_name = 'Team'
        verbose_name_plural = 'Teams'
        ordering = ['name']

    def __str__(self):
        return self.display_name
```

```python
# staff/models/team_staff.py
"""
TeamStaff model.

Join table linking staff members to teams.
"""
from django.db import models


class TeamStaff(models.Model):
    team = models.ForeignKey(
        'staff.Team',
        on_delete=models.CASCADE,
        related_name='team_staff',
    )
    staff = models.ForeignKey(
        'staff.Staff',
        on_delete=models.CASCADE,
        related_name='team_memberships',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'staff'
        db_table = '"acted"."team_staff"'
        unique_together = ['team', 'staff']
        verbose_name = 'Team Staff'
        verbose_name_plural = 'Team Staff'

    def __str__(self):
        return f"{self.team} - {self.staff}"
```

**Step 4: Create migration**

```bash
cd backend/django_Admin3 && python manage.py makemigrations staff --name create_team_and_team_staff
```

This should generate `staff/migrations/0002_create_team_and_team_staff.py`.

**Step 5: Run migration and tests**

```bash
cd backend/django_Admin3 && python manage.py migrate && python manage.py test staff.tests.test_models -v2
```

Expected: All tests PASS (8 Staff + 5 Team + 5 TeamStaff = 18 tests).

**Step 6: Commit**

```bash
git add backend/django_Admin3/staff/
git commit -m "feat(staff): add Team and TeamStaff models in acted schema"
```

---

## Task 5: Add Staff admin registration

**Files:**
- Modify: `backend/django_Admin3/staff/admin.py`

**Step 1: Write admin registrations**

```python
# staff/admin.py
from django.contrib import admin
from .models import Staff, Team, TeamStaff


class TeamStaffInline(admin.TabularInline):
    model = TeamStaff
    extra = 1
    autocomplete_fields = ['staff']


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('user', 'job_title', 'name_format', 'show_job_title', 'created_at')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'job_title')
    list_filter = ('name_format', 'show_job_title')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_name', 'default_sign_off_text', 'is_active', 'created_at')
    search_fields = ('name', 'display_name')
    list_filter = ('is_active',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [TeamStaffInline]


@admin.register(TeamStaff)
class TeamStaffAdmin(admin.ModelAdmin):
    list_display = ('team', 'staff', 'is_active', 'created_at')
    list_filter = ('is_active', 'team')
    autocomplete_fields = ['team', 'staff']
    readonly_fields = ('created_at', 'updated_at')
```

**Step 2: Commit**

```bash
git add backend/django_Admin3/staff/admin.py
git commit -m "feat(staff): add admin registration for Staff, Team, TeamStaff"
```

---

## Task 6: Update tutorials app — remove Staff, update FK references

**Files:**
- Modify: `backend/django_Admin3/tutorials/models/__init__.py:5` — remove Staff import
- Modify: `backend/django_Admin3/tutorials/admin.py:3-6` — remove Staff import and admin registration
- Modify: `backend/django_Admin3/tutorials/models/tutorial_instructor.py:12` — change FK from `'tutorials.Staff'` to `'staff.Staff'`

**Step 1: Update tutorials models __init__**

Remove line 5 (`from .staff import Staff`) from `tutorials/models/__init__.py`.

The file should become:
```python
from django.db import models
from .tutorial_events import TutorialEvents
from .tutorial_sessions import TutorialSessions
from .tutorial_course_template import TutorialCourseTemplate
from .tutorial_instructor import TutorialInstructor
from .tutorial_location import TutorialLocation
from .tutorial_venue import TutorialVenue
```

**Step 2: Update tutorials admin.py**

Remove `Staff` from imports and remove the `StaffAdmin` class (lines 35-39).

```python
from django.contrib import admin
from .models import (
    TutorialEvents, TutorialSessions,
    TutorialCourseTemplate, TutorialInstructor,
    TutorialLocation, TutorialVenue,
)

# ... remaining admin classes stay unchanged, just remove StaffAdmin ...
```

**Step 3: Update TutorialInstructor FK**

In `tutorials/models/tutorial_instructor.py:12`, change:
```python
        'tutorials.Staff',
```
to:
```python
        'staff.Staff',
```

**Step 4: Create migration for FK change**

```bash
cd backend/django_Admin3 && python manage.py makemigrations tutorials --name update_instructor_staff_fk
```

This should generate a migration that alters the FK on TutorialInstructor.

**Step 5: Run migration and tutorials tests**

```bash
cd backend/django_Admin3 && python manage.py migrate && python manage.py test tutorials.tests.test_models -v2
```

Expected: Tests pass. Note: The tutorials test file (`test_models.py`) imports `from tutorials.models import Staff` — those tests will need updating in Task 8.

**Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/
git commit -m "refactor(tutorials): remove Staff model, update TutorialInstructor FK to staff.Staff"
```

---

## Task 7: Revise ClosingSalutation model

**Files:**
- Modify: `backend/django_Admin3/email_system/models/closing_salutation.py`

**Step 1: Write the failing tests**

Create/update: `backend/django_Admin3/email_system/tests/test_closing_salutation_models.py`

```python
from django.test import TestCase
from django.contrib.auth.models import User
from email_system.models import ClosingSalutation, ClosingSalutationStaff
from staff.models import Staff, Team


class ClosingSalutationModelTest(TestCase):
    """Tests for revised ClosingSalutation with Team FK."""

    def setUp(self):
        self.team = Team.objects.create(
            name='acted_main',
            display_name='THE ACTUARIAL EDUCATION COMPANY (ActEd)',
            default_sign_off_text='Kind Regards',
        )

    def test_team_salutation(self):
        """Team salutation references Team model instead of string."""
        sal = ClosingSalutation.objects.create(
            name='team_sal',
            display_name='ActEd Team',
            signature_type='team',
            team=self.team,
        )
        self.assertEqual(sal.team, self.team)

    def test_sign_off_text_fallback_to_team(self):
        """When sign_off_text is blank, falls back to team's default."""
        sal = ClosingSalutation.objects.create(
            name='fallback_sal',
            display_name='Fallback',
            signature_type='team',
            team=self.team,
            sign_off_text='',
        )
        self.assertEqual(sal.get_sign_off_text(), 'Kind Regards')

    def test_sign_off_text_override(self):
        """Explicit sign_off_text overrides team default."""
        sal = ClosingSalutation.objects.create(
            name='override_sal',
            display_name='Override',
            signature_type='team',
            team=self.team,
            sign_off_text='Best wishes',
        )
        self.assertEqual(sal.get_sign_off_text(), 'Best wishes')

    def test_sign_off_text_ultimate_fallback(self):
        """Falls back to 'Kind Regards' when no sign_off_text and no team."""
        sal = ClosingSalutation.objects.create(
            name='no_team_sal',
            display_name='No Team',
            signature_type='staff',
            sign_off_text='',
        )
        self.assertEqual(sal.get_sign_off_text(), 'Kind Regards')

    def test_staff_salutation_uses_staff_name_format(self):
        """Staff salutation respects staff.name_format instead of salutation-level field."""
        user = User.objects.create_user(
            username='sal_staff', password='testpass123',
            first_name='Jane', last_name='Doe',
        )
        staff = Staff.objects.create(user=user, name_format='first_name')
        sal = ClosingSalutation.objects.create(
            name='staff_sal',
            display_name='Staff Sal',
            signature_type='staff',
            sign_off_text='Cheers',
        )
        ClosingSalutationStaff.objects.create(
            closing_salutation=sal, staff=staff, display_order=0,
        )
        # Verify render_mjml uses staff's name_format
        mjml = sal.render_mjml()
        self.assertIn('Jane', mjml)
        self.assertNotIn('Doe', mjml)

    def test_staff_salutation_with_job_title(self):
        """Staff with show_job_title=True includes job title in render."""
        user = User.objects.create_user(
            username='sal_jt', password='testpass123',
            first_name='Bob', last_name='Jones',
        )
        staff = Staff.objects.create(
            user=user, job_title='Senior Tutor', show_job_title=True,
        )
        sal = ClosingSalutation.objects.create(
            name='jt_sal',
            display_name='JT Sal',
            signature_type='staff',
            sign_off_text='Regards',
        )
        ClosingSalutationStaff.objects.create(
            closing_salutation=sal, staff=staff, display_order=0,
        )
        mjml = sal.render_mjml()
        self.assertIn('Senior Tutor', mjml)

    def test_staff_salutation_without_job_title(self):
        """Staff with show_job_title=False omits job title."""
        user = User.objects.create_user(
            username='sal_nojt', password='testpass123',
            first_name='Eve', last_name='Wilson',
        )
        staff = Staff.objects.create(
            user=user, job_title='Tutor', show_job_title=False,
        )
        sal = ClosingSalutation.objects.create(
            name='nojt_sal',
            display_name='No JT',
            signature_type='staff',
            sign_off_text='Regards',
        )
        ClosingSalutationStaff.objects.create(
            closing_salutation=sal, staff=staff, display_order=0,
        )
        mjml = sal.render_mjml()
        self.assertNotIn('Tutor', mjml)

    def test_no_team_signature_field(self):
        """team_signature field should no longer exist."""
        self.assertFalse(
            any(f.name == 'team_signature' for f in ClosingSalutation._meta.get_fields())
        )

    def test_no_staff_name_format_field(self):
        """staff_name_format field should no longer exist."""
        self.assertFalse(
            any(f.name == 'staff_name_format' for f in ClosingSalutation._meta.get_fields())
        )
```

**Step 2: Run tests to verify they fail**

```bash
cd backend/django_Admin3 && python manage.py test email_system.tests.test_closing_salutation_models -v2
```

Expected: FAIL — model still has old fields.

**Step 3: Update the ClosingSalutation model**

Replace the content of `email_system/models/closing_salutation.py`:

```python
from django.db import models
from django.utils.html import escape


class ClosingSalutation(models.Model):
    """Reusable closing salutation block for email templates."""

    SIGNATURE_TYPE_CHOICES = [
        ('team', 'Team'),
        ('staff', 'Staff'),
    ]

    name = models.CharField(max_length=100, unique=True, help_text="Salutation identifier")
    display_name = models.CharField(max_length=200, help_text="Human-readable name")
    sign_off_text = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="Sign-off line. Falls back to team's default_sign_off_text if blank.",
    )
    signature_type = models.CharField(max_length=10, choices=SIGNATURE_TYPE_CHOICES, default='team')
    team = models.ForeignKey(
        'staff.Team',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='closing_salutations',
        help_text="Team used when signature_type is 'team'",
    )

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

    def get_sign_off_text(self):
        """Return sign-off text with fallback chain."""
        if self.sign_off_text:
            return self.sign_off_text
        if self.signature_type == 'team' and self.team and self.team.default_sign_off_text:
            return self.team.default_sign_off_text
        return 'Kind Regards'

    def render_mjml(self):
        """Generate the MJML snippet for this closing salutation."""
        sign_off = self.get_sign_off_text()

        if self.signature_type == 'team' and self.team:
            name_lines = f'<b>{escape(self.team.display_name)}</b><br/>'
        else:
            staff_entries = self.staff_members.select_related('staff__user').order_by('display_order')
            lines = []
            for entry in staff_entries:
                staff_obj = entry.staff
                user = staff_obj.user
                if staff_obj.name_format == 'first_name':
                    name = escape(user.first_name)
                else:
                    name = escape(user.get_full_name() or user.username)
                line = f'<b>{name}</b><br/>'
                if staff_obj.show_job_title and staff_obj.job_title:
                    line += f'{escape(staff_obj.job_title)}<br/>'
                lines.append(line)
            name_lines = '\n      '.join(lines)

        return (
            '<mj-section background-color="#ffffff">\n'
            '  <mj-column width="100%" padding="0" background-color="#ffffff">\n'
            '    <mj-text align="left" css-class="signature-section" padding="12px 24px">\n'
            f'      {escape(sign_off)},<br/>\n'
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
        'staff.Staff',
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

**Step 4: Create migration**

This migration needs to:
1. Add `team` FK field
2. Migrate existing `team_signature` data into Team records and link
3. Remove `team_signature` and `staff_name_format` fields
4. Update `ClosingSalutationStaff.staff` FK to point to `staff.Staff`

```bash
cd backend/django_Admin3 && python manage.py makemigrations email_system --name revise_closing_salutation
```

This auto-generated migration will need manual editing to include the data migration. The migration should contain:

```python
# email_system/migrations/0009_revise_closing_salutation.py
from django.db import migrations, models
import django.db.models.deletion


def migrate_team_signatures_to_team_model(apps, schema_editor):
    """Create Team records from existing team_signature values and link salutations."""
    ClosingSalutation = apps.get_model('email_system', 'ClosingSalutation')
    Team = apps.get_model('staff', 'Team')

    for sal in ClosingSalutation.objects.filter(signature_type='team').exclude(team_signature=''):
        team, _ = Team.objects.get_or_create(
            display_name=sal.team_signature,
            defaults={
                'name': sal.name + '_team',
                'default_sign_off_text': sal.sign_off_text or 'Kind Regards',
                'is_active': True,
            },
        )
        sal.team_id = team.id
        sal.save(update_fields=['team_id'])


def reverse_migrate(apps, schema_editor):
    """Reverse: copy Team display_name back to team_signature."""
    ClosingSalutation = apps.get_model('email_system', 'ClosingSalutation')
    for sal in ClosingSalutation.objects.filter(team__isnull=False).select_related('team'):
        sal.team_signature = sal.team.display_name
        sal.save(update_fields=['team_signature'])


class Migration(migrations.Migration):

    dependencies = [
        ('email_system', '0008_add_basic_mode_and_mjml_elements'),
        ('staff', '0002_create_team_and_team_staff'),
    ]

    operations = [
        # 1. Add team FK (nullable)
        migrations.AddField(
            model_name='closingsalutation',
            name='team',
            field=models.ForeignKey(
                blank=True, null=True,
                help_text="Team used when signature_type is 'team'",
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='closing_salutations',
                to='staff.team',
            ),
        ),
        # 2. Data migration: create Teams from team_signature, link salutations
        migrations.RunPython(migrate_team_signatures_to_team_model, reverse_migrate),
        # 3. Remove old fields
        migrations.RemoveField(model_name='closingsalutation', name='team_signature'),
        migrations.RemoveField(model_name='closingsalutation', name='staff_name_format'),
        # 4. Update ClosingSalutationStaff FK to staff.Staff
        migrations.AlterField(
            model_name='closingsalutationstaff',
            name='staff',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='closing_salutations',
                to='staff.staff',
            ),
        ),
        # 5. Allow sign_off_text to be blank (falls back to team default)
        migrations.AlterField(
            model_name='closingsalutation',
            name='sign_off_text',
            field=models.CharField(
                blank=True, default='',
                help_text="Sign-off line. Falls back to team's default_sign_off_text if blank.",
                max_length=200,
            ),
        ),
    ]
```

**Step 5: Run migration and tests**

```bash
cd backend/django_Admin3 && python manage.py migrate
cd backend/django_Admin3 && python manage.py test email_system.tests.test_closing_salutation_models -v2
```

Expected: All 10 tests PASS.

**Step 6: Commit**

```bash
git add backend/django_Admin3/email_system/
git commit -m "refactor(email_system): revise ClosingSalutation to use Team FK, remove team_signature and staff_name_format"
```

---

## Task 8: Update all remaining FK references and imports

**Files:**
- Modify: `backend/django_Admin3/users/serializers.py:4` — change `from tutorials.models import Staff` to `from staff.models import Staff`
- Modify: `backend/django_Admin3/users/views.py:23` — change `from tutorials.models import Staff` to `from staff.models import Staff`
- Modify: `backend/django_Admin3/administrate/utils/event_importer.py:993` — change `from tutorials.models import Staff, TutorialInstructor` to import Staff from `staff.models` and TutorialInstructor from `tutorials.models`
- Modify: `backend/django_Admin3/tutorials/management/commands/link_instructors.py:22` — same split
- Modify: `backend/django_Admin3/pact_tests/state_handlers.py:967` — change to `from staff.models import Staff`

**Step 1: Update users/serializers.py:4**

```python
# Old:
from tutorials.models import Staff
# New:
from staff.models import Staff
```

**Step 2: Update users/views.py:23**

```python
# Old:
from tutorials.models import Staff
# New:
from staff.models import Staff
```

**Step 3: Update administrate/utils/event_importer.py:993**

```python
# Old:
from tutorials.models import Staff, TutorialInstructor
# New:
from staff.models import Staff
from tutorials.models import TutorialInstructor
```

**Step 4: Update tutorials/management/commands/link_instructors.py:22**

```python
# Old:
from tutorials.models import Staff, TutorialInstructor
# New:
from staff.models import Staff
from tutorials.models import TutorialInstructor
```

**Step 5: Update pact_tests/state_handlers.py:967**

```python
# Old:
from tutorials.models import Staff
# New:
from staff.models import Staff
```

**Step 6: Commit**

```bash
git add backend/django_Admin3/users/ backend/django_Admin3/administrate/ backend/django_Admin3/tutorials/management/ backend/django_Admin3/pact_tests/
git commit -m "refactor: update all Staff imports from tutorials.models to staff.models"
```

---

## Task 9: Update tests

**Files:**
- Modify: `backend/django_Admin3/tutorials/tests/test_models.py` — update Staff test class imports
- Modify: `backend/django_Admin3/users/tests/test_admin_views.py:21` — update import
- Modify: `backend/django_Admin3/email_system/tests/test_closing_salutation_views.py` — update test data
- Modify: `backend/django_Admin3/email_system/tests/test_closing_salutation_serializers.py` — update test data

**Step 1: Update tutorials/tests/test_models.py**

For the `StaffModelTest` class and `TutorialInstructorModelTest` class (lines 724-839), change all occurrences of:
```python
from tutorials.models import Staff
```
to:
```python
from staff.models import Staff
```

And for lines that import both:
```python
from tutorials.models import Staff, TutorialInstructor
```
change to:
```python
from staff.models import Staff
from tutorials.models import TutorialInstructor
```

**Step 2: Update users/tests/test_admin_views.py:21**

```python
# Old:
from tutorials.models import Staff
# New:
from staff.models import Staff
```

**Step 3: Update email_system/tests/test_closing_salutation_views.py**

Tests create salutations with `team_signature='Test Team'` — this field no longer exists. Update setUp and test data to use Team FK instead:

```python
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status as http_status
from email_system.models import ClosingSalutation, EmailTemplate
from staff.models import Team


class ClosingSalutationViewSetTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin', 'admin@test.com', 'pass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.team = Team.objects.create(
            name='test_team',
            display_name='Test Team',
            default_sign_off_text='Best',
        )

        self.salutation = ClosingSalutation.objects.create(
            name='test_sal',
            display_name='Test',
            sign_off_text='Best',
            signature_type='team',
            team=self.team,
        )

    # ... tests stay the same but any test that sends team_signature in POST data
    # should send team=self.team.id instead ...
```

**Step 4: Update email_system/tests/test_closing_salutation_serializers.py**

Same pattern — replace `team_signature` with `team` FK.

**Step 5: Update email_system serializers**

Modify `backend/django_Admin3/email_system/serializers.py` — update `ClosingSalutationListSerializer` and `ClosingSalutationSerializer` to replace `team_signature` and `staff_name_format` fields with `team`:

```python
class ClosingSalutationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for salutation list views."""

    class Meta:
        model = ClosingSalutation
        fields = [
            'id', 'name', 'display_name', 'sign_off_text',
            'signature_type', 'team',
            'is_active', 'created_at', 'updated_at',
        ]


class ClosingSalutationSerializer(serializers.ModelSerializer):
    """Full serializer for salutation detail, create, and update views."""
    staff_members = ClosingSalutationStaffSerializer(many=True, read_only=True)

    class Meta:
        model = ClosingSalutation
        fields = [
            'id', 'name', 'display_name', 'sign_off_text',
            'signature_type', 'team',
            'staff_members',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
```

**Step 6: Run all affected tests**

```bash
cd backend/django_Admin3 && python manage.py test email_system.tests tutorials.tests users.tests staff.tests -v2
```

Expected: All tests PASS.

**Step 7: Commit**

```bash
git add backend/django_Admin3/tutorials/tests/ backend/django_Admin3/users/tests/ backend/django_Admin3/email_system/tests/ backend/django_Admin3/email_system/serializers.py
git commit -m "test: update all tests for Staff app extraction and ClosingSalutation redesign"
```

---

## Task 10: Update StaffAdminSerializer for new fields

**Files:**
- Modify: `backend/django_Admin3/users/serializers.py:79-89`

**Step 1: Update serializer**

```python
class StaffAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for Staff.

    Shows nested user info on read, accepts user FK ID on write.
    """
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Staff
        fields = [
            'id', 'user', 'user_detail',
            'job_title', 'name_format', 'show_job_title',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
```

**Step 2: Commit**

```bash
git add backend/django_Admin3/users/serializers.py
git commit -m "feat(users): add job_title, name_format, show_job_title to StaffAdminSerializer"
```

---

## Task 11: Delete old Staff model file from tutorials

**Files:**
- Delete: `backend/django_Admin3/tutorials/models/staff.py`

**Step 1: Verify no remaining imports**

```bash
cd backend/django_Admin3 && grep -r "from tutorials.models import.*Staff\|from tutorials.models.staff" --include="*.py" .
```

Expected: No results (all imports updated in Tasks 6, 8, 9).

**Step 2: Delete the file**

```bash
rm backend/django_Admin3/tutorials/models/staff.py
```

**Step 3: Run full test suite**

```bash
cd backend/django_Admin3 && python manage.py test -v2
```

Expected: All tests PASS.

**Step 4: Commit**

```bash
git add -u backend/django_Admin3/tutorials/models/staff.py
git commit -m "chore(tutorials): remove old Staff model file (moved to staff app)"
```

---

## Task 12: Final verification

**Step 1: Run full migration check**

```bash
cd backend/django_Admin3 && python manage.py migrate --check
```

Expected: No unapplied migrations.

**Step 2: Run full test suite**

```bash
cd backend/django_Admin3 && python manage.py test -v2
```

Expected: All tests pass.

**Step 3: Verify schema placement**

```bash
cd backend/django_Admin3 && python manage.py verify_schema_placement
```

Expected: staff, team, team_staff all in `acted` schema.

**Step 4: Final commit (if any fixups needed)**

```bash
git log --oneline -10
```

Review all commits are clean and well-ordered.
