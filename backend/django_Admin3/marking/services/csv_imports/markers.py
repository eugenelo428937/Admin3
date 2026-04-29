"""markers.csv parsing and validation.

Names in this codebase are anonymised: ``auth_user.first_name`` /
``last_name`` may be hashed in production, with the cleartext-equivalent
hash stored in ``userprofile.UserProfile.first_name_hash`` /
``last_name_hash`` (HMAC-SHA256, lowercased + stripped — see
``userprofile.hash_utils.compute_search_hash``). We resolve markers by
hashing the CSV's plaintext name and matching the UserProfile hash.
"""
import csv
from dataclasses import dataclass
from typing import IO, List, Tuple

from userprofile.hash_utils import compute_search_hash
from userprofile.models.user_profile import UserProfile


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

        first_hash = compute_search_hash(row.firstname)
        last_hash = compute_search_hash(row.lastname)
        matches = UserProfile.objects.filter(
            first_name_hash=first_hash,
            last_name_hash=last_hash,
        )
        match_count = matches.count()
        user_id = None
        if match_count == 0:
            row_errors.append(
                f"No UserProfile matches firstname={row.firstname!r} lastname={row.lastname!r} (hashed)"
            )
        elif match_count > 1:
            row_errors.append(
                f"Ambiguous match: {match_count} UserProfile rows have "
                f"firstname={row.firstname!r} lastname={row.lastname!r} (hashed)"
            )
        else:
            user_id = matches.first().user_id

        if row_errors:
            errors.append(MarkerError(row=row, error_message='; '.join(row_errors)))
        else:
            resolved.append(ResolvedMarker(
                row=row, user_id=user_id, mkref_int=mkref_int, initials=row.initials,
            ))
    return errors, resolved
