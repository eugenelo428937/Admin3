"""Resolve which TutorialChoice fulfilled a CSV-imported registration.

Strategy (2026-05-08 simplification):
- Zero matches → ChoiceResolution(choice=None, warning='').
- Exactly one match → ChoiceResolution(choice=match, warning='').
- Multiple matches → ChoiceResolution(choice=None, warning=<message>).
  We intentionally do NOT auto-pick a winner — the operator can patch the
  link from the warnings list emitted by the importer.

`order_item` is reachable via `result.choice.order_item` when
`result.choice is not None`.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from tutorials.models import TutorialChoice


@dataclass
class ChoiceResolution:
    choice: Optional[TutorialChoice] = None
    warning: str = ''


def resolve_choice_for_registration(student, session) -> ChoiceResolution:
    """Find the TutorialChoice fulfilling a (student, session) CSV row.

    Cancelled order items (``is_cancelled=True``) are excluded — they
    represent refunded/withdrawn purchases.
    """
    matches = list(
        TutorialChoice.objects
        .filter(
            student=student,
            tutorial_event=session.tutorial_event,
            order_item__is_cancelled=False,
        )
        .order_by('choice_rank', 'created_at')[:2]
    )

    if not matches:
        return ChoiceResolution()
    if len(matches) >= 2:
        return ChoiceResolution(
            choice=None,
            warning=(
                f"multiple matching choices for student={student.student_ref} "
                f"event={session.tutorial_event.code}; left unlinked"
            ),
        )
    return ChoiceResolution(choice=matches[0])
