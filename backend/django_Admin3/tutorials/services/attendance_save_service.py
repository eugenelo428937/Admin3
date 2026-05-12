"""Shared upsert service for tutorial attendance writes.

Used by both the admin AttendanceView and the public attendance endpoint so
the two callers produce identical results (same validation, same recorded_at).

Administrate sync
-----------------
After a successful save we enqueue a single ``AttendanceSyncJob`` row
carrying the saved items + each student's ``student_ref``. The cron
command ``sync_attendance_to_administrate`` drains the queue and calls
``AdministrateAttendanceSyncService.sync_job`` per row. Failures stay
in the queue and retry with backoff; they never block the local save.
"""
from __future__ import annotations

from typing import Iterable, Mapping

from django.db import transaction
from django.utils import timezone

from tutorials.models import (
    AttendanceSyncJob, TutorialAttendance, TutorialRegistration,
)


class CrossSessionRegistration(Exception):
    """Caller passed a registration_id that does not belong to the given session."""


@transaction.atomic
def save_attendance_items(
    *, session, recorded_by, items: Iterable[Mapping],
) -> list[TutorialAttendance]:
    """Upsert TutorialAttendance rows for the given items.

    Raises CrossSessionRegistration if any item's registration belongs to a
    different session (defence in depth for the public endpoint).

    On success (with non-empty items), enqueues exactly one
    AttendanceSyncJob row so the Administrate sync cron can push the
    change. The enqueue happens inside the same transaction as the
    upsert, so a partially-saved batch never leaves a stale job behind.
    """
    item_list = list(items)
    if not item_list:
        return []

    reg_ids = [int(it['registration_id']) for it in item_list]
    valid_regs = (
        TutorialRegistration.objects
        .filter(tutorial_session=session, id__in=reg_ids)
        .select_related('student')
    )
    valid_reg_ids = set(valid_regs.values_list('id', flat=True))
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

    # Enqueue the Administrate sync job (with student_ref enrichment so
    # the cron drain doesn't need to re-query students). Imported lazily
    # to avoid pulling administrate models during local-only tests.
    from administrate.services.attendance_sync_service import (
        AdministrateAttendanceSyncService,
    )
    payload = AdministrateAttendanceSyncService.build_payload_from_registrations(
        list(valid_regs), item_list,
    )
    if payload:
        AttendanceSyncJob.objects.create(session=session, payload=payload)

    return written
