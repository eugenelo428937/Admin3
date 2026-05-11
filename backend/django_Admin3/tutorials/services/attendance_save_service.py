"""Shared upsert service for tutorial attendance writes.

Used by both the admin AttendanceView and the public attendance endpoint so
the two callers produce identical results (same validation, same recorded_at).
"""
from __future__ import annotations

from typing import Iterable, Mapping

from django.db import transaction
from django.utils import timezone

from tutorials.models import TutorialAttendance, TutorialRegistration


class CrossSessionRegistration(Exception):
    """Caller passed a registration_id that does not belong to the given session."""


@transaction.atomic
def save_attendance_items(
    *, session, recorded_by, items: Iterable[Mapping],
) -> list[TutorialAttendance]:
    """Upsert TutorialAttendance rows for the given items.

    Raises CrossSessionRegistration if any item's registration belongs to a
    different session (defence in depth for the public endpoint).
    """
    item_list = list(items)
    if not item_list:
        return []

    reg_ids = [int(it['registration_id']) for it in item_list]
    valid_reg_ids = set(
        TutorialRegistration.objects
        .filter(tutorial_session=session, id__in=reg_ids)
        .values_list('id', flat=True)
    )
    foreign = [rid for rid in reg_ids if rid not in valid_reg_ids]
    if foreign:
        raise CrossSessionRegistration(
            f'registration ids do not belong to session {session.id}: {foreign}'
        )

    now = timezone.now()
    written: list[TutorialAttendance] = []
    for it in item_list:
        obj, _ = TutorialAttendance.objects.update_or_create(
            registration_id=int(it['registration_id']),
            defaults={
                'status': it['status'],
                'reason': it.get('reason') or '',
                'recorded_by': recorded_by,
                'recorded_at': now,
            },
        )
        written.append(obj)
    return written
