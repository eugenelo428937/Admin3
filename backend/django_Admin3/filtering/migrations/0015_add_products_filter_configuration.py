"""Add a hidden 'products' FilterConfiguration so the nav menu can drill
to a specific catalog.Product (e.g. "Products > Core Study Materials >
Course Notes") and have the filter actually apply.

The new filter:
  - filter_key='products' (what useFilterPanelVM / nav handlers dispatch)
  - filter_type='product_id' (dispatched to ProductIdHandler in
    filtering/services/filter_handlers.py)
  - is_active=True, but get_options() returns [] so the filter panel
    renders no section. The filter is set exclusively by nav-menu drill
    clicks; URL sync round-trips it like every other filter.
"""
from django.db import migrations, models


def create_products_filter(apps, schema_editor):
    FilterConfiguration = apps.get_model('filtering', 'FilterConfiguration')
    FilterConfiguration.objects.update_or_create(
        filter_key='products',
        defaults={
            'name': 'PRODUCTS_FILTER',
            'display_label': 'Products',
            'description': (
                'Hidden filter set by nav-menu drill-downs to a specific '
                'catalog.Product master template (e.g. Course Notes). Not '
                'rendered in the filter panel.'
            ),
            'filter_type': 'product_id',
            'ui_component': 'multi_select',
            'display_order': 99,
            'is_active': True,
            'is_collapsible': True,
            'is_expanded_by_default': False,
            'is_required': False,
            'allow_multiple': True,
            'ui_config': {},
        },
    )


def remove_products_filter(apps, schema_editor):
    FilterConfiguration = apps.get_model('filtering', 'FilterConfiguration')
    FilterConfiguration.objects.filter(filter_key='products').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('filtering', '0014_clean_subject_type_fcg_mapping'),
    ]

    operations = [
        # AlterField — only the choices list changed (validator-only, no
        # schema impact). Keeps `makemigrations --check` green.
        migrations.AlterField(
            model_name='filterconfiguration',
            name='filter_type',
            field=models.CharField(
                choices=[
                    ('subject', 'Subject'),
                    ('subject_type', 'Subject Type'),
                    ('filter_group', 'Filter Group'),
                    ('product_id', 'Product ID'),
                    ('product_variation', 'Product Variation'),
                    ('tutorial_format', 'Tutorial Format'),
                    ('bundle', 'Bundle'),
                    ('custom_field', 'Custom Field'),
                    ('computed', 'Computed Filter'),
                    ('date_range', 'Date Range'),
                    ('numeric_range', 'Numeric Range'),
                ],
                help_text='Type of filter',
                max_length=32,
            ),
        ),
        migrations.RunPython(
            create_products_filter,
            reverse_code=remove_products_filter,
        ),
    ]
