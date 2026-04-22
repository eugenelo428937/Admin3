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
        # marking.MarkingPaperSubmission.marking_voucher FK was retargeted from
        # MarkingVoucher to store.GenericItem by marking.0009 — must run before
        # we drop the table here, or the FK constraint blocks the DROP.
        ("marking", "0009_switch_marking_voucher_to_generic_item"),
        # orders.0003_alter_orderitem_options (from main) registered
        # orders.OrderItem.marking_voucher as a lazy ref to MarkingVoucher.
        # orders.0008 removes that state entry — must run before this
        # migration deletes the MarkingVoucher model, otherwise any RunPython
        # in between trips StateApps validation on the dangling lazy ref.
        ("orders", "0008_drop_order_item_legacy_fks"),
    ]

    operations = [
        migrations.DeleteModel(
            name="MarkingVoucher",
        ),
    ]
