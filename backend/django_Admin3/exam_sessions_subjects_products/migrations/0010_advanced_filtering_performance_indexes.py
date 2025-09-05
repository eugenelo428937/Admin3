# Advanced performance indexes for filtering system optimization
# Phase 3: Database Performance Optimization

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('exam_sessions_subjects_products', '0009_add_filtering_performance_indexes'),
        ('products', '0010_refactored_filter_system'),  # Ensure acted_filter_group table exists
    ]

    operations = [
        # Basic index for common filter combinations (subject + product)
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_essp_subject_product_composite "
            "ON acted_exam_session_subject_products (exam_session_subject_id, product_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_essp_subject_product_composite;"
        ),
        
        # Index for exam session subjects (frequently joined)
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_exam_session_subjects_lookup "
            "ON acted_exam_session_subjects (exam_session_id, subject_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_exam_session_subjects_lookup;"
        ),
        
        # Index for filter group relationships (navbar filtering)
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_filter_groups_name_lookup "
            "ON acted_filter_group (name);",
            reverse_sql="DROP INDEX IF EXISTS idx_filter_groups_name_lookup;"
        ),
    ]