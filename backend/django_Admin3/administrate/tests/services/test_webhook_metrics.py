from datetime import timedelta

import pytest
from django.utils import timezone

from administrate.models import WebhookInbox
from administrate.services import webhook_metrics


@pytest.fixture(autouse=True)
def _reset_counters():
    webhook_metrics.reset_for_tests()
    yield
    webhook_metrics.reset_for_tests()


@pytest.mark.django_db
class TestLag:
    def test_no_in_flight_returns_none(self):
        assert webhook_metrics.inbox_lag_seconds() is None

    def test_old_received_row_dominates(self):
        old = WebhookInbox.objects.create(
            administrate_webhook_id='wh_lag_old',
            administrate_event_timestamp=timezone.now(),
            webhook_type_name='Event Updated',
            entity_type='event',
            entity_external_id='evt_lag',
            raw_payload={},
        )
        WebhookInbox.objects.filter(pk=old.pk).update(
            received_at=timezone.now() - timedelta(hours=2),
        )
        # Recent applied row should NOT count.
        WebhookInbox.objects.create(
            administrate_webhook_id='wh_lag_recent',
            administrate_event_timestamp=timezone.now(),
            webhook_type_name='Event Updated',
            entity_type='event',
            entity_external_id='evt_lag_2',
            raw_payload={},
            status=WebhookInbox.STATUS_APPLIED,
        )
        lag = webhook_metrics.inbox_lag_seconds()
        assert lag is not None
        assert lag > 3600  # > 1 hour


@pytest.mark.django_db
class TestCounters:
    def test_incr_received(self):
        webhook_metrics.incr_received('Event Updated', 'queued')
        webhook_metrics.incr_received('Event Updated', 'queued')
        webhook_metrics.incr_received('Event Updated', 'duplicate')
        assert webhook_metrics.get_counter_for_tests(
            ('received', 'Event Updated', 'queued')) == 2
        assert webhook_metrics.get_counter_for_tests(
            ('received', 'Event Updated', 'duplicate')) == 1

    def test_incr_applied(self):
        webhook_metrics.incr_applied('Event Cancelled')
        assert webhook_metrics.get_counter_for_tests(
            ('applied', 'Event Cancelled')) == 1

    def test_incr_failed(self):
        webhook_metrics.incr_failed('Event Updated', 3)
        assert webhook_metrics.get_counter_for_tests(
            ('failed', 'Event Updated', 3)) == 1
