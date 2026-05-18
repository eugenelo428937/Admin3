"""Phase 1 of the session+learner webhook expansion (2026-05-18).

Verifies the schema prep on `tutorial_sessions` that the new
`Session Created/Updated/Deleted` webhook handlers depend on:

  - `cancelled` BooleanField (default False) — receives the cancellation
    state currently stored on `adm.sessions.cancelled` (which Phase 2 of
    this PR drops as a redundant column).
  - `start_date` / `end_date` nullable — the registered Session GraphQL
    slice does NOT fetch dates (Administrate's Session typed fields don't
    expose them on the slice we care about; sequence/url/recording come
    via custom fields, dates are inherited from the parent Event in their
    model). Webhook-created sessions therefore land with NULL dates; CSV
    bulk import populates them subsequently. The model-level `clean()`
    validation already short-circuits when either date is None, so
    nullability doesn't loosen the "start <= end" invariant for rows that
    do have dates set.

These are pure schema assertions — no migration data to verify yet.
"""

from django.test import TestCase

from tutorials.models import TutorialSessions


class TutorialSessionsCancelledFieldTest(TestCase):

    def test_cancelled_field_exists(self):
        field = TutorialSessions._meta.get_field('cancelled')
        self.assertIsNotNone(field)

    def test_cancelled_field_is_boolean(self):
        from django.db.models import BooleanField
        field = TutorialSessions._meta.get_field('cancelled')
        self.assertIsInstance(field, BooleanField)

    def test_cancelled_default_is_false(self):
        field = TutorialSessions._meta.get_field('cancelled')
        self.assertEqual(field.default, False)


class TutorialSessionsNullableDatesTest(TestCase):

    def test_start_date_is_nullable(self):
        field = TutorialSessions._meta.get_field('start_date')
        self.assertTrue(field.null)

    def test_end_date_is_nullable(self):
        field = TutorialSessions._meta.get_field('end_date')
        self.assertTrue(field.null)

    def test_start_date_allows_blank(self):
        # `blank=True` is the form-validation pair to `null=True` — keeps
        # admin & DRF serializers from rejecting an empty submission. We
        # don't strictly need it on the model, but consistency with the
        # rest of the optional-DateTime fields in this app prevents
        # surprise validation errors down the line.
        field = TutorialSessions._meta.get_field('start_date')
        self.assertTrue(field.blank)

    def test_end_date_allows_blank(self):
        field = TutorialSessions._meta.get_field('end_date')
        self.assertTrue(field.blank)
