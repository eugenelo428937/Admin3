"""
Migrate administrate tables from literal dot-names in public schema
to properly schema-qualified tables in the adm schema.

Handles the fact that Django's db_table='adm.course_templates' creates
a table named "adm.course_templates" (with literal dot) in the public
schema, NOT a table named "course_templates" in the "adm" schema.

Steps per table:
  1. CREATE SCHEMA adm IF NOT EXISTS
  2. ALTER TABLE "adm.course_templates" SET SCHEMA adm;
     (moves "adm.course_templates" from public into adm schema)
  3. ALTER TABLE adm."adm.course_templates" RENAME TO course_templates;
     (strips the "adm." prefix from the table name)

After this migration, db_table should be '"adm"."course_templates"'.
"""
from django.db import migrations
from django.conf import settings


TABLES = [
    'course_templates',
    'custom_fields',
    'instructors',
    'locations',
    'pricelevels',
    'venues',
    'course_template_price_levels',
]


def make_forward_sql(table_name):
    """Move literal-dot table from public to adm schema and fix its name.

    The table currently exists as "adm.{table_name}" in the public schema.
    We need to:
      1. Move it to the adm schema
      2. Rename it to strip the 'adm.' prefix
    """
    literal_name = f'adm.{table_name}'
    assert_mode = getattr(settings, 'MIGRATION_ASSERT_MODE', False)

    if assert_mode:
        else_clause = f"""
                RAISE EXCEPTION 'MIGRATION VERIFICATION FAILED: '
                    'Table "adm.{table_name}" not found in public schema. '
                    'Cannot migrate to adm schema.';
        """
    else:
        else_clause = f"""
                RAISE WARNING 'Table "adm.{table_name}" not found in public schema — skipping migration to adm schema';
        """

    return f"""
        CREATE SCHEMA IF NOT EXISTS adm;

        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = '{literal_name}'
            ) THEN
                ALTER TABLE public."{literal_name}" SET SCHEMA adm;
                ALTER TABLE adm."{literal_name}" RENAME TO {table_name};
                RAISE NOTICE 'Moved and renamed "adm.{table_name}" -> adm.{table_name}';
            ELSIF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'adm'
                  AND table_name = '{table_name}'
            ) THEN
                RAISE NOTICE 'Table {table_name} already in adm schema — skipping';
            ELSE
                {else_clause}
            END IF;
        END $$;
    """


def make_reverse_sql(table_name):
    """Move table back from adm schema to public as literal-dot name."""
    literal_name = f'adm.{table_name}'
    return f"""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'adm'
                  AND table_name = '{table_name}'
            ) THEN
                ALTER TABLE adm.{table_name} RENAME TO "{literal_name}";
                ALTER TABLE adm."{literal_name}" SET SCHEMA public;
                RAISE NOTICE 'Reversed: adm.{table_name} -> public."{literal_name}"';
            END IF;
        END $$;
    """


def verify_migration(apps, schema_editor):
    """Post-migration verification: no literal-dot tables remain in public."""
    if schema_editor.connection.vendor != 'postgresql':
        return

    with schema_editor.connection.cursor() as cursor:
        for table in TABLES:
            literal_name = f'adm.{table}'
            # Fail if the literal-dot table STILL exists in public
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name = %s",
                [literal_name],
            )
            if cursor.fetchone():
                raise RuntimeError(
                    f"MIGRATION VERIFICATION FAILED: "
                    f"Table '{literal_name}' still in public schema!"
                )
            # Verify it's in adm OR doesn't exist at all (never created)
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'adm' AND table_name = %s",
                [table],
            )
            if not cursor.fetchone():
                print(
                    f"  NOTE: Table '{table}' not found in adm schema "
                    f"(may not have been created yet)"
                )


class Migration(migrations.Migration):

    dependencies = [
        ('administrate', '0002_alter_customfield_external_id'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=make_forward_sql(table),
                    reverse_sql=make_reverse_sql(table),
                )
                for table in TABLES
            ],
            state_operations=[
                migrations.AlterModelTable(
                    name='coursetemplate',
                    table='"adm"."course_templates"',
                ),
                migrations.AlterModelTable(
                    name='coursetemplatepricelevel',
                    table='"adm"."course_template_price_levels"',
                ),
                migrations.AlterModelTable(
                    name='customfield',
                    table='"adm"."custom_fields"',
                ),
                migrations.AlterModelTable(
                    name='instructor',
                    table='"adm"."instructors"',
                ),
                migrations.AlterModelTable(
                    name='location',
                    table='"adm"."locations"',
                ),
                migrations.AlterModelTable(
                    name='pricelevel',
                    table='"adm"."pricelevels"',
                ),
                migrations.AlterModelTable(
                    name='venue',
                    table='"adm"."venues"',
                ),
            ],
        ),
        migrations.RunPython(verify_migration, migrations.RunPython.noop),
    ]
