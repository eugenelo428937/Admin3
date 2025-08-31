# Generated migration for filtering system performance indexes

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('exam_sessions_subjects_products', '0008_new_bundle_structure'),
    ]

    operations = [
        # Index on acted_exam_session_subject_products for active filtering
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_essp_subject_product "
            "ON acted_exam_session_subject_products (exam_session_subject_id, product_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_essp_subject_product;"
        ),
        
        # Index on acted_exam_session_subject_products with created_at for ordering
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_essp_created "
            "ON acted_exam_session_subject_products (created_at DESC);",
            reverse_sql="DROP INDEX IF EXISTS idx_essp_created;"
        ),
        
        # Index on product-product group relationships
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_product_groups_lookup "
            "ON acted_product_productgroup (product_id, product_group_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_product_groups_lookup;"
        ),
        
        # Index on subjects code for fast subject lookups
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_subjects_code "
            "ON acted_subjects (code);",
            reverse_sql="DROP INDEX IF EXISTS idx_subjects_code;"
        ),
        
        # Index on product-product variation relationships
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_product_productvariation_lookup "
            "ON acted_product_productvariation (product_id, product_variation_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_product_productvariation_lookup;"
        ),
        
        # Index for product search by name (commonly used in filtering)
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_products_fullname "
            "ON acted_products (fullname);",
            reverse_sql="DROP INDEX IF EXISTS idx_products_fullname;"
        ),
        
        # Index for exam_session_subject_id filtering (most common filter)
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_essp_exam_session_subject "
            "ON acted_exam_session_subject_products (exam_session_subject_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_essp_exam_session_subject;"
        ),
        
        # Index for product_id filtering
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_essp_product "
            "ON acted_exam_session_subject_products (product_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_essp_product;"
        ),
    ]