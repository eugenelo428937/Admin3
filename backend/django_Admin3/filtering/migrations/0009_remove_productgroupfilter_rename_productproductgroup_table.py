"""
Remove deprecated ProductGroupFilter model and rename ProductProductGroup table.

1. Drops 'acted.product_group_filter' and 'acted.product_group_filter_groups' tables
   (both empty, replaced by FilterConfiguration + FilterConfigurationGroup).
2. Renames 'acted.catalog_product_product_groups' to 'acted.filter_product_product_groups'
   to reflect that this junction table belongs to the filtering app, not catalog.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("filtering", "0008_fix_filter_key_values"),
    ]

    operations = [
        # 1. Delete the deprecated ProductGroupFilter model
        #    This removes both the model table and its M2M through table:
        #    - acted.product_group_filter
        #    - acted.product_group_filter_groups
        migrations.DeleteModel(
            name="ProductGroupFilter",
        ),

        # 2. Rename the junction table from catalog namespace to filtering namespace.
        #    Uses SeparateDatabaseAndState because Django's AlterModelTable
        #    generates invalid SQL for schema-qualified PostgreSQL names
        #    (RENAME TO doesn't accept schema prefix).
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterModelTable(
                    name="ProductProductGroup",
                    table='"acted"."filter_product_product_groups"',
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql='ALTER TABLE "acted"."catalog_product_product_groups" RENAME TO "filter_product_product_groups";',
                    reverse_sql='ALTER TABLE "acted"."filter_product_product_groups" RENAME TO "catalog_product_product_groups";',
                ),
            ],
        ),
    ]
