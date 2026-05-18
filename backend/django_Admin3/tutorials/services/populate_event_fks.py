"""
Populate venue_id and location_id FK columns on tutorial_events.

venue_id:    matched via old venue VARCHAR column → tutorial_venues.name
location_id: matched via catalog_products.shortname → tutorial_locations.name

Both functions use single UPDATE statements (atomic, idempotent).
Called from migration 0007 and can be re-run safely.
"""

from django.db import connection


def populate_venue_ids():
    """Set venue_id on tutorial_events by matching old venue text to tutorial_venues.name."""
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE acted.tutorial_events te
            SET venue_id = tv.id
            FROM acted.tutorial_venues tv
            WHERE te.venue = tv.name
              AND te.venue IS NOT NULL
              AND te.venue != ''
        """)
        return cursor.rowcount


def populate_location_ids():
    """Set location_id on tutorial_events by matching catalog product shortname to tutorial_locations.name."""
    with connection.cursor() as cursor:
        # Detect current column name (renamed by migration 0007)
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'acted'
              AND table_name = 'tutorial_events'
              AND column_name IN ('product_id', 'exam_session_subject_product_variation_id')
        """)
        col = cursor.fetchone()[0]

        # Post-Release-B: store.Product is now an MTI subclass of
        # store.Purchasable — acted.products.id was renamed to
        # acted.products.purchasable_ptr_id by store.0010_product_to_mti_subclass.
        # This service is called both as a one-shot migration op (from
        # tutorials/0007, before store.0010 runs → column is still `id`) AND
        # from tests running post all migrations (column is `purchasable_ptr_id`).
        # Detect which PK column name is current on acted.products.
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'acted'
              AND table_name = 'products'
              AND column_name IN ('id', 'purchasable_ptr_id')
        """)
        product_pk_col = cursor.fetchone()[0]

        # Phase 5 Task 4b: product_product_variation_id moved off
        # acted.products onto acted.material_products. Detect which
        # table holds the column and use it. Material-only join (Tutorial
        # rows that don't have a material counterpart are skipped).
        cursor.execute("""
            SELECT table_name
            FROM information_schema.columns
            WHERE table_schema = 'acted'
              AND column_name = 'product_product_variation_id'
              AND table_name IN ('products', 'material_products')
            ORDER BY CASE table_name
                WHEN 'material_products' THEN 0
                WHEN 'products' THEN 1
            END
            LIMIT 1
        """)
        ppv_row = cursor.fetchone()
        if ppv_row is None:
            return 0
        ppv_table = ppv_row[0]
        if ppv_table == 'material_products':
            cursor.execute(f"""
                UPDATE acted.tutorial_events te
                SET location_id = tl.id
                FROM acted.products sp
                JOIN acted.material_products mp
                  ON mp.product_ptr_id = sp.{product_pk_col}
                JOIN acted.catalog_product_product_variations ppv
                  ON ppv.id = mp.product_product_variation_id
                JOIN acted.catalog_products cp
                  ON cp.id = ppv.product_id
                JOIN acted.tutorial_locations tl
                  ON tl.name = cp.shortname
                WHERE sp.{product_pk_col} = te.{col}
            """)
        else:
            cursor.execute(f"""
                UPDATE acted.tutorial_events te
                SET location_id = tl.id
                FROM acted.products sp
                JOIN acted.catalog_product_product_variations ppv
                  ON ppv.id = sp.product_product_variation_id
                JOIN acted.catalog_products cp
                  ON cp.id = ppv.product_id
                JOIN acted.tutorial_locations tl
                  ON tl.name = cp.shortname
                WHERE sp.{product_pk_col} = te.{col}
            """)
        return cursor.rowcount
