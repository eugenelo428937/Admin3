import pytest
from catalog.services.navigation_filter_mapping import resolve_nav_filter


@pytest.mark.django_db
def test_resolve_nav_filter_returns_filter_key_for_group():
    """A FilterGroup mapped to a FilterConfiguration via FilterConfigurationGroup
    yields {key, value, preserve} aligned to the configuration's filter_key."""
    from filtering.models import (
        FilterConfiguration, FilterGroup, FilterConfigurationGroup,
    )

    fc = FilterConfiguration.objects.create(
        name='CAT', filter_key='categories',
        filter_type='filter_group', display_label='Category',
    )
    fg = FilterGroup.objects.create(name='Material', code='material')
    FilterConfigurationGroup.objects.create(filter_configuration=fc, filter_group=fg)

    result = resolve_nav_filter('Material', preserve=['subjects'])
    assert result == {
        'key': 'categories',
        'value': 'Material',
        'preserve': ['subjects'],
    }


@pytest.mark.django_db
def test_resolve_nav_filter_returns_none_for_unmapped_group():
    """A FilterGroup not mapped to any FilterConfiguration returns None."""
    from filtering.models import FilterGroup
    FilterGroup.objects.create(name='Lonely', code='lonely')
    assert resolve_nav_filter('Lonely', preserve=[]) is None


@pytest.mark.django_db
def test_resolve_nav_filter_returns_none_for_missing_group():
    """An unknown group name returns None (caller handles)."""
    assert resolve_nav_filter('NotARealGroup', preserve=[]) is None
