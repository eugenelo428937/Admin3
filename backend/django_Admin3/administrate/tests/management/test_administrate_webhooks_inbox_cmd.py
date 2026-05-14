from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command

from administrate.models import WebhookInbox


@pytest.fixture
def dead_row(db):
    return WebhookInbox.objects.create(
        administrate_webhook_id='wh_op_1',
        administrate_event_timestamp='2026-05-14T12:00:00Z',
        webhook_type_name='Event Updated',
        entity_type='event',
        entity_external_id='evt_op_1',
        raw_payload={'payload': {'event': {'id': 'evt_op_1'}}},
        status=WebhookInbox.STATUS_DEAD,
        attempts=5,
        error_message='boom',
    )


@pytest.fixture
def processing_row(db):
    """A row stuck in PROCESSING (simulates a worker that crashed mid-handler)."""
    return WebhookInbox.objects.create(
        administrate_webhook_id='wh_op_proc',
        administrate_event_timestamp='2026-05-14T12:00:00Z',
        webhook_type_name='Event Updated',
        entity_type='event',
        entity_external_id='evt_op_proc',
        raw_payload={'payload': {'event': {'id': 'evt_op_proc'}}},
        status=WebhookInbox.STATUS_PROCESSING,
        attempts=1,
    )


@pytest.mark.django_db
class TestInboxCommand:
    def test_list_status_dead(self, dead_row):
        out = StringIO()
        call_command(
            'administrate_webhooks_inbox', 'list', '--status', 'dead',
            stdout=out,
        )
        assert str(dead_row.id) in out.getvalue()

    def test_show(self, dead_row):
        out = StringIO()
        call_command('administrate_webhooks_inbox', 'show', str(dead_row.id), stdout=out)
        assert 'Event Updated' in out.getvalue()
        assert 'boom' in out.getvalue()

    @patch(
        'administrate.management.commands.administrate_webhooks_inbox'
        '.dispatch_inbox_task'
    )
    def test_replay_resets_and_enqueues(self, mock_dispatch, dead_row):
        call_command('administrate_webhooks_inbox', 'replay', str(dead_row.id))

        dead_row.refresh_from_db()
        assert dead_row.status == WebhookInbox.STATUS_RECEIVED
        assert dead_row.attempts == 0
        assert dead_row.error_message == ''
        mock_dispatch.assert_called_once_with(dead_row.id)

    @patch(
        'administrate.management.commands.administrate_webhooks_inbox'
        '.dispatch_inbox_task'
    )
    def test_replay_resets_processing_row(self, mock_dispatch, processing_row):
        """Stuck-in-PROCESSING rows must be replayable (worker crash recovery)."""
        call_command('administrate_webhooks_inbox', 'replay', str(processing_row.id))

        processing_row.refresh_from_db()
        assert processing_row.status == WebhookInbox.STATUS_RECEIVED
        assert processing_row.attempts == 0
        mock_dispatch.assert_called_once_with(processing_row.id)

    def test_replay_refuses_applied_row(self, db):
        """Already-applied rows should NOT be replayable — that's not a recovery
        scenario, that's a re-execution which would clobber the Event row."""
        row = WebhookInbox.objects.create(
            administrate_webhook_id='wh_done',
            administrate_event_timestamp='2026-05-14T12:00:00Z',
            webhook_type_name='Event Updated',
            entity_type='event',
            entity_external_id='evt_done',
            raw_payload={},
            status=WebhookInbox.STATUS_APPLIED,
            attempts=1,
        )
        # Replay an applied row should error (CommandError).
        from django.core.management.base import CommandError
        with pytest.raises(CommandError):
            call_command('administrate_webhooks_inbox', 'replay', str(row.id))
        row.refresh_from_db()
        assert row.status == WebhookInbox.STATUS_APPLIED  # unchanged

    def test_show_missing_inbox_id_raises_command_error(self, db):
        from django.core.management.base import CommandError
        with pytest.raises(CommandError, match='No inbox row #99999'):
            call_command('administrate_webhooks_inbox', 'show', '99999')

    @patch(
        'administrate.management.commands.administrate_webhooks_inbox'
        '.dispatch_inbox_task'
    )
    def test_bulk_replay_by_status(self, mock_dispatch, db):
        """Bulk replay --status dead should re-enqueue every dead row."""
        for i in range(3):
            WebhookInbox.objects.create(
                administrate_webhook_id=f'wh_bulk_{i}',
                administrate_event_timestamp='2026-05-14T12:00:00Z',
                webhook_type_name='Event Updated',
                entity_type='event',
                entity_external_id=f'evt_bulk_{i}',
                raw_payload={},
                status=WebhookInbox.STATUS_DEAD,
                attempts=5,
            )

        out = StringIO()
        call_command(
            'administrate_webhooks_inbox', 'replay', '--status', 'dead',
            stdout=out,
        )
        assert mock_dispatch.call_count == 3
        assert 'replayed 3 row(s)' in out.getvalue()

    @patch(
        'administrate.management.commands.administrate_webhooks_inbox'
        '.dispatch_inbox_task'
    )
    def test_bulk_replay_dry_run_does_not_dispatch(self, mock_dispatch, db):
        WebhookInbox.objects.create(
            administrate_webhook_id='wh_dry_1',
            administrate_event_timestamp='2026-05-14T12:00:00Z',
            webhook_type_name='Event Updated',
            entity_type='event',
            entity_external_id='evt_dry_1',
            raw_payload={},
            status=WebhookInbox.STATUS_DEAD,
            attempts=5,
        )
        out = StringIO()
        call_command(
            'administrate_webhooks_inbox', 'replay',
            '--status', 'dead', '--dry-run',
            stdout=out,
        )
        assert mock_dispatch.call_count == 0
        assert 'would replay 1 row(s)' in out.getvalue()

    def test_invalid_since_raises_command_error(self, db):
        from django.core.management.base import CommandError
        with pytest.raises(CommandError, match='not a valid ISO-8601'):
            call_command(
                'administrate_webhooks_inbox', 'replay',
                '--status', 'dead', '--since', 'yesterday',
            )
