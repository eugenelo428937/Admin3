from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_productbundle_productbundleproduct_and_more'),
    ]

    operations = [
        # Step 1: Drop existing bundle tables since this is a new project
        migrations.RunSQL(
            "DROP TABLE IF EXISTS acted_product_bundle_products CASCADE;",
            reverse_sql=migrations.RunSQL.noop
        ),
        migrations.RunSQL(
            "DROP TABLE IF EXISTS acted_product_bundles CASCADE;",
            reverse_sql=migrations.RunSQL.noop
        ),
        
        # Step 2: Create new ProductBundle table with ProductProductVariation relationship
        migrations.CreateModel(
            name='ProductBundle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bundle_name', models.CharField(help_text="Name of the bundle (e.g., 'CM1 Materials & Marking Bundle')", max_length=255)),
                ('bundle_description', models.TextField(blank=True, help_text='Description of what\'s included in the bundle', null=True)),
                ('is_featured', models.BooleanField(default=False, help_text='Whether to feature this bundle prominently')),
                ('is_active', models.BooleanField(default=True, help_text='Whether this bundle is currently available')),
                ('display_order', models.PositiveIntegerField(default=0, help_text='Order in which to display this bundle')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('subject', models.ForeignKey(help_text='Subject this bundle is for', on_delete=django.db.models.deletion.CASCADE, related_name='bundles', to='subjects.subject')),
            ],
            options={
                'verbose_name': 'Product Bundle',
                'verbose_name_plural': 'Product Bundles',
                'db_table': 'acted_product_bundles',
                'ordering': ['subject__code', 'display_order', 'bundle_name'],
            },
        ),
        
        # Step 3: Create new ProductBundleProduct table with ProductProductVariation FK
        migrations.CreateModel(
            name='ProductBundleProduct',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('default_price_type', models.CharField(choices=[('standard', 'Standard'), ('retaker', 'Retaker'), ('additional', 'Additional Copy')], default='standard', help_text='Default price type for this product when added via bundle', max_length=20)),
                ('quantity', models.PositiveIntegerField(default=1, help_text='Number of this product to add when bundle is selected')),
                ('sort_order', models.PositiveIntegerField(default=0, help_text='Display order of this product within the bundle')),
                ('is_active', models.BooleanField(default=True, help_text='Whether this product is currently active in the bundle')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('bundle', models.ForeignKey(help_text='The bundle this product belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='bundle_products', to='products.productbundle')),
                ('product_product_variation', models.ForeignKey(help_text='The specific product-variation combination included in the bundle', on_delete=django.db.models.deletion.CASCADE, to='products.productproductvariation')),
            ],
            options={
                'verbose_name': 'Bundle Product',
                'verbose_name_plural': 'Bundle Products',
                'db_table': 'acted_product_bundle_products',
                'ordering': ['sort_order', 'product_product_variation__product__shortname'],
            },
        ),
        
        # Step 4: Add unique constraint
        migrations.AlterUniqueTogether(
            name='productbundle',
            unique_together={('subject', 'bundle_name')},
        ),
        
        migrations.AlterUniqueTogether(
            name='productbundleproduct',
            unique_together={('bundle', 'product_product_variation')},
        ),
        
        # Step 5: Add many-to-many relationship
        migrations.AddField(
            model_name='productbundle',
            name='product_variations',
            field=models.ManyToManyField(help_text='Product variations included in this bundle', related_name='bundles', through='products.ProductBundleProduct', to='products.productproductvariation'),
        ),
    ] 