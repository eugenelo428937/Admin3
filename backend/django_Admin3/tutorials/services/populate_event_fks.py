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
            WHERE sp.id = te.{col}
        """)
        return cursor.rowcount
