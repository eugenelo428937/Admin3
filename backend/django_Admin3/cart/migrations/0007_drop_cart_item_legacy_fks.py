# Task 23 (Release B): drop legacy product / marking_voucher / item_type
# columns from acted.cart_items.
#
# All CartItem rows now reach the catalog via `purchasable_id` (NOT NULL
# since Task 22). The legacy columns plus their associated check
# constraints are removed here. Also updates help_text on `purchasable`
# now that it is the sole catalog FK (no longer "Non-null in Release B").

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cart", "0006_cart_item_purchasable_not_null"),
        ("store", "0013_drop_price_product_fk"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="cartitem",
            name="cart_item_has_product_or_voucher_or_is_fee",
        ),
        migrations.RemoveConstraint(
            model_name="cartitem",
            name="cart_item_not_both_product_and_voucher",
        ),
        migrations.RemoveField(
            model_name="cartitem",
            name="product",
        ),
        migrations.RemoveField(
            model_name="cartitem",
            name="marking_voucher",
        ),
        migrations.RemoveField(
            model_name="cartitem",
            name="item_type",
        ),
        migrations.AlterField(
            model_name="cartitem",
            name="purchasable",
            field=models.ForeignKey(
                help_text="The catalog entity being purchased.",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="cart_items_by_purchasable",
                to="store.purchasable",
            ),
        ),
    ]
