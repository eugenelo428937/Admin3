"""
Tests for the manage_events management command.
"""
import unittest
from unittest.mock import Mock, patch
from django.test import TestCase
from django.core.management import call_command
from django.core.management.base import CommandError
from io import StringIO
from administrate.management.commands.manage_events import Command

class ManageEventsCommandTest(TestCase):
    """Test cases for manage_events command."""

    def setUp(self):
        """Set up test fixtures."""
        self.command = Command()
        self.mock_api_service = Mock()
        self.mock_event_service = Mock()

    @patch('administrate.management.commands.manage_events.AdministrateAPIService')
    @patch('administrate.management.commands.manage_events.EventManagementService')
    def test_handle_set_soldout_processes_events_in_batches(self, mock_event_service_class, mock_api_service_class):
        """Test that set-soldout processes events correctly with batch pagination."""
        # Mock the services
        mock_event_service_class.return_value = self.mock_event_service
        mock_api_service_class.return_value = self.mock_api_service

        # Mock event_service.get_events to return events, then empty (pagination complete)
        self.mock_event_service.get_events.side_effect = [
            [f"event_{i}" for i in range(100)],  # First call - 100 events
            []  # Second call - no more events (pagination complete)
        ]

        # Mock successful soldout updates
        self.mock_event_service.set_event_soldout.return_value = {
            'data': {'event': {'id': 'test'}}
        }

        # Prepare command options
        options = {
            'sitting': '25S',
            'state': 'published',
            'soldout': 'True',
            'dry_run': False,
            'batch_size': 500,
            'verbosity': 1
        }

        # Execute the command
        out = StringIO()
        self.command.stdout = out
        self.command.handle_set_soldout(self.mock_event_service, options)

        # Verify that get_events was called for pagination
        self.mock_event_service.get_events.assert_called()

        # Verify that set_event_soldout was called exactly 100 times (once per event)
        self.assertEqual(self.mock_event_service.set_event_soldout.call_count, 100)

        # Check output contains expected information
        output = out.getvalue()
        self.assertIn("Processing batch of 100 events", output)
        self.assertIn("Successfully updated: 100", output)

    @patch('administrate.management.commands.manage_events.AdministrateAPIService')
    @patch('administrate.management.commands.manage_events.EventManagementService')
    def test_handle_set_soldout_stops_on_empty_batch(self, mock_event_service_class, mock_api_service_class):
        """Test that pagination stops when an empty batch is returned."""
        # Mock the services
        mock_event_service_class.return_value = self.mock_event_service
        mock_api_service_class.return_value = self.mock_api_service

        # Return events only once, then empty
        self.mock_event_service.get_events.side_effect = [
            [f"event_{i}" for i in range(10)],  # First call - 10 events
            []  # Second call - empty, should stop
        ]

        # Mock successful soldout updates
        self.mock_event_service.set_event_soldout.return_value = {
            'data': {'event': {'id': 'test'}}
        }

        options = {
            'sitting': '25S',
            'state': 'published',
            'soldout': 'True',
            'dry_run': False,
            'batch_size': 10,
            'verbosity': 1
        }

        out = StringIO()
        self.command.stdout = out
        self.command.handle_set_soldout(self.mock_event_service, options)

        # Verify events were processed exactly once each
        self.assertEqual(self.mock_event_service.set_event_soldout.call_count, 10)

        # Verify get_events was called twice (first batch + check for more)
        self.assertEqual(self.mock_event_service.get_events.call_count, 2)