"""Backfill OrderItem.purchasable_id from legacy FKs.

Mirror of cart.0005_cart_item_backfill_purchasable applied to OrderItem.

- product-backed rows: purchasable_id = product_id  (same PK under MTI Variant A)
- voucher-backed rows: lookup via acted._voucher_migration_map (from Task 5)
- fee-only rows: point at the FEE_GENERIC Purchasable

NOTE: OrderItem is declared with managed=False and its migration state does
NOT include `product` / `marking_voucher` FK fields (they live only as raw
DB columns in acted.order_items). So every UPDATE here is executed as raw
SQL — we cannot go through the ORM with F('product_id') like cart.0005 did.
"""
from django.db import migrations

FEE_GENERIC_CODE = 'FEE_GENERIC'


def backfill(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')

    with schema_editor.connection.cursor() as cur:
        # Product-backed: direct column copy (Product.id == Purchasable.id post-MTI)
        cur.execute('''
            UPDATE acted.order_items
            SET    purchasable_id = product_id
            WHERE  product_id IS NOT NULL
              AND  purchasable_id IS NULL
        ''')

        # Voucher-backed: JOIN via acted._voucher_migration_map
        cur.execute('''
            UPDATE acted.order_items oi
            SET    purchasable_id = m.purchasable_id
            FROM   acted._voucher_migration_map m
            WHERE  oi.marking_voucher_id = m.marking_voucher_id
              AND  oi.purchasable_id IS NULL
        ''')

    # Fee-only rows
    try:
        fee_generic = Purchasable.objects.get(code=FEE_GENERIC_CODE)
    except Purchasable.DoesNotExist:
        return
    with schema_editor.connection.cursor() as cur:
        cur.execute('''
            UPDATE acted.order_items
            SET    purchasable_id = %s
            WHERE  item_type = 'fee'
              AND  purchasable_id IS NULL
        ''', [fee_generic.id])


def reverse(apps, schema_editor):
    with schema_editor.connection.cursor() as cur:
        cur.execute('UPDATE acted.order_items SET purchasable_id = NULL')


class Migration(migrations.Migration):
    dependencies = [
        ('orders', '0004_order_item_add_purchasable_fk'),
        ('store', '0009_create_fee_generic_purchasable'),
    ]
    operations = [migrations.RunPython(backfill, reverse)]
