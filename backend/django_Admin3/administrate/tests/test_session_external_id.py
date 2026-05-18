"""Tests for the ``external_id`` field on ``administrate.Session``.

The Administrate API identifies sessions by their own opaque id. We cache
that id in ``adm.sessions.external_id`` so subsequent attendance syncs
can skip the title-based GraphQL lookup and hit the mutation directly.

This mirrors the existing ``external_id`` field on ``administrate.Event``
(see events.py:47): nullable + unique so multiple "not yet synced" rows
are valid until they get a real Administrate id written through.
"""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.test import TestCase

from administrate.models import Session
from tutorials.tests.factories import (
    make_event, make_session, make_store_product,
)


def _make_session(tutorial_session, external_id=None):
    # Post-Phase-2 (2026-05-18): adm.sessions is a thin bridge — only
    # external_id + tutorial_session survive the column drop. Helpers
    # that used to set title/day_number/classroom_* should set those
    # on the linked tutorials.TutorialSessions row (which `make_session`
    # already does for us).
    return Session.objects.create(
        external_id=external_id,
        tutorial_session=tutorial_session,
    )


class AdmSessionExternalIdTests(TestCase):
    def setUp(self):
        sp = make_store_product(variation_code='EXT1', cat_product_code='ExtIdTest')
        self.t_event = make_event(code='EXT-EV-1', store_product=sp)
        # Two distinct master rows so the unique-external_id test can
        # link different bridges to different masters.
        self.t_session_1 = make_session(
            event=self.t_event, title='Day 1', sequence=1,
        )
        self.t_session_2 = make_session(
            event=self.t_event, title='Day 2', sequence=2,
        )

    def test_external_id_optional_at_creation(self):
        """New adm.Session rows can be created without an external_id —
        the field is populated lazily by the attendance sync service.
        """
        s = _make_session(self.t_session_1, external_id=None)
        self.assertIsNone(s.external_id)

    def test_external_id_persists_when_set(self):
        s = _make_session(self.t_session_1, external_id='sess-ext-42')
        s.refresh_from_db()
        self.assertEqual(s.external_id, 'sess-ext-42')

    def test_external_id_is_unique(self):
        _make_session(self.t_session_1, external_id='dup')
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                _make_session(self.t_session_2, external_id='dup')

    def test_multiple_rows_can_share_null_external_id(self):
        """Unique-with-nulls: multiple unsynced rows are allowed."""
        _make_session(self.t_session_1, external_id=None)
        _make_session(self.t_session_2, external_id=None)
        self.assertEqual(
            Session.objects.filter(external_id__isnull=True).count(), 2,
        )
