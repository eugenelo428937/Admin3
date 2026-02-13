"""
Tests for sync_instructors management command.
"""
from io import StringIO
from unittest.mock import patch
from django.test import TestCase
from django.core.management import call_command
from django.contrib.auth.models import User
from administrate.models import Instructor
from tutorials.models import TutorialInstructor
from tutorials.models.staff import Staff


class SyncInstructorsTest(TestCase):
    """Test sync_instructors command with tutorial matching."""

    def setUp(self):
        # Create tutorial instructor chain: User → Staff → TutorialInstructor
        self.user = User.objects.create_user(
            username='jdoe', first_name='John', last_name='Doe'
        )
        self.staff = Staff.objects.create(user=self.user)
        self.tut_instructor = TutorialInstructor.objects.create(
            staff=self.staff, is_active=True
        )

    def _mock_api_response(self, instructors):
        return {
            'data': {
                'contacts': {
                    'edges': [{'node': i} for i in instructors],
                    'pageInfo': {'hasNextPage': False}
                }
            }
        }

    @patch('administrate.management.commands.sync_instructors.AdministrateAPIService')
    def test_matched_instructor_gets_fk(self, MockAPI):
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'instr-1', 'firstName': 'John', 'lastName': 'Doe',
             'email': 'john@test.com', 'legacyId': None},
        ])

        out = StringIO()
        call_command('sync_instructors', '--no-prompt', stdout=out)

        instr = Instructor.objects.get(external_id='instr-1')
        self.assertEqual(instr.tutorial_instructor, self.tut_instructor)

    @patch('administrate.management.commands.sync_instructors.AdministrateAPIService')
    def test_case_insensitive_name_matching(self, MockAPI):
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'instr-1', 'firstName': 'JOHN', 'lastName': 'DOE',
             'email': 'john@test.com', 'legacyId': None},
        ])

        out = StringIO()
        call_command('sync_instructors', '--no-prompt', stdout=out)

        instr = Instructor.objects.get(external_id='instr-1')
        self.assertEqual(instr.tutorial_instructor, self.tut_instructor)

    @patch('administrate.management.commands.sync_instructors.AdministrateAPIService')
    def test_unmatched_api_instructors_reported(self, MockAPI):
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'instr-1', 'firstName': 'John', 'lastName': 'Doe',
             'email': 'john@test.com', 'legacyId': None},
            {'id': 'instr-2', 'firstName': 'Unknown', 'lastName': 'Person',
             'email': 'unknown@test.com', 'legacyId': None},
        ])

        out = StringIO()
        call_command('sync_instructors', '--no-prompt', stdout=out)
        output = out.getvalue()

        self.assertIn('Administrate instructor(s) had no match', output)

    @patch('administrate.management.commands.sync_instructors.AdministrateAPIService')
    def test_no_prompt_flag(self, MockAPI):
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'instr-1', 'firstName': 'John', 'lastName': 'Doe',
             'email': 'john@test.com', 'legacyId': None},
        ])

        out = StringIO()
        call_command('sync_instructors', '--no-prompt', stdout=out)
        output = out.getvalue()

        # No error output
        self.assertIn('Sync completed', output)
