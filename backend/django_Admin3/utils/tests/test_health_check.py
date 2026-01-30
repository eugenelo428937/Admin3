"""Tests for utils/health_check.py - Railway deployment health check.

Covers:
- health_check view returns 200 OK always
- System information (python version, environment)
- Debug info (settings module, request info, allowed hosts)
- Database connectivity check (success, degraded, error)
- Environment variable checks
- Railway-specific variable reporting
- Traceback output in debug/UAT mode
"""
from django.test import TestCase, RequestFactory, override_settings
from unittest.mock import patch, MagicMock
import json
import sys
import os

from utils.health_check import health_check


class TestHealthCheckBasic(TestCase):
    """Test basic health_check response."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_UTL_returns_200_ok(self):
        """Health check should always return 200 OK."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        self.assertEqual(response.status_code, 200)

    def test_UTL_returns_json(self):
        """Response should be valid JSON."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIsInstance(data, dict)

    def test_UTL_contains_status_field(self):
        """Response should contain 'status' field."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('status', data)

    def test_UTL_contains_checks(self):
        """Response should contain 'checks' section."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('checks', data)

    def test_UTL_contains_debug_info(self):
        """Response should contain 'debug_info' section."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('debug_info', data)


class TestHealthCheckSystemInfo(TestCase):
    """Test system information in health check."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_UTL_python_version(self):
        """Should include Python version."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        expected_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        self.assertEqual(data['python_version'], expected_version)

    def test_UTL_debug_setting(self):
        """Should include DEBUG setting."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('debug', data)
        self.assertIsInstance(data['debug'], bool)

    def test_UTL_environment_setting(self):
        """Should include environment setting."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('environment', data)


class TestHealthCheckDebugInfo(TestCase):
    """Test debug information in health check."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_UTL_settings_module(self):
        """Should include DJANGO_SETTINGS_MODULE."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('settings_module', data['debug_info'])

    def test_UTL_django_env(self):
        """Should include DJANGO_ENV."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('django_env', data['debug_info'])

    def test_UTL_request_path(self):
        """Should include request path."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertEqual(data['debug_info']['request_path'], '/api/health/')

    def test_UTL_request_method(self):
        """Should include request method."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertEqual(data['debug_info']['request_method'], 'GET')

    def test_UTL_request_host(self):
        """Should include request host."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('request_host', data['debug_info'])

    def test_UTL_allowed_hosts(self):
        """Should include allowed hosts."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('allowed_hosts', data['debug_info'])
        self.assertIn('allowed_hosts_count', data['debug_info'])


class TestHealthCheckDatabase(TestCase):
    """Test database connectivity in health check."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_UTL_database_connected(self):
        """When DB is available, should report 'connected'."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertEqual(data['checks']['database'], 'connected')
        self.assertEqual(data['status'], 'healthy')

    def test_UTL_database_config_info(self):
        """Should include database configuration info."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('database_engine', data['debug_info'])
        self.assertIn('database_name', data['debug_info'])

    @patch('utils.health_check.connection')
    def test_UTL_database_error_returns_starting(self, mock_connection):
        """When DB fails, status should be 'starting' but still return 200."""
        mock_connection.cursor.side_effect = Exception('Connection refused')
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['checks']['database'], 'error')
        self.assertEqual(data['status'], 'starting')
        self.assertIn('database_error', data['debug_info'])
        self.assertIn('database_error_type', data['debug_info'])

    @patch('utils.health_check.connection')
    def test_UTL_database_returns_unexpected_value(self, mock_connection):
        """When DB returns unexpected value, should report 'degraded'."""
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (0,)  # Not 1
        mock_connection.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_connection.cursor.return_value.__exit__ = MagicMock(return_value=False)

        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertEqual(data['checks']['database'], 'error')
        self.assertEqual(data['status'], 'degraded')

    @patch.dict(os.environ, {'DJANGO_ENV': 'uat'})
    @patch('utils.health_check.connection')
    def test_UTL_database_error_includes_traceback_in_uat(self, mock_connection):
        """In UAT, database errors should include traceback."""
        mock_connection.cursor.side_effect = Exception('Connection refused')
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('database_traceback', data['debug_info'])

    @override_settings(DEBUG=True)
    @patch('utils.health_check.connection')
    def test_UTL_database_error_includes_traceback_in_debug(self, mock_connection):
        """In DEBUG mode, database errors should include traceback."""
        mock_connection.cursor.side_effect = Exception('Connection refused')
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('database_traceback', data['debug_info'])


class TestHealthCheckEnvVariables(TestCase):
    """Test environment variable reporting in health check."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_UTL_env_variables_set(self):
        """Should report which environment variables are set."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('env_variables_set', data['debug_info'])
        env_vars = data['debug_info']['env_variables_set']
        self.assertIn('DATABASE_URL', env_vars)
        self.assertIn('DJANGO_SECRET_KEY', env_vars)
        self.assertIn('DJANGO_ENV', env_vars)
        self.assertIn('ALLOWED_HOSTS', env_vars)

    def test_UTL_railway_variables(self):
        """Should report Railway-specific variables."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('railway_variables', data['debug_info'])
        railway = data['debug_info']['railway_variables']
        self.assertIn('RAILWAY_ENVIRONMENT', railway)
        self.assertIn('RAILWAY_PUBLIC_DOMAIN', railway)
        self.assertIn('RAILWAY_PRIVATE_DOMAIN', railway)

    def test_UTL_database_url_set_flag(self):
        """Should include database_url_set boolean."""
        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        self.assertIn('database_url_set', data['debug_info'])
        self.assertIsInstance(data['debug_info']['database_url_set'], bool)


class TestHealthCheckAllowedHostsError(TestCase):
    """Test ALLOWED_HOSTS error handling."""

    def setUp(self):
        self.factory = RequestFactory()

    @patch('utils.health_check.settings')
    def test_UTL_allowed_hosts_exception(self, mock_settings):
        """Should handle ALLOWED_HOSTS access errors gracefully."""
        # Make ALLOWED_HOSTS raise an exception
        type(mock_settings).ALLOWED_HOSTS = property(
            lambda self: (_ for _ in ()).throw(Exception('Access denied'))
        )
        # Still need other settings
        mock_settings.DEBUG = False
        mock_settings.DJANGO_ENV = 'test'
        mock_settings.DATABASES = {'default': {'ENGINE': 'django.db.backends.postgresql', 'NAME': 'test', 'HOST': 'localhost', 'PORT': '5432'}}

        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)
        # Should still return 200 and include error info
        self.assertEqual(response.status_code, 200)
        self.assertIn('allowed_hosts_error', data['debug_info'])
