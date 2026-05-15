"""Tests for store.MaterialProduct (Phase 1 of MTI specialization).

MaterialProduct is the MTI subclass of store.Product for eBook/Printed/Hub
items — the products that fit the catalog template + variation pattern.

Phase 1: empty marker subclass (just a parent_link to Product). The
product_product_variation FK stays on Product through Phases 1-4; it
moves to MaterialProduct as a local field in Phase 5.
"""
from django.test import TestCase


class MaterialProductImportTests(TestCase):
    def test_importable_from_store_models(self):
        from store.models import MaterialProduct
        self.assertTrue(hasattr(MaterialProduct, '_meta'))

    def test_schema_qualified_db_table(self):
        from store.models import MaterialProduct
        self.assertEqual(
            MaterialProduct._meta.db_table,
            '"acted"."material_products"',
        )


class MaterialProductMTITests(TestCase):
    """MaterialProduct is an MTI subclass of store.Product."""

    def test_is_subclass_of_product(self):
        from store.models import MaterialProduct, Product
        self.assertTrue(issubclass(MaterialProduct, Product))

    def test_is_subclass_of_purchasable_transitively(self):
        from store.models import MaterialProduct, Purchasable
        self.assertTrue(issubclass(MaterialProduct, Purchasable))

    def test_has_product_ptr_parent_link(self):
        from store.models import MaterialProduct, Product
        parent_link = MaterialProduct._meta.parents.get(Product)
        self.assertIsNotNone(
            parent_link,
            "No MTI parent_link found from MaterialProduct to Product",
        )

    def test_inherits_exam_session_subject_from_product(self):
        """ESS FK is inherited from the intermediate Product parent."""
        from store.models import MaterialProduct, Product
        field = MaterialProduct._meta.get_field('exam_session_subject')
        self.assertEqual(field.model, Product)

    def test_inherits_product_product_variation_from_product(self):
        """PPV FK stays on Product through Phases 1-4; MaterialProduct
        inherits it via MTI. The 'move PPV to MaterialProduct' rewrite
        happens in Phase 5 (see design doc §6 Phase 5).
        """
        from store.models import MaterialProduct, Product
        field = MaterialProduct._meta.get_field('product_product_variation')
        self.assertEqual(
            field.model, Product,
            "Phase 1: PPV remains on Product; MaterialProduct inherits it",
        )
        self.assertEqual(
            field.related_model._meta.label,
            'catalog_products.ProductProductVariation',
        )

    def test_no_local_fields_beyond_parent_link(self):
        """Phase 1 / Phase 5 Task 3: MaterialProduct has no locally-declared
        Python model fields beyond the MTI parent_link.

        The `product_product_variation_id` column exists at the DB level
        (added by migrations 0021-0023), but the Python field declaration
        on MaterialProduct is deferred to Task 4, when the same-named field
        is removed from the parent Product (Django MTI prohibits redeclaring
        a parent's field in the subclass while both coexist in model state).
        """
        from store.models import MaterialProduct
        local_field_names = {
            f.name for f in MaterialProduct._meta.local_fields
        }
        # `product_ptr` is the auto-generated MTI parent_link OneToOneField
        self.assertEqual(local_field_names, {'product_ptr'})


class MaterialProductPhase5MigrationTests(TestCase):
    """Regression tests for Phase 5 Task 3 DB-level migration (0021-0023).

    Verifies that the `product_product_variation_id` column was correctly
    added to and backfilled in `acted.material_products` at the database
    level, even though the Python model field is not yet declared on
    MaterialProduct (deferred to Task 4).
    """

    def test_db_column_exists_and_not_null(self):
        """Migration 0021 added the column; 0023 made it NOT NULL."""
        from django.db import connection
        with connection.cursor() as cur:
            cur.execute(
                'SELECT column_name, is_nullable '
                'FROM information_schema.columns '
                'WHERE table_schema = %s '
                '  AND table_name = %s '
                '  AND column_name = %s',
                ['acted', 'material_products', 'product_product_variation_id'],
            )
            row = cur.fetchone()
        self.assertIsNotNone(row, 'Column product_product_variation_id not found')
        col_name, is_nullable = row
        self.assertEqual(col_name, 'product_product_variation_id')
        self.assertEqual(
            is_nullable, 'NO',
            'Phase 5 Task 3: column must be NOT NULL after migration 0023',
        )

    def test_db_column_has_no_nulls(self):
        """Migration 0022 backfilled all 6847 rows; none should be NULL."""
        from django.db import connection
        with connection.cursor() as cur:
            cur.execute(
                'SELECT COUNT(*) FROM "acted"."material_products" '
                'WHERE product_product_variation_id IS NULL'
            )
            nulls = cur.fetchone()[0]
        self.assertEqual(
            nulls, 0,
            f'Phase 5 Task 3: {nulls} rows still have NULL product_product_variation_id',
        )

    def test_db_column_fk_points_to_ppv_table(self):
        """Migration 0021 created a FK to acted.catalog_product_product_variations."""
        from django.db import connection
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT ccu.table_name AS referenced_table
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = 'acted'
                  AND tc.table_name = 'material_products'
                  AND kcu.column_name = 'product_product_variation_id'
                """
            )
            row = cur.fetchone()
        self.assertIsNotNone(
            row,
            'No FK constraint found for material_products.product_product_variation_id',
        )
        self.assertEqual(
            row[0],
            'catalog_product_product_variations',
            'FK must reference acted.catalog_product_product_variations',
        )

    def test_sync_trigger_exists(self):
        """Migration 0023 installed a BEFORE INSERT/UPDATE trigger that
        auto-populates product_product_variation_id from the parent products
        table, allowing the NOT NULL constraint to be satisfied without a
        Python field declaration on MaterialProduct.
        """
        from django.db import connection
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT trigger_name
                FROM information_schema.triggers
                WHERE event_object_schema = 'acted'
                  AND event_object_table = 'material_products'
                  AND trigger_name = 'material_products_sync_ppv_from_parent'
                """
            )
            rows = cur.fetchall()
        self.assertGreater(
            len(rows), 0,
            'Phase 5 Task 3: sync trigger material_products_sync_ppv_from_parent not found',
        )
