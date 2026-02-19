"""
Tests for sync_course_template_price_levels management command.
"""
from io import StringIO
from django.test import TestCase
from django.core.management import call_command
from administrate.models import CourseTemplate, PriceLevel


class SyncCourseTemplatePriceLevelsTest(TestCase):
    """Test sync_course_template_price_levels dependency validation."""

    def test_fails_without_course_templates(self):
        """Should abort if no CourseTemplate records exist."""
        PriceLevel.objects.create(external_id='pl-1', name='Standard')

        out = StringIO()
        call_command('sync_course_template_price_levels', '--no-prompt', stdout=out)
        output = out.getvalue()

        self.assertIn('Dependency not met', output)
        self.assertIn('CourseTemplate', output)

    def test_fails_without_price_levels(self):
        """Should abort if no PriceLevel records exist."""
        CourseTemplate.objects.create(external_id='ct-1')

        out = StringIO()
        call_command('sync_course_template_price_levels', '--no-prompt', stdout=out)
        output = out.getvalue()

        self.assertIn('Dependency not met', output)
        self.assertIn('PriceLevel', output)

    def test_no_prompt_argument_accepted(self):
        """--no-prompt should be accepted without error."""
        out = StringIO()
        # Will fail on dependency check, but --no-prompt should be accepted
        call_command('sync_course_template_price_levels', '--no-prompt', stdout=out)
        # No ArgumentError thrown means flag is accepted
