"""
Tests for sync_venues management command.
"""
from io import StringIO
from unittest.mock import patch
from django.test import TestCase
from django.core.management import call_command
from administrate.models import Location, Venue
from tutorials.models import TutorialLocation, TutorialVenue


class SyncVenuesTest(TestCase):
    """Test sync_venues command with tutorial matching."""

    def setUp(self):
        # Tutorial data
        self.tut_london = TutorialLocation.objects.create(
            name='London', code='LON', is_active=True
        )
        self.tut_venue = TutorialVenue.objects.create(
            name='Conference Hall', location=self.tut_london
        )
        # Adm location with tutorial FK (must exist for venue resolution)
        self.adm_london = Location.objects.create(
            external_id='loc-1',
            tutorial_location=self.tut_london,
        )

    def _mock_api_response(self, venues):
        return {
            'data': {
                'venues': {
                    'edges': [{'node': v} for v in venues],
                    'pageInfo': {'hasNextPage': False}
                }
            }
        }

    @patch('administrate.management.commands.sync_venues.AdministrateAPIService')
    def test_matched_venue_gets_fk(self, MockAPI):
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'ven-1', 'name': 'Conference Hall',
             'description': '', 'location': {'id': 'loc-1'}},
        ])

        out = StringIO()
        call_command('sync_venues', '--no-prompt', stdout=out)

        venue = Venue.objects.get(external_id='ven-1')
        self.assertEqual(venue.tutorial_venue, self.tut_venue)

    @patch('administrate.management.commands.sync_venues.AdministrateAPIService')
    def test_case_insensitive_venue_name(self, MockAPI):
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'ven-1', 'name': 'CONFERENCE HALL',
             'description': '', 'location': {'id': 'loc-1'}},
        ])

        out = StringIO()
        call_command('sync_venues', '--no-prompt', stdout=out)

        venue = Venue.objects.get(external_id='ven-1')
        self.assertEqual(venue.tutorial_venue, self.tut_venue)

    @patch('administrate.management.commands.sync_venues.AdministrateAPIService')
    def test_dependency_validation_fails(self, MockAPI):
        """Venues sync should fail without locations."""
        Location.objects.all().delete()

        out = StringIO()
        call_command('sync_venues', '--no-prompt', stdout=out)
        output = out.getvalue()

        self.assertIn('Dependency not met', output)

    @patch('administrate.management.commands.sync_venues.AdministrateAPIService')
    def test_no_prompt_flag(self, MockAPI):
        mock_service = MockAPI.return_value
        mock_service.execute_query.return_value = self._mock_api_response([
            {'id': 'ven-1', 'name': 'Unknown Venue',
             'description': '', 'location': {'id': 'loc-1'}},
        ])

        out = StringIO()
        call_command('sync_venues', '--no-prompt', stdout=out)
        output = out.getvalue()

        # Should log unmatched (no tutorial venue named 'Unknown Venue')
        self.assertIn('Sync completed', output)
