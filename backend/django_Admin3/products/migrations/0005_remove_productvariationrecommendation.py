"""Remove ProductVariationRecommendation from products app state.

Model has been moved to catalog app. This migration only updates Django's
state - the database table was already moved by catalog migration 0007.
"""
from django.db import migrations


class Migration(migrations.Migration):
    """Remove ProductVariationRecommendation from products app state."""

    dependencies = [
        ("products", "0004_remove_productproductvariation_product_and_more"),
        ("catalog", "0007_add_product_variation_recommendation"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.DeleteModel(
                    name='ProductVariationRecommendation',
                ),
            ],
            database_operations=[],
        ),
    ]
