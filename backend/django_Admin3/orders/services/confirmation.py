"""Order confirmation service.

When an order transitions from in-progress to confirmed (e.g. payment
success), this service runs all side-effects that need to happen:
- Issue marking vouchers for voucher line items
- (Future: email confirmation, fulfilment hooks, etc.)

Called from the checkout/payment-callback code paths.
"""
from django.db import transaction

from marking_vouchers.services.voucher_service import IssuedVoucherService


@transaction.atomic
def confirm_order(order):
    """Run all side-effects for a newly-confirmed order.

    Idempotent: calling more than once on the same order does not
    duplicate side-effects (e.g. re-confirming will not re-issue
    vouchers that already exist for an OrderItem).
    """
    _issue_vouchers_for_order(order)
    # Add other confirmation side-effects here in future tasks.


def _issue_vouchers_for_order(order):
    """Create IssuedVoucher rows for every voucher-kind OrderItem.

    Skips OrderItems that already have issued vouchers (idempotency).
    """
    voucher_items = (
        order.items
        .select_related('purchasable')
        .filter(purchasable__kind='marking_voucher')
    )
    for item in voucher_items:
        if item.issued_vouchers.exists():
            continue
        IssuedVoucherService.issue(item)
