"""Backfill CartItem.purchasable_id from legacy FKs.

- product-backed rows: purchasable_id = product_id  (same PK under Variant A / MTI)
- voucher-backed rows: lookup via acted._voucher_migration_map (from Task 5)
- fee-only rows: point at the FEE_GENERIC Purchasable
"""
from django.db import migrations
from django.db.models import F

FEE_GENERIC_CODE = 'FEE_GENERIC'


def backfill(apps, schema_editor):
    CartItem = apps.get_model('cart', 'CartItem')
    Purchasable = apps.get_model('store', 'Purchasable')

    # Product-backed: direct column copy (Product.id == Purchasable.id post-MTI)
    CartItem.objects.filter(
        product_id__isnull=False,
        purchasable_id__isnull=True,
    ).update(purchasable_id=F('product_id'))

    # Voucher-backed: JOIN via acted._voucher_migration_map (Task 5)
    with schema_editor.connection.cursor() as cur:
        cur.execute('''
            UPDATE acted.cart_items ci
            SET    purchasable_id = m.purchasable_id
            FROM   acted._voucher_migration_map m
            WHERE  ci.marking_voucher_id = m.marking_voucher_id
              AND  ci.purchasable_id IS NULL
        ''')

    # Fee-only rows: point at FEE_GENERIC
    try:
        fee_generic = Purchasable.objects.get(code=FEE_GENERIC_CODE)
    except Purchasable.DoesNotExist:
        # Shouldn't happen — store.0009 creates this — but guard against ordering issues
        return
    CartItem.objects.filter(
        item_type='fee',
        purchasable_id__isnull=True,
    ).update(purchasable_id=fee_generic.id)


def reverse(apps, schema_editor):
    CartItem = apps.get_model('cart', 'CartItem')
    CartItem.objects.update(purchasable_id=None)


class Migration(migrations.Migration):
    dependencies = [
        ('cart', '0004_cart_item_add_purchasable_fk'),
        ('store', '0009_create_fee_generic_purchasable'),
    ]
    operations = [migrations.RunPython(backfill, reverse)]
