from unittest.mock import patch, MagicMock
from django.test import TestCase
from administrate.models import ApiAuditLog
from administrate.services.api_service import AdministrateAPIService


class TestApiAuditLogging(TestCase):

    def _create_service_with_mock_session(self, mock_response):
        """Helper to create an API service with a mocked session."""
        mock_session = MagicMock()
        mock_session.post.return_value = mock_response

        with patch('administrate.services.api_service.AdministrateAuthService') as mock_auth:
            mock_auth_instance = MagicMock()
            mock_auth_instance.get_access_token.return_value = 'fake-token'
            mock_auth.return_value = mock_auth_instance

            service = AdministrateAPIService()
            service.session = mock_session

        return service

    def test_execute_query_logs_successful_call(self):
        """Successful API call creates an audit log entry."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': {'courseTemplates': []}}

        service = self._create_service_with_mock_session(mock_response)
        ApiAuditLog.set_current_command('test_command')
        service.execute_query('query { test }', {'var': 'val'})

        self.assertEqual(ApiAuditLog.objects.count(), 1)
        log = ApiAuditLog.objects.first()
        self.assertEqual(log.command, 'test_command')
        self.assertEqual(log.operation, 'query')
        self.assertTrue(log.success)
        self.assertEqual(log.status_code, 200)
        self.assertEqual(log.variables, {'var': 'val'})
        self.assertIsNotNone(log.response_body)
        self.assertIsNotNone(log.duration_ms)

    def test_execute_query_logs_failed_call(self):
        """Failed API call creates an audit log entry with error details."""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = 'Internal Server Error'

        service = self._create_service_with_mock_session(mock_response)
        ApiAuditLog.set_current_command('test_command')

        with self.assertRaises(Exception):
            service.execute_query('mutation { create }')

        self.assertEqual(ApiAuditLog.objects.count(), 1)
        log = ApiAuditLog.objects.first()
        self.assertFalse(log.success)
        self.assertEqual(log.status_code, 500)
        self.assertIn('500', log.error_message)
        self.assertEqual(log.operation, 'mutation')

    def test_detects_query_vs_mutation(self):
        """Operation type is detected from the GraphQL string."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': {}}

        service = self._create_service_with_mock_session(mock_response)

        service.execute_query('mutation CreateEvent { event { create } }')
        log = ApiAuditLog.objects.first()
        self.assertEqual(log.operation, 'mutation')

    def test_query_with_graphql_errors_logged(self):
        """GraphQL errors in the response body are logged."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': None,
            'errors': [{'message': 'Field not found'}]
        }

        service = self._create_service_with_mock_session(mock_response)

        with self.assertRaises(Exception):
            service.execute_query('query { badField }')

        log = ApiAuditLog.objects.first()
        self.assertFalse(log.success)
        self.assertIn('errors', log.error_message)

    def test_ignore_errors_still_logs(self):
        """When ignore_errors=True, GraphQL errors are logged but don't raise."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': {'result': 'ok'},
            'errors': [{'message': 'Warning'}]
        }

        service = self._create_service_with_mock_session(mock_response)
        result = service.execute_query('query { test }', ignore_errors=True)

        self.assertIsNotNone(result)
        log = ApiAuditLog.objects.first()
        # ignore_errors means success stays True
        self.assertTrue(log.success)
