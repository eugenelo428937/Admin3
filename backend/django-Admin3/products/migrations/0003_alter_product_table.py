# Generated by Django 5.1.1 on 2025-03-11 12:44

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0002_alter_product_options_alter_product_table'),
    ]

    operations = [
        migrations.AlterModelTable(
            name='product',
            table='acted_products',
        ),
    ]
