"""
Migration: Add FK fields to TutorialEvents and TutorialSessions.

For NEW fields (instructor, location on events): standard AddField.
For ALTERED fields (venue on events, venue+location on sessions):
  Use SeparateDatabaseAndState because the production DB has string data
  in the old varchar columns that cannot be cast to bigint.
  - Database: add new *_id FK columns alongside existing varchar columns
  - State: update Django's model state to reflect the FK fields
  The old varchar columns are preserved for Phase 5 data migration
  and will be dropped in Phase 6.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tutorials", "0004_tutorialcoursetemplate_tutoriallocation_staff_and_more"),
    ]

    operations = [
        # --- New FK fields (no column conflict) ---
        migrations.AddField(
            model_name="tutorialevents",
            name="instructor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="events",
                to="tutorials.tutorialinstructor",
            ),
        ),
        migrations.AddField(
            model_name="tutorialevents",
            name="location",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="events",
                to="tutorials.tutoriallocation",
            ),
        ),
        migrations.AddField(
            model_name="tutorialsessions",
            name="instructor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sessions",
                to="tutorials.tutorialinstructor",
            ),
        ),

        # --- Make old varchar columns nullable (they'll be dropped in Phase 6) ---
        migrations.RunSQL(
            sql=[
                'ALTER TABLE "acted"."tutorial_events" ALTER COLUMN venue DROP NOT NULL',
                'ALTER TABLE "acted"."tutorial_sessions" ALTER COLUMN venue DROP NOT NULL',
                'ALTER TABLE "acted"."tutorial_sessions" ALTER COLUMN location DROP NOT NULL',
            ],
            reverse_sql=[
                'ALTER TABLE "acted"."tutorial_events" ALTER COLUMN venue SET NOT NULL',
                'ALTER TABLE "acted"."tutorial_sessions" ALTER COLUMN venue SET NOT NULL',
                'ALTER TABLE "acted"."tutorial_sessions" ALTER COLUMN location SET NOT NULL',
            ],
        ),

        # --- CharField → FK conversions (need SeparateDatabaseAndState) ---

        # tutorial_events.venue: varchar → FK to tutorial_venues
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=[
                        'ALTER TABLE "acted"."tutorial_events" ADD COLUMN venue_id bigint NULL',
                        'ALTER TABLE "acted"."tutorial_events" ADD CONSTRAINT '
                        '"tutorials_tutorialevents_venue_id_fk" '
                        'FOREIGN KEY (venue_id) REFERENCES "acted"."tutorial_venues"(id) '
                        'ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED',
                        'CREATE INDEX "tutorials_tutorialevents_venue_id_idx" '
                        'ON "acted"."tutorial_events" (venue_id)',
                    ],
                    reverse_sql=[
                        'DROP INDEX IF EXISTS "tutorials_tutorialevents_venue_id_idx"',
                        'ALTER TABLE "acted"."tutorial_events" DROP CONSTRAINT IF EXISTS '
                        '"tutorials_tutorialevents_venue_id_fk"',
                        'ALTER TABLE "acted"."tutorial_events" DROP COLUMN IF EXISTS venue_id',
                    ],
                ),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name="tutorialevents",
                    name="venue",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="events",
                        to="tutorials.tutorialvenue",
                    ),
                ),
            ],
        ),

        # tutorial_sessions.venue: varchar → FK to tutorial_venues
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=[
                        'ALTER TABLE "acted"."tutorial_sessions" ADD COLUMN venue_id bigint NULL',
                        'ALTER TABLE "acted"."tutorial_sessions" ADD CONSTRAINT '
                        '"tutorials_tutorialsessions_venue_id_fk" '
                        'FOREIGN KEY (venue_id) REFERENCES "acted"."tutorial_venues"(id) '
                        'ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED',
                        'CREATE INDEX "tutorials_tutorialsessions_venue_id_idx" '
                        'ON "acted"."tutorial_sessions" (venue_id)',
                    ],
                    reverse_sql=[
                        'DROP INDEX IF EXISTS "tutorials_tutorialsessions_venue_id_idx"',
                        'ALTER TABLE "acted"."tutorial_sessions" DROP CONSTRAINT IF EXISTS '
                        '"tutorials_tutorialsessions_venue_id_fk"',
                        'ALTER TABLE "acted"."tutorial_sessions" DROP COLUMN IF EXISTS venue_id',
                    ],
                ),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name="tutorialsessions",
                    name="venue",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sessions",
                        to="tutorials.tutorialvenue",
                    ),
                ),
            ],
        ),

        # tutorial_sessions.location: varchar → FK to tutorial_locations
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=[
                        'ALTER TABLE "acted"."tutorial_sessions" ADD COLUMN location_id bigint NULL',
                        'ALTER TABLE "acted"."tutorial_sessions" ADD CONSTRAINT '
                        '"tutorials_tutorialsessions_location_id_fk" '
                        'FOREIGN KEY (location_id) REFERENCES "acted"."tutorial_locations"(id) '
                        'ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED',
                        'CREATE INDEX "tutorials_tutorialsessions_location_id_idx" '
                        'ON "acted"."tutorial_sessions" (location_id)',
                    ],
                    reverse_sql=[
                        'DROP INDEX IF EXISTS "tutorials_tutorialsessions_location_id_idx"',
                        'ALTER TABLE "acted"."tutorial_sessions" DROP CONSTRAINT IF EXISTS '
                        '"tutorials_tutorialsessions_location_id_fk"',
                        'ALTER TABLE "acted"."tutorial_sessions" DROP COLUMN IF EXISTS location_id',
                    ],
                ),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name="tutorialsessions",
                    name="location",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sessions",
                        to="tutorials.tutoriallocation",
                    ),
                ),
            ],
        ),
    ]
