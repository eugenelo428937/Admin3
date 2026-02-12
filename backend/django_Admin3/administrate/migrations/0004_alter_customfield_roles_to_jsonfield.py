"""
Change CustomField.roles from ArrayField to JSONField.

ArrayField is PostgreSQL-only. JSONField provides the same list storage
capability while also being compatible with SQLite for testing.

Uses SeparateDatabaseAndState because PostgreSQL cannot directly cast
varchar[] to jsonb — we need array_to_json() as an intermediate step.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('administrate', '0003_migrate_to_adm_schema'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    # Use "adm"."custom_fields" (schema-qualified) to match
                    # the corrected db_table='"adm"."custom_fields"' format.
                    sql=(
                        'ALTER TABLE "adm"."custom_fields" '
                        'ALTER COLUMN "roles" TYPE jsonb '
                        'USING array_to_json("roles")::jsonb'
                    ),
                    reverse_sql=(
                        'ALTER TABLE "adm"."custom_fields" '
                        'ALTER COLUMN "roles" TYPE varchar[] '
                        "USING ARRAY(SELECT jsonb_array_elements_text(\"roles\"))"
                    ),
                ),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name='customfield',
                    name='roles',
                    field=models.JSONField(blank=True, default=list, null=True),
                ),
            ],
        ),
    ]
