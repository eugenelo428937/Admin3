"""Tests for the Administrate-derived fields on `acted.tutorial_events`.

Phase 1 of the tutorial-events-as-master refactor (plan:
docs/superpowers/plans/2026-05-15-tutorial-events-as-master-refactor.md):
all event data formerly mirrored on `adm.events` lives here. Sanity tests
to pin the schema:

  - All ~20 new columns exist and are nullable (additive migration is
    reversible if Phase 2/3 don't land).
  - `external_id` (Administrate id) is unique when set.
  - `course_template` is a real cross-schema FK to `adm.course_templates`
    (this is the directional reversal — `acted` referencing `adm`).
  - The legacy `start_date`/`end_date` Date columns coexist with the new
    `lms_start_date`/`lms_end_date` DateTime columns until Phase 5 drops
    the Date columns.

The webhook handler tests (Phase 2) and the data migration tests
(Phase 3) live elsewhere; these are pure schema-shape tests.
"""
from datetime import date, datetime, timedelta, timezone as tz
from decimal import Decimal

import pytest
from django.db import IntegrityError, connection
from django.utils import timezone

from administrate.models import CourseTemplate
from catalog.models import (
    ExamSession, ExamSessionSubject, Subject, Product,
    ProductProductVariation, ProductVariation,
)
from store.models import TutorialProduct
from tutorials.models import TutorialEvents


@pytest.fixture
def store_product(db):
    """Bare minimum store.Product chain to satisfy TutorialEvents.store_product NOT NULL."""
    exam_session = ExamSession.objects.create(
        session_code='TEST26S',
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=60),
    )
    subject = Subject.objects.create(code='CB1', description='CB1 test', active=True)
    ess = ExamSessionSubject.objects.create(exam_session=exam_session, subject=subject)
    product = Product.objects.create(code='TUT_PHASE1', fullname='Phase 1 Tutorial', shortname='Phase 1')
    variation = ProductVariation.objects.create(
        code='WKD', name='Weekend', description='Weekend tutorial',
        description_short='Weekend', variation_type='Tutorial',
    )
    ppv = ProductProductVariation.objects.create(product=product, product_variation=variation)
    return TutorialProduct.objects.create(
        exam_session_subject=ess,
        product_product_variation=ppv,
        product_code='CB1/TUT_PHASE1WKD/TEST26S',
        format='LO_6H',
    )


@pytest.fixture
def course_template(db):
    """A `adm.course_templates` row to point the new cross-schema FK at."""
    return CourseTemplate.objects.create(external_id='ct_phase1_test')


@pytest.mark.django_db
class TestNewAdministrateFieldsExist:
    """Schema-shape pins. Each new column is asserted to exist + be nullable."""

    def test_all_new_columns_present_on_table(self):
        """The migration must add every column listed in the plan."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'acted'
                  AND table_name = 'tutorial_events'
            """)
            cols = {name: nullable for name, nullable in cursor.fetchall()}

        expected_new_cols = {
            # Administrate join key
            'external_id',
            # Status / type
            'lifecycle_state', 'learning_mode', 'tutorial_category',
            # Capacity / web flags
            'web_sale', 'max_places', 'min_places',
            # DateTime replacements (legacy Date columns kept until Phase 5)
            'lms_start_date', 'lms_end_date', 'registration_deadline',
            # URLs / location info
            'event_url', 'virtual_classroom', 'timezone',
            # Sitting / admin metadata
            'sitting', 'administrator', 'session_title',
            # External codes
            'ocr_moodle_code', 'sage_code',
            # Recordings
            'recordings', 'recording_pin',
            # Free-text
            'extra_information', 'tutors', 'access_duration',
            # Cross-schema FK
            'course_template_id',
            # Sold-out (rename target for adm.events.sold_out)
            'sold_out',
        }
        missing = expected_new_cols - cols.keys()
        assert not missing, f"Migration missing columns: {missing}"

        # All new columns must be nullable so the migration is reversible
        # without backfill (Phase 3 will populate them).
        for col in expected_new_cols:
            assert cols[col] == 'YES', (
                f"new column {col} must be nullable in Phase 1 (got {cols[col]})"
            )

    def test_legacy_date_columns_dropped(self):
        """Phase 5b (2026-05-16): `start_date` / `end_date` (Date) were
        dropped from `acted.tutorial_events`. The canonical fields are
        `lms_start_date` / `lms_end_date` (DateTime).

        Pin the absence so a future migration that re-introduces those
        names with a different type would fail loudly here."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'acted'
                  AND table_name = 'tutorial_events'
                  AND column_name IN ('start_date', 'end_date')
            """)
            cols = dict(cursor.fetchall())
        assert cols == {}, \
            f"legacy start_date/end_date must NOT exist after Phase 5b; found {cols!r}"


@pytest.mark.django_db
class TestNewFieldRoundTrip:
    """Saving + reading new field values must round-trip via the ORM."""

    def test_can_create_with_all_new_fields_populated(self, store_product, course_template):
        """Smoke test: a TutorialEvents row carrying every new field must
        save and reload cleanly."""
        midnight_utc = datetime(2026, 9, 1, 0, 0, tzinfo=tz.utc)
        event = TutorialEvents.objects.create(
            code='CB1-PHASE1-26S',
            store_product=store_product,
            # Administrate-derived fields (Phase 5b dropped the legacy
            # Date columns; lms_start_date / lms_end_date below are the
            # canonical ones now)
            external_id='evt_phase1_001',
            lifecycle_state='PUBLISHED',
            learning_mode='CLASSROOM',
            tutorial_category='REGULAR',
            web_sale=True,
            sold_out=False,
            max_places=30,
            min_places=5,
            lms_start_date=midnight_utc,
            lms_end_date=midnight_utc + timedelta(days=91),
            registration_deadline=midnight_utc - timedelta(days=7),
            event_url='https://example.com/event/1',
            virtual_classroom='zoom-room-7',
            timezone='Europe/London',
            sitting='26S',
            administrator='Admin Test',
            session_title='Session A',
            ocr_moodle_code='OCR-CB1-26S',
            sage_code='SAGE-CB1',
            recordings=True,
            recording_pin='1234',
            extra_information='Extra notes',
            tutors='Alice, Bob',
            access_duration='3 months',
            course_template=course_template,
        )
        event.refresh_from_db()
        assert event.external_id == 'evt_phase1_001'
        assert event.lifecycle_state == 'PUBLISHED'
        assert event.lms_start_date == midnight_utc
        assert event.course_template_id == course_template.pk

    def test_external_id_unique(self, store_product):
        """external_id is the Administrate join key — duplicates would
        break the inbound webhook's idempotency."""
        TutorialEvents.objects.create(
            code='UNIQ-A', lms_start_date=date(2026, 1, 1), lms_end_date=date(2026, 1, 2),
            store_product=store_product, external_id='evt_uniq',
        )
        with pytest.raises(IntegrityError):
            TutorialEvents.objects.create(
                code='UNIQ-B', lms_start_date=date(2026, 1, 1), lms_end_date=date(2026, 1, 2),
                store_product=store_product, external_id='evt_uniq',
            )

    def test_external_id_nullable_for_legacy_rows(self, store_product):
        """Legacy tutorial_events rows that pre-date Administrate
        integration must still be valid (external_id = NULL)."""
        a = TutorialEvents.objects.create(
            code='LEGACY-A', lms_start_date=date(2026, 1, 1), lms_end_date=date(2026, 1, 2),
            store_product=store_product,
        )
        b = TutorialEvents.objects.create(
            code='LEGACY-B', lms_start_date=date(2026, 1, 1), lms_end_date=date(2026, 1, 2),
            store_product=store_product,
        )
        # Two rows with NULL external_id must coexist (UNIQUE constraint
        # treats multiple NULLs as distinct in PostgreSQL).
        assert a.external_id is None
        assert b.external_id is None


@pytest.mark.django_db
class TestCrossSchemaCourseTemplateFK:
    """The `course_template` FK reverses the cross-schema dependency
    direction — `acted.tutorial_events` now references `adm.course_templates`.
    Pin that the FK works and is properly enforced."""

    def test_course_template_resolves_to_adm_row(self, store_product, course_template):
        event = TutorialEvents.objects.create(
            code='FK-A', lms_start_date=date(2026, 1, 1), lms_end_date=date(2026, 1, 2),
            store_product=store_product, course_template=course_template,
        )
        event.refresh_from_db()
        assert event.course_template.external_id == 'ct_phase1_test'

    def test_course_template_nullable(self, store_product):
        """In Phase 1 the FK is nullable (Phase 3 backfills from adm.events)."""
        event = TutorialEvents.objects.create(
            code='FK-NULL', lms_start_date=date(2026, 1, 1), lms_end_date=date(2026, 1, 2),
            store_product=store_product,
        )
        assert event.course_template is None
