# Generated manually for updating constraints to allow fee items

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cart', '0006_add_fee_item_type'),
    ]

    operations = [
        # Remove old constraints
        migrations.RemoveConstraint(
            model_name='cartitem',
            name='cart_item_has_product_or_voucher',
        ),
        migrations.RemoveConstraint(
            model_name='actedorderitem',
            name='order_item_has_product_or_voucher',
        ),

        # Add new constraints that allow fees
        migrations.AddConstraint(
            model_name='cartitem',
            constraint=models.CheckConstraint(
                check=(
                    models.Q(product__isnull=False) |
                    models.Q(marking_voucher__isnull=False) |
                    models.Q(item_type='fee')
                ),
                name='cart_item_has_product_or_voucher_or_is_fee'
            ),
        ),
        migrations.AddConstraint(
            model_name='actedorderitem',
            constraint=models.CheckConstraint(
                check=(
                    models.Q(product__isnull=False) |
                    models.Q(marking_voucher__isnull=False) |
                    models.Q(item_type='fee')
                ),
                name='order_item_has_product_or_voucher_or_is_fee'
            ),
        ),
    ]