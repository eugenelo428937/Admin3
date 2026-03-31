# Move email_master_components from acted schema to public schema.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("email_system", "0019_remove_closing_salutation_staff"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql='ALTER TABLE "acted"."email_master_components" SET SCHEMA public;',
                    reverse_sql='ALTER TABLE "public"."email_master_components" SET SCHEMA acted;',
                ),
            ],
            state_operations=[
                migrations.AlterModelTable(
                    name="emailmastercomponent",
                    table="email_master_components",
                ),
            ],
        ),
    ]
