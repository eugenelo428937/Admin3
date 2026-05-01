"""marks26.csv parsing — produces typed row objects."""
import csv
from dataclasses import dataclass
from typing import IO, List

from .date_parsing import EMPTY_DATE_MARKER


VOUCHER_ASSIGN_PREFIX = '*/MV/'


@dataclass
class Marks26Row:
    row_num: int
    ref: str
    subject: str
    assign: str
    abbrev: str
    sequence: str
    datelogged: str
    dateout: str
    score: str
    grade: str
    marker: str
    rating: str
    voucher: str
    order: str
    realdatein: str
    expiry: str
    staffalloc: str
    hubdownld: str
    hubout: str
    hubfeedbk: str
    comments: str

    def is_voucher_row(self) -> bool:
        return self.assign.startswith(VOUCHER_ASSIGN_PREFIX)

    def is_voucher_row_redeemed(self) -> bool:
        return self.is_voucher_row() and self.has_valid_datelogged()

    def has_valid_datelogged(self) -> bool:
        return self.datelogged.strip() not in ('', EMPTY_DATE_MARKER)

    def has_valid_dateout(self) -> bool:
        return self.dateout.strip() not in ('', EMPTY_DATE_MARKER)

    def has_valid_hubfeedbk(self) -> bool:
        return self.hubfeedbk.strip() not in ('', EMPTY_DATE_MARKER)

    def sequence_int(self) -> int:
        """Parse the CSV sequence column as int (raises ValueError if non-numeric)."""
        return int(self.sequence)


def parse_marks26_csv(file_obj: IO) -> List[Marks26Row]:
    reader = csv.DictReader(file_obj)
    rows: List[Marks26Row] = []
    for index, raw in enumerate(reader, start=2):
        if not any((v or '').strip() for v in raw.values()):
            continue
        rows.append(Marks26Row(
            row_num=index,
            ref=(raw.get('ref') or '').strip(),
            subject=(raw.get('subject') or '').strip(),
            assign=(raw.get('assign') or '').strip(),
            abbrev=(raw.get('abbrev') or '').strip(),
            sequence=(raw.get('sequence') or '').strip(),
            datelogged=raw.get('datelogged') or '',
            dateout=raw.get('dateout') or '',
            score=(raw.get('score') or '').strip(),
            grade=(raw.get('grade') or '').strip(),
            marker=(raw.get('marker') or '').strip(),
            rating=(raw.get('rating') or '').strip(),
            voucher=(raw.get('voucher') or '').strip(),
            order=(raw.get('order') or '').strip(),
            realdatein=raw.get('realdatein') or '',
            expiry=(raw.get('expiry') or '').strip(),
            staffalloc=(raw.get('staffalloc') or '').strip(),
            hubdownld=raw.get('hubdownld') or '',
            hubout=raw.get('hubout') or '',
            hubfeedbk=raw.get('hubfeedbk') or '',
            comments=(raw.get('comments') or '').strip(),
        ))
    return rows
