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
        'Event Updated': _raise(ValueError('transient db lock')),
    })
    def test_generic_exception_marks_failed_and_reraises(self, received_row):
        """Generic (non-MissingDependency) exceptions are treated as transient:
        FAILED + re-raise so a retrying task backend can reschedule.
        Exhaustion to DEAD is covered by test_attempts_exhausted_marks_dead.
        """
        with pytest.raises(ValueError):
            apply_inbox_row(received_row.id)
        received_row.refresh_from_db()
        assert received_row.status == WebhookInbox.STATUS_FAILED
        assert received_row.attempts == 1
        assert 'transient db lock' in received_row.error_message

    @patch('administrate.services.webhook_dispatch.EVENT_HANDLERS', new={})
    def test_unknown_webhook_type_marks_dead_immediately(self, received_row):
        received_row.webhook_type_name = 'Event Mystery'
        received_row.save()
        apply_inbox_row(received_row.id)  # should NOT raise
        received_row.refresh_from_db()
        assert received_row.status == WebhookInbox.STATUS_DEAD
        assert 'Event Mystery' in received_row.error_message

    @patch('administrate.services.webhook_dispatch.EVENT_HANDLERS', new={
        'Event Updated': _raise(MissingDependencyError('Location', 'loc_999')),
    })
    def test_missing_dependency_error_marks_dead_immediately(self, received_row):
        """MissingDependencyError is the explicit "fail loud, dead-letter,
        manual replay" signal. It must NOT enter the retry loop because
        the missing FK won't materialize from a re-attempt: it requires
        operator action (run sync_*, then replay). Going via FAILED
        would just mask the row in transient-error noise and let lag
        accumulate forever (since attempts never escalates without a
        retrying backend or with attempts=0-resetting replay)."""
        # Should NOT raise — terminal state, not transient.
        apply_inbox_row(received_row.id)
        received_row.refresh_from_db()
        assert received_row.status == WebhookInbox.STATUS_DEAD
        assert received_row.attempts == 1  # one attempt, then dead
        # Error message surfaces structured attrs for operator grep-ability.
        assert 'MissingDependencyError' in received_row.error_message
        assert 'Location' in received_row.error_message
        assert 'loc_999' in received_row.error_message

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
