"""Phase 1 of the session+learner webhook expansion (2026-05-18).

Schema prep on `acted.tutorial_sessions` that the new Session webhook
handlers depend on:

  - Add `cancelled` BooleanField (default False). Holds the cancellation
    state that previously lived on `adm.sessions.cancelled` (dropped in
    the next migration in this PR as a redundant column).
  - Make `start_date` and `end_date` nullable. The registered Session
    webhook GraphQL slice does not fetch dates as typed fields, so rows
    created by the Session Created handler land with NULL dates; CSV
    bulk import populates them later. Model-level `clean()` continues to
    enforce start<=end for rows that do have dates set.

Forward-only: there is no automatic reversal of nullable -> NOT NULL
because we cannot synthesize plausible dates for rows that the webhook
has left empty.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tutorials', '0027_drop_legacy_date_columns'),
    ]

    operations = [
        migrations.AddField(
            model_name='tutorialsessions',
            name='cancelled',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='tutorialsessions',
            name='start_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='tutorialsessions',
            name='end_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
