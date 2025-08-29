# Advanced performance indexes for filtering system optimization
# Phase 3: Database Performance Optimization

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('exam_sessions_subjects_products', '0009_add_filtering_performance_indexes'),
    ]

    operations = [
        # Composite index for common filter combinations (subject + product)
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_essp_subject_product_composite "
            "ON acted_exam_session_subject_products (exam_session_subject_id, product_id, created_at DESC);",
            reverse_sql="DROP INDEX IF EXISTS idx_essp_subject_product_composite;"
        ),
        
        # Index for variation filtering with prices (common in unified search)
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_esspv_filtering "
            "ON acted_exam_session_subject_product_variations (exam_session_subject_product_id, product_product_variation_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_esspv_filtering;"
        ),
        
        # Index for bundle filtering
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bundles_active_subject "
            "ON acted_exam_session_subject_bundles (is_active, exam_session_subject_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_bundles_active_subject;"
        ),
        
        # Index for bundle product relationships
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bundle_products_lookup "
            "ON acted_exam_session_subject_bundle_products (bundle_id, exam_session_subject_product_variation_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_bundle_products_lookup;"
        ),
        
        # Covering index for product details (includes commonly accessed columns)
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_covering "
            "ON acted_products (id, code, fullname, shortname, description);",
            reverse_sql="DROP INDEX IF EXISTS idx_products_covering;"
        ),
        
        # Index for filter group relationships (navbar filtering)
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_groups_name_lookup "
            "ON acted_product_groups (name);",
            reverse_sql="DROP INDEX IF EXISTS idx_product_groups_name_lookup;"
        ),
        
        # Index for exam session subjects (frequently joined)
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_session_subjects_lookup "
            "ON acted_exam_session_subjects (exam_session_id, subject_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_exam_session_subjects_lookup;"
        ),
        
        # Index for price lookups in variations
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_variation_type "
            "ON acted_exam_session_subject_product_variation_prices (variation_id, price_type);",
            reverse_sql="DROP INDEX IF EXISTS idx_prices_variation_type;"
        ),
        
        # Partial index for active exam sessions (improves filtering performance)
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_sessions_active "
            "ON acted_exam_sessions (id) WHERE is_active = true;",
            reverse_sql="DROP INDEX IF EXISTS idx_exam_sessions_active;"
        ),
        
        # Text search index for product names (GIN index for better text search)
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_fullname_gin "
            "ON acted_products USING gin (to_tsvector('english', fullname));",
            reverse_sql="DROP INDEX IF EXISTS idx_products_fullname_gin;"
        ),
        
        # Index for tutorial events filtering
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tutorial_events_esspv "
            "ON acted_tutorial_events (exam_session_subject_product_variation_id, is_soldout);",
            reverse_sql="DROP INDEX IF EXISTS idx_tutorial_events_esspv;"
        ),
        
        # Index for filter configurations (dynamic filtering)
        migrations.RunSQL(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_filter_configs_active "
            "ON acted_filter_configurations (is_active, name);",
            reverse_sql="DROP INDEX IF EXISTS idx_filter_configs_active;"
        ),
    ]