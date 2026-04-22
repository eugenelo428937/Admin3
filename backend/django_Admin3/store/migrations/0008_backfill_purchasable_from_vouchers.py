"""Create Purchasable + GenericItem rows from existing MarkingVoucher rows.

Also backfills a Price row per voucher (standard, amount = MarkingVoucher.price)
and records a (MarkingVoucher.id -> Purchasable.id) mapping in a temp table so
Tasks 11-12 can repoint cart/order FKs from marking_voucher_id to
purchasable_id.
"""
from django.db import migrations


def backfill_purchasables_from_vouchers(apps, schema_editor):
    MarkingVoucher = apps.get_model('marking_vouchers', 'MarkingVoucher')
    GenericItem = apps.get_model('store', 'GenericItem')
    Price = apps.get_model('store', 'Price')

    # Create a temp mapping table for Tasks 11-12 to reference.
    with schema_editor.connection.cursor() as cur:
        cur.execute('''
            CREATE TABLE IF NOT EXISTS acted._voucher_migration_map (
                marking_voucher_id INT PRIMARY KEY,
                purchasable_id INT NOT NULL
            )
        ''')

    for mv in MarkingVoucher.objects.all().iterator(chunk_size=200):
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code=mv.code,
            name=mv.name,
            description=mv.description or '',
            is_active=mv.is_active,
            dynamic_pricing=False,
            vat_classification='',
            validity_period_days=1460,        # 4 years
            stock_tracked=False,
        )
        Price.objects.create(
            purchasable_id=gi.purchasable_ptr_id,
            price_type='standard',
            amount=mv.price,
            currency='GBP',
        )
        with schema_editor.connection.cursor() as cur:
            cur.execute(
                'INSERT INTO acted._voucher_migration_map VALUES (%s, %s)',
                [mv.id, gi.purchasable_ptr_id],
            )


def reverse(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')
    Purchasable.objects.filter(kind='marking_voucher').delete()
    with schema_editor.connection.cursor() as cur:
        cur.execute('DROP TABLE IF EXISTS acted._voucher_migration_map')


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0007_backfill_purchasable_from_products'),
        ('marking_vouchers', '0002_migrate_to_acted_schema'),
    ]
    operations = [
        migrations.RunPython(backfill_purchasables_from_vouchers, reverse),
    ]
