"""Resolve adm.events -> acted.tutorial_events linkage.

Matching rule (product decision 2026-05-15):
    `acted.tutorial_events.code` == `adm.events.title`  (exact, 1-to-1)

Design notes:
  - The linker is a pure lookup (no DB writes, no side effects). Callers
    decide whether to persist by assigning `event.tutorial_event = match`
    and calling `event.save(update_fields=['tutorial_event'])`. This keeps
    dry-run support trivial and makes the matcher unit-testable without
    constructing a full transaction.
  - 1-to-1 invariant is enforced by `TutorialEvents.code` being declared
    `unique=True` in the model. If two TutorialEvents rows ever share a
    code (data corruption), the linker will return one of them
    deterministically — `.first()` orders by the model's default
    ordering (`start_date, code`). A periodic uniqueness check at the
    DB layer is a better belt-and-braces.
  - The match is case-sensitive on purpose. Codes are deterministic
    identifiers, not user-facing labels, so case drift is itself a bug
    worth surfacing rather than silently normalising.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from administrate.models import Event
    from tutorials.models import TutorialEvents as _TutorialEvents


def link_event_to_tutorial(event: 'Event') -> Optional['_TutorialEvents']:
    """Return the TutorialEvents row whose `code` equals `event.title`, or None.

    Empty/falsy titles short-circuit to None — an Administrate event with
    no title is itself a data-integrity issue worth flagging separately
    rather than silently matching a (probably-non-existent) blank code.
    """
    if not event.title:
        return None
    # Import inside the function so cross-app circular-import risk is
    # contained. The administrate app boots before tutorials in
    # INSTALLED_APPS, so module-level imports of tutorials models from
    # an administrate service module can cause ordering problems.
    from tutorials.models import TutorialEvents
    return TutorialEvents.objects.filter(code=event.title).first()
