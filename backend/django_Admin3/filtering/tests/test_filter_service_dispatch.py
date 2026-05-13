"""Integration tests for the new filter_type dispatcher in ProductFilterService."""
import pytest
from filtering.models import FilterConfiguration, FilterGroup, FilterConfigurationGroup
from filtering.services.filter_service import ProductFilterService


@pytest.mark.django_db
def test_get_filter_configuration_keys_are_filter_keys():
    """Top-level keys in the response are now FilterConfiguration.filter_key,
    not .name (was 'SUBJECT_FILTER', now 'subjects')."""
    FilterConfiguration.objects.create(
        name='X_FILTER', filter_key='x_key',
        filter_type='subject', display_label='X', display_order=1,
    )
    service = ProductFilterService()
    cfg = service.get_filter_configuration()

    assert 'x_key' in cfg
    assert 'X_FILTER' not in cfg


@pytest.mark.django_db
def test_get_filter_configuration_skips_unknown_filter_type(caplog):
    """A FilterConfiguration with an unhandled filter_type produces a
    warning and is omitted from the response (instead of crashing)."""
    FilterConfiguration.objects.create(
        name='WEIRD', filter_key='weird',
        filter_type='date_range',  # no handler registered
        display_label='Weird', display_order=99,
    )
    service = ProductFilterService()
    with caplog.at_level('WARNING'):
        cfg = service.get_filter_configuration()
    assert 'weird' not in cfg
    assert any('No handler for filter_type' in r.message for r in caplog.records)


@pytest.mark.django_db
def test_get_filter_configuration_response_shape():
    """Each entry has filter_key, filter_type, label, options, display_order,
    ui_component, allow_multiple, is_collapsible, is_expanded_by_default."""
    FilterConfiguration.objects.create(
        name='X', filter_key='x', filter_type='subject',
        display_label='Test', display_order=5, allow_multiple=True,
    )
    service = ProductFilterService()
    cfg = service.get_filter_configuration()

    entry = cfg['x']
    assert entry['filter_key'] == 'x'
    assert entry['filter_type'] == 'subject'
    assert entry['label'] == 'Test'
    assert entry['display_order'] == 5
    assert entry['allow_multiple'] is True
    assert 'options' in entry
    # The removed fields must not appear
    assert 'validation_rules' not in entry
    assert 'dependency_rules' not in entry
    assert 'filter_groups' not in entry  # junction array no longer needed
