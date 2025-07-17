# Generated migration for configurable filter system

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('products', '0007_new_bundle_structure'),
    ]

    operations = [
        migrations.CreateModel(
            name='FilterConfiguration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Internal name for the filter', max_length=100, unique=True)),
                ('display_label', models.CharField(help_text='User-facing label', max_length=100)),
                ('description', models.TextField(blank=True, help_text='Description for admin users')),
                ('filter_type', models.CharField(choices=[('subject', 'Subject'), ('product_group', 'Product Group'), ('product_variation', 'Product Variation'), ('tutorial_format', 'Tutorial Format'), ('custom_field', 'Custom Field'), ('computed', 'Computed Filter')], max_length=32)),
                ('filter_key', models.CharField(help_text='Key used in API requests', max_length=50)),
                ('ui_component', models.CharField(choices=[('multi_select', 'Multi-Select Checkboxes'), ('single_select', 'Single Select Dropdown'), ('radio_buttons', 'Radio Buttons'), ('toggle_buttons', 'Toggle Buttons'), ('search_select', 'Searchable Select'), ('range_slider', 'Range Slider'), ('date_picker', 'Date Picker')], default='multi_select', max_length=32)),
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
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Filter Configuration',
                'verbose_name_plural': 'Filter Configurations',
                'db_table': 'acted_filter_configuration',
                'ordering': ['display_order', 'display_label'],
            },
        ),
        migrations.CreateModel(
            name='FilterOptionProvider',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source_type', models.CharField(choices=[('database_table', 'Database Table'), ('model_field', 'Model Field'), ('static_list', 'Static List'), ('api_endpoint', 'API Endpoint'), ('computed', 'Computed Values')], max_length=32)),
                ('source_config', models.JSONField(default=dict, help_text='Configuration for the data source')),
                ('cache_timeout', models.IntegerField(default=900, help_text='Cache timeout in seconds')),
                ('last_cached', models.DateTimeField(blank=True, null=True)),
                ('transform_function', models.CharField(blank=True, help_text='Python function to transform options', max_length=100)),
                ('filter_configuration', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='option_provider', to='products.filterconfiguration')),
            ],
            options={
                'verbose_name': 'Filter Option Provider',
                'verbose_name_plural': 'Filter Option Providers',
                'db_table': 'acted_filter_option_provider',
            },
        ),
        migrations.CreateModel(
            name='FilterPreset',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('filter_values', models.JSONField(default=dict)),
                ('is_public', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('usage_count', models.IntegerField(default=0)),
                ('last_used', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Filter Preset',
                'verbose_name_plural': 'Filter Presets',
                'db_table': 'acted_filter_preset',
                'ordering': ['-usage_count', 'name'],
            },
        ),
        migrations.CreateModel(
            name='FilterUsageAnalytics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('filter_value', models.CharField(max_length=100)),
                ('usage_count', models.IntegerField(default=0)),
                ('last_used', models.DateTimeField(auto_now=True)),
                ('session_id', models.CharField(blank=True, max_length=100)),
                ('filter_configuration', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='products.filterconfiguration')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Filter Usage Analytics',
                'verbose_name_plural': 'Filter Usage Analytics',
                'db_table': 'acted_filter_usage_analytics',
            },
        ),
        migrations.AddIndex(
            model_name='filterusageanalytics',
            index=models.Index(fields=['filter_configuration', '-usage_count'], name='acted_filter_usage_analytics_filter_configuration_usage_count_idx'),
        ),
        migrations.AddIndex(
            model_name='filterusageanalytics',
            index=models.Index(fields=['last_used'], name='acted_filter_usage_analytics_last_used_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='filterusageanalytics',
            unique_together={('filter_configuration', 'filter_value')},
        ),
    ]