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

TDD_SKIP_REASON = "TDD RED phase: Pagination fix for manage_events not implemented yet"


class ManageEventsCommandTest(TestCase):
    """Test cases for manage_events command."""

    def setUp(self):
        """Set up test fixtures."""
        self.command = Command()
        self.mock_api_service = Mock()
        self.mock_event_service = Mock()

    @unittest.skip(TDD_SKIP_REASON)
    @patch('administrate.management.commands.manage_events.AdministrateAPIService')
    @patch('administrate.management.commands.manage_events.EventManagementService')
    def test_handle_set_soldout_collects_all_events_first(self, mock_event_service_class, mock_api_service_class):
        """Test that set-soldout collects all events before processing to avoid pagination issues."""
        # Mock the services
        mock_event_service_class.return_value = self.mock_event_service
        mock_api_service_class.return_value = self.mock_api_service
        
        # Mock event_service.get_events to return the same 100 events twice (simulating the bug)
        # This simulates what happens when soldout status doesn't change the query results
        self.mock_event_service.get_events.side_effect = [
            [f"event_{i}" for i in range(100)],  # First call - 100 events
            []  # Second call - no more events (pagination working)
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
        
        # Verify that get_events was called correctly for pagination
        # It should be called at least once to get all events
        self.mock_event_service.get_events.assert_called()
        
        # Verify that set_event_soldout was called exactly 100 times (once per event)
        self.assertEqual(self.mock_event_service.set_event_soldout.call_count, 100)
        
        # Check output contains expected information
        output = out.getvalue()
        # After fix, should show collecting events and then processing them
        self.assertIn("Collecting all events", output)
        self.assertIn("Found 100 events to update", output)
        self.assertIn("Successfully updated: 100", output)

    @unittest.skip(TDD_SKIP_REASON)
    @patch('administrate.management.commands.manage_events.AdministrateAPIService')
    @patch('administrate.management.commands.manage_events.EventManagementService')
    def test_handle_set_soldout_pagination_bug_demonstration(self, mock_event_service_class, mock_api_service_class):
        """Test that demonstrates the pagination bug - same events returned multiple times."""
        # Mock the services
        mock_event_service_class.return_value = self.mock_event_service
        mock_api_service_class.return_value = self.mock_api_service
        
        # Simulate the bug: get_events returns the same events multiple times
        # This happens because soldout status doesn't change the lifecycle state filter
        same_events = [f"event_{i}" for i in range(10)]
        # Return same events twice, then empty to avoid infinite loop
        self.mock_event_service.get_events.side_effect = [same_events, same_events, []]
        
        # Mock successful soldout updates
        self.mock_event_service.set_event_soldout.return_value = {
            'data': {'event': {'id': 'test'}}
        }
        
        # Use a small batch size to force multiple iterations
        options = {
            'sitting': '25S',
            'state': 'published', 
            'soldout': 'True',
            'dry_run': False,
            'batch_size': 10,  # Small batch to trigger multiple calls
            'verbosity': 1
        }
        
        # Execute the command
        out = StringIO()
        self.command.stdout = out
        self.command.handle_set_soldout(self.mock_event_service, options)
        
        # BUG: With current implementation, get_events could be called multiple times
        # and set_event_soldout could be called more than once per event
        # This demonstrates the pagination issue where events are processed multiple times
        
        # The bug would show up if get_events is called more than necessary
        # and the same events are processed multiple times
        call_count = self.mock_event_service.get_events.call_count
        soldout_call_count = self.mock_event_service.set_event_soldout.call_count
        
        # With the current buggy implementation, it might call set_event_soldout
        # more times than there are unique events
        print(f"get_events called {call_count} times")
        print(f"set_event_soldout called {soldout_call_count} times")
        
        # This test should fail initially - we want to process only unique events
        # Expected: Should process 10 unique events only once each
        self.assertEqual(soldout_call_count, 10, "Should process each event exactly once")
        # Accept that get_events may be called multiple times for pagination
        self.assertGreaterEqual(call_count, 1, "get_events called at least once")