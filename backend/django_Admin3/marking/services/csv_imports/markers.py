"""markers.csv parsing and validation.

Resolution strategy (two-tier):

1. **Staff by plaintext name** — most current markers are staff. Staff
   names on ``auth_user.first_name`` / ``last_name`` are stored as
   cleartext (staff data is not anonymised), so we can match the CSV
   firstname/lastname directly with case-insensitive comparison.

2. **Student fallback** — if no staff match, the marker may be a former
   student who hasn't been promoted to staff. The CSV's ``mkref`` is a
   ``students.student_ref``; we narrow by ``student_type IN
   ('M','Q','I','O','D')`` — every non-regular-student type seen in
   the legacy marker pool. This excludes regular students ('S') to
   prevent false matches with the much larger student base.

The first tier wins because a person currently in the staff table
represents their *current* role; the legacy student record may be a
pre-staff history entry.
"""
import csv
from dataclasses import dataclass
from typing import IO, List, Tuple

from staff.models import Staff
from students.models import Student


# student_type values eligible for the marker fallback. Excludes 'S'
# (regular students) to prevent accidental cross-wiring with the
# 10k+ regular-student base. See module docstring for rationale.
MARKER_STUDENT_TYPES = ('M', 'Q', 'I', 'O', 'D')


@dataclass
class MarkerCsvRow:
    row_num: int
    mkref: str
    firstname: str
    lastname: str
    initials: str


@dataclass
class MarkerError:
    row: MarkerCsvRow
    error_message: str


@dataclass
class ResolvedMarker:
    row: MarkerCsvRow
    user_id: int
    mkref_int: int
    initials: str


def parse_markers_csv(file_obj: IO) -> List[MarkerCsvRow]:
    """Parse markers.csv into a list of MarkerCsvRow."""
    reader = csv.DictReader(file_obj)
    rows: List[MarkerCsvRow] = []
    for index, raw in enumerate(reader, start=2):  # 2 because header is row 1
        if not any(raw.values()):
            continue
        rows.append(MarkerCsvRow(
            row_num=index,
            mkref=(raw.get('mkref') or '').strip(),
            firstname=(raw.get('firstname') or '').strip(),
            lastname=(raw.get('lastname') or '').strip(),
            initials=(raw.get('initials') or '').strip(),
        ))
    return rows


def validate_markers_rows(
    rows: List[MarkerCsvRow],
) -> Tuple[List[MarkerError], List[ResolvedMarker]]:
    """Validate every row; return (errors, resolved). Never stops on first error."""
    errors: List[MarkerError] = []
    resolved: List[ResolvedMarker] = []
    for row in rows:
        row_errors: List[str] = []

        try:
            mkref_int = int(row.mkref)
            if mkref_int <= 0:
                row_errors.append(f"mkref={row.mkref!r} must be a positive integer")
        except ValueError:
            row_errors.append(f"mkref={row.mkref!r} is not an integer")
            mkref_int = -1

        if not row.initials:
            row_errors.append('initials is empty')
        elif len(row.initials) > 10:
            row_errors.append(f"initials={row.initials!r} exceeds 10 characters")

        # Tier 1 — staff lookup by plaintext name (case-insensitive)
        user_id = None
        staff_matches = Staff.objects.filter(
            user__first_name__iexact=row.firstname,
            user__last_name__iexact=row.lastname,
        )
        staff_count = staff_matches.count()
        if staff_count == 1:
            user_id = staff_matches.first().user_id
        elif staff_count > 1:
            row_errors.append(
                f"Ambiguous Staff match: {staff_count} rows have "
                f"firstname={row.firstname!r} lastname={row.lastname!r}"
            )
        else:
            # Tier 2 — student fallback by mkref + marker-eligible type
            if mkref_int > 0:
                try:
                    student = Student.objects.get(
                        student_ref=mkref_int,
                        student_type__in=MARKER_STUDENT_TYPES,
                    )
                    user_id = student.user_id
                except Student.DoesNotExist:
                    row_errors.append(
                        f"No Staff matches firstname={row.firstname!r} "
                        f"lastname={row.lastname!r}, and no Student "
                        f"with student_ref={mkref_int} and "
                        f"student_type in {MARKER_STUDENT_TYPES}"
                    )

        if row_errors:
            errors.append(MarkerError(row=row, error_message='; '.join(row_errors)))
        else:
            resolved.append(ResolvedMarker(
                row=row, user_id=user_id, mkref_int=mkref_int, initials=row.initials,
            ))
    return errors, resolved
