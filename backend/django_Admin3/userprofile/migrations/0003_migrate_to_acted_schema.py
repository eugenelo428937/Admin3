"""
Migrate userprofile tables from public schema to acted schema.

Uses SeparateDatabaseAndState to:
- Database: ALTER TABLE SET SCHEMA + RENAME (actual SQL)
- State: AlterModelTable (tells Django's migration state the db_table changed)

Moves all 4 userprofile tables together in a single migration
to preserve internal FK integrity (email, address, contact_number
all reference user_profile).

Forward: public.acted_user_profile_* -> acted.user_profile_*
Reverse: acted.user_profile_* -> public.acted_user_profile_*
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('userprofile', '0002_add_country_code_to_contact_number'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                # user_profile (parent table - migrate first)
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_user_profile SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_user_profile RENAME TO user_profile;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.user_profile RENAME TO acted_user_profile; '
                        'ALTER TABLE acted.acted_user_profile SET SCHEMA public;'
                    ),
                ),
                # user_profile_email
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_user_profile_email SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_user_profile_email RENAME TO user_profile_email;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.user_profile_email RENAME TO acted_user_profile_email; '
                        'ALTER TABLE acted.acted_user_profile_email SET SCHEMA public;'
                    ),
                ),
                # user_profile_address
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_user_profile_address SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_user_profile_address RENAME TO user_profile_address;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.user_profile_address RENAME TO acted_user_profile_address; '
                        'ALTER TABLE acted.acted_user_profile_address SET SCHEMA public;'
                    ),
                ),
                # user_profile_contact_number
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_user_profile_contact_number SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_user_profile_contact_number RENAME TO user_profile_contact_number;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.user_profile_contact_number RENAME TO acted_user_profile_contact_number; '
                        'ALTER TABLE acted.acted_user_profile_contact_number SET SCHEMA public;'
                    ),
                ),
            ],
            state_operations=[
                migrations.AlterModelTable(
                    name='userprofile',
                    table='"acted"."user_profile"',
                ),
                migrations.AlterModelTable(
                    name='userprofileemail',
                    table='"acted"."user_profile_email"',
                ),
                migrations.AlterModelTable(
                    name='userprofileaddress',
                    table='"acted"."user_profile_address"',
                ),
                migrations.AlterModelTable(
                    name='userprofilecontactnumber',
                    table='"acted"."user_profile_contact_number"',
                ),
            ],
        ),
    ]
