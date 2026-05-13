"""Tests for the FilterHandler ABC and the three concrete handlers."""
import pytest
from django.db.models import Q
from filtering.services.filter_handlers import FilterHandler, FILTER_HANDLERS


def test_filter_handler_is_abstract():
    """FilterHandler cannot be instantiated directly."""
    with pytest.raises(TypeError):
        FilterHandler()


def test_filter_handlers_registry_has_three_handlers():
    """FILTER_HANDLERS dict ships with subject, subject_type, filter_group."""
    assert set(FILTER_HANDLERS.keys()) == {'subject', 'subject_type', 'filter_group'}


def test_filter_handlers_all_implement_required_methods():
    """Each handler must implement get_options, build_q, count_path."""
    for filter_type, handler in FILTER_HANDLERS.items():
        assert callable(handler.get_options), \
            f"{filter_type} handler missing get_options"
        assert callable(handler.build_q), \
            f"{filter_type} handler missing build_q"
        assert callable(handler.count_path), \
            f"{filter_type} handler missing count_path"
