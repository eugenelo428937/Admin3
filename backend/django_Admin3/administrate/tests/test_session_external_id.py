"""Tests for the ``external_id`` field on ``administrate.Session``.

The Administrate API identifies sessions by their own opaque id. We cache
that id in ``adm.sessions.external_id`` so subsequent attendance syncs
can skip the title-based GraphQL lookup and hit the mutation directly.

This mirrors the existing ``external_id`` field on ``administrate.Event``
(see events.py:47): nullable + unique so multiple "not yet synced" rows
are valid until they get a real Administrate id written through.
"""
from __future__ import annotations

from datetime import date, time

from django.db import IntegrityError, transaction
from django.test import TestCase

from administrate.models import (
    CourseTemplate, Event, Instructor, Location, Session, Venue,
)


def _make_course_template():
    return CourseTemplate.objects.create(external_id='ct-ext-1')


def _make_location():
    return Location.objects.create(external_id='loc-ext-1')


def _make_venue(loc):
    return Venue.objects.create(external_id='ven-ext-1', location=loc)


def _make_instructor():
    return Instructor.objects.create(external_id='ins-ext-1')


def _make_event(ct, loc, ven, ins, suffix='1'):
    # Phase 5 (2026-05-15): adm.events is now a thin bridge — only
    # external_id + tutorial_event survived the column drop. Tests that
    # used to pass course_template / title / location / venue /
    # primary_instructor on adm.events should set those on the linked
    # tutorial_events row instead. This helper preserves the old
    # signature so callers don't have to change, but only `external_id`
    # is actually persisted on the bridge.
    return Event.objects.create(external_id=f'evt-ext-{suffix}')


def _make_session(event, day=1, external_id=None, instructor=None):
    # session_instructor is now passed explicitly (post-Phase-5: the
    # bridge no longer carries primary_instructor for us to crib from).
    return Session.objects.create(
        event=event,
        external_id=external_id,
        title=f'Day {day}',
        day_number=day,
        classroom_start_date=date(2026, 5, 12),
        classroom_start_time=time(9, 0),
        classroom_end_date=date(2026, 5, 12),
        classroom_end_time=time(17, 0),
        session_instructor=instructor,
    )


class AdmSessionExternalIdTests(TestCase):
    def setUp(self):
        self.ct = _make_course_template()
        self.loc = _make_location()
        self.ven = _make_venue(self.loc)
        self.ins = _make_instructor()
        self.event = _make_event(self.ct, self.loc, self.ven, self.ins)

    def test_external_id_optional_at_creation(self):
        """New adm.Session rows can be created without an external_id —
        the field is populated lazily by the attendance sync service.
        """
        s = _make_session(self.event, day=1, external_id=None, instructor=self.ins)
        self.assertIsNone(s.external_id)

    def test_external_id_persists_when_set(self):
        s = _make_session(self.event, day=1, external_id='sess-ext-42', instructor=self.ins)
        s.refresh_from_db()
        self.assertEqual(s.external_id, 'sess-ext-42')

    def test_external_id_is_unique(self):
        _make_session(self.event, day=1, external_id='dup', instructor=self.ins)
        ev2 = _make_event(self.ct, self.loc, self.ven, self.ins, suffix='2')
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                _make_session(ev2, day=1, external_id='dup', instructor=self.ins)

    def test_multiple_rows_can_share_null_external_id(self):
        """Unique-with-nulls: multiple unsynced rows are allowed."""
        _make_session(self.event, day=1, external_id=None, instructor=self.ins)
        _make_session(self.event, day=2, external_id=None, instructor=self.ins)
        self.assertEqual(
            Session.objects.filter(external_id__isnull=True).count(), 2,
        )
