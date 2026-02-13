"""
Tests for sync_course_templates management command.
"""
from io import StringIO
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.core.management import call_command
from administrate.models import CourseTemplate, CustomField
from tutorials.models import TutorialCourseTemplate


class SyncCourseTemplatesTest(TestCase):
    """Test sync_course_templates command with tutorial matching."""

    def setUp(self):
        # Create required CustomField dependency
        CustomField.objects.create(
            external_id='cf-1', label='Test Field',
            field_type='text', entity_type='Event',
        )
        # Create tutorial course templates
        self.tut_cm2 = TutorialCourseTemplate.objects.create(
            code='CM2', title='CM2 Course', is_active=True
        )
        self.tut_sa1 = TutorialCourseTemplate.objects.create(
            code='SA1', title='SA1 Course', is_active=True
        )

    def _mock_api_response(self, templates):
        """Build a mock API response."""
        return {
            'data': {
                'courseTemplates': {
                    'edges': [
                        {'node': t} for t in templates
                    ],
                    'pageInfo': {'hasNextPage': False}
                }
            }
        }

    @patch('administrate.management.commands.sync_course_templates.AdministrateAPIService')
    def test_matched_records_get_fk_set(self, MockAPI):
        """Matched API records should have tutorial_course_template FK set."""
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'api-1', 'code': 'CM2', 'eventLearningMode': 'CLASSROOM', 'customFieldValues': []},
            {'id': 'api-2', 'code': 'SA1', 'eventLearningMode': 'LMS', 'customFieldValues': []},
        ])

        out = StringIO()
        call_command('sync_course_templates', '--no-prompt', stdout=out)

        ct1 = CourseTemplate.objects.get(external_id='api-1')
        ct2 = CourseTemplate.objects.get(external_id='api-2')
        self.assertEqual(ct1.tutorial_course_template, self.tut_cm2)
        self.assertEqual(ct2.tutorial_course_template, self.tut_sa1)

    @patch('administrate.management.commands.sync_course_templates.AdministrateAPIService')
    def test_unmatched_tutorial_records_reported(self, MockAPI):
        """Tutorial records without API match should be reported."""
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'api-1', 'code': 'CM2', 'eventLearningMode': 'CLASSROOM', 'customFieldValues': []},
        ])

        out = StringIO()
        call_command('sync_course_templates', '--no-prompt', stdout=out)
        output = out.getvalue()

        # SA1 exists in tutorial but not in API
        self.assertIn('tutorial course template(s) had no match', output)

    @patch('administrate.management.commands.sync_course_templates.AdministrateAPIService')
    def test_unmatched_api_records_reported(self, MockAPI):
        """API records without tutorial match should be reported."""
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'api-1', 'code': 'CM2', 'eventLearningMode': 'CLASSROOM', 'customFieldValues': []},
            {'id': 'api-3', 'code': 'UNKNOWN', 'eventLearningMode': 'LMS', 'customFieldValues': []},
        ])

        out = StringIO()
        call_command('sync_course_templates', '--no-prompt', stdout=out)
        output = out.getvalue()

        self.assertIn('Administrate course template(s) had no match', output)

    @patch('administrate.management.commands.sync_course_templates.AdministrateAPIService')
    def test_no_prompt_skips_prompting(self, MockAPI):
        """--no-prompt should skip interactive prompts."""
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'api-1', 'code': 'CM2', 'eventLearningMode': 'CLASSROOM', 'customFieldValues': []},
        ])

        out = StringIO()
        call_command('sync_course_templates', '--no-prompt', stdout=out)
        output = out.getvalue()

        self.assertIn('--no-prompt set', output)

    def test_dependency_validation_fails_without_custom_fields(self):
        """Should abort if CustomField (Event) records don't exist."""
        CustomField.objects.all().delete()

        out = StringIO()
        call_command('sync_course_templates', '--no-prompt', stdout=out)
        output = out.getvalue()

        self.assertIn('Dependency not met', output)

    @patch('administrate.management.commands.sync_course_templates.AdministrateAPIService')
    def test_case_insensitive_matching(self, MockAPI):
        """Code matching should be case-insensitive."""
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'api-1', 'code': 'cm2', 'eventLearningMode': 'CLASSROOM', 'customFieldValues': []},
        ])

        out = StringIO()
        call_command('sync_course_templates', '--no-prompt', stdout=out)

        ct = CourseTemplate.objects.get(external_id='api-1')
        self.assertEqual(ct.tutorial_course_template, self.tut_cm2)

    @patch('administrate.management.commands.sync_course_templates.AdministrateAPIService')
    def test_update_existing_record(self, MockAPI):
        """Existing records should be updated with new tutorial FK."""
        # Pre-create a record without tutorial FK
        CourseTemplate.objects.create(
            external_id='api-1',
            event_learning_mode='LMS',
        )

        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'api-1', 'code': 'CM2', 'eventLearningMode': 'CLASSROOM', 'customFieldValues': []},
        ])

        out = StringIO()
        call_command('sync_course_templates', '--no-prompt', stdout=out)
        output = out.getvalue()

        ct = CourseTemplate.objects.get(external_id='api-1')
        self.assertEqual(ct.tutorial_course_template, self.tut_cm2)
        self.assertEqual(ct.event_learning_mode, 'CLASSROOM')
        self.assertIn('Updated', output)
