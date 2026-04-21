"""For every historical OrderItem whose purchasable.kind='marking_voucher',
create `quantity` IssuedVoucher rows, dated from the order's created_at.

Idempotent: skips OrderItems that already have at least one IssuedVoucher.
Codes follow the same format as IssuedVoucherService.issue() — MV-YYYYMM-<8 base32>.
"""
import base64
import secrets
from datetime import timedelta

from django.db import migrations
from django.utils import timezone


DEFAULT_VALIDITY_DAYS = 1460  # 4 years fallback


def backfill(apps, schema_editor):
    OrderItem = apps.get_model('orders', 'OrderItem')
    IssuedVoucher = apps.get_model('marking_vouchers', 'IssuedVoucher')
    GenericItem = apps.get_model('store', 'GenericItem')
    # Use the real Order model for created_at access since OrderItem in
    # migration state may not expose the `order` FK (managed=False).
    Order = apps.get_model('orders', 'Order')

    qs = OrderItem.objects.select_related('purchasable').filter(
        purchasable__kind='marking_voucher'
    )
    for oi in qs.iterator(chunk_size=200):
        # Idempotent: skip OrderItems that already have issued vouchers.
        if IssuedVoucher.objects.filter(order_item_id=oi.id).exists():
            continue

        # Resolve validity from the GenericItem subclass if possible.
        try:
            gi = GenericItem.objects.get(purchasable_ptr_id=oi.purchasable_id)
            validity = gi.validity_period_days or DEFAULT_VALIDITY_DAYS
        except GenericItem.DoesNotExist:
            validity = DEFAULT_VALIDITY_DAYS

        # Use the order's creation timestamp as issue date.
        order_id = getattr(oi, 'order_id', None)
        order_created_at = None
        if order_id is not None:
            try:
                order_created_at = Order.objects.only('created_at').get(
                    pk=order_id
                ).created_at
            except Order.DoesNotExist:
                order_created_at = None
        issued_at = order_created_at or timezone.now()
        expires_at = issued_at + timedelta(days=validity)
        is_expired = expires_at < timezone.now()

        rows = []
        for _ in range(oi.quantity):
            random = base64.b32encode(
                secrets.token_bytes(5)
            ).decode('ascii').rstrip('=')
            code = f"MV-{issued_at.strftime('%Y%m')}-{random}"
            rows.append(IssuedVoucher(
                voucher_code=code,
                order_item_id=oi.id,
                purchasable_id=oi.purchasable_id,
                issued_at=issued_at,
                expires_at=expires_at,
                status='expired' if is_expired else 'active',
            ))
        if rows:
            IssuedVoucher.objects.bulk_create(rows, batch_size=500)


def reverse(apps, schema_editor):
    """Delete all IssuedVoucher rows created by this migration.

    Destructive but sound as reverse: the only IssuedVouchers that
    existed before this migration ran were zero (Task 13 just created
    the table). So reversing this migration and Task 13 together
    returns the DB to the pre-voucher-tracking state.
    """
    IssuedVoucher = apps.get_model('marking_vouchers', 'IssuedVoucher')
    IssuedVoucher.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('orders', '0004_order_item_backfill_purchasable'),
        ('marking_vouchers', '0003_create_issued_voucher'),
    ]
    operations = [migrations.RunPython(backfill, reverse)]
