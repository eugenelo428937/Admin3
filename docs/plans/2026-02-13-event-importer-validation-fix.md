# Event Importer Validation Fix + API Audit Log — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 4 broken validation functions in event_importer.py to query through bridge table FKs, auto-create missing tutorial/bridge records from API data, and add an API audit log model.

**Architecture:** The `adm.*` bridge models have no data fields (code, name, etc.) — only `external_id` and FK links to `acted.tutorial_*` models. Validation functions must query through the FK chain. When records are found via API but not locally, both tutorial and bridge records are auto-created. All API calls are logged to `adm.api_audit_log`.

**Tech Stack:** Django 6.0, PostgreSQL (adm + acted schemas), GraphQL (Administrate API)

---

## Task 1: Create ApiAuditLog Model

**Files:**
- Create: `backend/django_Admin3/administrate/models/api_audit_log.py`
- Modify: `backend/django_Admin3/administrate/models/__init__.py`

**Step 1: Write the model**

Create `backend/django_Admin3/administrate/models/api_audit_log.py`:

```python
import threading
from django.db import models

_current_command = threading.local()


class ApiAuditLog(models.Model):
    """Audit log for all Administrate GraphQL API interactions."""

    command = models.CharField(max_length=100, db_index=True)
    operation = models.CharField(max_length=50)

    graphql_query = models.TextField()
    variables = models.JSONField(default=dict, blank=True)

    response_body = models.JSONField(null=True, blank=True)
    status_code = models.IntegerField(null=True, blank=True)

    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True, default='')

    started_at = models.DateTimeField()
    completed_at = models.DateTimeField()
    duration_ms = models.IntegerField(null=True, blank=True)

    entity_type = models.CharField(max_length=50, blank=True, default='')
    entity_id = models.CharField(max_length=255, blank=True, default='')
    records_processed = models.IntegerField(default=0)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."api_audit_log"'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['command', 'started_at']),
            models.Index(fields=['success', 'started_at']),
        ]
        verbose_name = 'API Audit Log'
        verbose_name_plural = 'API Audit Logs'

    def __str__(self):
        status = 'OK' if self.success else 'FAIL'
        return f"[{status}] {self.command} {self.operation} @ {self.started_at}"

    @classmethod
    def set_current_command(cls, command_name):
        _current_command.name = command_name

    @classmethod
    def get_current_command(cls):
        return getattr(_current_command, 'name', 'unknown')
```

**Step 2: Export from `__init__.py`**

Add to `backend/django_Admin3/administrate/models/__init__.py`:

```python
from .api_audit_log import ApiAuditLog
```

**Step 3: Commit**

```bash
git add administrate/models/api_audit_log.py administrate/models/__init__.py
git commit -m "feat(administrate): add ApiAuditLog model for API interaction auditing"
```

---

## Task 2: Create Migration 0008

**Files:**
- Create: `backend/django_Admin3/administrate/migrations/0008_add_api_audit_log.py`

**Step 1: Generate migration**

Run: `cd backend/django_Admin3 && python manage.py makemigrations administrate --name add_api_audit_log`

Verify the generated migration creates a table with `db_table = '"adm"."api_audit_log"'`.

**Step 2: Run migration**

Run: `python manage.py migrate administrate`

**Step 3: Verify schema placement**

Run: `python manage.py verify_schema_placement`

Expected: all tables pass, including `api_audit_log` in `adm` schema (add to verification list if needed).

**Step 4: Commit**

```bash
git add administrate/migrations/0008_*.py
git commit -m "feat(administrate): add migration 0008 for api_audit_log table"
```

---

## Task 3: Integrate Audit Logging into AdministrateAPIService

**Files:**
- Modify: `backend/django_Admin3/administrate/services/api_service.py`
- Create: `backend/django_Admin3/administrate/tests/test_api_audit_log.py`

**Step 1: Write failing tests**

Create `backend/django_Admin3/administrate/tests/test_api_audit_log.py`:

```python
from unittest.mock import patch, MagicMock
from django.test import TestCase
from administrate.models import ApiAuditLog
from administrate.services.api_service import AdministrateAPIService


class TestApiAuditLogging(TestCase):

    @patch('administrate.services.api_service.AdministrateAuthService')
    @patch('administrate.services.api_service.requests.Session')
    def test_execute_query_logs_successful_call(self, mock_session_cls, mock_auth):
        """Successful API call creates an audit log entry."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_access_token.return_value = 'fake-token'
        mock_auth.return_value = mock_auth_instance

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': {'courseTemplates': []}}

        mock_session = MagicMock()
        mock_session.post.return_value = mock_response
        mock_session_cls.return_value = mock_session

        ApiAuditLog.set_current_command('test_command')
        service = AdministrateAPIService()
        service.session = mock_session
        service.execute_query('query { test }', {'var': 'val'})

        self.assertEqual(ApiAuditLog.objects.count(), 1)
        log = ApiAuditLog.objects.first()
        self.assertEqual(log.command, 'test_command')
        self.assertEqual(log.operation, 'query')
        self.assertTrue(log.success)
        self.assertEqual(log.status_code, 200)
        self.assertEqual(log.variables, {'var': 'val'})
        self.assertIsNotNone(log.response_body)
        self.assertIsNotNone(log.duration_ms)

    @patch('administrate.services.api_service.AdministrateAuthService')
    @patch('administrate.services.api_service.requests.Session')
    def test_execute_query_logs_failed_call(self, mock_session_cls, mock_auth):
        """Failed API call creates an audit log entry with error details."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_access_token.return_value = 'fake-token'
        mock_auth.return_value = mock_auth_instance

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = 'Internal Server Error'

        mock_session = MagicMock()
        mock_session.post.return_value = mock_response
        mock_session_cls.return_value = mock_session

        ApiAuditLog.set_current_command('test_command')
        service = AdministrateAPIService()
        service.session = mock_session

        with self.assertRaises(Exception):
            service.execute_query('mutation { create }')

        self.assertEqual(ApiAuditLog.objects.count(), 1)
        log = ApiAuditLog.objects.first()
        self.assertFalse(log.success)
        self.assertEqual(log.status_code, 500)
        self.assertIn('500', log.error_message)
        self.assertEqual(log.operation, 'mutation')

    @patch('administrate.services.api_service.AdministrateAuthService')
    @patch('administrate.services.api_service.requests.Session')
    def test_detects_query_vs_mutation(self, mock_session_cls, mock_auth):
        """Operation type is detected from the GraphQL string."""
        mock_auth_instance = MagicMock()
        mock_auth_instance.get_access_token.return_value = 'fake-token'
        mock_auth.return_value = mock_auth_instance

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': {}}

        mock_session = MagicMock()
        mock_session.post.return_value = mock_response
        mock_session_cls.return_value = mock_session

        service = AdministrateAPIService()
        service.session = mock_session

        service.execute_query('mutation CreateEvent { event { create } }')
        log = ApiAuditLog.objects.first()
        self.assertEqual(log.operation, 'mutation')
```

**Step 2: Run tests to verify they fail**

Run: `cd backend/django_Admin3 && python manage.py test administrate.tests.test_api_audit_log -v2`

Expected: FAIL (audit logging not yet implemented)

**Step 3: Implement audit logging in api_service.py**

Modify `backend/django_Admin3/administrate/services/api_service.py` — replace `execute_query`:

```python
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

# In execute_query method, wrap the existing logic:
def execute_query(self, query, variables=None, ignore_errors=False):
    """Execute a GraphQL query with audit logging."""
    from administrate.models.api_audit_log import ApiAuditLog

    started_at = timezone.now()
    operation = 'mutation' if query.strip().lower().startswith('mutation') else 'query'

    headers = {
        'Authorization': f'Bearer {self.auth_service.get_access_token()}',
        'Content-Type': 'application/json',
    }

    payload = {'query': query}
    if variables:
        payload['variables'] = variables

    status_code = None
    response_body = None
    error_message = ''
    success = True

    try:
        response = self.session.post(
            self.api_url,
            headers=headers,
            json=payload
        )
        status_code = response.status_code

        if response.status_code != 200:
            error_message = (
                f"GraphQL query failed with status "
                f"{response.status_code}: {response.text}"
            )
            success = False
            raise AdministrateAPIError(error_message)

        result = response.json()
        response_body = result

        if not ignore_errors and 'errors' in result:
            error_message = f"GraphQL query returned errors: {result['errors']}"
            success = False
            raise AdministrateAPIError(error_message)

        return result

    except Exception as e:
        if not error_message:
            error_message = str(e)
            success = False
        raise

    finally:
        completed_at = timezone.now()
        duration_ms = int(
            (completed_at - started_at).total_seconds() * 1000
        )
        try:
            ApiAuditLog.objects.create(
                command=ApiAuditLog.get_current_command(),
                operation=operation,
                graphql_query=query,
                variables=variables or {},
                response_body=response_body,
                status_code=status_code,
                success=success,
                error_message=error_message,
                started_at=started_at,
                completed_at=completed_at,
                duration_ms=duration_ms,
            )
        except Exception as log_err:
            logger.warning(f"Failed to write API audit log: {log_err}")
```

**Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && python manage.py test administrate.tests.test_api_audit_log -v2`

Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add administrate/services/api_service.py administrate/tests/test_api_audit_log.py
git commit -m "feat(administrate): integrate audit logging into AdministrateAPIService"
```

---

## Task 4: Fix validate_course_template

**Files:**
- Modify: `backend/django_Admin3/administrate/utils/event_importer.py` (lines 716-757)
- Create: `backend/django_Admin3/administrate/tests/test_event_importer_validation.py`

**Step 1: Write failing test**

Create `backend/django_Admin3/administrate/tests/test_event_importer_validation.py`:

```python
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth.models import User
from administrate.models import CourseTemplate, Location, Venue, Instructor
from tutorials.models import (
    TutorialCourseTemplate, TutorialLocation, TutorialVenue,
    TutorialInstructor, Staff,
)


class TestValidateCourseTemplate(TestCase):
    """Tests for validate_course_template with bridge FK queries."""

    def test_finds_course_template_via_bridge_fk(self):
        """Local query finds course template through tutorial FK."""
        from administrate.utils.event_importer import validate_course_template

        tct = TutorialCourseTemplate.objects.create(
            code='CM2', title='CM2 Models', is_active=True
        )
        ct = CourseTemplate.objects.create(
            external_id='CT_123', tutorial_course_template=tct
        )

        result = validate_course_template(None, 'CM2')

        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'CT_123')
        self.assertEqual(result['code'], 'CM2')
        self.assertEqual(result['title'], 'CM2 Models')

    def test_case_insensitive_match(self):
        """Code matching is case-insensitive."""
        from administrate.utils.event_importer import validate_course_template

        tct = TutorialCourseTemplate.objects.create(
            code='SA1', title='SA1 Actuarial', is_active=True
        )
        CourseTemplate.objects.create(
            external_id='CT_456', tutorial_course_template=tct
        )

        result = validate_course_template(None, 'sa1')
        self.assertIsNotNone(result)
        self.assertEqual(result['code'], 'SA1')

    @patch('administrate.utils.event_importer.load_graphql_query')
    def test_api_fallback_creates_tutorial_and_bridge_records(self, mock_load):
        """When not found locally, API fallback auto-creates records."""
        from administrate.utils.event_importer import validate_course_template

        mock_load.return_value = 'query { courseTemplates }'

        api_service = MagicMock()
        api_service.execute_query.return_value = {
            'data': {
                'courseTemplates': {
                    'edges': [{
                        'node': {
                            'id': 'CT_789',
                            'code': 'CB1',
                            'title': 'CB1 Business'
                        }
                    }]
                }
            }
        }

        result = validate_course_template(api_service, 'CB1')

        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'CT_789')

        # Verify tutorial record was auto-created
        tct = TutorialCourseTemplate.objects.get(code='CB1')
        self.assertEqual(tct.title, 'CB1 Business')
        self.assertTrue(tct.is_active)

        # Verify bridge record was auto-created with FK link
        ct = CourseTemplate.objects.get(external_id='CT_789')
        self.assertEqual(ct.tutorial_course_template, tct)

    def test_returns_none_for_nonexistent(self):
        """Returns None when not found locally and no API service."""
        from administrate.utils.event_importer import validate_course_template

        result = validate_course_template(None, 'NONEXISTENT')
        self.assertIsNone(result)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend/django_Admin3 && python manage.py test administrate.tests.test_event_importer_validation.TestValidateCourseTemplate -v2`

Expected: FAIL (current code queries nonexistent `code` field)

**Step 3: Fix validate_course_template in event_importer.py**

Replace `validate_course_template` function (around line 716) with:

```python
def validate_course_template(api_service, course_code):
    """
    Validate that a course template exists with the given code.
    Queries local tutorial tables via bridge FK first, falls back to API.
    Auto-creates tutorial + bridge records from API data if not found locally.
    """
    try:
        # Query through bridge FK to tutorial_course_template
        ct = CourseTemplate.objects.select_related(
            'tutorial_course_template'
        ).filter(
            tutorial_course_template__code__iexact=course_code
        ).first()

        if ct and ct.tutorial_course_template:
            return {
                'id': ct.external_id,
                'code': ct.tutorial_course_template.code,
                'title': ct.tutorial_course_template.title,
            }

        # Fallback: query Administrate API
        if not api_service:
            return None

        query = load_graphql_query('get_course_template_by_code')
        variables = {"code": course_code}
        result = api_service.execute_query(query, variables)

        if (result and 'data' in result and
            'courseTemplates' in result['data'] and
            'edges' in result['data']['courseTemplates'] and
                len(result['data']['courseTemplates']['edges']) > 0):

            node = result['data']['courseTemplates']['edges'][0]['node']

            # Auto-create tutorial + bridge records
            try:
                from tutorials.models import TutorialCourseTemplate
                from django.db import transaction

                with transaction.atomic():
                    tct, _ = TutorialCourseTemplate.objects.get_or_create(
                        code=node.get('code', course_code),
                        defaults={
                            'title': node.get('title', ''),
                            'is_active': True,
                        }
                    )
                    bridge_ct, created = CourseTemplate.objects.get_or_create(
                        external_id=node['id'],
                        defaults={'tutorial_course_template': tct}
                    )
                    if not created and not bridge_ct.tutorial_course_template:
                        bridge_ct.tutorial_course_template = tct
                        bridge_ct.save(update_fields=['tutorial_course_template'])

                logger.info(
                    f"Auto-created records for course template: "
                    f"{node.get('code', course_code)}"
                )
            except Exception as e:
                logger.warning(
                    f"Failed to auto-create course template records: {e}"
                )

            return node

        logger.warning(f"Course template not found: {course_code}")
        return None
    except Exception as e:
        logger.warning(
            f"Error validating course template {course_code}: {str(e)}"
        )
        return None
```

**Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && python manage.py test administrate.tests.test_event_importer_validation.TestValidateCourseTemplate -v2`

Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add administrate/utils/event_importer.py administrate/tests/test_event_importer_validation.py
git commit -m "fix(event-importer): validate_course_template queries through bridge FK"
```

---

## Task 5: Fix validate_location

**Files:**
- Modify: `backend/django_Admin3/administrate/utils/event_importer.py` (lines 759-797)
- Modify: `backend/django_Admin3/administrate/tests/test_event_importer_validation.py`

**Step 1: Write failing test**

Add to `test_event_importer_validation.py`:

```python
class TestValidateLocation(TestCase):
    """Tests for validate_location with bridge FK queries."""

    def test_finds_location_via_bridge_fk(self):
        from administrate.utils.event_importer import validate_location

        tl = TutorialLocation.objects.create(name='London', is_active=True)
        loc = Location.objects.create(
            external_id='LOC_123', tutorial_location=tl
        )

        result = validate_location(None, 'London')

        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'LOC_123')
        self.assertEqual(result['name'], 'London')

    def test_case_insensitive_match(self):
        from administrate.utils.event_importer import validate_location

        tl = TutorialLocation.objects.create(name='Edinburgh', is_active=True)
        Location.objects.create(
            external_id='LOC_456', tutorial_location=tl
        )

        result = validate_location(None, 'edinburgh')
        self.assertIsNotNone(result)
        self.assertEqual(result['name'], 'Edinburgh')

    @patch('administrate.utils.event_importer.load_graphql_query')
    def test_api_fallback_creates_tutorial_and_bridge_records(self, mock_load):
        from administrate.utils.event_importer import validate_location

        mock_load.return_value = 'query { locations }'

        api_service = MagicMock()
        api_service.execute_query.return_value = {
            'data': {
                'locations': {
                    'edges': [{
                        'node': {
                            'id': 'LOC_789',
                            'name': 'Manchester'
                        }
                    }]
                }
            }
        }

        result = validate_location(api_service, 'Manchester')

        self.assertIsNotNone(result)

        tl = TutorialLocation.objects.get(name='Manchester')
        self.assertTrue(tl.is_active)

        loc = Location.objects.get(external_id='LOC_789')
        self.assertEqual(loc.tutorial_location, tl)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend/django_Admin3 && python manage.py test administrate.tests.test_event_importer_validation.TestValidateLocation -v2`

**Step 3: Fix validate_location in event_importer.py**

Replace `validate_location` function (around line 759) with:

```python
def validate_location(api_service, location_name):
    """
    Validate that a location exists with the given name.
    Queries local tutorial tables via bridge FK first, falls back to API.
    Auto-creates tutorial + bridge records from API data if not found locally.
    """
    try:
        loc = Location.objects.select_related(
            'tutorial_location'
        ).filter(
            tutorial_location__name__iexact=location_name
        ).first()

        if loc and loc.tutorial_location:
            return {
                'id': loc.external_id,
                'code': loc.tutorial_location.code,
                'name': loc.tutorial_location.name,
            }

        if not api_service:
            return None

        query = load_graphql_query('get_location_by_name')
        variables = {"location_name": location_name}
        result = api_service.execute_query(query, variables)

        if (result and 'data' in result and
            'locations' in result['data'] and
            'edges' in result['data']['locations'] and
                len(result['data']['locations']['edges']) > 0):

            node = result['data']['locations']['edges'][0]['node']

            try:
                from tutorials.models import TutorialLocation
                from django.db import transaction

                with transaction.atomic():
                    tl, _ = TutorialLocation.objects.get_or_create(
                        name=node.get('name', location_name),
                        defaults={'is_active': True}
                    )
                    bridge_loc, created = Location.objects.get_or_create(
                        external_id=node['id'],
                        defaults={'tutorial_location': tl}
                    )
                    if not created and not bridge_loc.tutorial_location:
                        bridge_loc.tutorial_location = tl
                        bridge_loc.save(update_fields=['tutorial_location'])

                logger.info(
                    f"Auto-created records for location: "
                    f"{node.get('name', location_name)}"
                )
            except Exception as e:
                logger.warning(
                    f"Failed to auto-create location records: {e}"
                )

            return node

        return None
    except Exception as e:
        logger.warning(
            f"Error validating location {location_name}: {str(e)}"
        )
        return None
```

**Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && python manage.py test administrate.tests.test_event_importer_validation.TestValidateLocation -v2`

Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add administrate/utils/event_importer.py administrate/tests/test_event_importer_validation.py
git commit -m "fix(event-importer): validate_location queries through bridge FK"
```

---

## Task 6: Fix validate_venue

**Files:**
- Modify: `backend/django_Admin3/administrate/utils/event_importer.py` (lines 799-841)
- Modify: `backend/django_Admin3/administrate/tests/test_event_importer_validation.py`

**Step 1: Write failing test**

Add to `test_event_importer_validation.py`:

```python
class TestValidateVenue(TestCase):
    """Tests for validate_venue with bridge FK queries."""

    def test_finds_venue_via_bridge_fk(self):
        from administrate.utils.event_importer import validate_venue

        tl = TutorialLocation.objects.create(name='London', is_active=True)
        loc = Location.objects.create(
            external_id='LOC_1', tutorial_location=tl
        )
        tv = TutorialVenue.objects.create(name='BPP Waterloo', location=tl)
        Venue.objects.create(
            external_id='VEN_1', location=loc, tutorial_venue=tv
        )

        result = validate_venue(None, 'BPP Waterloo', 'LOC_1')

        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'VEN_1')
        self.assertEqual(result['name'], 'BPP Waterloo')

    @patch('administrate.utils.event_importer.load_graphql_query')
    def test_api_fallback_creates_tutorial_and_bridge_records(self, mock_load):
        from administrate.utils.event_importer import validate_venue

        # Pre-create location chain (venue needs a location)
        tl = TutorialLocation.objects.create(name='London', is_active=True)
        loc = Location.objects.create(
            external_id='LOC_1', tutorial_location=tl
        )

        mock_load.return_value = 'query { locations }'

        api_service = MagicMock()
        api_service.execute_query.return_value = {
            'data': {
                'locations': {
                    'edges': [{
                        'node': {
                            'id': 'VEN_99',
                            'name': 'New Venue'
                        }
                    }]
                }
            }
        }

        result = validate_venue(api_service, 'New Venue', 'LOC_1')

        self.assertIsNotNone(result)

        tv = TutorialVenue.objects.get(name='New Venue')
        self.assertEqual(tv.location, tl)

        ven = Venue.objects.get(external_id='VEN_99')
        self.assertEqual(ven.tutorial_venue, tv)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend/django_Admin3 && python manage.py test administrate.tests.test_event_importer_validation.TestValidateVenue -v2`

**Step 3: Fix validate_venue in event_importer.py**

Replace `validate_venue` function (around line 799) with:

```python
def validate_venue(api_service, venue_name, location_id):
    """
    Validate that a venue exists with the given name and location.
    Queries local tutorial tables via bridge FK first, falls back to API.
    Auto-creates tutorial + bridge records from API data if not found locally.

    Note: location_id is the Administrate external_id for the location.
    """
    try:
        venue = Venue.objects.select_related(
            'tutorial_venue', 'location__tutorial_location'
        ).filter(
            tutorial_venue__name__iexact=venue_name,
            location__external_id=location_id,
        ).first()

        if venue and venue.tutorial_venue:
            return {
                'id': venue.external_id,
                'name': venue.tutorial_venue.name,
            }

        # Check TBC venue names
        if venue_name and venue_name.casefold() in tbc_venue_name:
            return {'id': None, 'name': venue_name}

        if not api_service:
            return None

        query = load_graphql_query('get_venue_by_name')
        variables = {"venue_name": venue_name}
        result = api_service.execute_query(query, variables)

        if (result and 'data' in result and
            'locations' in result['data'] and
            'edges' in result['data']['locations'] and
                len(result['data']['locations']['edges']) > 0):

            node = result['data']['locations']['edges'][0]['node']

            try:
                from tutorials.models import TutorialVenue
                from django.db import transaction

                # Resolve the tutorial location from the adm.Location bridge
                adm_loc = Location.objects.select_related(
                    'tutorial_location'
                ).filter(external_id=location_id).first()

                tutorial_location = (
                    adm_loc.tutorial_location if adm_loc else None
                )

                with transaction.atomic():
                    tv, _ = TutorialVenue.objects.get_or_create(
                        name=node.get('name', venue_name),
                        location=tutorial_location,
                        defaults={}
                    )
                    bridge_ven, created = Venue.objects.get_or_create(
                        external_id=node['id'],
                        defaults={
                            'tutorial_venue': tv,
                            'location': adm_loc,
                        }
                    )
                    if not created and not bridge_ven.tutorial_venue:
                        bridge_ven.tutorial_venue = tv
                        bridge_ven.save(update_fields=['tutorial_venue'])

                logger.info(
                    f"Auto-created records for venue: "
                    f"{node.get('name', venue_name)}"
                )
            except Exception as e:
                logger.warning(
                    f"Failed to auto-create venue records: {e}"
                )

            return node

        return None
    except Exception as e:
        logger.warning(
            f"Error validating venue {venue_name}: {str(e)}"
        )
        return None
```

**Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && python manage.py test administrate.tests.test_event_importer_validation.TestValidateVenue -v2`

Expected: 2 tests PASS

**Step 5: Commit**

```bash
git add administrate/utils/event_importer.py administrate/tests/test_event_importer_validation.py
git commit -m "fix(event-importer): validate_venue queries through bridge FK"
```

---

## Task 7: Fix validate_instructor

**Files:**
- Modify: `backend/django_Admin3/administrate/utils/event_importer.py` (lines 843-895)
- Modify: `backend/django_Admin3/administrate/tests/test_event_importer_validation.py`

**Step 1: Write failing test**

Add to `test_event_importer_validation.py`:

```python
class TestValidateInstructor(TestCase):
    """Tests for validate_instructor with bridge FK queries."""

    def test_finds_instructor_via_bridge_fk(self):
        from administrate.utils.event_importer import validate_instructor

        user = User.objects.create_user(
            username='jsmith', first_name='John', last_name='Smith'
        )
        staff = Staff.objects.create(user=user)
        ti = TutorialInstructor.objects.create(staff=staff, is_active=True)
        Instructor.objects.create(
            external_id='INS_1', tutorial_instructor=ti, is_active=True
        )

        result = validate_instructor(None, 'John Smith')

        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'INS_1')

    def test_case_insensitive_match(self):
        from administrate.utils.event_importer import validate_instructor

        user = User.objects.create_user(
            username='alee', first_name='Alice', last_name='Lee'
        )
        staff = Staff.objects.create(user=user)
        ti = TutorialInstructor.objects.create(staff=staff, is_active=True)
        Instructor.objects.create(
            external_id='INS_2', tutorial_instructor=ti, is_active=True
        )

        result = validate_instructor(None, 'alice lee')
        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'INS_2')

    @patch('administrate.utils.event_importer.load_graphql_query')
    def test_api_fallback_creates_full_chain(self, mock_load):
        """API fallback creates User + Staff + TutorialInstructor + bridge."""
        from administrate.utils.event_importer import validate_instructor

        mock_load.return_value = 'query { contacts }'

        api_service = MagicMock()
        api_service.execute_query.return_value = {
            'data': {
                'contacts': {
                    'edges': [{
                        'node': {
                            'id': 'INS_99',
                            'firstName': 'Bob',
                            'lastName': 'Jones'
                        }
                    }]
                }
            }
        }

        result = validate_instructor(api_service, 'Bob Jones')

        self.assertIsNotNone(result)

        # Verify full chain was auto-created
        user = User.objects.get(first_name='Bob', last_name='Jones')
        staff = Staff.objects.get(user=user)
        ti = TutorialInstructor.objects.get(staff=staff)
        ins = Instructor.objects.get(external_id='INS_99')
        self.assertEqual(ins.tutorial_instructor, ti)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend/django_Admin3 && python manage.py test administrate.tests.test_event_importer_validation.TestValidateInstructor -v2`

**Step 3: Fix validate_instructor in event_importer.py**

Replace `validate_instructor` function (around line 843) with:

```python
def validate_instructor(api_service, instructor_name):
    """
    Validate that an instructor exists with the given name.
    Queries local tutorial tables via bridge FK first, falls back to API.
    Auto-creates User + Staff + TutorialInstructor + bridge from API data.
    """
    try:
        name_parts = instructor_name.strip().split()
        if len(name_parts) == 1:
            first_name = ''
            last_name = name_parts[0]
        else:
            last_name = name_parts[-1]
            first_name = ' '.join(name_parts[:-1])

        # Query through bridge FK chain
        ins = Instructor.objects.select_related(
            'tutorial_instructor__staff__user'
        ).filter(
            tutorial_instructor__staff__user__first_name__iexact=first_name,
            tutorial_instructor__staff__user__last_name__iexact=last_name,
            tutorial_instructor__is_active=True,
        ).first()

        if ins and ins.tutorial_instructor:
            return {
                'id': ins.external_id,
                'legacy_id': ins.legacy_id,
                'name': str(ins.tutorial_instructor),
            }

        if not api_service:
            return None

        query = load_graphql_query('get_instructor_by_name')
        variables = {"tutorname": instructor_name.replace(" ", "%")}
        result = api_service.execute_query(query, variables)

        if (result and 'data' in result and
            'contacts' in result['data'] and
            'edges' in result['data']['contacts'] and
                len(result['data']['contacts']['edges']) > 0):

            node = result['data']['contacts']['edges'][0]['node']

            try:
                from django.contrib.auth.models import User
                from tutorials.models import Staff, TutorialInstructor
                from django.db import transaction

                api_first = node.get('firstName', first_name)
                api_last = node.get('lastName', last_name)

                with transaction.atomic():
                    username = f"adm_{api_first}_{api_last}".lower().replace(
                        ' ', '_'
                    )[:150]
                    user, _ = User.objects.get_or_create(
                        first_name__iexact=api_first,
                        last_name__iexact=api_last,
                        defaults={
                            'username': username,
                            'first_name': api_first,
                            'last_name': api_last,
                        }
                    )
                    staff, _ = Staff.objects.get_or_create(user=user)
                    ti, _ = TutorialInstructor.objects.get_or_create(
                        staff=staff,
                        defaults={'is_active': True}
                    )
                    bridge_ins, created = Instructor.objects.get_or_create(
                        external_id=node['id'],
                        defaults={
                            'tutorial_instructor': ti,
                            'is_active': True,
                        }
                    )
                    if not created and not bridge_ins.tutorial_instructor:
                        bridge_ins.tutorial_instructor = ti
                        bridge_ins.save(
                            update_fields=['tutorial_instructor']
                        )

                logger.info(
                    f"Auto-created records for instructor: "
                    f"{api_first} {api_last}"
                )
            except Exception as e:
                logger.warning(
                    f"Failed to auto-create instructor records: {e}"
                )

            return node

        return None
    except Exception as e:
        logger.warning(
            f"Error validating instructor {instructor_name}: {str(e)}"
        )
        return None
```

**Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && python manage.py test administrate.tests.test_event_importer_validation.TestValidateInstructor -v2`

Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add administrate/utils/event_importer.py administrate/tests/test_event_importer_validation.py
git commit -m "fix(event-importer): validate_instructor queries through bridge FK"
```

---

## Task 8: Run Full Test Suite + Verify

**Step 1: Run all administrate tests**

Run: `cd backend/django_Admin3 && python manage.py test administrate -v2`

Expected: All tests pass (previous 105 + new tests)

**Step 2: Run schema verification**

Run: `python manage.py verify_schema_placement`

Expected: All tables pass, including new `api_audit_log`

**Step 3: Run makemigrations check**

Run: `python manage.py makemigrations --check`

Expected: No pending migrations

**Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, schema verified"
```
