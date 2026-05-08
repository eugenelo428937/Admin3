"""Resolve which TutorialChoice + OrderItem fulfilled a CSV-imported registration.

Strategy A (strict, picked 2026-05-05): a registration is only valid if
there is a non-cancelled TutorialChoice for the (student, event) pair.
Zero matches → caller should record an unmatched warning and skip the
row. Multiple matches → return the lowest choice_rank with a warning
(downstream may want to surface this for manual triage).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from orders.models import OrderItem
from tutorials.models import TutorialChoice


@dataclass
class ChoiceResolution:
    choice: Optional[TutorialChoice] = None
    order_item: Optional[OrderItem] = None
    warning: str = ''


def resolve_choice_for_registration(student, session) -> ChoiceResolution:
    """Find the (choice, order_item) pair fulfilling a (student, session) row.

    Rules (spec section 4.3, strategy A):
      * exactly one match → return it.
      * multiple matches → return the one with lowest choice_rank;
        ties broken by created_at; emit a warning.
      * zero matches → return an empty :class:`ChoiceResolution`.
      * cancelled order items (``is_cancelled=True``) are excluded
        because they represent refunded/withdrawn purchases.
    """
    qs = (
        TutorialChoice.objects
        .filter(
            student=student,
            tutorial_event=session.tutorial_event,
            order_item__is_cancelled=False,
        )
        .select_related('order_item')
        .order_by('choice_rank', 'created_at')
    )
    matches = list(qs)
    if not matches:
        return ChoiceResolution()

    chosen = matches[0]
    warning = ''
    if len(matches) > 1:
        warning = (
            f"multiple matching choices for student={student.student_ref} "
            f"event={session.tutorial_event.code}; picked rank {chosen.choice_rank}"
        )
    return ChoiceResolution(
        choice=chosen, order_item=chosen.order_item, warning=warning,
    )
