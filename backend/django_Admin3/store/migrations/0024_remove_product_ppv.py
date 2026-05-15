"""Phase 5 Task 4: move product_product_variation from Product to MaterialProduct.

This is the final API-breaking change for Phase 5. It combines three
operations to complete the transition started in migrations 0021–0023:

1. **Drop the transitional trigger** ``material_products_sync_ppv_from_parent``
   (installed in migration 0023). The trigger was only needed while the
   Django ORM wrote PPV to the parent ``products`` table; after this
   migration the ORM writes PPV directly to the
   ``material_products`` subclass column.

2. **RemoveField from Product** — drops the
   ``products.product_product_variation_id`` column from the parent
   table. Django default behaviour (DB + state).

3. **State-only AddField on MaterialProduct** — registers the existing
   ``material_products.product_product_variation_id`` DB column
   (created in migration 0021 via raw SQL) with Django's model state.
   Wrapped in ``SeparateDatabaseAndState`` with empty
   ``database_operations`` because the DB column already exists.

Order matters: drop the trigger BEFORE removing the column it reads.
"""
from django.db import migrations, models
import django.db.models.deletion


_CREATE_TRIGGER_SQL = """
CREATE OR REPLACE FUNCTION
    "acted"."sync_material_product_ppv_from_parent"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- On INSERT/UPDATE of material_products, if product_product_variation_id
    -- is NULL, fetch the value from the parent products table via shared PK.
    IF NEW.product_product_variation_id IS NULL THEN
        SELECT p.product_product_variation_id
          INTO NEW.product_product_variation_id
          FROM "acted"."products" p
         WHERE p.purchasable_ptr_id = NEW.product_ptr_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
    "material_products_sync_ppv_from_parent"
ON "acted"."material_products";

CREATE TRIGGER "material_products_sync_ppv_from_parent"
BEFORE INSERT OR UPDATE
ON "acted"."material_products"
FOR EACH ROW
EXECUTE FUNCTION "acted"."sync_material_product_ppv_from_parent"();
"""

_DROP_TRIGGER_SQL = """
DROP TRIGGER IF EXISTS
    "material_products_sync_ppv_from_parent"
ON "acted"."material_products";

DROP FUNCTION IF EXISTS
    "acted"."sync_material_product_ppv_from_parent"();
"""


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0023_alter_materialproduct_ppv_not_null'),
        ('catalog_products', '__first__'),
    ]

    operations = [
        # 1. Drop the transitional trigger first — it's about to become
        #    redundant because the Django ORM will now write PPV directly
        #    to material_products.
        migrations.RunSQL(
            sql=_DROP_TRIGGER_SQL,
            reverse_sql=_CREATE_TRIGGER_SQL,
        ),
        # 2. RemoveField from the parent Product (drops the
        #    products.product_product_variation_id column).
        migrations.RemoveField(
            model_name='product',
            name='product_product_variation',
        ),
        # 3. State-only AddField on MaterialProduct. The DB column already
        #    exists (added in migration 0021's raw SQL and backfilled in
        #    0022), so database_operations is empty.
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='materialproduct',
                    name='product_product_variation',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='material_products',
                        to='catalog_products.productproductvariation',
                        help_text='The product variation (template + variation '
                                  'combination) this material maps to in the catalog.',
                    ),
                ),
            ],
        ),
    ]
