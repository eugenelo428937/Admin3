"""Tests for the administrate app system checks.

These checks run during `manage.py check` and at server startup
(runserver/gunicorn). They must NOT run during build-phase commands
like collectstatic or migrate — that requirement is implicit in
Django's check framework lifecycle and is exercised by the absence of
boot-time validation in AppConfig.ready().
"""

from django.core.checks import run_checks
from django.test import override_settings


@override_settings(
    DEBUG=False,
    ADMINISTRATE_WEBHOOK_SECRET='',
    ADMINISTRATE_WEBHOOK_ROUTE_TOKEN='',
)
def test_empty_credentials_in_non_debug_produces_check_errors():
    errors = run_checks()
    error_ids = {e.id for e in errors}
    assert 'administrate.E001' in error_ids


@override_settings(DEBUG=True)
def test_empty_credentials_in_debug_skipped():
    errors = run_checks()
    error_ids = {e.id for e in errors}
    assert 'administrate.E001' not in error_ids


@override_settings(
    DEBUG=False,
    ADMINISTRATE_WEBHOOK_SECRET='real-secret',
    ADMINISTRATE_WEBHOOK_ROUTE_TOKEN='real-token',
)
def test_credentials_set_no_check_errors():
    errors = run_checks()
    administrate_errors = [e for e in errors if e.id.startswith('administrate.')]
    assert administrate_errors == []
