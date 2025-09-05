"""
Test-only migration that creates essential product tables without conflicts.

This migration creates the minimum viable schema for TDD tests to run,
avoiding the complex migration conflicts in the main migrations.
"""

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('contenttypes', '0001_initial'),
    ]

    operations = [
        # Essential product tables
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fullname', models.CharField(max_length=255)),
                ('code', models.CharField(max_length=100, unique=True)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Product',
                'verbose_name_plural': 'Products',
                'db_table': 'acted_products',
                'ordering': ['fullname'],
            },
        ),
        
        migrations.CreateModel(
            name='ProductVariation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=100)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True, null=True)),
                ('description_short', models.CharField(blank=True, max_length=100, null=True)),
                ('active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Product Variation',
                'verbose_name_plural': 'Product Variations',
                'db_table': 'acted_product_variations',
                'ordering': ['code'],
            },
        ),

        migrations.CreateModel(
            name='ProductProductVariation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='products.product')),
                ('product_variation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='products.productvariation')),
            ],
            options={
                'verbose_name': 'Product Product Variation',
                'verbose_name_plural': 'Product Product Variations',
                'db_table': 'acted_product_productvariation',
                'unique_together': {('product', 'product_variation')},
            },
        ),
        
        # Simple filter configuration for tests (without conflicts)
        migrations.CreateModel(
            name='FilterConfiguration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('display_label', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('filter_type', models.CharField(max_length=32)),
                ('filter_key', models.CharField(max_length=50)),
                ('ui_component', models.CharField(default='multi_select', max_length=32)),
                ('display_order', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Filter Configuration',
                'verbose_name_plural': 'Filter Configurations', 
                'db_table': 'acted_filter_configuration',
                'ordering': ['display_order', 'display_label'],
            },
        ),

        migrations.CreateModel(
            name='FilterGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('code', models.CharField(max_length=100, unique=True, null=True, blank=True)),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('display_order', models.IntegerField(default=0)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='products.filtergroup')),
            ],
            options={
                'db_table': 'acted_filter_group',
                'ordering': ['display_order', 'name'],
                'verbose_name': 'Filter Group',
                'verbose_name_plural': 'Filter Groups',
            },
        ),
    ]