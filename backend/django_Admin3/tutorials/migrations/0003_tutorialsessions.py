# Generated manually for TutorialSessions model (US2)

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tutorials", "0002_migrate_to_acted_schema"),
    ]

    operations = [
        # Rename TutorialEvent → TutorialEvents to match the model class
        # rename from commit 6ac2be44. The explicit db_table on the model
        # means this only changes Django's internal state, not the table.
        migrations.RenameModel(
            old_name="TutorialEvent",
            new_name="TutorialEvents",
        ),
        migrations.CreateModel(
            name="TutorialSessions",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("location", models.CharField(max_length=255)),
                ("venue", models.CharField(max_length=255)),
                ("start_date", models.DateTimeField()),
                ("end_date", models.DateTimeField()),
                ("sequence", models.PositiveIntegerField()),
                ("url", models.URLField(blank=True, max_length=500, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tutorial_event",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sessions",
                        to="tutorials.tutorialevents",
                    ),
                ),
            ],
            options={
                "verbose_name": "Tutorial Session",
                "verbose_name_plural": "Tutorial Sessions",
                "db_table": '"acted"."tutorial_sessions"',
                "ordering": ["sequence"],
                "unique_together": {("tutorial_event", "sequence")},
            },
        ),
    ]
