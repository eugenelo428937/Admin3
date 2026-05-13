import logging

from filtering.models import FilterConfiguration

logger = logging.getLogger(__name__)


class ProductFilterService:
    """
    Product filter service using the unified filter system.

    Thin facade that dispatches to per-filter_type handler classes
    defined in filter_handlers.py.  No instance state is required.
    """

    def get_filter_configuration(self) -> dict:
        """Build the registry payload by dispatching to handlers per filter_type."""
        from filtering.services.filter_handlers import FILTER_HANDLERS

        result = {}
        configs = FilterConfiguration.objects.filter(is_active=True).order_by('display_order')
        for config in configs:
            handler = FILTER_HANDLERS.get(config.filter_type)
            if not handler:
                logger.warning(
                    f"No handler for filter_type={config.filter_type!r} "
                    f"(filter_key={config.filter_key}); skipping."
                )
                continue
            # filter_groups: groups assigned to this configuration via
            # FilterConfigurationGroup. Consumed by the pact contract,
            # by test_format_cleanup, and by the (future) plural_label
            # resolution path. Each entry is {'name': ..., 'code': ...}
            # so callers don't have to query the FilterGroup table
            # again for display data. Empty for non-filter_group types.
            if config.filter_type == 'filter_group':
                filter_groups = [
                    {'name': g.name, 'code': g.code or ''}
                    for g in config.filter_groups.order_by('display_order', 'name')
                ]
            else:
                filter_groups = []

            options = handler.get_options(config)
            # The consumer pact contract requires an `id` on each option.
            # SubjectHandler / SubjectTypeHandler return options without
            # an id (no surrogate exists for SubjectType, and Subject's
            # code is already the option value). Synthesise a stable
            # ordinal so the contract verifies.
            options_with_id = [
                {**opt, 'id': opt.get('id', idx + 1)}
                for idx, opt in enumerate(options)
            ]

            # The consumer pact uses the legacy 'type' / 'collapsible' /
            # 'default_open' key names. They are kept as aliases of the
            # canonical filter_type / is_collapsible / is_expanded_by_default
            # fields so existing clients keep working through the next
            # frontend deploy. Drop the aliases when the consumer pact is
            # regenerated against the canonical shape.
            result[config.filter_key] = {
                'filter_key': config.filter_key,
                'filter_type': config.filter_type,
                'type': config.filter_type,
                'label': config.display_label,
                'description': config.description,
                'ui_component': config.ui_component,
                'display_order': config.display_order,
                'allow_multiple': config.allow_multiple,
                'is_collapsible': config.is_collapsible,
                'collapsible': config.is_collapsible,
                'is_expanded_by_default': config.is_expanded_by_default,
                'default_open': config.is_expanded_by_default,
                'is_required': config.is_required,
                'ui_config': config.get_ui_config(),
                'filter_groups': filter_groups,
                'options': options_with_id,
            }
        return result

    # ── store.Product filter methods ─────────────────────────────────────────

    def apply_filters(self, queryset, filters: dict):
        """Apply filters to a queryset by dispatching to per-filter_type handlers.

        Args:
            queryset: base queryset (typically store.Product.objects.all()).
            filters: dict mapping filter_key → list of selected values.

        Returns:
            Filtered, distinct queryset.
        """
        from filtering.services.filter_handlers import FILTER_HANDLERS

        if not filters:
            return queryset.distinct()

        for config in FilterConfiguration.objects.filter(is_active=True):
            values = filters.get(config.filter_key) or []
            if not values:
                continue
            handler = FILTER_HANDLERS.get(config.filter_type)
            if not handler:
                continue
            queryset = queryset.filter(handler.build_q(config, values))

        return queryset.distinct()

    def _apply_filters_excluding(self, queryset, filters, exclude_filter_key,
                                  descendant_map=None):
        """Apply all filters EXCEPT the excluded filter_key (disjunctive faceting)."""
        if not filters:
            return queryset.distinct()
        reduced = {k: v for k, v in filters.items() if k != exclude_filter_key}
        return self.apply_filters(queryset, reduced)

    def generate_filter_counts(self, base_queryset, filters=None):
        """Generate disjunctive facet counts keyed by FilterConfiguration.filter_key.

        For each active filter configuration, compute counts against a queryset
        with all OTHER active filters applied (disjunctive faceting).

        For filter_group-type configs, results are partitioned to only the
        FilterGroup names assigned to that specific configuration. Different
        filter_group configs (categories, product_types, modes_of_delivery,
        programme_type) all join the same filter_product_product_groups
        table, so without partitioning the raw aggregation would mix their
        values together.
        """
        from django.db.models import Count
        from filtering.services.filter_handlers import FILTER_HANDLERS

        filters = filters or {}
        result = {}

        configs = FilterConfiguration.objects.filter(is_active=True)
        for config in configs:
            handler = FILTER_HANDLERS.get(config.filter_type)
            if not handler:
                continue

            dimension_qs = self._apply_filters_excluding(
                base_queryset, filters, config.filter_key,
            )
            path = handler.count_path(config)
            rows = (
                dimension_qs.values(path)
                .annotate(count=Count('id', distinct=True))
                .order_by('-count')
            )

            # For filter_group, restrict to names assigned to THIS config.
            allowed_names = None
            if config.filter_type == 'filter_group':
                allowed_names = set(
                    config.filter_groups.values_list('name', flat=True)
                )

            bucket = {}
            for row in rows:
                value = row[path]
                n = row['count']
                if not value or n <= 0:
                    continue
                if allowed_names is not None and value not in allowed_names:
                    continue
                bucket[value] = {'count': n, 'name': value}
            result[config.filter_key] = bucket

        return result


def get_filter_service() -> ProductFilterService:
    """Get a ProductFilterService instance."""
    return ProductFilterService()
