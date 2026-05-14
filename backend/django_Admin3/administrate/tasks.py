from django.tasks import task

from administrate.services.webhook_dispatch import apply_inbox_row


@task()
def process_webhook_inbox(inbox_id: int) -> None:
    """Apply a single webhook inbox row.

    The task body is intentionally a one-liner. All retry / dead-letter logic
    lives in `apply_inbox_row` so it's unit-testable without involving the
    task framework. Django 6.0.1's `@task()` decorator does not accept the
    `max_retries`/`backoff`/`queue_name` kwargs the original design assumed —
    retry semantics live entirely in `apply_inbox_row.MAX_ATTEMPTS`.
    """
    apply_inbox_row(inbox_id)
