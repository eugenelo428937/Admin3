"""Phase 5b: drop tutorial_events.start_date/end_date (Date) and convert
finalisation_date Date -> DateTime.

The Date columns are replaced by their DateTime equivalents
(`lms_start_date`, `lms_end_date`) which the webhook handler and
`sync_events` have been writing since 2026-05-15. This migration:

  1. Backfills `lms_start_date`/`lms_end_date` from `start_date`/`end_date`
     for any row where the new column is still NULL (rows the webhook
     hasn't touched). Conversion is midnight Europe/London, matching the
     canonical timezone used by the webhook handler.
  2. Drops `start_date` and `end_date`.
  3. Converts `finalisation_date` Date -> DateTime via
     `ALTER COLUMN ... TYPE ... USING ... AT TIME ZONE 'Europe/London'`.
     `SeparateDatabaseAndState` keeps Django's model graph consistent
     (state-side `AlterField` declares the type change; database-side
     `RunSQL` does the conversion with explicit timezone semantics).
  4. Updates the model Meta `ordering` from `start_date` to
     `lms_start_date`.

Forward-only: reversing would require fabricating a Date from a DateTime,
losing time-of-day information. If you need to roll back beyond this
point, restore from a backup.
"""
from django.db import migrations, models


def backfill_datetime_columns(apps, schema_editor):
    """Backfill `lms_start_date` / `lms_end_date` from the legacy Date cols.

    Both source columns were NOT NULL on the model, so every row has a
    date to convert. The new columns are nullable; only fill them where
    they're still empty (preserve any datetime the webhook already wrote
    — that one carries time-of-day from Administrate).

    `AT TIME ZONE 'Europe/London'` treats the bare timestamp as a local
    time and produces the tz-aware UTC equivalent, matching the canonical
    conversion the webhook handler uses for new deliveries.
    """
    with schema_editor.connection.cursor() as cur:
        cur.execute('''
            UPDATE "acted"."tutorial_events"
               SET lms_start_date = (start_date::timestamp AT TIME ZONE 'Europe/London')
             WHERE lms_start_date IS NULL
               AND start_date IS NOT NULL;
        ''')
        cur.execute('''
            UPDATE "acted"."tutorial_events"
               SET lms_end_date = (end_date::timestamp AT TIME ZONE 'Europe/London')
             WHERE lms_end_date IS NULL
               AND end_date IS NOT NULL;
        ''')


def noop_reverse(apps, schema_editor):
    raise NotImplementedError(
        'Phase 5b is forward-only: reversing would lose time-of-day data. '
        'Restore from a backup taken before the migration if you need to '
        'roll back.'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('tutorials', '0026_add_administrate_fields'),
    ]

    operations = [
        # 1. Backfill DateTime columns from legacy Date columns.
        migrations.RunPython(backfill_datetime_columns, noop_reverse),

        # 2. Drop the legacy Date columns. Django emits the DROP COLUMN
        # statements; the data is already preserved in lms_start_date /
        # lms_end_date by step 1.
        migrations.RemoveField(model_name='tutorialevents', name='start_date'),
        migrations.RemoveField(model_name='tutorialevents', name='end_date'),

        # 3. Convert finalisation_date Date -> DateTime in one ALTER COLUMN.
        # SeparateDatabaseAndState because Django's auto AlterField uses an
        # implicit cast (which would interpret the date as midnight UTC,
        # not midnight Europe/London). The state-side declares the type
        # change so the model graph stays consistent; the database-side
        # RunSQL does the conversion with explicit timezone semantics.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='tutorialevents',
                    name='finalisation_date',
                    field=models.DateTimeField(blank=True, null=True),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE "acted"."tutorial_events" '
                        '  ALTER COLUMN finalisation_date '
                        '  TYPE timestamp with time zone '
                        '  USING (finalisation_date::timestamp AT TIME ZONE \'Europe/London\');'
                    ),
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
        ),

        # 4. Update ordering to use the surviving DateTime column.
        migrations.AlterModelOptions(
            name='tutorialevents',
            options={
                'ordering': ['lms_start_date', 'code'],
                'verbose_name': 'Tutorial Event',
                'verbose_name_plural': 'Tutorial Events',
            },
        ),
    ]
