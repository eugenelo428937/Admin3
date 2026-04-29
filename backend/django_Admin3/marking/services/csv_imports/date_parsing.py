"""Date parsing helpers for legacy marking CSVs.

CSV dates use the DD/MM/YYYY format. Empty markers like '/  /' are
treated as None. Parsed datetimes are midnight Europe/London (per spec).
"""
from datetime import datetime
from zoneinfo import ZoneInfo


UK = ZoneInfo('Europe/London')
EMPTY_DATE_MARKER = '/  /'


def parse_date(value):
    """Parse DD/MM/YYYY to midnight Europe/London datetime, or None."""
    if value is None:
        return None
    stripped = value.strip()
    if stripped in ('', EMPTY_DATE_MARKER):
        return None
    naive = datetime.strptime(stripped, '%d/%m/%Y')
    return naive.replace(tzinfo=UK)
