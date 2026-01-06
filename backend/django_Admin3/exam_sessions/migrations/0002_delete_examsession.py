# Manual migration for catalog consolidation (001-catalog-consolidation)
#
# ExamSession model has been moved to catalog app.
# This migration updates Django's state WITHOUT deleting the database table.
# The old table (acted_exam_sessions) is preserved per "Copy and Preserve" strategy.

from django.db import migrations


class Migration(migrations.Migration):
    """State-only migration: ExamSession moved to catalog app."""

    dependencies = [
        ('exam_sessions', '0001_initial'),
        ('catalog', '0002_create_models'),  # Ensure catalog models exist first
    ]

    operations = [
        # Use SeparateDatabaseAndState to update Django's state without touching DB
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.DeleteModel(
                    name='ExamSession',
                ),
            ],
            database_operations=[
                # No database operations - preserve the old table
            ],
        ),
    ]
