"""Sequential import steps a-d for marks26.

Each step iterates the parsed rows in input order. Per-row state is
tracked in dicts keyed by row_num so subsequent steps can resolve their
FK targets.

This module assumes:
  - Pre-flight + row validation already passed.
  - Caller wraps run_import_steps in transaction.atomic().
"""
from typing import Dict, List

from .date_parsing import parse_date
from .marks26_lookups import Marks26Lookups
from .marks26_parsing import Marks26Row

from marking.models import (
    MarkingPaperFeedback,
    MarkingPaperGrading,
    MarkingPaperSubmission,
)
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher


def run_import_steps(rows: List[Marks26Row], lookups: Marks26Lookups) -> Dict[str, int]:
    """Execute steps a–d. Return counts dict for caller to log."""
    iv_by_voucher_code: Dict[str, IssuedVoucher] = {}
    rv_by_row_num: Dict[int, RedeemedVoucher] = {}
    submission_by_row_num: Dict[int, MarkingPaperSubmission] = {}
    grading_by_row_num: Dict[int, MarkingPaperGrading] = {}

    counts = {'iv': 0, 'rv': 0, 'sub': 0, 'grading': 0, 'feedback': 0}

    # --- Step a: IssuedVouchers ---
    for row in rows:
        if not row.is_voucher_row():
            continue
        oi = lookups.order_items[(row.order, 'MV')]
        iv = IssuedVoucher.objects.create(
            voucher_code=row.voucher,
            order_item=oi,
            purchasable=lookups.mv_purchasable,
            expires_at=parse_date(row.expiry),
            status='active',
        )
        # Override auto_now_add issued_at with the order's purchase date.
        IssuedVoucher.objects.filter(pk=iv.pk).update(issued_at=oi.order.order_date)
        iv.refresh_from_db()
        iv_by_voucher_code[row.voucher] = iv
        counts['iv'] += 1

    # --- Step a (continued): RedeemedVouchers + cascade IV update ---
    for row in rows:
        if not row.is_voucher_row_redeemed():
            continue
        iv = iv_by_voucher_code[row.voucher]
        paper = lookups.papers[(row.subject, row.abbrev, row.sequence_int())]
        redeemed_at = parse_date(row.datelogged)
        rv = RedeemedVoucher.objects.create(
            issued_voucher=iv,
            marking_paper=paper,
            redeemed_at=redeemed_at,
        )
        iv.status = 'redeemed'
        iv.redeemed_at = redeemed_at
        iv.save(update_fields=['status', 'redeemed_at'])
        rv_by_row_num[row.row_num] = rv
        counts['rv'] += 1

    # --- Step b: Submissions ---
    for row in rows:
        if not row.has_valid_datelogged():
            continue
        student = lookups.students[int(row.ref)]
        paper = lookups.papers[(row.subject, row.abbrev, row.sequence_int())]
        if row.is_voucher_row():
            order_item = lookups.order_items[(row.order, 'MV')]
        else:
            order_item = lookups.order_items[(row.order, row.assign)]
        rv = rv_by_row_num.get(row.row_num)
        sub = MarkingPaperSubmission.objects.create(
            student=student,
            marking_paper=paper,
            redeemed_voucher=rv,
            order_item=order_item,
            submission_date=parse_date(row.realdatein),
            hub_download_date=parse_date(row.hubdownld),
        )
        submission_by_row_num[row.row_num] = sub
        counts['sub'] += 1

    # --- Step c: Gradings ---
    for row in rows:
        if not row.has_valid_dateout():
            continue
        sub = submission_by_row_num[row.row_num]
        grading = MarkingPaperGrading.objects.create(
            submission=sub,
            marker=lookups.markers[row.marker],
            allocate_date=parse_date(row.dateout),
            allocate_by=lookups.staff[row.staffalloc],
            graded_date=parse_date(row.hubout),
            hub_upload_date=parse_date(row.hubout),
            score=int(row.score) if row.score else None,
            grade=row.grade if row.grade else None,
        )
        grading_by_row_num[row.row_num] = grading
        counts['grading'] += 1

    # --- Step d: Feedbacks ---
    for row in rows:
        if not row.has_valid_hubfeedbk():
            continue
        grading = grading_by_row_num[row.row_num]
        MarkingPaperFeedback.objects.create(
            grading=grading,
            rating=row.rating if row.rating else None,
            comments=row.comments or '',
            feedback_date=parse_date(row.hubfeedbk),
        )
        counts['feedback'] += 1

    return counts
