import pytest

from administrate.services import webhook_metrics


@pytest.fixture(autouse=True)
def _isolate_webhook_counters():
    """Ensure module-level webhook metric counters don't leak between tests."""
    webhook_metrics.reset_for_tests()
    yield
    webhook_metrics.reset_for_tests()
