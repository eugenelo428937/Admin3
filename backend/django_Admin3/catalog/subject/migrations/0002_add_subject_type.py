"""State-only mirror of catalog.0011_add_subject_subject_type.

The actual DB column was added by the catalog app migration. This migration
keeps the per-app `catalog_subjects` model state aligned with the DB.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog_subjects", "0001_initial"),
        ("catalog", "0011_add_subject_subject_type"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="subject",
                    name="subject_type",
                    field=models.CharField(
                        max_length=4,
                        default="UK",
                        choices=[
                            ("UK", "UK Exam"),
                            ("SA", "South Africa Exam"),
                            ("CAA", "Actuarial Analyst Courses"),
                            ("PMS", "Pure Maths and Statistics for Actuarial Studies"),
                        ],
                        help_text="Programme classification (UK/SA/CAA/PMS)",
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
