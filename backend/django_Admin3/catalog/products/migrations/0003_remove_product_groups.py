"""Remove groups M2M from catalog.Product.

State-only migration — the through table (filter_product_product_groups)
is managed by the filtering app. This just removes Django's awareness of
the M2M accessor on Product, since the through table FK now points to
ProductProductVariation instead.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('catalog_products', '0002_initial'),
        ('filtering', '0010_ppg_fk_to_product_product_variation'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='product',
            name='groups',
        ),
    ]
