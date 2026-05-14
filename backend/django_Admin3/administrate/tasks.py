from django.tasks import task


@task()
def process_webhook_inbox(inbox_id: int) -> None:
    """Stub — real implementation lands in Task 7."""
    # No-op so the view's enqueue call succeeds during Task 4 tests.
    # NOTE: Django 6.0.1's `django.tasks.task` decorator only accepts
    # priority/queue_name/backend/takes_context. The plan's
    # `queue_name='administrate_webhooks'`, `max_retries=5`, and
    # `backoff='exponential'` kwargs are unsupported in this Django
    # version: the first requires queue registration in the
    # ImmediateBackend (not configured), and the latter two aren't
    # part of the decorator API. Real retry/backoff behaviour lands
    # in Task 7 via the backend or task body.
    return None
