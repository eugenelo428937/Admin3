"""Initial migration for filtering app.

Creates tables in the acted schema by renaming existing tables from products app.
If tables already exist in acted schema, only registers model state.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def rename_tables_to_acted_schema(apps, schema_editor):
    """Rename existing tables to acted schema with new names."""
    with schema_editor.connection.cursor() as cursor:
        # List of (old_table_name, new_table_name) pairs
        table_mappings = [
            ('acted_filter_group', 'filter_groups'),
            ('acted_filter_configuration', 'filter_configurations'),
            ('acted_filter_configuration_group', 'filter_configuration_groups'),
            ('acted_filter_preset', 'filter_presets'),
            ('acted_filter_usage_analytics', 'filter_usage_analytics'),
        ]

        for old_name, new_name in table_mappings:
            # Check if old table exists in public schema
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = %s
                )
            """, [old_name])
            old_exists = cursor.fetchone()[0]

            # Check if new table exists in acted schema
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'acted'
                    AND table_name = %s
                )
            """, [new_name])
            new_exists = cursor.fetchone()[0]

            if old_exists and not new_exists:
                # Rename and move to acted schema
                cursor.execute(f'ALTER TABLE "{old_name}" RENAME TO "{new_name}"')
                cursor.execute(f'ALTER TABLE "{new_name}" SET SCHEMA acted')


def reverse_rename(apps, schema_editor):
    """Reverse: move tables back to public schema with old names."""
    with schema_editor.connection.cursor() as cursor:
        table_mappings = [
            ('filter_groups', 'acted_filter_group'),
            ('filter_configurations', 'acted_filter_configuration'),
            ('filter_configuration_groups', 'acted_filter_configuration_group'),
            ('filter_presets', 'acted_filter_preset'),
            ('filter_usage_analytics', 'acted_filter_usage_analytics'),
        ]

        for acted_name, public_name in table_mappings:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'acted'
                    AND table_name = %s
                )
            """, [acted_name])
            if cursor.fetchone()[0]:
                cursor.execute(f'ALTER TABLE acted."{acted_name}" SET SCHEMA public')
                cursor.execute(f'ALTER TABLE "{acted_name}" RENAME TO "{public_name}"')


class Migration(migrations.Migration):
    """Create filtering app tables in acted schema."""

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Step 1: Rename existing tables to acted schema (if they exist in public)
        migrations.RunPython(rename_tables_to_acted_schema, reverse_rename),

        # Step 2: Create model states without database operations
        # (tables already exist or will be created by Django if they don't)
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='FilterGroup',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('name', models.CharField(help_text='Display name for the filter group', max_length=100)),
                        ('code', models.CharField(blank=True, help_text='Unique code identifier', max_length=100, null=True, unique=True)),
                        ('description', models.TextField(blank=True, help_text='Description of the filter group')),
                        ('is_active', models.BooleanField(default=True, help_text='Whether group is available for filtering')),
                        ('display_order', models.IntegerField(default=0, help_text='Sort order for display')),
                        ('parent', models.ForeignKey(blank=True, help_text='Parent group for hierarchy', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='filtering.filtergroup')),
                    ],
                    options={
                        'verbose_name': 'Filter Group',
                        'verbose_name_plural': 'Filter Groups',
                        'db_table': '"acted"."filter_groups"',
                        'ordering': ['display_order', 'name'],
                    },
                ),
                migrations.CreateModel(
                    name='FilterConfiguration',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('name', models.CharField(help_text='Internal name for the filter', max_length=100, unique=True)),
                        ('display_label', models.CharField(help_text='User-facing label', max_length=100)),
                        ('description', models.TextField(blank=True, help_text='Description for admin users')),
                        ('filter_type', models.CharField(choices=[('subject', 'Subject'), ('filter_group', 'Filter Group'), ('product_variation', 'Product Variation'), ('tutorial_format', 'Tutorial Format'), ('bundle', 'Bundle'), ('custom_field', 'Custom Field'), ('computed', 'Computed Filter'), ('date_range', 'Date Range'), ('numeric_range', 'Numeric Range')], help_text='Type of filter', max_length=32)),
                        ('filter_key', models.CharField(help_text='Key used in API requests', max_length=50)),
                        ('ui_component', models.CharField(choices=[('multi_select', 'Multi-Select Checkboxes'), ('single_select', 'Single Select Dropdown'), ('checkbox', 'Single Checkbox'), ('radio_buttons', 'Radio Buttons'), ('toggle_buttons', 'Toggle Buttons'), ('search_select', 'Searchable Select'), ('tree_select', 'Hierarchical Tree Select'), ('range_slider', 'Range Slider'), ('date_picker', 'Date Picker'), ('tag_input', 'Tag Input')], default='multi_select', help_text='UI component type', max_length=32)),
                        ('display_order', models.IntegerField(default=0, help_text='Order in which filters appear')),
                        ('is_active', models.BooleanField(default=True)),
                        ('is_collapsible', models.BooleanField(default=True)),
                        ('is_expanded_by_default', models.BooleanField(default=False)),
                        ('is_required', models.BooleanField(default=False)),
                        ('allow_multiple', models.BooleanField(default=True)),
                        ('ui_config', models.JSONField(blank=True, default=dict, help_text='UI-specific configuration')),
                        ('validation_rules', models.JSONField(blank=True, default=dict, help_text='Validation rules')),
                        ('dependency_rules', models.JSONField(blank=True, default=dict, help_text='Dependencies on other filters')),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='filtering_configurations', to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'verbose_name': 'Filter Configuration',
                        'verbose_name_plural': 'Filter Configurations',
                        'db_table': '"acted"."filter_configurations"',
                        'ordering': ['display_order', 'display_label'],
                    },
                ),
                migrations.CreateModel(
                    name='FilterConfigurationGroup',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('is_default', models.BooleanField(default=False, help_text='Is this a default option for the filter?')),
                        ('display_order', models.IntegerField(default=0, help_text='Order within this filter')),
                        ('filter_configuration', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='filtering.filterconfiguration')),
                        ('filter_group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='filtering.filtergroup')),
                    ],
                    options={
                        'verbose_name': 'Filter Configuration Group',
                        'verbose_name_plural': 'Filter Configuration Groups',
                        'db_table': '"acted"."filter_configuration_groups"',
                        'ordering': ['display_order', 'filter_group__name'],
                        'unique_together': {('filter_configuration', 'filter_group')},
                    },
                ),
                migrations.CreateModel(
                    name='FilterPreset',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('name', models.CharField(help_text='Preset name', max_length=100)),
                        ('description', models.TextField(blank=True, help_text='Description of the preset')),
                        ('filter_values', models.JSONField(default=dict, help_text='Saved filter values')),
                        ('is_public', models.BooleanField(default=False, help_text='Available to all users')),
                        ('usage_count', models.IntegerField(default=0)),
                        ('last_used', models.DateTimeField(blank=True, null=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='filtering_presets', to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'verbose_name': 'Filter Preset',
                        'verbose_name_plural': 'Filter Presets',
                        'db_table': '"acted"."filter_presets"',
                        'ordering': ['-usage_count', 'name'],
                    },
                ),
                migrations.CreateModel(
                    name='FilterUsageAnalytics',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('filter_value', models.CharField(help_text='The actual filter value used', max_length=100)),
                        ('usage_count', models.IntegerField(default=0)),
                        ('last_used', models.DateTimeField(auto_now=True)),
                        ('session_id', models.CharField(blank=True, help_text='Session ID for anonymous users', max_length=100)),
                        ('filter_configuration', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='filtering.filterconfiguration')),
                        ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='filtering_analytics', to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'verbose_name': 'Filter Usage Analytics',
                        'verbose_name_plural': 'Filter Usage Analytics',
                        'db_table': '"acted"."filter_usage_analytics"',
                        'unique_together': {('filter_configuration', 'filter_value')},
                    },
                ),
                migrations.AddField(
                    model_name='filterconfiguration',
                    name='filter_groups',
                    field=models.ManyToManyField(blank=True, through='filtering.FilterConfigurationGroup', to='filtering.filtergroup'),
                ),
            ],
            database_operations=[],
        ),
    ]
