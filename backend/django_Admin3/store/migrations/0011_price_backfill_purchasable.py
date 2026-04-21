"""Backfill Price.purchasable_id = Price.product_id.

Under the Variant A MTI conversion (Task 7), Product.id == Purchasable.id,
so this is a direct column copy. Only affects rows where product_id is set
and purchasable_id is not (i.e. rows that predate Task 5's voucher backfill,
which already set purchasable_id directly).
"""
from django.db import migrations
from django.db.models import F


def backfill(apps, schema_editor):
    Price = apps.get_model('store', 'Price')
    Price.objects.filter(
        product_id__isnull=False,
        purchasable_id__isnull=True,
    ).update(purchasable_id=F('product_id'))


def reverse(apps, schema_editor):
    Price = apps.get_model('store', 'Price')
    # Only reset rows that have both — the voucher-backfill rows (Task 5) also
    # have purchasable_id set but their product_id is NULL; leave those alone.
    Price.objects.filter(
        product_id__isnull=False,
        purchasable_id__isnull=False,
    ).update(purchasable_id=None)


class Migration(migrations.Migration):
    dependencies = [('store', '0010_product_to_mti_subclass')]
    operations = [migrations.RunPython(backfill, reverse)]
