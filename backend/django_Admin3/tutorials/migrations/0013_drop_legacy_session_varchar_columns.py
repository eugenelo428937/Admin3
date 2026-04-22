"""
Migration: Drop legacy varchar venue/location columns from tutorial_sessions.

Phase 6 of the venue/location FK conversion started in 0005. The FK columns
(venue_id, location_id) have been populated (see 0007_populate_event_fks and
subsequent data migrations); the legacy varchar columns are no longer read
by the Django model state and can be dropped.

Database-only: Django's model state already reflects FK fields, so no
state_operations are required.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("tutorials", "0012_tutorialevents_main_instructor"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                'ALTER TABLE "acted"."tutorial_sessions" DROP COLUMN IF EXISTS venue',
                'ALTER TABLE "acted"."tutorial_sessions" DROP COLUMN IF EXISTS location',
            ],
            reverse_sql=[
                'ALTER TABLE "acted"."tutorial_sessions" ADD COLUMN location varchar(255) NULL',
                'ALTER TABLE "acted"."tutorial_sessions" ADD COLUMN venue varchar(255) NULL',
            ],
        ),
    ]
