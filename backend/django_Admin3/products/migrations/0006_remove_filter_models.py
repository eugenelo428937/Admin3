"""Migration to remove filter models from products app state.

The database tables have already been moved to filtering app via
filtering.0001_initial migration. This migration only removes
the model state from products app.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """Remove filter models from products app (state only - tables moved to filtering)."""

    dependencies = [
        ('products', '0005_remove_productvariationrecommendation'),
        ('filtering', '0002_update_filter_group_references'),
    ]

    operations = [
        # State-only removal of filter models (tables already moved to filtering app)
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='productgroupfilter',
                    name='groups',
                    field=models.ManyToManyField(related_name='filter_groups', to='filtering.filtergroup'),
                ),
                migrations.DeleteModel(name='FilterUsageAnalytics'),
                migrations.DeleteModel(name='FilterPreset'),
                migrations.DeleteModel(name='FilterConfigurationGroup'),
                migrations.DeleteModel(name='FilterConfiguration'),
                migrations.DeleteModel(name='FilterGroup'),
            ],
            database_operations=[],
        ),
    ]
