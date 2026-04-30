"""Pre-flight and per-row validators for the marks26 import."""
from dataclasses import dataclass
from typing import List

from .date_parsing import parse_date
from .marks26_lookups import Marks26Lookups
from .marks26_parsing import Marks26Row


VALID_GRADES = {'A', 'B', 'C', 'D', 'E'}
VALID_RATINGS = {'E', 'G', 'A', 'P'}


@dataclass
class Marks26Error:
    row: Marks26Row
    error_field: str
    error_message: str


def preflight_checks(
    rows: List[Marks26Row],
    lookups: Marks26Lookups,
) -> List[str]:
    """Return a list of error messages; empty list = OK."""
    errors: List[str] = []

    if lookups.mv_purchasable is None:
        errors.append("Required Purchasable with code='MV' does not exist.")

    needed_staff_initials = {
        r.staffalloc for r in rows if r.has_valid_dateout() and r.staffalloc
    }
    missing_staff = needed_staff_initials - set(lookups.staff.keys())
    for ini in sorted(missing_staff):
        errors.append(f"Staff.initials missing: {ini!r}")

    needed_marker_initials = {
        r.marker for r in rows if r.has_valid_dateout() and r.marker
    }
    missing_markers = needed_marker_initials - set(lookups.markers.keys())
    for ini in sorted(missing_markers):
        errors.append(f"Marker.initial missing: {ini!r}")

    return errors


def validate_marks26_row(
    row: Marks26Row,
    lookups: Marks26Lookups,
) -> List[Marks26Error]:
    """Validate a single row; return error list (possibly empty)."""
    errors: List[Marks26Error] = []

    def err(field: str, msg: str) -> None:
        errors.append(Marks26Error(row=row, error_field=field, error_message=msg))

    # ref → Student.student_ref
    try:
        ref_int = int(row.ref)
        if ref_int not in lookups.students:
            err('ref', f"student_ref={ref_int} not found")
    except ValueError:
        err('ref', f"ref={row.ref!r} is not an integer")

    if row.is_voucher_row():
        if not row.voucher or row.voucher == '0':
            err('voucher', f"voucher row must have a voucher code; got {row.voucher!r}")
        try:
            parse_date(row.expiry)
        except ValueError as e:
            err('expiry', f"expiry not parseable: {e}")
        oi = lookups.order_items.get((row.order, 'MV'))
        if oi is None:
            err('order', f"no OrderItem with orderno={row.order!r} and purchasable.code='MV'")

        if row.has_valid_datelogged():
            try:
                seq_int = row.sequence_int()
            except ValueError:
                err('sequence', f"sequence={row.sequence!r} is not an integer")
                seq_int = None
            if seq_int is not None:
                paper = lookups.papers.get((row.subject, row.abbrev, seq_int))
                if paper is None:
                    err(
                        'marking_paper',
                        f"no MarkingPaper for subject={row.subject!r} "
                        f"name={row.abbrev!r} sequences={seq_int}",
                    )
    else:
        product = lookups.products.get(row.assign)
        if product is None:
            err('assign', f"assign={row.assign!r} not found in products.product_code")
        else:
            try:
                seq_int = row.sequence_int()
            except ValueError:
                err('sequence', f"sequence={row.sequence!r} is not an integer")
                seq_int = None
            if seq_int is not None:
                paper = lookups.papers.get((row.subject, row.abbrev, seq_int))
                if paper is None:
                    err(
                        'marking_paper',
                        f"no MarkingPaper for subject={row.subject!r} "
                        f"name={row.abbrev!r} sequences={seq_int}",
                    )
            oi = lookups.order_items.get((row.order, row.assign))
            if oi is None:
                err(
                    'order',
                    f"no OrderItem with orderno={row.order!r} and purchasable.code={row.assign!r}",
                )

    if row.has_valid_datelogged():
        try:
            parse_date(row.realdatein)
        except ValueError as e:
            err('realdatein', f"realdatein not parseable: {e}")

    if row.has_valid_dateout():
        if not row.has_valid_datelogged():
            err('datelogged', 'orphan grading: dateout is valid but datelogged is not')
        if not row.staffalloc:
            err('staffalloc', 'staffalloc is empty but dateout is valid')
        elif row.staffalloc not in lookups.staff:
            err('staffalloc', f"staffalloc={row.staffalloc!r} not in Staff.initials")
        if not row.marker:
            err('marker', 'marker is empty but dateout is valid')
        elif row.marker not in lookups.markers:
            err('marker', f"marker={row.marker!r} not in Marker.initial")
        if row.score:
            try:
                int(row.score)
            except ValueError:
                err('score', f"score={row.score!r} is not an integer")
        if row.grade and row.grade not in VALID_GRADES:
            err('grade', f"grade={row.grade!r} not in {{A,B,C,D,E}}")

    if row.has_valid_hubfeedbk():
        if not row.has_valid_dateout():
            err('hubfeedbk', 'orphan feedback: hubfeedbk is valid but dateout is not')
        if row.rating and row.rating not in VALID_RATINGS:
            err('rating', f"rating={row.rating!r} not in {{E,G,A,P}}")

    return errors
