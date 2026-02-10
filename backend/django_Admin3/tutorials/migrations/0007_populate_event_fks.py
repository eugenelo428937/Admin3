"""
Migration 0007: Populate event FK columns and rename product column.

1. Populate venue_id by matching old venue VARCHAR → tutorial_venues.name
2. Populate location_id by matching catalog_products.shortname → tutorial_locations.name
3. Rename exam_session_subject_product_variation_id → product_id
4. Drop the old venue VARCHAR column (superseded by venue_id FK)
"""

from django.db import migrations


def populate_fks_forward(apps, schema_editor):
    """Populate venue_id and location_id on tutorial_events."""
    from tutorials.services.populate_event_fks import populate_venue_ids, populate_location_ids

    venue_count = populate_venue_ids()
    location_count = populate_location_ids()
    print(f"\n  Populated {venue_count} venue_id and {location_count} location_id values")


def populate_fks_reverse(apps, schema_editor):
    """Reverse: clear venue_id and location_id (old venue text still preserved)."""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("UPDATE acted.tutorial_events SET venue_id = NULL, location_id = NULL")


class Migration(migrations.Migration):

    # Non-atomic: RunPython UPDATEs the table, then RunSQL ALTERs it.
    # PostgreSQL forbids ALTER on a table with pending trigger events
    # in the same transaction.
    atomic = False

    dependencies = [
        ('tutorials', '0006_data_migration_adm_to_acted'),
    ]

    operations = [
        # Step 1: Populate FK columns using existing data
        migrations.RunPython(populate_fks_forward, populate_fks_reverse),

        # Step 2: Rename the product FK column
        migrations.RunSQL(
            sql='ALTER TABLE acted.tutorial_events RENAME COLUMN exam_session_subject_product_variation_id TO product_id',
            reverse_sql='ALTER TABLE acted.tutorial_events RENAME COLUMN product_id TO exam_session_subject_product_variation_id',
        ),

        # Step 3: Drop old venue VARCHAR column (data now lives in venue_id FK)
        migrations.RunSQL(
            sql='ALTER TABLE acted.tutorial_events DROP COLUMN IF EXISTS venue',
            reverse_sql="ALTER TABLE acted.tutorial_events ADD COLUMN venue VARCHAR(255)",
        ),
    ]
