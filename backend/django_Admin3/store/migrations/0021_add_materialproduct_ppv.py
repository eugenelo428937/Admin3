"""Phase 5 Task 3 (step 1): Add product_product_variation_id column to
acted.material_products as a NULLABLE FK.

Django MTI prohibits a subclass from redeclaring a field that already
exists on the parent (Product.product_product_variation). Therefore
this migration uses raw SQL (SeparateDatabaseAndState with
RunSQL + state_operations=[]) to add the column at the database level
only, without touching the Django model state.

The Python model field declaration on MaterialProduct is deferred to
Task 4, when migration 0024 removes the same-named field from the
parent Product model and the two tasks (RemoveField + AddField) are
applied together.

Migration 0022 backfills the column values from the parent Product row
(via shared MTI PK). Migration 0023 enforces NOT NULL.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0020_remove_kind_product_choice'),
        ('catalog_products', '__first__'),
    ]

    operations = [
        # SeparateDatabaseAndState: we run the DDL at the DB level but
        # leave the Django model state unchanged (MaterialProduct still
        # has no local product_product_variation field in Django's eyes).
        # Task 4's AlterField / AddField will update the model state when
        # the parent field is removed.
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE "acted"."material_products"
                        ADD COLUMN IF NOT EXISTS "product_product_variation_id" bigint
                            NULL
                            REFERENCES "acted"."catalog_product_product_variations" ("id")
                            DEFERRABLE INITIALLY DEFERRED;
                        CREATE INDEX IF NOT EXISTS
                            "material_products_product_product_variation_id_idx"
                        ON "acted"."material_products" ("product_product_variation_id");
                    """,
                    reverse_sql="""
                        DROP INDEX IF EXISTS
                            "material_products_product_product_variation_id_idx";
                        ALTER TABLE "acted"."material_products"
                        DROP COLUMN IF EXISTS "product_product_variation_id";
                    """,
                ),
            ],
            state_operations=[],  # no model-state change; field declared in Task 4
        ),
    ]
