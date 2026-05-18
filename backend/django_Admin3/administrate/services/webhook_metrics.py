"""Metric-emission hooks for the webhook pipeline.

No exporter is configured yet, so these helpers are deliberately no-ops
that record to module-level counters for tests. When a real exporter is
adopted (statsd / prometheus_client / OpenTelemetry), replace the bodies
in this single file — call sites do not change.

The `inbox_lag_seconds()` helper is real today and is the canonical
alerting query: max(now - received_at) across rows still in flight.
"""

from collections import Counter
from typing import Optional

from django.db.models import Min
from django.utils import timezone

from administrate.models import WebhookInbox


# Module-level counters — used only by tests; replace with real exporter calls.
_COUNTERS: Counter = Counter()


def incr_received(webhook_type: str, outcome: str) -> None:
    """outcome ∈ {queued, duplicate, auth_failed, bad_request}."""
    _COUNTERS[('received', webhook_type, outcome)] += 1


def incr_applied(webhook_type: str) -> None:
    _COUNTERS[('applied', webhook_type)] += 1


def incr_failed(webhook_type: str, attempt: int) -> None:
    _COUNTERS[('failed', webhook_type, attempt)] += 1


def inbox_lag_seconds() -> Optional[float]:
    """Maximum age (in seconds) of any inbox row not yet in a terminal state.

    Returns None if no in-flight rows exist. This is the spec's primary
    alerting signal — wire it into whatever scraper/poller you adopt.

    Implementation note: max age corresponds to the OLDEST row, i.e. the row
    with the MINIMUM `received_at`. Hence Min, not Max.
    """
    in_flight = WebhookInbox.objects.filter(
        status__in=[
            WebhookInbox.STATUS_RECEIVED,
            WebhookInbox.STATUS_PROCESSING,
            WebhookInbox.STATUS_FAILED,
        ]
    )
    oldest = in_flight.aggregate(oldest=Min('received_at'))['oldest']
    if oldest is None:
        return None
    return (timezone.now() - oldest).total_seconds()


def reset_for_tests() -> None:
    _COUNTERS.clear()


def get_counter_for_tests(key) -> int:
    return _COUNTERS[key]
