"""
Migration to create ProductGroupFilter model in the filtering app.

Creates the table "acted"."product_group_filter" and the M2M through table
"acted"."product_group_filter_groups".
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('filtering', '0004_filterusageanalytics_filter_usag_filter__e51648_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductGroupFilter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('filter_type', models.CharField(choices=[('type', 'Product Type'), ('delivery', 'Delivery Method'), ('custom', 'Custom')], max_length=32)),
                ('groups', models.ManyToManyField(db_table='"acted"."product_group_filter_groups"', related_name='filter_groups', to='filtering.FilterGroup')),
            ],
            options={
                'db_table': '"acted"."product_group_filter"',
                'verbose_name': 'Product Group Filter',
                'verbose_name_plural': 'Product Group Filters',
            },
        ),
    ]
