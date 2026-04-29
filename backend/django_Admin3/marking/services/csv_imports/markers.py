"""markers.csv parsing and validation."""
import csv
from dataclasses import dataclass
from typing import IO, List, Tuple

from django.contrib.auth.models import User


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

        matches = User.objects.filter(
            first_name=row.firstname,
            last_name=row.lastname,
        )
        match_count = matches.count()
        user_id = None
        if match_count == 0:
            row_errors.append(
                f"No auth_user matches firstname={row.firstname!r} lastname={row.lastname!r}"
            )
        elif match_count > 1:
            row_errors.append(
                f"Ambiguous match: {match_count} auth_user rows have "
                f"firstname={row.firstname!r} lastname={row.lastname!r}"
            )
        else:
            user_id = matches.first().id

        if row_errors:
            errors.append(MarkerError(row=row, error_message='; '.join(row_errors)))
        else:
            resolved.append(ResolvedMarker(
                row=row, user_id=user_id, mkref_int=mkref_int, initials=row.initials,
            ))
    return errors, resolved
