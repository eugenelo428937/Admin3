# Task 22 (Release B): Flip CartItem.purchasable to NOT NULL.
#
# Pre-flight (dev DB, 2026-04-21): acted.cart_items has 0 rows, so the
# NOT NULL constraint applies cleanly. Check constraints referencing
# product/marking_voucher remain in place — they are dropped in Task 23.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cart", "0005_cart_item_backfill_purchasable"),
    ]

    operations = [
        migrations.AlterField(
            model_name="cartitem",
            name="purchasable",
            field=models.ForeignKey(
                help_text="The catalog entity being purchased. Non-null in Release B.",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="cart_items_by_purchasable",
                to="store.purchasable",
            ),
        ),
    ]
