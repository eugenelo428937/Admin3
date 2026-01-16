"""Data migration to populate store.Bundle and store.BundleProduct tables.

Part of 001-store-app-consolidation feature.
Migrates bundle data from the old ExamSessionSubjectBundle structure to the new
store.Bundle and store.BundleProduct tables.

Migration mapping:
  - acted_exam_session_subject_bundles → "acted"."bundles"
  - acted_exam_session_subject_bundle_products → "acted"."bundle_products"
"""
from django.db import migrations


def migrate_bundles(apps, schema_editor):
    """
    Migrate bundle data from old ESSB tables to new store tables.

    This migration:
    1. Creates store.Bundle records from ExamSessionSubjectBundle
    2. Creates store.BundleProduct records from ExamSessionSubjectBundleProduct
    3. Maps ESSPV IDs to store.Product IDs (they're the same due to ID preservation)
    """
    with schema_editor.connection.cursor() as cursor:
        # Check if source table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'acted_exam_session_subject_bundles'
            )
        """)
        table_exists = cursor.fetchone()[0]

        if not table_exists:
            # Source table doesn't exist (e.g., fresh test database) - skip migration
            return

        # Check if source table has any data
        cursor.execute("SELECT COUNT(*) FROM acted_exam_session_subject_bundles")
        count = cursor.fetchone()[0]

        if count == 0:
            # No data to migrate
            return

        try:
            # Step 1: Migrate ExamSessionSubjectBundle → store.Bundle
            # Note: bundle_id in source maps to bundle_template_id in target
            cursor.execute("""
                INSERT INTO "acted"."bundles" (
                    id,
                    bundle_template_id,
                    exam_session_subject_id,
                    is_active,
                    override_name,
                    override_description,
                    display_order,
                    created_at,
                    updated_at
                )
                SELECT
                    essb.id,
                    essb.bundle_id,  -- FK to catalog.ProductBundle
                    essb.exam_session_subject_id,
                    essb.is_active,
                    essb.override_name,
                    essb.override_description,
                    essb.display_order,
                    essb.created_at,
                    essb.updated_at
                FROM acted_exam_session_subject_bundles essb
                ON CONFLICT (id) DO NOTHING
            """)

            # Update sequence to avoid ID conflicts
            cursor.execute("""
                SELECT setval(
                    pg_get_serial_sequence('"acted"."bundles"', 'id'),
                    COALESCE((SELECT MAX(id) FROM "acted"."bundles"), 1),
                    true
                )
            """)

            # Step 2: Migrate ExamSessionSubjectBundleProduct → store.BundleProduct
            # The product_id maps directly since store.Product uses same IDs as ESSPV
            cursor.execute("""
                INSERT INTO "acted"."bundle_products" (
                    id,
                    bundle_id,
                    product_id,
                    default_price_type,
                    quantity,
                    sort_order,
                    is_active,
                    created_at,
                    updated_at
                )
                SELECT
                    essbp.id,
                    essbp.bundle_id,  -- Maps to new store.Bundle (same IDs)
                    essbp.exam_session_subject_product_variation_id,  -- Maps to store.Product (same IDs as ESSPV)
                    essbp.default_price_type,
                    essbp.quantity,
                    essbp.sort_order,
                    essbp.is_active,
                    essbp.created_at,
                    essbp.updated_at
                FROM acted_exam_session_subject_bundle_products essbp
                -- Only include bundle products where both bundle and product exist
                WHERE EXISTS (
                    SELECT 1 FROM "acted"."bundles" b
                    WHERE b.id = essbp.bundle_id
                )
                AND EXISTS (
                    SELECT 1 FROM "acted"."products" p
                    WHERE p.id = essbp.exam_session_subject_product_variation_id
                )
                ON CONFLICT (id) DO NOTHING
            """)

            # Update bundle_products sequence
            cursor.execute("""
                SELECT setval(
                    pg_get_serial_sequence('"acted"."bundle_products"', 'id'),
                    COALESCE((SELECT MAX(id) FROM "acted"."bundle_products"), 1),
                    true
                )
            """)

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not migrate bundle data: {e}")


def reverse_migration(apps, schema_editor):
    """Reverse migration - clear the bundle tables."""
    BundleProduct = apps.get_model('store', 'BundleProduct')
    Bundle = apps.get_model('store', 'Bundle')

    BundleProduct.objects.all().delete()
    Bundle.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0002_migrate_product_data'),
    ]

    operations = [
        migrations.RunPython(migrate_bundles, reverse_migration),
    ]
