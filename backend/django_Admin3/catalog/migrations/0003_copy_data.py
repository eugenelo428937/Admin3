"""Data migration to copy existing data from old tables to new catalog tables.

This migration copies data from the original tables to the new acted schema tables.
Old tables are preserved for rollback capability.

Note: Tables are created in the 'acted' PostgreSQL schema (e.g., acted.catalog_subjects).
If source tables don't exist (e.g., in dev/test environments), the copy is skipped.
"""
from django.db import migrations


def table_exists(cursor, table_name):
    """Check if a table exists in the database."""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = %s
        );
    """, [table_name])
    return cursor.fetchone()[0]


def copy_subjects(apps, schema_editor):
    """Copy data from acted_subjects to acted.catalog_subjects."""
    with schema_editor.connection.cursor() as cursor:
        if not table_exists(cursor, 'acted_subjects'):
            return  # Source table doesn't exist, skip copy
        cursor.execute("""
            INSERT INTO acted.catalog_subjects (id, code, description, active, created_at, updated_at)
            SELECT id, code, description, active, created_at, updated_at
            FROM acted_subjects
            ON CONFLICT (id) DO NOTHING;
        """)
        # Update sequence to avoid ID conflicts
        cursor.execute("""
            SELECT setval(
                pg_get_serial_sequence('acted.catalog_subjects', 'id'),
                COALESCE((SELECT MAX(id) FROM acted.catalog_subjects), 1)
            );
        """)


def copy_exam_sessions(apps, schema_editor):
    """Copy data from acted_exam_sessions to acted.catalog_exam_sessions."""
    with schema_editor.connection.cursor() as cursor:
        if not table_exists(cursor, 'acted_exam_sessions'):
            return  # Source table doesn't exist, skip copy
        cursor.execute("""
            INSERT INTO acted.catalog_exam_sessions (id, session_code, start_date, end_date, create_date, modified_date)
            SELECT id, session_code, start_date, end_date, create_date, modified_date
            FROM acted_exam_sessions
            ON CONFLICT (id) DO NOTHING;
        """)
        cursor.execute("""
            SELECT setval(
                pg_get_serial_sequence('acted.catalog_exam_sessions', 'id'),
                COALESCE((SELECT MAX(id) FROM acted.catalog_exam_sessions), 1)
            );
        """)


def copy_product_variations(apps, schema_editor):
    """Copy data from acted_product_variations to acted.catalog_product_variations."""
    with schema_editor.connection.cursor() as cursor:
        if not table_exists(cursor, 'acted_product_variations'):
            return  # Source table doesn't exist, skip copy
        cursor.execute("""
            INSERT INTO acted.catalog_product_variations (id, variation_type, name, description, description_short, code)
            SELECT id, variation_type, name, description, description_short, code
            FROM acted_product_variations
            ON CONFLICT (id) DO NOTHING;
        """)
        cursor.execute("""
            SELECT setval(
                pg_get_serial_sequence('acted.catalog_product_variations', 'id'),
                COALESCE((SELECT MAX(id) FROM acted.catalog_product_variations), 1)
            );
        """)


def copy_products(apps, schema_editor):
    """Copy data from acted_products to acted.catalog_products."""
    with schema_editor.connection.cursor() as cursor:
        if not table_exists(cursor, 'acted_products'):
            return  # Source table doesn't exist, skip copy
        cursor.execute("""
            INSERT INTO acted.catalog_products (id, fullname, shortname, description, code, created_at, updated_at, is_active, buy_both)
            SELECT id, fullname, shortname, description, code, created_at, updated_at, is_active, buy_both
            FROM acted_products
            ON CONFLICT (id) DO NOTHING;
        """)
        cursor.execute("""
            SELECT setval(
                pg_get_serial_sequence('acted.catalog_products', 'id'),
                COALESCE((SELECT MAX(id) FROM acted.catalog_products), 1)
            );
        """)


def copy_product_bundles(apps, schema_editor):
    """Copy data from acted_product_bundles to acted.catalog_product_bundles."""
    with schema_editor.connection.cursor() as cursor:
        if not table_exists(cursor, 'acted_product_bundles'):
            return  # Source table doesn't exist, skip copy
        cursor.execute("""
            INSERT INTO acted.catalog_product_bundles (
                id, bundle_name, subject_id, bundle_description, is_featured,
                is_active, display_order, created_at, updated_at
            )
            SELECT
                id, bundle_name, subject_id, bundle_description, is_featured,
                is_active, display_order, created_at, updated_at
            FROM acted_product_bundles
            ON CONFLICT (id) DO NOTHING;
        """)
        cursor.execute("""
            SELECT setval(
                pg_get_serial_sequence('acted.catalog_product_bundles', 'id'),
                COALESCE((SELECT MAX(id) FROM acted.catalog_product_bundles), 1)
            );
        """)


def copy_product_product_variations(apps, schema_editor):
    """Copy data from acted_product_productvariation to acted.catalog_product_product_variations."""
    with schema_editor.connection.cursor() as cursor:
        if not table_exists(cursor, 'acted_product_productvariation'):
            return  # Source table doesn't exist, skip copy
        cursor.execute("""
            INSERT INTO acted.catalog_product_product_variations (id, product_id, product_variation_id)
            SELECT id, product_id, product_variation_id
            FROM acted_product_productvariation
            ON CONFLICT (id) DO NOTHING;
        """)
        cursor.execute("""
            SELECT setval(
                pg_get_serial_sequence('acted.catalog_product_product_variations', 'id'),
                COALESCE((SELECT MAX(id) FROM acted.catalog_product_product_variations), 1)
            );
        """)


def copy_product_product_groups(apps, schema_editor):
    """Copy data from acted_product_productgroup to acted.catalog_product_product_groups."""
    with schema_editor.connection.cursor() as cursor:
        if not table_exists(cursor, 'acted_product_productgroup'):
            return  # Source table doesn't exist, skip copy
        cursor.execute("""
            INSERT INTO acted.catalog_product_product_groups (id, product_id, product_group_id)
            SELECT id, product_id, product_group_id
            FROM acted_product_productgroup
            ON CONFLICT (id) DO NOTHING;
        """)
        cursor.execute("""
            SELECT setval(
                pg_get_serial_sequence('acted.catalog_product_product_groups', 'id'),
                COALESCE((SELECT MAX(id) FROM acted.catalog_product_product_groups), 1)
            );
        """)


def copy_product_bundle_products(apps, schema_editor):
    """Copy data from acted_product_bundle_products to acted.catalog_product_bundle_products."""
    with schema_editor.connection.cursor() as cursor:
        if not table_exists(cursor, 'acted_product_bundle_products'):
            return  # Source table doesn't exist, skip copy
        cursor.execute("""
            INSERT INTO acted.catalog_product_bundle_products (
                id, bundle_id, product_product_variation_id, default_price_type,
                quantity, sort_order, is_active, created_at, updated_at
            )
            SELECT
                id, bundle_id, product_product_variation_id, default_price_type,
                quantity, sort_order, is_active, created_at, updated_at
            FROM acted_product_bundle_products
            ON CONFLICT (id) DO NOTHING;
        """)
        cursor.execute("""
            SELECT setval(
                pg_get_serial_sequence('acted.catalog_product_bundle_products', 'id'),
                COALESCE((SELECT MAX(id) FROM acted.catalog_product_bundle_products), 1)
            );
        """)


def reverse_copy(apps, schema_editor):
    """Reverse migration - truncate the new tables (old tables are preserved).

    Uses IF EXISTS to handle cases where tables might not exist.
    """
    with schema_editor.connection.cursor() as cursor:
        # Truncate in reverse order of dependencies (IF EXISTS for safety)
        cursor.execute('TRUNCATE TABLE IF EXISTS acted.catalog_product_bundle_products CASCADE;')
        cursor.execute('TRUNCATE TABLE IF EXISTS acted.catalog_product_product_groups CASCADE;')
        cursor.execute('TRUNCATE TABLE IF EXISTS acted.catalog_product_product_variations CASCADE;')
        cursor.execute('TRUNCATE TABLE IF EXISTS acted.catalog_product_bundles CASCADE;')
        cursor.execute('TRUNCATE TABLE IF EXISTS acted.catalog_products CASCADE;')
        cursor.execute('TRUNCATE TABLE IF EXISTS acted.catalog_product_variations CASCADE;')
        cursor.execute('TRUNCATE TABLE IF EXISTS acted.catalog_exam_sessions CASCADE;')
        cursor.execute('TRUNCATE TABLE IF EXISTS acted.catalog_subjects CASCADE;')


class Migration(migrations.Migration):
    """Copy data from old tables to new catalog tables."""

    dependencies = [
        ('catalog', '0002_create_models'),
    ]

    operations = [
        # Copy data in order of dependencies (no FK dependencies first)
        migrations.RunPython(copy_subjects, reverse_copy),
        migrations.RunPython(copy_exam_sessions, reverse_copy),
        migrations.RunPython(copy_product_variations, reverse_copy),
        migrations.RunPython(copy_products, reverse_copy),
        migrations.RunPython(copy_product_bundles, reverse_copy),
        migrations.RunPython(copy_product_product_variations, reverse_copy),
        migrations.RunPython(copy_product_product_groups, reverse_copy),
        migrations.RunPython(copy_product_bundle_products, reverse_copy),
    ]
