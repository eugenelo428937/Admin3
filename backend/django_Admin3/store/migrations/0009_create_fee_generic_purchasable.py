"""Create the FEE_GENERIC Purchasable used for cart/order fee lines
that previously had item_type='fee' with no FK.
"""
from django.db import migrations

FEE_GENERIC_CODE = 'FEE_GENERIC'


def create_fee_generic(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')
    Purchasable.objects.get_or_create(
        code=FEE_GENERIC_CODE,
        defaults={
            'kind': 'additional_charge',
            'name': 'Generic Fee',
            'description': 'Catch-all purchasable for legacy fee lines. Amount comes from actual_price.',
            'is_active': True,
            'dynamic_pricing': True,
            'vat_classification': '',
        },
    )


def reverse(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')
    Purchasable.objects.filter(code=FEE_GENERIC_CODE).delete()


class Migration(migrations.Migration):
    dependencies = [('store', '0008_backfill_purchasable_from_vouchers')]
    operations = [migrations.RunPython(create_fee_generic, reverse)]
