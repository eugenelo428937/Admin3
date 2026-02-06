"""
Tests for column removal verification (US6).

Verifies that redundant columns have been removed from adm tables
and retained columns are still present.
"""
from django.db import connection
from django.test import TestCase


class ColumnRemovalTest(TestCase):
    """Verify redundant ADM columns removed, retained columns present."""

    def _column_exists(self, table, column):
        """Check if a column exists in the adm schema."""
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_schema = 'adm' AND table_name = %s "
                "AND column_name = %s",
                [table, column],
            )
            return cursor.fetchone() is not None

    # --- CourseTemplate ---
    def test_course_template_code_removed(self):
        """T045a: code column removed from course_templates."""
        self.assertFalse(self._column_exists('course_templates', 'code'))

    def test_course_template_title_removed(self):
        """T045b: title column removed from course_templates."""
        self.assertFalse(self._column_exists('course_templates', 'title'))

    def test_course_template_categories_removed(self):
        """T045c: categories column removed from course_templates."""
        self.assertFalse(self._column_exists('course_templates', 'categories'))

    def test_course_template_active_removed(self):
        """T045d: active column removed from course_templates."""
        self.assertFalse(self._column_exists('course_templates', 'active'))

    def test_course_template_retained_columns(self):
        """T045e: retained columns present on course_templates."""
        for col in ['id', 'external_id', 'event_learning_mode', 'custom_fields',
                     'tutorial_course_template_id', 'created_at', 'updated_at']:
            self.assertTrue(
                self._column_exists('course_templates', col),
                f"Expected column '{col}' missing from course_templates",
            )

    # --- Instructor ---
    def test_instructor_first_name_removed(self):
        """T045f: first_name column removed from instructors."""
        self.assertFalse(self._column_exists('instructors', 'first_name'))

    def test_instructor_last_name_removed(self):
        """T045g: last_name column removed from instructors."""
        self.assertFalse(self._column_exists('instructors', 'last_name'))

    def test_instructor_email_removed(self):
        """T045h: email column removed from instructors."""
        self.assertFalse(self._column_exists('instructors', 'email'))

    def test_instructor_retained_columns(self):
        """T045i: retained columns present on instructors."""
        for col in ['id', 'external_id', 'legacy_id', 'is_active',
                     'tutorial_instructor_id', 'created_at', 'updated_at',
                     'last_synced']:
            self.assertTrue(
                self._column_exists('instructors', col),
                f"Expected column '{col}' missing from instructors",
            )

    # --- Location ---
    def test_location_name_removed(self):
        """T045j: name column removed from locations."""
        self.assertFalse(self._column_exists('locations', 'name'))

    def test_location_code_removed(self):
        """T045k: code column removed from locations."""
        self.assertFalse(self._column_exists('locations', 'code'))

    def test_location_active_removed(self):
        """T045l: active column removed from locations."""
        self.assertFalse(self._column_exists('locations', 'active'))

    def test_location_retained_columns(self):
        """T045m: retained columns present on locations."""
        for col in ['id', 'external_id', 'legacy_id',
                     'tutorial_location_id', 'created_at', 'updated_at']:
            self.assertTrue(
                self._column_exists('locations', col),
                f"Expected column '{col}' missing from locations",
            )

    # --- Venue ---
    def test_venue_name_removed(self):
        """T045n: name column removed from venues."""
        self.assertFalse(self._column_exists('venues', 'name'))

    def test_venue_description_removed(self):
        """T045o: description column removed from venues."""
        self.assertFalse(self._column_exists('venues', 'description'))

    def test_venue_retained_columns(self):
        """T045p: retained columns present on venues."""
        for col in ['id', 'external_id', 'location_id',
                     'tutorial_venue_id', 'created_at', 'updated_at']:
            self.assertTrue(
                self._column_exists('venues', col),
                f"Expected column '{col}' missing from venues",
            )
