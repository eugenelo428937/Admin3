"""
Tests for sync_locations management command.
"""
from io import StringIO
from unittest.mock import patch
from django.test import TestCase
from django.core.management import call_command
from administrate.models import Location
from tutorials.models import TutorialLocation


class SyncLocationsTest(TestCase):
    """Test sync_locations command with tutorial matching."""

    def setUp(self):
        self.tut_london = TutorialLocation.objects.create(
            name='London', code='LON', is_active=True
        )
        self.tut_manchester = TutorialLocation.objects.create(
            name='Manchester', code='MAN', is_active=True
        )

    def _mock_api_response(self, locations):
        return {
            'data': {
                'locations': {
                    'edges': [{'node': l} for l in locations],
                    'pageInfo': {'hasNextPage': False}
                }
            }
        }

    @patch('administrate.management.commands.sync_locations.AdministrateAPIService')
    def test_matched_records_get_fk_set(self, MockAPI):
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'loc-1', 'name': 'London', 'legacyId': None},
            {'id': 'loc-2', 'name': 'Manchester', 'legacyId': None},
        ])

        out = StringIO()
        call_command('sync_locations', '--no-prompt', stdout=out)

        loc1 = Location.objects.get(external_id='loc-1')
        loc2 = Location.objects.get(external_id='loc-2')
        self.assertEqual(loc1.tutorial_location, self.tut_london)
        self.assertEqual(loc2.tutorial_location, self.tut_manchester)

    @patch('administrate.management.commands.sync_locations.AdministrateAPIService')
    def test_case_insensitive_name_matching(self, MockAPI):
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'loc-1', 'name': 'LONDON', 'legacyId': None},
        ])

        out = StringIO()
        call_command('sync_locations', '--no-prompt', stdout=out)

        loc = Location.objects.get(external_id='loc-1')
        self.assertEqual(loc.tutorial_location, self.tut_london)

    @patch('administrate.management.commands.sync_locations.AdministrateAPIService')
    def test_unmatched_tutorial_reported(self, MockAPI):
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'loc-1', 'name': 'London', 'legacyId': None},
        ])

        out = StringIO()
        call_command('sync_locations', '--no-prompt', stdout=out)
        output = out.getvalue()

        self.assertIn('tutorial location(s) had no match', output)

    @patch('administrate.management.commands.sync_locations.AdministrateAPIService')
    def test_no_prompt_flag(self, MockAPI):
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'loc-1', 'name': 'London', 'legacyId': None},
        ])

        out = StringIO()
        call_command('sync_locations', '--no-prompt', stdout=out)
        output = out.getvalue()

        self.assertIn('--no-prompt set', output)
