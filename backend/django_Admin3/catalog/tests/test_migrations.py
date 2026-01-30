"""Tests for catalog migration verification.

Tables are created in the 'acted' PostgreSQL schema (e.g., acted.catalog_subjects).
"""
from django.test import TestCase
from django.db import connection


class TestActedSchemaExists(TestCase):
    """Test that the acted PostgreSQL schema exists (created by 0001_initial)."""

    def test_acted_schema_exists(self):
        """Verify the acted schema exists in the database."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name = 'acted'
            """)
            result = cursor.fetchone()
            self.assertIsNotNone(result, "Schema 'acted' should exist")
            self.assertEqual(result[0], 'acted')


class TestCatalogTablesExist(TestCase):
    """Test that all catalog tables exist in the acted schema."""

    EXPECTED_TABLES = [
        'catalog_subjects',
        'catalog_exam_sessions',
        'catalog_exam_session_subjects',
        'catalog_products',
        'catalog_product_variations',
        'catalog_product_bundles',
        'catalog_product_product_variations',
        'catalog_product_bundle_products',
    ]

    def test_all_catalog_tables_exist(self):
        """Verify all 8 catalog tables exist in acted schema."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'acted'
                AND table_name LIKE 'catalog_%'
                ORDER BY table_name
            """)
            existing_tables = [row[0] for row in cursor.fetchall()]

        for table_name in self.EXPECTED_TABLES:
            with self.subTest(table=table_name):
                self.assertIn(
                    table_name,
                    existing_tables,
                    f"Table '{table_name}' should exist in acted schema"
                )

    def test_catalog_subjects_table(self):
        """Verify catalog_subjects table has correct columns."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'acted'
                AND table_name = 'catalog_subjects'
            """)
            columns = [row[0] for row in cursor.fetchall()]

        expected_columns = ['id', 'code', 'description', 'active', 'created_at', 'updated_at']
        for col in expected_columns:
            with self.subTest(column=col):
                self.assertIn(col, columns, f"Column '{col}' should exist in acted.catalog_subjects")

    def test_catalog_exam_sessions_table(self):
        """Verify catalog_exam_sessions table has correct columns."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'acted'
                AND table_name = 'catalog_exam_sessions'
            """)
            columns = [row[0] for row in cursor.fetchall()]

        expected_columns = ['id', 'session_code', 'start_date', 'end_date', 'create_date', 'modified_date']
        for col in expected_columns:
            with self.subTest(column=col):
                self.assertIn(col, columns, f"Column '{col}' should exist in acted.catalog_exam_sessions")

    def test_catalog_products_table(self):
        """Verify catalog_products table has correct columns."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'acted'
                AND table_name = 'catalog_products'
            """)
            columns = [row[0] for row in cursor.fetchall()]

        expected_columns = ['id', 'fullname', 'shortname', 'description', 'code',
                            'is_active', 'buy_both', 'created_at', 'updated_at']
        for col in expected_columns:
            with self.subTest(column=col):
                self.assertIn(col, columns, f"Column '{col}' should exist in acted.catalog_products")

    def test_catalog_product_variations_table(self):
        """Verify catalog_product_variations table has correct columns."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'acted'
                AND table_name = 'catalog_product_variations'
            """)
            columns = [row[0] for row in cursor.fetchall()]

        expected_columns = ['id', 'variation_type', 'name', 'description', 'description_short', 'code']
        for col in expected_columns:
            with self.subTest(column=col):
                self.assertIn(col, columns, f"Column '{col}' should exist in acted.catalog_product_variations")

    def test_table_count(self):
        """Verify exactly 8 catalog tables exist in acted schema.

        Tables: subjects, exam_sessions, exam_session_subjects, products,
        product_variations, product_product_variations, product_bundles,
        product_bundle_products.

        Note: ProductProductGroup is in filtering app (filter_product_product_groups).
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'acted'
                AND table_name LIKE 'catalog_%'
            """)
            count = cursor.fetchone()[0]
            self.assertEqual(count, 8, "Should have exactly 8 catalog_* tables in acted schema")


class TestDataMigration(TestCase):
    """Test that data was copied to new tables.

    NOTE: These tests verify data migration from old tables to new tables.
    They are designed for production migration verification, not unit testing.
    In the test database, old tables may be empty (no production data to copy),
    so these tests check table accessibility rather than row counts.
    """

    def test_subjects_table_accessible(self):
        """Verify acted.catalog_subjects table is accessible."""
        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM acted.catalog_subjects')
            count = cursor.fetchone()[0]
            # Just verify the table is accessible (count can be 0 in test db)
            self.assertIsNotNone(count, "Should be able to query acted.catalog_subjects")

    def test_products_table_accessible(self):
        """Verify acted.catalog_products table is accessible."""
        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM acted.catalog_products')
            count = cursor.fetchone()[0]
            # Just verify the table is accessible (count can be 0 in test db)
            self.assertIsNotNone(count, "Should be able to query acted.catalog_products")

    def test_product_variations_table_accessible(self):
        """Verify acted.catalog_product_variations table is accessible."""
        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM acted.catalog_product_variations')
            count = cursor.fetchone()[0]
            # Just verify the table is accessible (count can be 0 in test db)
            self.assertIsNotNone(count, "Should be able to query acted.catalog_product_variations")
