"""Tests for the Administrate Event -> TutorialEvents link resolver.

The matching rule (per product decision 2026-05-15):
    acted.tutorial_events.code == adm.events.title  (exact match, 1-to-1)

The linker is a one-line ORM query, so mocking TutorialEvents.objects.filter
is the right tool here — building the real 5-level FK chain (TutorialEvents
-> StoreProduct -> ESS -> ExamSession -> Subject) to test a one-liner
costs more than it earns. The contract we *do* care about:
  - filter is called with `code=event.title`, NOT `code__iexact` or similar
  - empty title short-circuits without hitting the DB
  - exactly `.first()` is used (so multi-match doesn't crash)
"""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from administrate.services.tutorial_event_linker import link_event_to_tutorial


class TestLinker:
    def test_exact_match_returns_tutorial_event(self):
        """When TutorialEvents.code exactly equals event.title, return it."""
        event = SimpleNamespace(title='CB1-1-26S')
        fake_match = MagicMock(pk=42, code='CB1-1-26S')

        with patch(
            'tutorials.models.TutorialEvents.objects.filter'
        ) as mock_filter:
            mock_filter.return_value.first.return_value = fake_match
            result = link_event_to_tutorial(event)

        # The filter MUST use the exact equality lookup. If someone later
        # 'helpfully' changes this to code__iexact or code__icontains,
        # that's a silent breaking change to the 1-to-1 invariant.
        mock_filter.assert_called_once_with(code='CB1-1-26S')
        assert result is fake_match

    def test_no_match_returns_none(self):
        """When no TutorialEvents.code equals event.title, return None.
        The caller (sync command) logs the unlinked event so an operator
        can investigate — typo in the Administrate title is the most
        common cause."""
        event = SimpleNamespace(title='CB1-99-WRONG')

        with patch(
            'tutorials.models.TutorialEvents.objects.filter'
        ) as mock_filter:
            mock_filter.return_value.first.return_value = None
            result = link_event_to_tutorial(event)

        assert result is None

    def test_empty_title_short_circuits_without_db_hit(self):
        """An empty title is a data-integrity issue worth surfacing
        separately. We refuse to even query — otherwise a blank-code
        TutorialEvents row (also a bug, but a different one) could
        silently link."""
        event = SimpleNamespace(title='')

        with patch(
            'tutorials.models.TutorialEvents.objects.filter'
        ) as mock_filter:
            result = link_event_to_tutorial(event)

        assert result is None
        mock_filter.assert_not_called()

    def test_none_title_short_circuits_without_db_hit(self):
        """Defensive: same as empty string."""
        event = SimpleNamespace(title=None)

        with patch(
            'tutorials.models.TutorialEvents.objects.filter'
        ) as mock_filter:
            result = link_event_to_tutorial(event)

        assert result is None
        mock_filter.assert_not_called()
