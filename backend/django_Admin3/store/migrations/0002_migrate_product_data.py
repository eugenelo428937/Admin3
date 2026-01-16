"""Data migration to populate store.Product and store.Price tables.

Part of 001-store-app-consolidation feature.
Migrates data from the old 4-table structure:
  ESS → ESSP → ESSPV → Price
To the new 2-join structure:
  ESS → store.Product → store.Price
"""
from django.db import migrations


def migrate_products_and_prices(apps, schema_editor):
    """
    Migrate data from ESSPV to store.Product and Price tables.

    This migration:
    1. Creates store.Product records from ESSPV records
    2. Creates store.Price records from old Price records
    3. Preserves the ESSPV ID as the Product ID for FK integrity
    """
    with schema_editor.connection.cursor() as cursor:
        # Check if source table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'acted_exam_session_subject_product_variations'
            )
        """)
        table_exists = cursor.fetchone()[0]

        if not table_exists:
            # Source table doesn't exist (e.g., fresh test database) - skip migration
            return

        # Check if source table has any data
        cursor.execute("SELECT COUNT(*) FROM acted_exam_session_subject_product_variations")
        count = cursor.fetchone()[0]

        if count == 0:
            # No data to migrate
            return

        # Step 1: Migrate ESSPV records to store.Product
        # The old model allowed multiple ESSPV records for the same ESS+PPV combination
        # through different ESSP records. The new model requires unique ESS+PPV pairs.
        # We use DISTINCT ON to select the first record (by ID) for each unique combination.
        try:
            cursor.execute("""
                INSERT INTO "acted"."products" (
                    id,
                    exam_session_subject_id,
                    product_product_variation_id,
                    product_code,
                    is_active,
                    created_at,
                    updated_at
                )
                SELECT DISTINCT ON (essp.exam_session_subject_id, esspv.product_product_variation_id)
                    esspv.id,
                    essp.exam_session_subject_id,
                    esspv.product_product_variation_id,
                    -- Generate product code based on variation type
                    -- Material/Marking: {subject}/{variation.code}{product.code}/{session}
                    -- Tutorial/Other: {subject}/{prefix}{product.code}{variation.code}/{session}-{id}
                    CASE
                        WHEN pv.variation_type IN ('eBook', 'Printed', 'Marking')
                        THEN s.code || '/' || COALESCE(pv.code, '') || p.code || '/' || es.session_code
                        WHEN esspv.product_code IS NOT NULL AND TRIM(esspv.product_code) != ''
                        THEN esspv.product_code || '-' || esspv.id::text
                        ELSE
                            s.code || '/' ||
                            UPPER(LEFT(pv.variation_type, 1)) ||
                            p.code ||
                            COALESCE(pv.code, '') ||
                            '/' || es.session_code ||
                            '-' || esspv.id::text
                    END AS product_code,
                    true AS is_active,
                    esspv.created_at,
                    esspv.updated_at
                FROM acted_exam_session_subject_product_variations esspv
                JOIN acted_exam_session_subject_products essp
                    ON essp.id = esspv.exam_session_subject_product_id
                JOIN "acted"."catalog_exam_session_subjects" ess
                    ON ess.id = essp.exam_session_subject_id
                JOIN "acted"."catalog_subjects" s
                    ON s.id = ess.subject_id
                JOIN "acted"."catalog_exam_sessions" es
                    ON es.id = ess.exam_session_id
                JOIN "acted"."catalog_product_product_variations" ppv
                    ON ppv.id = esspv.product_product_variation_id
                JOIN "acted"."catalog_products" p
                    ON p.id = ppv.product_id
                JOIN "acted"."catalog_product_variations" pv
                    ON pv.id = ppv.product_variation_id
                ORDER BY essp.exam_session_subject_id, esspv.product_product_variation_id, esspv.id
                ON CONFLICT (id) DO NOTHING
            """)

            # Update sequence to avoid ID conflicts
            cursor.execute("""
                SELECT setval(
                    pg_get_serial_sequence('"acted"."products"', 'id'),
                    COALESCE((SELECT MAX(id) FROM "acted"."products"), 1),
                    true
                )
            """)

            # Step 2: Migrate Price records
            # Only migrate prices for ESSPVs that became Products (some were deduplicated)
            cursor.execute("""
                INSERT INTO "acted"."prices" (
                    id,
                    product_id,
                    price_type,
                    amount,
                    currency,
                    created_at,
                    updated_at
                )
                SELECT
                    p.id,
                    p.variation_id,  -- Maps to Product ID (= ESSPV ID)
                    p.price_type,
                    p.amount,
                    p.currency,
                    p.created_at,
                    p.updated_at
                FROM acted_exam_session_subject_product_variation_price p
                -- Only include prices for products that exist after deduplication
                WHERE EXISTS (
                    SELECT 1 FROM "acted"."products" prod
                    WHERE prod.id = p.variation_id
                )
                ON CONFLICT (id) DO NOTHING
            """)

            # Update price sequence
            cursor.execute("""
                SELECT setval(
                    pg_get_serial_sequence('"acted"."prices"', 'id'),
                    COALESCE((SELECT MAX(id) FROM "acted"."prices"), 1),
                    true
                )
            """)

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not migrate product/price data: {e}")


def reverse_migration(apps, schema_editor):
    """Reverse migration - clear the new tables."""
    Product = apps.get_model('store', 'Product')
    Price = apps.get_model('store', 'Price')

    Price.objects.all().delete()
    Product.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0001_initial'),
        ('exam_sessions_subjects_products', '0002_update_fk_to_catalog'),
    ]

    operations = [
        migrations.RunPython(migrate_products_and_prices, reverse_migration),
    ]
