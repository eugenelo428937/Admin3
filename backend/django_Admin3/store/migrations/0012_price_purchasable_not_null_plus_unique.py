# Task 22 (Release B): Enforce `purchasable` NOT NULL on Price and restore
# the (purchasable, price_type) unique constraint that was dropped during
# the dual-write phase (see 0006_price_add_purchasable_fk).
#
# Why SeparateDatabaseAndState for the unique constraint:
#   The Price model uses a schema-qualified / quoted `db_table`
#   ('"acted"."prices"'). Django's schema editor cannot correctly resolve
#   that quoted identifier when computing the ALTER statement for
#   composite unique constraints — the same limitation that forced us to
#   use SeparateDatabaseAndState in 0006 when dropping the legacy
#   (product, price_type) unique. We follow the same pattern here for
#   symmetry (and to keep reverse migrations working cleanly).
#
# The AlterField for NOT NULL uses a plain AlterField: Django's schema
# editor handles simple column-level NOT NULL changes fine even on the
# quoted table.
#
# Pre-flight (dev DB, 2026-04-21): acted.prices has 1031 rows, 0 with
# purchasable_id IS NULL — the NOT NULL constraint applies cleanly.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0011_price_backfill_purchasable"),
    ]

    operations = [
        # 1. Flip purchasable -> NOT NULL.
        migrations.AlterField(
            model_name="price",
            name="purchasable",
            field=models.ForeignKey(
                help_text="The purchasable this price applies to.",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="prices",
                to="store.purchasable",
            ),
        ),

        # 2. Restore unique_together as (purchasable, price_type).
        #    Use SeparateDatabaseAndState because schema-qualified db_table
        #    breaks Django's automatic unique-constraint DDL.
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql='ALTER TABLE "acted"."prices" '
                        'ADD CONSTRAINT '
                        '"prices_purchasable_id_price_type_uniq" '
                        'UNIQUE (purchasable_id, price_type);',
                    reverse_sql='ALTER TABLE "acted"."prices" '
                                'DROP CONSTRAINT IF EXISTS '
                                '"prices_purchasable_id_price_type_uniq";',
                ),
            ],
            state_operations=[
                migrations.AlterUniqueTogether(
                    name="price",
                    unique_together={("purchasable", "price_type")},
                ),
            ],
        ),
    ]
