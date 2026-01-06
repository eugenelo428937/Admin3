# Generated manually for catalog consolidation (001-catalog-consolidation)
#
# This migration updates ProductVariationRecommendation FK references
# to point to the new catalog.ProductProductVariation model.
#
# NOTE: Old models (Product, ProductVariation, etc.) are preserved in the database
# but are now defined in the catalog app. The products app re-exports them for
# backward compatibility.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """Update ProductVariationRecommendation FKs to point to catalog models."""

    dependencies = [
        ("catalog", "0003_copy_data"),
        ("products", "0002_add_product_variation_recommendations"),
    ]

    operations = [
        # Update FK to point to catalog.ProductProductVariation
        migrations.AlterField(
            model_name="productvariationrecommendation",
            name="recommended_product_product_variation",
            field=models.ForeignKey(
                help_text="Recommended complementary product-variation combination",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="recommended_by",
                to="catalog.productproductvariation",
            ),
        ),
        migrations.AlterField(
            model_name="productvariationrecommendation",
            name="product_product_variation",
            field=models.OneToOneField(
                help_text="Source product-variation combination that makes the recommendation",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="recommendation",
                to="catalog.productproductvariation",
            ),
        ),
    ]
