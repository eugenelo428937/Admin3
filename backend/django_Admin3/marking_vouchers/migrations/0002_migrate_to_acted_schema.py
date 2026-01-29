"""
Migrate marking_vouchers table from public schema to acted schema.

Uses SeparateDatabaseAndState to:
- Database: ALTER TABLE SET SCHEMA + RENAME (actual SQL)
- State: AlterModelTable (tells Django's migration state the db_table changed)

Forward: public.acted_marking_vouchers -> acted.marking_vouchers
Reverse: acted.marking_vouchers -> public.acted_marking_vouchers
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('marking_vouchers', '0001_initial'),
        ('orders', '0001_initial'),  # orders.0001 has FK to acted_marking_vouchers; must run before we move the table
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE public.acted_marking_vouchers SET SCHEMA acted; '
                        'ALTER TABLE acted.acted_marking_vouchers RENAME TO marking_vouchers;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE acted.marking_vouchers RENAME TO acted_marking_vouchers; '
                        'ALTER TABLE acted.acted_marking_vouchers SET SCHEMA public;'
                    ),
                ),
            ],
            state_operations=[
                migrations.AlterModelTable(
                    name='markingvoucher',
                    table='"acted"."marking_vouchers"',
                ),
            ],
        ),
    ]
