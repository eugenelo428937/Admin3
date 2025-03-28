# Generated by Django 5.1.1 on 2025-03-28 17:28

import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='PriceLevel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('external_id', models.CharField(max_length=255, unique=True)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('last_synced', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Price Level',
                'verbose_name_plural': 'Price Levels',
                'db_table': 'admpricelevels',
            },
        ),
        migrations.CreateModel(
            name='CustomField',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('external_id', models.CharField(max_length=255, unique=True)),
                ('label', models.CharField(max_length=255)),
                ('field_type', models.CharField(max_length=50)),
                ('description', models.TextField(blank=True, null=True)),
                ('is_required', models.BooleanField(default=False)),
                ('roles', django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=255), blank=True, default=list, null=True, size=None)),
                ('entity_type', models.CharField(max_length=50)),
                ('last_synced', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Custom Field',
                'verbose_name_plural': 'Custom Fields',
                'db_table': 'admcustomfields',
                'indexes': [models.Index(fields=['entity_type'], name='admcustomfi_entity__bbad98_idx'), models.Index(fields=['external_id'], name='admcustomfi_externa_e39812_idx')],
            },
        ),
    ]
