"""Resolves a ParsedOrderRow into the (Student, TutorialEvent, store.Product)
triple required to write Order/OrderItem/TutorialChoice.

Per Q3=A (2026-05-01): missing students are auto-created (User + Student
with unusable password), mirroring the events importer's instructor flow.
Per Q4: the OrderItem's purchasable is the chosen event's store_product —
we don't manually compose location+variation+subject+sitting because the
already-imported TutorialEvents already wires that chain.

Per Q1=Yes (2026-05-01) the sitting → event-code-suffix mapping is:
    csitting='2024'  (April)    → '24A'
    csitting='2024S' (September) → '24S'
    csitting='2025'  → '25A'  / '2025S' → '25S'  / '2026' → '26A' / etc.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from django.contrib.auth.models import User

from store.models import Product as StoreProduct
from students.models import Student
from tutorials.models import TutorialEvents
from tutorials.services.orders_csv_parser import ParsedOrderRow


@dataclass
class OrderResolution:
    student: Optional[Student] = None
    tutorial_event: Optional[TutorialEvents] = None
    store_product: Optional[StoreProduct] = None
    errors: List[str] = field(default_factory=list)


def resolve_order_row(parsed: ParsedOrderRow) -> OrderResolution:
    resolution = OrderResolution()

    # 1. Student (auto-create if missing — Q3=A).
    resolution.student = _get_or_create_student(parsed)

    # 2. TutorialEvent lookup by xname + sitting-derived code.
    candidates = make_event_code_candidates(parsed.event_code_xname, parsed.sitting_year)
    events = list(TutorialEvents.objects.filter(code__in=candidates).select_related('store_product'))
    if len(events) == 0:
        resolution.errors.append(
            f"TutorialEvent not found: tried {candidates} for student {parsed.student_ref}"
        )
        return resolution
    if len(events) > 1:
        resolution.errors.append(
            f"Multiple TutorialEvents matched candidates {candidates}: "
            f"{[e.code for e in events]} — ambiguous"
        )
        return resolution

    resolution.tutorial_event = events[0]
    resolution.store_product = events[0].store_product
    return resolution


def make_event_code_candidates(xname: str, sitting_year: str) -> List[str]:
    """Construct the TutorialEvents.code values to search for.

    csitting is one of '2024', '2024S', '2025', '2025S', '2026', etc.
    Ending in 'S' = September (keep the S); else April (append 'A').
    The two-digit year suffix joins the xname.
    """
    if not sitting_year:
        return []
    if sitting_year.endswith('S'):
        # '2024S' → year='2024', suffix='24S'
        suffix = sitting_year[-3:-1] + 'S'
    else:
        # '2024' → year='2024', suffix='24A'
        suffix = sitting_year[-2:] + 'A'
    return [f"{xname}-{suffix}"]


def _get_or_create_student(parsed: ParsedOrderRow) -> Student:
    """Look up Student by student_ref; create User+Student if missing.

    The CSV's `ref` column maps to Student.student_ref (PK). When creating a
    new student we set a deterministic username (so re-runs are idempotent)
    and an unusable password.
    """
    existing = Student.objects.filter(student_ref=parsed.student_ref).select_related('user').first()
    if existing is not None:
        return existing

    # Build a stable, unique username from the email (preferred) or ref.
    base_username = (parsed.email.split('@')[0] if parsed.email else f'student_{parsed.student_ref}').lower()
    username = _unique_username(base_username)

    user = User.objects.create(
        username=username,
        first_name=parsed.firstname,
        last_name=parsed.lastname,
        email=parsed.email,
    )
    user.set_unusable_password()
    user.save()

    # Force the student_ref to match the CSV value (Student.student_ref is the PK).
    student = Student.objects.create(student_ref=parsed.student_ref, user=user)
    return student


def _unique_username(base: str) -> str:
    """Return base, or base_2/base_3/... if base is taken."""
    if not User.objects.filter(username=base).exists():
        return base
    n = 2
    while User.objects.filter(username=f"{base}_{n}").exists():
        n += 1
    return f"{base}_{n}"
