"""Test factories for filtering models.

Provides reusable factory functions for creating FilterConfiguration,
FilterConfigurationGroup, and FilterGroup hierarchies in tests.

Usage::

    from filtering.tests.factories import (
        create_filter_config,
        create_filter_group,
        assign_group_to_config,
        create_filter_hierarchy,
    )

    # Create a filter config for categories
    config = create_filter_config('Categories', 'categories', 'filter_group')

    # Create a hierarchy: Material > Core Study Materials, Revision Materials
    material = create_filter_group('Material', code='MATERIAL')
    core = create_filter_group('Core Study Materials', parent=material, code='CORE')
    revision = create_filter_group('Revision Materials', parent=material, code='REVISION')

    # Assign groups to config
    assign_group_to_config(config, material)
    assign_group_to_config(config, core)
"""
from filtering.models import FilterConfiguration, FilterConfigurationGroup, FilterGroup


def create_filter_config(name, filter_key, filter_type='filter_group', **kwargs):
    """Create a FilterConfiguration record.

    Args:
        name: Internal name (also used as display_label if not provided).
        filter_key: API request key (e.g., 'categories', 'product_types').
        filter_type: Type of filter (default: 'filter_group').
        **kwargs: Additional fields to override.

    Returns:
        FilterConfiguration instance.
    """
    defaults = {
        'name': name,
        'display_label': kwargs.pop('display_label', name),
        'filter_type': filter_type,
        'filter_key': filter_key,
        'ui_component': 'multi_select',
        'display_order': kwargs.pop('display_order', 0),
        'is_active': True,
    }
    defaults.update(kwargs)
    return FilterConfiguration.objects.create(**defaults)


def create_filter_group(name, parent=None, code=None, **kwargs):
    """Create a FilterGroup record.

    Args:
        name: Display name for the group.
        parent: Optional parent FilterGroup for hierarchy.
        code: Optional unique code identifier.
        **kwargs: Additional fields to override.

    Returns:
        FilterGroup instance.
    """
    defaults = {
        'name': name,
        'parent': parent,
        'code': code,
        'is_active': True,
        'display_order': kwargs.pop('display_order', 0),
    }
    defaults.update(kwargs)
    return FilterGroup.objects.create(**defaults)


def assign_group_to_config(config, group, is_default=False, display_order=0):
    """Assign a FilterGroup to a FilterConfiguration via junction table.

    Args:
        config: FilterConfiguration instance.
        group: FilterGroup instance.
        is_default: Whether this is a default selection.
        display_order: Sort order within this config.

    Returns:
        FilterConfigurationGroup instance.
    """
    return FilterConfigurationGroup.objects.create(
        filter_configuration=config,
        filter_group=group,
        is_default=is_default,
        display_order=display_order,
    )


def create_filter_hierarchy(root_name, child_names, root_code=None):
    """Create a root group with children in one call.

    Args:
        root_name: Name for the root group.
        child_names: List of child group names (or tuples of (name, code)).
        root_code: Optional code for root group.

    Returns:
        Tuple of (root_group, list_of_child_groups).
    """
    root = create_filter_group(root_name, code=root_code)
    children = []
    for i, child in enumerate(child_names):
        if isinstance(child, tuple):
            name, code = child
        else:
            name, code = child, None
        children.append(
            create_filter_group(name, parent=root, code=code, display_order=i)
        )
    return root, children
