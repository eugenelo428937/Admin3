from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        # set this to your last migration
        ('products', '0007_productmaincategory_order_sequence'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE acted_product_subcategory RENAME COLUMN product_type_id TO product_category_id;",
            reverse_sql="ALTER TABLE acted_product_subcategory RENAME COLUMN product_category_id TO product_type_id;",
        ),
    ]
