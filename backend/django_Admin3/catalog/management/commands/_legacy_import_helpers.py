"""Shared helpers for legacy product CSV import commands.

Every function in this module is pure: no DB access, no filesystem writes.
This makes them trivially unit-testable and safe to reuse across the three
staged management commands (profile, import_legacy_templates,
import_legacy_store_products).
"""
import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, List, Optional


@dataclass(frozen=True)
class LegacyRow:
    """One row from a legacy product CSV.

    source_file and source_line are tracked so invalid rows can be reported
    back to the exact origin for human review.
    """
    source_file: str
    source_line: int
    subject: str
    col2: str
    col3: str
    session: str
    full_code: str
    raw_fullname: str
    raw_shortname: str


def iter_legacy_csv_rows(paths: Iterable[Path]) -> Iterator[LegacyRow]:
    """Stream rows from one or more legacy CSVs.

    The legacy CSVs have no header, use cp1252 encoding (legacy Windows
    export), and have 7 columns. Rows with fewer than 7 columns are skipped.
    """
    for path in paths:
        path = Path(path)
        with open(path, 'r', encoding='cp1252', newline='') as fh:
            reader = csv.reader(fh)
            for line_num, raw_row in enumerate(reader, start=1):
                if len(raw_row) < 7:
                    continue
                fields = [c.strip() for c in raw_row[:7]]
                yield LegacyRow(
                    source_file=path.name,
                    source_line=line_num,
                    subject=fields[0],
                    col2=fields[1],
                    col3=fields[2],
                    session=fields[3],
                    full_code=fields[4],
                    raw_fullname=fields[5],
                    raw_shortname=fields[6],
                )
