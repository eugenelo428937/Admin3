"""CSV error report writers for marking imports."""
import csv
from typing import IO, List

from .markers import MarkerError


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
