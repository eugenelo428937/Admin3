# Task 22 (Release B): Flip OrderItem.purchasable to NOT NULL.
#
# OrderItem.Meta.managed = False so makemigrations does not emit anything
# for this model — we hand-write the DDL and pair it with
# state_operations that mirror the change in Django's model state, same
# pattern as 0003_order_item_add_purchasable_fk.
#
# Pre-flight (dev DB, 2026-04-21): acted.order_items has 0 rows, so the
# NOT NULL constraint applies cleanly. The existing check constraints
# (product/marking_voucher/purchasable/fee) remain intact — they are
# relaxed/dropped in Task 23.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0006_order_item_backfill_issued_vouchers"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=[
                        'ALTER TABLE "acted"."order_items" '
                        'ALTER COLUMN "purchasable_id" SET NOT NULL;',
                    ],
                    reverse_sql=[
                        'ALTER TABLE "acted"."order_items" '
                        'ALTER COLUMN "purchasable_id" DROP NOT NULL;',
                    ],
                ),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name="orderitem",
                    name="purchasable",
                    field=models.ForeignKey(
                        help_text=(
                            "The catalog entity being purchased. "
                            "Non-null in Release B."
                        ),
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="order_items_by_purchasable",
                        to="store.purchasable",
                    ),
                ),
            ],
        ),
    ]
