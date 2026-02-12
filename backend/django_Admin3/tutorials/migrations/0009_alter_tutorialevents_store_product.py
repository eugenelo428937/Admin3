"""
Migration 0009: Sync Django state for store_product column rename.

Migration 0007 used RunSQL to rename the column from
exam_session_subject_product_variation_id to product_id, but RunSQL
doesn't update Django's migration state. This state-only migration
tells Django the column is now called product_id without running any SQL.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0002_alter_bundle_bundle_template_and_more"),
        ("tutorials", "0008_events_instructor_fk_to_m2m"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="tutorialevents",
                    name="store_product",
                    field=models.ForeignKey(
                        db_column="product_id",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tutorial_events",
                        to="store.product",
                    ),
                ),
            ],
            database_operations=[],  # Column already renamed by RunSQL in 0007
        ),
    ]
