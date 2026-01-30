"""Format cleanup service for US6.

Removes format-level groups (eBook, Printed, Hub) from category and
product_type FilterConfiguration assignments. These format concepts
are handled by modes_of_delivery via product_variation.variation_type.
"""
import logging

from filtering.models import FilterConfigurationGroup

logger = logging.getLogger(__name__)

FORMAT_GROUP_NAMES = ['eBook', 'Printed', 'Hub']
TARGET_FILTER_KEYS = ['categories', 'product_types']


def remove_format_groups_from_configs():
    """Remove format-level FilterConfigurationGroup records.

    Deletes junction records where:
    - filter_configuration.filter_key IN ('categories', 'product_types')
    - filter_group.name IN ('eBook', 'Printed', 'Hub')

    Returns:
        int: Number of records deleted.
    """
    qs = FilterConfigurationGroup.objects.filter(
        filter_configuration__filter_key__in=TARGET_FILTER_KEYS,
        filter_group__name__in=FORMAT_GROUP_NAMES,
    )

    count = qs.count()
    if count > 0:
        logger.info(
            "Removing %d format group assignments from %s configs",
            count, TARGET_FILTER_KEYS,
        )
        qs.delete()
    else:
        logger.info("No format group assignments found to remove")

    return count
