"""Idempotent ensure-row migration for FEE_GENERIC Purchasable.

The original 0009_create_fee_generic_purchasable.py used get_or_create
with a delete-on-reverse. Some environments ended up missing the row
(reversed migration, fresh DB without re-applying, etc.), which made
OrderBuilder._transfer_fees fail with a NOT NULL violation on
order_items.purchasable_id. This migration is idempotent and
intentionally non-destructive on reverse — historical OrderItem rows
PROTECT-FK this row.
"""
from django.db import migrations

FEE_GENERIC_CODE = 'FEE_GENERIC'


def ensure_fee_generic(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')
    Purchasable.objects.update_or_create(
        code=FEE_GENERIC_CODE,
        defaults={
            'kind': 'additional_charge',
            'name': 'Generic Fee',
            'description': (
                'Catch-all purchasable for fee lines. Amount comes '
                'from actual_price.'
            ),
            'is_active': True,
            'dynamic_pricing': True,
            'vat_classification': '',
        },
    )


def reverse(apps, schema_editor):
    """No-op: never auto-delete this row. OrderItem.purchasable is
    PROTECT, so deletion would fail mid-reverse on any DB with
    historical fee rows."""
    pass


class Migration(migrations.Migration):
    dependencies = [('store', '0014_add_is_addon_and_drop_product_unique')]
    operations = [migrations.RunPython(ensure_fee_generic, reverse)]
