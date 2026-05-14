from datetime import datetime, timezone

import pytest
from django.db import IntegrityError

from administrate.models import WebhookInbox


@pytest.mark.django_db
class TestWebhookInbox:
    def _kwargs(self, **overrides):
        defaults = dict(
            administrate_webhook_id='wh_123',
            administrate_event_timestamp=datetime(
                2026, 5, 14, 12, 0, tzinfo=timezone.utc
            ),
            webhook_type_name='Event Updated',
            entity_type='event',
            entity_external_id='evt_42',
            raw_payload={'foo': 'bar'},
            raw_headers={'X-Test': '1'},
        )
        defaults.update(overrides)
        return defaults

    def test_defaults(self):
        row = WebhookInbox.objects.create(**self._kwargs())
        assert row.status == WebhookInbox.STATUS_RECEIVED
        assert row.attempts == 0
        assert row.applied_at is None
        assert row.last_attempted_at is None
        assert row.error_message == ''
        assert row.task_id == ''
        assert row.received_at is not None

    def test_unique_delivery_constraint(self):
        WebhookInbox.objects.create(**self._kwargs())
        with pytest.raises(IntegrityError):
            WebhookInbox.objects.create(**self._kwargs())

    def test_distinct_timestamp_allowed(self):
        WebhookInbox.objects.create(**self._kwargs())
        WebhookInbox.objects.create(
            **self._kwargs(
                administrate_event_timestamp=datetime(
                    2026, 5, 14, 12, 0, 1, tzinfo=timezone.utc
                ),
            )
        )
        assert WebhookInbox.objects.count() == 2

    def test_status_choices_complete(self):
        choices = {c[0] for c in WebhookInbox.STATUS_CHOICES}
        assert choices == {
            'received', 'processing', 'applied',
            'duplicate', 'failed', 'dead',
        }
