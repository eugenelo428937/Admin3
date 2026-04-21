"""IssuedVoucherService — issuance, expiry, cancellation of marking vouchers."""
import base64
import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from marking_vouchers.models import IssuedVoucher


class IssuedVoucherService:
    """Lifecycle operations for marking vouchers.

    `issue()` creates one IssuedVoucher per unit of OrderItem.quantity.
    Called from the order-confirmation hook (Task 17). The historical
    backfill in Task 16 also uses it.
    """

    CODE_PREFIX = 'MV'
    CODE_RANDOM_BYTES = 5         # 5 bytes -> 8 base32 chars
    DEFAULT_VALIDITY_DAYS = 1460  # 4 years fallback if catalog row is missing

    @classmethod
    def issue(cls, order_item):
        """Create one IssuedVoucher per unit of order_item.quantity.

        Returns the list of created IssuedVoucher rows.

        Raises ValueError if the order_item's purchasable is not a marking_voucher.
        """
        purchasable = order_item.purchasable
        if purchasable is None or purchasable.kind != 'marking_voucher':
            raise ValueError(
                f'Cannot issue vouchers for purchasable kind={getattr(purchasable, "kind", None)}'
            )

        # Resolve validity from the GenericItem subclass if available.
        generic = getattr(purchasable, 'genericitem', None)
        validity_days = (
            generic.validity_period_days
            if generic and generic.validity_period_days
            else cls.DEFAULT_VALIDITY_DAYS
        )

        now = timezone.now()
        expires_at = now + timedelta(days=validity_days)

        created = []
        with transaction.atomic():
            for _ in range(order_item.quantity):
                code = cls._generate_code(now)
                v = IssuedVoucher.objects.create(
                    voucher_code=code,
                    order_item=order_item,
                    purchasable=purchasable,
                    expires_at=expires_at,
                    status='active',
                )
                created.append(v)
        return created

    @classmethod
    def _generate_code(cls, now):
        """Format: MV-<yyyymm>-<8 base32 chars>. Collision probability: 1 in 2^40."""
        yyyymm = now.strftime('%Y%m')
        random = base64.b32encode(
            secrets.token_bytes(cls.CODE_RANDOM_BYTES)
        ).decode('ascii').rstrip('=')
        return f"{cls.CODE_PREFIX}-{yyyymm}-{random}"
