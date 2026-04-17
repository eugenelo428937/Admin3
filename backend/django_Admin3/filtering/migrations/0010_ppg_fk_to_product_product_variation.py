"""Change ProductProductGroup FK from catalog.Product to catalog.ProductProductVariation.

Each existing ProductProductGroup row links a catalog.Product to a FilterGroup.
This migration fans out those rows so that every ProductProductVariation (PPV)
derived from that Product inherits the same group assignments.

Steps:
  1. Add nullable product_product_variation FK column
  2. Populate: for each (product, group) row, create rows for all PPVs of that product
  3. Remove orphan rows (products with no PPVs)
  4. Make the FK non-nullable
  5. Drop old unique constraint (raw SQL — constraint name from pre-rename era)
  6. Add new unique constraint
  7. Remove old product FK column
"""
from django.db import migrations, models
import django.db.models.deletion


def populate_ppv_fk(apps, schema_editor):
    """Fan out product->group rows into PPV->group rows."""
    ProductProductGroup = apps.get_model('filtering', 'ProductProductGroup')
    ProductProductVariation = apps.get_model('catalog_products', 'ProductProductVariation')

    existing_rows = list(
        ProductProductGroup.objects.values_list('id', 'product_id', 'product_group_id')
    )

    for row_id, product_id, group_id in existing_rows:
        ppv_list = list(ProductProductVariation.objects.filter(product_id=product_id))

        if not ppv_list:
            ProductProductGroup.objects.filter(id=row_id).delete()
            continue

        # Assign first PPV to the existing row
        ProductProductGroup.objects.filter(id=row_id).update(
            product_product_variation_id=ppv_list[0].id
        )

        # Create new rows for remaining PPVs (skip duplicates)
        for ppv in ppv_list[1:]:
            if not ProductProductGroup.objects.filter(
                product_product_variation_id=ppv.id, product_group_id=group_id
            ).exists():
                ProductProductGroup.objects.create(
                    product_id=product_id,
                    product_product_variation_id=ppv.id,
                    product_group_id=group_id,
                )


def reverse_ppv_fk(apps, schema_editor):
    """Reverse: collapse PPV->group rows back to product->group rows."""
    ProductProductGroup = apps.get_model('filtering', 'ProductProductGroup')

    seen = set()
    for ppg in ProductProductGroup.objects.select_related('product_product_variation'):
        product_id = ppg.product_product_variation.product_id
        key = (product_id, ppg.product_group_id)
        if key in seen:
            ppg.delete()
        else:
            seen.add(key)
            ProductProductGroup.objects.filter(id=ppg.id).update(product_id=product_id)


class Migration(migrations.Migration):

    dependencies = [
        ('filtering', '0009_remove_productgroupfilter_rename_productproductgroup_table'),
        ('catalog_products', '0002_initial'),
    ]

    operations = [
        # 1. Add nullable FK to ProductProductVariation
        migrations.AddField(
            model_name='productproductgroup',
            name='product_product_variation',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='product_groups',
                to='catalog_products.productproductvariation',
                help_text='The product-variation combination being categorized',
            ),
        ),

        # 2. Populate the new FK
        migrations.RunPython(populate_ppv_fk, reverse_ppv_fk),

        # 3. Make FK non-nullable
        migrations.AlterField(
            model_name='productproductgroup',
            name='product_product_variation',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='product_groups',
                to='catalog_products.productproductvariation',
                help_text='The product-variation combination being categorized',
            ),
        ),

        # 4. Swap unique constraint: drop old, add new (DB + state separated)
        migrations.SeparateDatabaseAndState(
            database_operations=[
                # Drop old constraint (name from before table rename in 0009)
                migrations.RunSQL(
                    sql='ALTER TABLE "acted"."filter_product_product_groups" '
                        'DROP CONSTRAINT IF EXISTS '
                        '"catalog_product_product__product_id_product_group_b3d47e39_uniq";',
                    reverse_sql='ALTER TABLE "acted"."filter_product_product_groups" '
                                'ADD CONSTRAINT '
                                '"catalog_product_product__product_id_product_group_b3d47e39_uniq" '
                                'UNIQUE (product_id, product_group_id);',
                ),
            ],
            state_operations=[
                # Tell Django the old unique_together is gone
                migrations.AlterUniqueTogether(
                    name='productproductgroup',
                    unique_together=set(),
                ),
            ],
        ),

        # 5. Add new unique constraint (standard Django operation)
        migrations.AlterUniqueTogether(
            name='productproductgroup',
            unique_together={('product_product_variation', 'product_group')},
        ),

        # 6. Remove old product FK
        migrations.RemoveField(
            model_name='productproductgroup',
            name='product',
        ),
    ]
