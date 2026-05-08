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

from tutorials.models import TutorialRegistration


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
    """Import the legacy registrations CSV into ``tutorial_registrations``.

    Raises:
        RuntimeError: if the table already contains any rows (one-shot
            guard).
    """
    if TutorialRegistration.objects_all.exists():
        raise RuntimeError(
            'tutorial_registrations is non-empty; this importer is one-shot only',
        )
    # Subsequent tasks fill in: parse, batch creation, row insertion,
    # commit/rollback. For now, return an empty result so callers can
    # exercise the pre-flight branch without a TypeError.
    return ImportResult(batch_id=None)
