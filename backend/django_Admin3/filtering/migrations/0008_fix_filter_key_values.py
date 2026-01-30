"""Data migration: fix filter_key values in FilterConfiguration.

The filter_key column was seeded with the generic 'product_group' for all
three filter_group-type configurations, but the backend code expects
distinct keys ('categories', 'product_types', 'modes_of_delivery') to
partition filter groups into the correct filter panel sections.

The subject config also had 'subject' (singular) instead of 'subjects'.

This migration corrects the four filter_key values to match the code
expectations, fixing:
  - Empty categories/product_types filter panels
  - Frontend registerFromBackend() key collision
  - Bundle filtering not activating (no non-subject filters selectable)
"""
from django.db import migrations


# Map: config name → correct filter_key
FILTER_KEY_CORRECTIONS = {
    'SUBJECT_FILTER': 'subjects',
    'PRODUCT_CATEGORY': 'categories',
    'PRODUCT_TYPE': 'product_types',
    'DELIVERY_MODE': 'modes_of_delivery',
}

# Reverse map: config name → original (wrong) filter_key
ORIGINAL_FILTER_KEYS = {
    'SUBJECT_FILTER': 'subject',
    'PRODUCT_CATEGORY': 'product_group',
    'PRODUCT_TYPE': 'product_group',
    'DELIVERY_MODE': 'product_group',
}


def fix_filter_keys(apps, schema_editor):
    """Set correct filter_key values for each FilterConfiguration."""
    FilterConfiguration = apps.get_model('filtering', 'FilterConfiguration')
    updated = 0
    for config_name, correct_key in FILTER_KEY_CORRECTIONS.items():
        count = FilterConfiguration.objects.filter(name=config_name).exclude(
            filter_key=correct_key
        ).update(filter_key=correct_key)
        if count:
            updated += count
            print(f"\n  Updated {config_name} filter_key → '{correct_key}'")
    if updated:
        print(f"\n  Total: {updated} filter_key values corrected")
    else:
        print("\n  All filter_key values already correct")


def restore_filter_keys(apps, schema_editor):
    """Reverse: restore original filter_key values."""
    FilterConfiguration = apps.get_model('filtering', 'FilterConfiguration')
    for config_name, original_key in ORIGINAL_FILTER_KEYS.items():
        FilterConfiguration.objects.filter(name=config_name).update(
            filter_key=original_key
        )
    print("\n  Restored original filter_key values")


class Migration(migrations.Migration):

    dependencies = [
        ('filtering', '0007_remove_format_groups_from_configs'),
    ]

    operations = [
        migrations.RunPython(
            fix_filter_keys,
            restore_filter_keys,
        ),
    ]
