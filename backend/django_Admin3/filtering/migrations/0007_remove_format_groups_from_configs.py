"""Data migration: remove format-level groups from category/product_type configs.

eBook, Printed, and Hub are format/delivery concepts handled by
modes_of_delivery via product_variation.variation_type. They should
not appear as FilterConfigurationGroup assignments under the
'categories' or 'product_types' configurations.

US6 / T062
"""
from django.db import migrations


FORMAT_GROUP_NAMES = ['eBook', 'Printed', 'Hub']
TARGET_FILTER_KEYS = ['categories', 'product_types']


def remove_format_groups(apps, schema_editor):
    """Delete FilterConfigurationGroup records linking format groups
    to category/product_type configs."""
    FilterConfigurationGroup = apps.get_model('filtering', 'FilterConfigurationGroup')
    deleted, _ = FilterConfigurationGroup.objects.filter(
        filter_configuration__filter_key__in=TARGET_FILTER_KEYS,
        filter_group__name__in=FORMAT_GROUP_NAMES,
    ).delete()
    if deleted:
        print(f"\n  Removed {deleted} format group assignments from configs")


def restore_format_groups(apps, schema_editor):
    """Reverse migration: re-create format group assignments.

    NOTE: This is a best-effort reverse. It re-assigns any existing
    FilterGroup records named eBook/Printed/Hub to both categories
    and product_types configs with default ordering.
    """
    FilterConfiguration = apps.get_model('filtering', 'FilterConfiguration')
    FilterGroup = apps.get_model('filtering', 'FilterGroup')
    FilterConfigurationGroup = apps.get_model('filtering', 'FilterConfigurationGroup')

    configs = FilterConfiguration.objects.filter(
        filter_key__in=TARGET_FILTER_KEYS
    )
    groups = FilterGroup.objects.filter(name__in=FORMAT_GROUP_NAMES)

    created = 0
    for config in configs:
        for group in groups:
            _, was_created = FilterConfigurationGroup.objects.get_or_create(
                filter_configuration=config,
                filter_group=group,
                defaults={'display_order': 99, 'is_default': False},
            )
            if was_created:
                created += 1

    if created:
        print(f"\n  Restored {created} format group assignments")


class Migration(migrations.Migration):

    dependencies = [
        ('filtering', '0006_productproductgroup'),
    ]

    operations = [
        migrations.RunPython(
            remove_format_groups,
            restore_format_groups,
        ),
    ]
