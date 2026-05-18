"""Phase 5 Task 3 (step 2): backfill MaterialProduct.product_product_variation_id
from the parent Product table via shared MTI PK.

Every MaterialProduct row shares its PK with a Product row (MTI
inheritance via product_ptr_id), and the parent Product currently has
product_product_variation_id set (it will be removed by migration 0024).
Single UPDATE...FROM bulk-copies the value.

Idempotent: re-running this migration produces no additional updates
(skips rows where the subclass column is already populated).
"""
from django.db import migrations


def backfill_materialproduct_ppv(apps, schema_editor):
    """Forward: copy PPV from parent Product to MaterialProduct subclass.

    Joins via MaterialProduct.product_ptr_id == Product.purchasable_ptr_id
    (Product's primary key column under MTI). MaterialProduct.product_ptr_id
    points at Product's PK; Product.purchasable_ptr_id is the same value
    (Product itself is an MTI subclass of Purchasable).
    """
    with schema_editor.connection.cursor() as cur:
        cur.execute(
            'UPDATE "acted"."material_products" mp '
            'SET product_product_variation_id = p.product_product_variation_id '
            'FROM "acted"."products" p '
            'WHERE mp.product_ptr_id = p.purchasable_ptr_id '
            '  AND mp.product_product_variation_id IS NULL'
        )
        print(f'  backfill_materialproduct_ppv: updated={cur.rowcount} rows')


def reverse_backfill(apps, schema_editor):
    """Reverse: NO-OP. Migration 0023's reverse re-allows null, and
    forward of 0022 again would simply re-populate. Don't try to
    selectively un-fill — we can't reliably distinguish backfilled
    rows from manually-set ones.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0021_add_materialproduct_ppv'),
    ]

    operations = [
        migrations.RunPython(
            backfill_materialproduct_ppv,
            reverse_code=reverse_backfill,
        ),
    ]
