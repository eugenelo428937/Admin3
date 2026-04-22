"""Drop the acted.marking_vouchers table (Release B Task 24).

All catalog data migrated to store.GenericItem with kind='marking_voucher'
in Task 5 (store.0008_backfill_purchasable_from_vouchers). Every cart/order
item that referenced marking_voucher_id was repointed to purchasable_id in
Tasks 11-12. The column and FK were dropped in Task 23.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("marking_vouchers", "0003_create_issued_voucher"),
    ]

    operations = [
        migrations.DeleteModel(
            name="MarkingVoucher",
        ),
    ]
