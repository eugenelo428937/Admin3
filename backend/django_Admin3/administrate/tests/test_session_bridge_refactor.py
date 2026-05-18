"""Phase 2 of the session+learner webhook expansion (2026-05-18).

Verifies the `adm.sessions` thin-bridge refactor. Post-refactor, the model
carries only `external_id` and `tutorial_session` (FK to acted master).
All formerly-redundant data columns (title, day_number, classroom_*,
session_instructor, session_url, cancelled, event) have been moved to /
were already on `acted.tutorial_sessions` and are dropped here.

Mirrors the `adm.Event` thin-bridge refactor (PR #120, 2026-05-15):
  - `external_id`: Administrate session id, nullable+unique
  - `tutorial_session`: FK to master, SET_NULL on delete (so deleting the
    master doesn't cascade-kill the bridge row that webhook history
    references)

This file asserts the *new* shape. Tests for `external_id` semantics
(uniqueness, nullable creation, etc.) continue to live in
`test_session_external_id.py` — those tests still apply post-refactor;
their helpers needed adjusting for the new field set, not the test
assertions themselves.
"""
from django.test import TestCase
from django.db import models as djmodels

from administrate.models import Session as AdmSession


class AdmSessionPostRefactorShapeTest(TestCase):

    DROPPED_FIELDS = (
        'title', 'day_number',
        'classroom_start_date', 'classroom_start_time',
        'classroom_end_date', 'classroom_end_time',
        'session_instructor', 'session_url', 'cancelled',
        'event',  # the old FK to adm.Event — replaced by tutorial_session
    )

    def test_tutorial_session_fk_exists(self):
        field = AdmSession._meta.get_field('tutorial_session')
        self.assertTrue(field.is_relation)
        # Verify the FK targets the right master model.
        self.assertEqual(
            field.related_model._meta.label_lower,
            'tutorials.tutorialsessions',
        )

    def test_tutorial_session_fk_is_nullable(self):
        # Matches the adm.Event.tutorial_event pattern: bridge survives
        # the master's deletion so webhook receipt history stays intact.
        field = AdmSession._meta.get_field('tutorial_session')
        self.assertTrue(field.null)

    def test_tutorial_session_fk_uses_set_null_on_delete(self):
        field = AdmSession._meta.get_field('tutorial_session')
        self.assertEqual(field.remote_field.on_delete, djmodels.SET_NULL)

    def test_external_id_still_present(self):
        # The bridge keeps `external_id` as the Administrate join key.
        field = AdmSession._meta.get_field('external_id')
        self.assertTrue(field.unique)
        self.assertTrue(field.null)

    def test_redundant_data_columns_dropped(self):
        existing = {f.name for f in AdmSession._meta.get_fields()}
        leftover = sorted(set(self.DROPPED_FIELDS) & existing)
        self.assertEqual(
            leftover, [],
            f'Expected these columns to be dropped from adm.sessions: {leftover}',
        )

    def test_no_deprecated_computed_properties(self):
        # The properties `duration_hours`, `is_today`, `is_past`, `is_future`
        # used to live on adm.Session — derived from columns we're dropping.
        # They're removed because callers should reach those semantics
        # through `tutorial_session.start_date` / `end_date` instead.
        for prop_name in ('duration_hours', 'is_today', 'is_past', 'is_future'):
            self.assertFalse(
                hasattr(AdmSession, prop_name),
                f'{prop_name} should be removed from adm.Session post-refactor',
            )
