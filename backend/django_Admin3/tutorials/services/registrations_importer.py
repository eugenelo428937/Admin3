"""One-shot legacy bulk importer for tutorial_registrations.csv.

Reads ``docs/misc/tutorial_registrations.csv`` (full schema in
``tutorials.services.registrations_csv_parser``) and creates one
``TutorialRegistration`` row per (session, student) pair, linking
``tutorial_choice`` when a single live ``TutorialChoice`` exists for
that pair (see ``tutorials.services.choice_resolver``).

Multi-match and no-match cases create a registration with
``tutorial_choice=NULL``; multi-match additionally records a warning
on the ``TutorialEnrolmentImport.report['warnings']`` list.

This importer is **one-shot** — it refuses to run if the
``tutorial_registrations`` table is non-empty. Future incremental
sync (soft-deactivate / reactivate) is out of scope.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from django.db import transaction
from django.utils import timezone
from students.models import Student
from tutorials.models import (
    TutorialEnrolmentImport, TutorialRegistration, TutorialSessions,
)
from tutorials.services.choice_resolver import resolve_choice_for_registration
from tutorials.services.registrations_csv_parser import parse_registrations_csv


@dataclass
class ImportResult:
    batch_id: Optional[int]
    total_csv_rows: int = 0
    created: int = 0
    linked_to_choice: int = 0
    unlinked: int = 0
    multi_match_warnings: int = 0
    skipped_cancelled: int = 0
    skipped_unknown_session: int = 0
    skipped_unknown_student: int = 0
    skipped_paren_suffix: int = 0
    skipped_empty: int = 0
    skipped_duplicate_in_db: int = 0
    warnings: List[str] = field(default_factory=list)


def import_registrations_csv(
    file_obj, *, uploaded_by, filename: str,
    dry_run: bool = False, strict: bool = False,
) -> ImportResult:
    """Import the legacy registrations CSV into ``tutorial_registrations``."""
    if TutorialRegistration.objects_all.exists():
        raise RuntimeError(
            'tutorial_registrations is non-empty; this importer is one-shot only',
        )

    parsed = parse_registrations_csv(file_obj)

    result = ImportResult(
        batch_id=None,
        total_csv_rows=parsed.total_rows,
        skipped_cancelled=parsed.skipped_cancelled,
        skipped_unknown_session=parsed.skipped_unknown_session,
        skipped_unknown_student=parsed.skipped_unknown_student,
        skipped_paren_suffix=parsed.skipped_paren_suffix,
        skipped_empty=parsed.skipped_empty,
    )

    with transaction.atomic():
        batch = TutorialEnrolmentImport.objects.create(
            filename=filename,
            uploaded_by=uploaded_by,
            status=TutorialEnrolmentImport.STATUS_PENDING,
        )
        result.batch_id = batch.pk

        for row in parsed.rows:
            session = TutorialSessions.objects.get(pk=row.session_id)
            students_by_ref = {
                s.student_ref: s for s in Student.objects.filter(
                    student_ref__in=row.student_refs,
                )
            }
            for ref in row.student_refs:
                student = students_by_ref.get(ref)
                if student is None:
                    # Already counted by parser as skipped_unknown_student.
                    continue
                resolution = resolve_choice_for_registration(student, session)
                if resolution.warning:
                    result.warnings.append(resolution.warning)
                    result.multi_match_warnings += 1

                TutorialRegistration.objects.create(
                    student=student,
                    tutorial_session=session,
                    tutorial_choice=resolution.choice,
                    import_batch=batch,
                )
                result.created += 1
                if resolution.choice is not None:
                    result.linked_to_choice += 1
                else:
                    result.unlinked += 1

        # Finalise the batch row.
        batch.total_rows = result.total_csv_rows
        batch.created_count = result.created
        batch.unmatched_count = (
            result.skipped_unknown_session
            + result.skipped_unknown_student
            + result.skipped_paren_suffix
            + result.skipped_empty
            + result.skipped_duplicate_in_db
        )
        batch.report = {
            'created': result.created,
            'linked_to_choice': result.linked_to_choice,
            'unlinked': result.unlinked,
            'multi_match_warnings': result.multi_match_warnings,
            'skipped_cancelled': result.skipped_cancelled,
            'skipped_unknown_session': result.skipped_unknown_session,
            'skipped_unknown_student': result.skipped_unknown_student,
            'skipped_paren_suffix': result.skipped_paren_suffix,
            'skipped_empty': result.skipped_empty,
            'skipped_duplicate_in_db': result.skipped_duplicate_in_db,
            'warnings': list(result.warnings),
            'unmatched': list(parsed.unmatched),
        }
        if dry_run:
            batch.status = TutorialEnrolmentImport.STATUS_DRY_RUN
        else:
            batch.status = TutorialEnrolmentImport.STATUS_COMMITTED
            batch.committed_at = timezone.now()
        batch.save()

        if dry_run:
            transaction.set_rollback(True)
            result.batch_id = None  # Row is rolled back.

    return result
