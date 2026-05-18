import pytest

from administrate.models import WebhookInbox
from administrate.tasks import process_webhook_inbox


@pytest.mark.django_db
class TestProcessWebhookInboxTask:
    def test_enqueue_runs_synchronously_under_immediate_backend(self):
        """Test settings use ImmediateBackend — enqueue() runs the task body
        in-process and returns. We use an unknown webhook_type so the row
        dead-letters immediately without raising."""
        row = WebhookInbox.objects.create(
            administrate_webhook_id='wh_t_1',
            administrate_event_timestamp='2026-05-14T12:00:00Z',
            webhook_type_name='Event Mystery',  # unknown -> immediate dead
            entity_type='event',
            entity_external_id='evt_t_1',
            raw_payload={'payload': {'event': {'id': 'evt_t_1'}}},
        )

        process_webhook_inbox.enqueue(row.id)

        row.refresh_from_db()
        assert row.status == WebhookInbox.STATUS_DEAD
