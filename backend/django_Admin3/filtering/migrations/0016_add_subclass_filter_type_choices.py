# Phase 4a — add tutorial_location and marking_template to
# FilterConfiguration.filter_type choices.
#
# 'tutorial_format' was already in the choices list. 'product_id' was
# added by migration 0015 alongside the hidden 'products' configuration.
# This migration appends the two remaining subclass-aware types so the
# new TutorialLocationHandler and MarkingTemplateHandler (registered in
# filtering/services/filter_handlers.py) can be selected on a
# FilterConfiguration row by an admin.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("filtering", "0015_add_products_filter_configuration"),
    ]

    operations = [
        migrations.AlterField(
            model_name="filterconfiguration",
            name="filter_type",
            field=models.CharField(
                choices=[
                    ("subject", "Subject"),
                    ("subject_type", "Subject Type"),
                    ("filter_group", "Filter Group"),
                    ("product_id", "Product ID"),
                    ("product_variation", "Product Variation"),
                    ("tutorial_format", "Tutorial Format"),
                    ("tutorial_location", "Tutorial Location"),
                    ("marking_template", "Marking Template"),
                    ("bundle", "Bundle"),
                    ("custom_field", "Custom Field"),
                    ("computed", "Computed Filter"),
                    ("date_range", "Date Range"),
                    ("numeric_range", "Numeric Range"),
                ],
                help_text="Type of filter",
                max_length=32,
            ),
        ),
    ]
