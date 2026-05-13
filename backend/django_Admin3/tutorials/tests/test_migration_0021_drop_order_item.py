"""Schema introspection test for the 0021_tutorial_registration_drop_order_item migration.

Verifies that after migrate:
- `acted.tutorial_registrations` has no `order_item_id` column.
- The partial unique index `uniq_active_reg_per_student_session` exists.
- The `tutorial_choice_id` column exists and is nullable.
"""
from django.db import connection
from django.test import TestCase


class Migration0021SchemaTests(TestCase):
    def test_order_item_id_column_does_not_exist(self):
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'acted'
                  AND table_name = 'tutorial_registrations'
                """
            )
            cols = {row[0] for row in cur.fetchall()}
        self.assertNotIn('order_item_id', cols)
        # Sanity: tutorial_choice_id still there.
        self.assertIn('tutorial_choice_id', cols)
        self.assertIn('student_id', cols)
        self.assertIn('tutorial_session_id', cols)

    def test_tutorial_choice_id_is_nullable(self):
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'acted'
                  AND table_name = 'tutorial_registrations'
                  AND column_name = 'tutorial_choice_id'
                """
            )
            row = cur.fetchone()
        self.assertIsNotNone(row, 'tutorial_choice_id column missing')
        self.assertEqual(row[0], 'YES')

    def test_partial_unique_index_still_exists(self):
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname = 'acted'
                  AND tablename = 'tutorial_registrations'
                  AND indexname = 'uniq_active_reg_per_student_session'
                """
            )
            row = cur.fetchone()
        self.assertIsNotNone(
            row, 'partial unique index uniq_active_reg_per_student_session missing',
        )
