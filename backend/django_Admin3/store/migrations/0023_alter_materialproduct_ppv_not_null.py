"""Phase 5 Task 3 (step 3): enforce NOT NULL on
acted.material_products.product_product_variation_id.

After migration 0022 backfilled all 6847 Material rows, no NULLs
remain. This migration:
  1. Creates a BEFORE INSERT OR UPDATE trigger on material_products that
     automatically copies product_product_variation_id from the parent
     products table via the shared MTI PK (product_ptr_id). This ensures
     that ORM inserts (which Django does not include the subclass column in)
     are automatically populated before the NOT NULL constraint is checked.
  2. Enforces NOT NULL on the column.

The trigger is the bridge between the Django ORM (which writes PPV to the
parent products table) and the subclass table (which needs the same value
for querying and for the forthcoming Task 4 field declaration on the Python
model). The trigger is dropped in Task 4's migration once the Python model
takes over.

Uses SeparateDatabaseAndState (database_operations only, no state change)
because the Python field declaration on MaterialProduct is deferred to
Task 4 (Django MTI prohibits redeclaring a parent's field in the subclass).
"""
from django.db import migrations


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
        ('store', '0022_backfill_materialproduct_ppv'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                # Step 1: Create the BEFORE INSERT trigger so that
                # ORM inserts that leave product_product_variation_id NULL
                # are auto-populated from the parent products row.
                migrations.RunSQL(
                    sql=_CREATE_TRIGGER_SQL,
                    reverse_sql=_DROP_TRIGGER_SQL,
                ),
                # Step 2: Now that the trigger guarantees the value is always
                # populated, enforce NOT NULL.
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE "acted"."material_products"
                        ALTER COLUMN "product_product_variation_id" SET NOT NULL;
                    """,
                    reverse_sql="""
                        ALTER TABLE "acted"."material_products"
                        ALTER COLUMN "product_product_variation_id" DROP NOT NULL;
                    """,
                ),
            ],
            state_operations=[],  # model-state change deferred to Task 4
        ),
    ]
