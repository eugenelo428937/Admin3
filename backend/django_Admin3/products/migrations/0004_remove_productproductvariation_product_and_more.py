# Manual migration for catalog consolidation (001-catalog-consolidation)
#
# Product models have been moved to catalog app.
# This migration updates Django's state WITHOUT deleting the database tables.
# Old tables are preserved per "Copy and Preserve" strategy:
#   - acted_products
#   - acted_product_variations
#   - acted_product_productvariation
#   - acted_product_productgroup
#   - acted_product_bundles
#   - acted_product_bundle_products
#
# IMPORTANT: FK updates in exam_sessions_subjects_products MUST complete before
# this migration runs, because AlterField needs the old models to exist in Django's state.

from django.db import migrations


class Migration(migrations.Migration):
    """State-only migration: Product models moved to catalog app."""

    dependencies = [
        ('products', '0003_update_fk_to_catalog'),
        ('catalog', '0002_create_models'),  # Ensure catalog models exist first
        # Note: essp.0001 now directly references catalog models, so this dependency is unnecessary
    ]

    operations = [
        # Use SeparateDatabaseAndState to update Django's state without touching DB
        # Order matters: remove FKs and constraints before deleting models
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # Remove fields from junction tables first
                migrations.RemoveField(
                    model_name='productproductvariation',
                    name='product',
                ),
                migrations.RemoveField(
                    model_name='productproductvariation',
                    name='product_variation',
                ),
                migrations.RemoveField(
                    model_name='productproductgroup',
                    name='product',
                ),
                migrations.RemoveField(
                    model_name='productproductgroup',
                    name='product_group',
                ),
                migrations.RemoveField(
                    model_name='productbundleproduct',
                    name='bundle',
                ),
                migrations.RemoveField(
                    model_name='productbundleproduct',
                    name='product_product_variation',
                ),
                migrations.RemoveField(
                    model_name='productbundle',
                    name='product_variations',
                ),
                migrations.RemoveField(
                    model_name='productbundle',
                    name='subject',
                ),
                # Remove unique_together constraints
                migrations.AlterUniqueTogether(
                    name='productvariation',
                    unique_together=None,
                ),
                migrations.AlterUniqueTogether(
                    name='productproductvariation',
                    unique_together=None,
                ),
                migrations.AlterUniqueTogether(
                    name='productproductgroup',
                    unique_together=None,
                ),
                migrations.AlterUniqueTogether(
                    name='productbundle',
                    unique_together=None,
                ),
                migrations.AlterUniqueTogether(
                    name='productbundleproduct',
                    unique_together=None,
                ),
                # Delete models (state only)
                migrations.DeleteModel(
                    name='ProductBundleProduct',
                ),
                migrations.DeleteModel(
                    name='ProductBundle',
                ),
                migrations.DeleteModel(
                    name='ProductProductGroup',
                ),
                migrations.DeleteModel(
                    name='ProductProductVariation',
                ),
                migrations.DeleteModel(
                    name='ProductVariation',
                ),
                migrations.DeleteModel(
                    name='Product',
                ),
            ],
            database_operations=[
                # No database operations - preserve the old tables
            ],
        ),
    ]
