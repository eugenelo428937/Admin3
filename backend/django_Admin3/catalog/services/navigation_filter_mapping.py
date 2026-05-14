"""Resolve a FilterGroup name to its target filter_key + value + preserve.

Used by the navigation-data endpoint to embed `filter` objects per
clickable nav item. Reads filter_configuration_groups, so reassigning a
group in admin automatically updates the nav targets.
"""
from typing import Optional

from filtering.models import FilterConfigurationGroup


def resolve_nav_filter(group_name: str, preserve: list[str]) -> Optional[dict]:
    """Return {'key': filter_key, 'value': group_name, 'preserve': [...]}
    for a FilterGroup mapped to a FilterConfiguration; None if unmapped.
    """
    fcg = (
        FilterConfigurationGroup.objects
        .filter(
            filter_group__name=group_name,
            filter_configuration__is_active=True,
        )
        .select_related('filter_configuration')
        .first()
    )
    if not fcg:
        return None
    return {
        'key': fcg.filter_configuration.filter_key,
        'value': group_name,
        'preserve': list(preserve),
    }
