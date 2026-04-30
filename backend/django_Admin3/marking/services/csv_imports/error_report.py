"""CSV error report writers for marking imports."""
import csv
from typing import IO, List

from .markers import MarkerError
from .marks26_validators import Marks26Error


def write_markers_errors_csv(errors: List[MarkerError], file_obj: IO) -> None:
    writer = csv.writer(file_obj)
    writer.writerow(['row_num', 'mkref', 'firstname', 'lastname', 'initials', 'error_message'])
    for err in errors:
        writer.writerow([
            err.row.row_num,
            err.row.mkref,
            err.row.firstname,
            err.row.lastname,
            err.row.initials,
            err.error_message,
        ])


def write_marks26_errors_csv(errors: List[Marks26Error], file_obj: IO) -> None:
    writer = csv.writer(file_obj)
    writer.writerow([
        'row_num', 'ref', 'subject', 'assign', 'abbrev', 'sequence',
        'error_field', 'error_message',
    ])
    for err in errors:
        writer.writerow([
            err.row.row_num,
            err.row.ref,
            err.row.subject,
            err.row.assign,
            err.row.abbrev,
            err.row.sequence,
            err.error_field,
            err.error_message,
        ])
