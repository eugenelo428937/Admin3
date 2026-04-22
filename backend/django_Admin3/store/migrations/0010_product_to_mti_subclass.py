"""Convert store.Product into an MTI subclass of store.Purchasable.

DB-side: rename products.id -> products.purchasable_ptr_id, add FK to
purchasables.id, drop created_at/updated_at/is_active (now on parent).
State-side: Django model graph updated to MTI.

Rollback: reverse_sql restores the three dropped columns and copies
their original values back from the parent Purchasable rows. Lossless
because Task 4's backfill preserved created_at/updated_at/is_active
onto Purchasable.

Existing Purchasable rows from migration 0007 already have matching IDs
(preserved by Task 4's backfill), so the FK is immediately valid.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0009_create_fee_generic_purchasable'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=[
                        'ALTER TABLE acted.products RENAME COLUMN id TO purchasable_ptr_id;',
                        'ALTER TABLE acted.products ADD CONSTRAINT products_purchasable_ptr_fk '
                        'FOREIGN KEY (purchasable_ptr_id) REFERENCES acted.purchasables(id) '
                        'ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;',
                        'ALTER TABLE acted.products DROP COLUMN created_at;',
                        'ALTER TABLE acted.products DROP COLUMN updated_at;',
                        'ALTER TABLE acted.products DROP COLUMN is_active;',
                    ],
                    reverse_sql=[
                        'ALTER TABLE acted.products ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;',
                        'ALTER TABLE acted.products ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();',
                        'ALTER TABLE acted.products ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();',
                        # Restore historical values from parent Purchasable rows.
                        # Must run BEFORE dropping the FK constraint and renaming
                        # purchasable_ptr_id back to id, while the JOIN predicate
                        # is still intact.
                        'UPDATE acted.products p '
                        'SET created_at = pu.created_at, updated_at = pu.updated_at, is_active = pu.is_active '
                        'FROM acted.purchasables pu '
                        'WHERE p.purchasable_ptr_id = pu.id;',
                        'ALTER TABLE acted.products DROP CONSTRAINT products_purchasable_ptr_fk;',
                        'ALTER TABLE acted.products RENAME COLUMN purchasable_ptr_id TO id;',
                    ],
                ),
            ],
            state_operations=[
                migrations.RemoveField(model_name='product', name='created_at'),
                migrations.RemoveField(model_name='product', name='updated_at'),
                migrations.RemoveField(model_name='product', name='is_active'),
                migrations.RemoveField(model_name='product', name='id'),
                migrations.AddField(
                    model_name='product',
                    name='purchasable_ptr',
                    field=models.OneToOneField(
                        auto_created=True, on_delete=models.deletion.CASCADE,
                        parent_link=True, primary_key=True, serialize=False,
                        to='store.purchasable',
                    ),
                ),
            ],
        ),
    ]
