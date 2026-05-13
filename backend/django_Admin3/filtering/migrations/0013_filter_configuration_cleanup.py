from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('filtering', '0012_drop_filter_group_parent'),
    ]

    operations = [
        migrations.AlterField(
            model_name='filterconfiguration',
            name='filter_type',
            field=models.CharField(
                choices=[
                    ('subject', 'Subject'),
                    ('subject_type', 'Subject Type'),
                    ('filter_group', 'Filter Group'),
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
        migrations.RemoveField(
            model_name='filterconfiguration',
            name='dependency_rules',
        ),
        migrations.RemoveField(
            model_name='filterconfiguration',
            name='validation_rules',
        ),
    ]
