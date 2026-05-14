from unittest.mock import patch

import pytest

from administrate.exceptions import MissingDependencyError
from administrate.models import WebhookInbox
from administrate.services.webhook_dispatch import (
    MAX_ATTEMPTS,
    apply_inbox_row,
)


def _raise(exc):
    """Helper: build a callable that raises a specific exception."""
    def _fn(_node):
        raise exc
    return _fn


@pytest.fixture
def received_row(db):
    return WebhookInbox.objects.create(
        administrate_webhook_id='wh_disp_1',
        administrate_event_timestamp='2026-05-14T12:00:00Z',
        webhook_type_name='Event Updated',
        entity_type='event',
        entity_external_id='evt_disp_1',
        raw_payload={
            'metadata': {},
            'payload': {'event': {'id': 'evt_disp_1'}},
        },
    )


@pytest.mark.django_db
class TestApplyInboxRow:
    @patch('administrate.services.webhook_dispatch.EVENT_HANDLERS', new={
        'Event Updated': lambda node: None,
    })
    def test_success_marks_applied(self, received_row):
        apply_inbox_row(received_row.id)
        received_row.refresh_from_db()
        assert received_row.status == WebhookInbox.STATUS_APPLIED
        assert received_row.applied_at is not None
        assert received_row.attempts == 1

    @patch('administrate.services.webhook_dispatch.EVENT_HANDLERS', new={
        'Event Updated': _raise(MissingDependencyError('CourseTemplate', 'ct_x')),
    })
    def test_transient_failure_increments_and_reraises(self, received_row):
        with pytest.raises(MissingDependencyError):
            apply_inbox_row(received_row.id)
        received_row.refresh_from_db()
        assert received_row.status == WebhookInbox.STATUS_FAILED
        assert received_row.attempts == 1
        assert 'CourseTemplate' in received_row.error_message

    def test_unknown_webhook_type_marks_dead_immediately(self, received_row):
        received_row.webhook_type_name = 'Event Mystery'
        received_row.save()
        apply_inbox_row(received_row.id)  # should NOT raise
        received_row.refresh_from_db()
        assert received_row.status == WebhookInbox.STATUS_DEAD
        assert 'Event Mystery' in received_row.error_message

    @patch('administrate.services.webhook_dispatch.EVENT_HANDLERS', new={
        'Event Updated': _raise(ValueError('boom')),
    })
    def test_attempts_exhausted_marks_dead_and_swallows(self, received_row):
        received_row.attempts = MAX_ATTEMPTS - 1
        received_row.save()
        # Should NOT raise — exhaustion is a terminal state, not a transient one.
        apply_inbox_row(received_row.id)
        received_row.refresh_from_db()
        assert received_row.status == WebhookInbox.STATUS_DEAD
        assert received_row.attempts == MAX_ATTEMPTS

    def test_already_applied_row_short_circuits(self, received_row):
        received_row.status = WebhookInbox.STATUS_APPLIED
        received_row.save()
        apply_inbox_row(received_row.id)  # no-op, no exception
        received_row.refresh_from_db()
        assert received_row.attempts == 0  # didn't increment
