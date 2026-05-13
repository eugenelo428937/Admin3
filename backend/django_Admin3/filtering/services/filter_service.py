import logging
from typing import Dict, List, Any, Optional
from django.db.models import Prefetch
from django.core.cache import cache

from filtering.models import (
    FilterConfiguration,
    FilterGroup,
    FilterConfigurationGroup,
)

logger = logging.getLogger(__name__)


class FilterOptionProvider:
    """Provides filter options for frontend filter configuration.

    Each instance wraps a FilterConfiguration row and returns the
    available options (filter groups, subjects, variations, or bundles)
    for that configuration.  Used by ProductFilterService.get_filter_configuration()
    to build the dynamic filter panel data sent to the frontend.
    """

    def __init__(self, filter_config: FilterConfiguration):
        self.filter_config = filter_config

    def get_options(self) -> List[Dict[str, Any]]:
        """Get available filter options based on filter type."""
        if self.filter_config.filter_type == 'filter_group':
            return self._get_filter_group_options()
        elif self.filter_config.filter_type == 'subject':
            return self._get_subject_options()
        elif self.filter_config.filter_type == 'product_variation':
            return self._get_variation_options()
        elif self.filter_config.filter_type == 'bundle':
            return self._get_bundle_options()
        return []

    def _get_filter_group_options(self) -> List[Dict[str, Any]]:
        """Get options from associated filter groups (flat — hierarchy removed in migration 0012)."""
        groups = self.filter_config.filter_groups.all()

        options = []
        for group in groups:
            options.append({
                'id': group.id,
                'value': group.code,
                'label': group.name,
                'code': group.code,
            })

        options.sort(key=lambda x: x['label'])
        return options

    def _get_subject_options(self) -> List[Dict[str, Any]]:
        """Get subject options."""
        from catalog.models import Subject
        subjects = Subject.objects.filter(active=True).order_by('code')

        return [
            {
                'id': subject.id,
                'value': subject.code,
                'label': f"{subject.code} - {subject.description}",
                'code': subject.code,
                'description': subject.description,
            }
            for subject in subjects
        ]

    def _get_variation_options(self) -> List[Dict[str, Any]]:
        """Get product variation options."""
        from catalog.models import ProductVariation
        variations = ProductVariation.objects.all().order_by('variation_type', 'name')

        return [
            {
                'id': variation.id,
                'value': variation.id,
                'label': f"{variation.name} ({variation.variation_type})",
                'variation_type': variation.variation_type,
                'name': variation.name,
                'description': variation.description,
            }
            for variation in variations
        ]

    def _get_bundle_options(self) -> List[Dict[str, Any]]:
        """Get bundle filter options."""
        return [
            {
                'id': 'bundle',
                'value': 'bundle',
                'label': 'Bundle',
                'description': 'Show only bundle products'
            }
        ]

    def get_cache_key(self) -> str:
        """Get cache key for this filter type."""
        return f"filter_options_{self.filter_config.name}"


class ProductFilterService:
    """
    Product filter service using the unified filter system
    """
    
    def __init__(self):
        self.option_providers = {}
        self._load_filter_configurations()
    
    def _load_filter_configurations(self):
        """Load filter configurations from database."""
        configs = FilterConfiguration.objects.filter(is_active=True).prefetch_related(
            Prefetch('filter_groups', queryset=FilterGroup.objects.all())
        )

        for config in configs:
            self.option_providers[config.name] = FilterOptionProvider(config)

    def get_filter_options(self, filter_names: Optional[List[str]] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Get filter options for specified filters."""
        if filter_names is None:
            filter_names = list(self.option_providers.keys())

        options = {}
        for filter_name in filter_names:
            if filter_name in self.option_providers:
                try:
                    cache_key = self.option_providers[filter_name].get_cache_key()
                    cached_options = cache.get(cache_key)

                    if cached_options is None:
                        options[filter_name] = self.option_providers[filter_name].get_options()
                        cache.set(cache_key, options[filter_name], 900)
                    else:
                        options[filter_name] = cached_options

                except Exception as e:
                    logger.error(f"Error getting options for {filter_name}: {e}")
                    options[filter_name] = []

        return options
    
    def get_filter_configuration(self) -> Dict[str, Dict[str, Any]]:
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
            result[config.filter_key] = {
                'filter_key': config.filter_key,
                'filter_type': config.filter_type,
                'label': config.display_label,
                'description': config.description,
                'ui_component': config.ui_component,
                'display_order': config.display_order,
                'allow_multiple': config.allow_multiple,
                'is_collapsible': config.is_collapsible,
                'is_expanded_by_default': config.is_expanded_by_default,
                'is_required': config.is_required,
                'ui_config': config.get_ui_config(),
                'options': handler.get_options(config),
            }
        return result
    
    def get_main_category_filter(self) -> Optional[Dict[str, Any]]:
        """Get the main category filter specifically."""
        try:
            config = FilterConfiguration.objects.get(filter_key='main_category', is_active=True)
            provider = self.option_providers.get('main_category')

            if provider:
                return {
                    'id': config.id,
                    'name': config.name,
                    'label': config.display_label,
                    'options': provider.get_options(),
                    'ui_config': config.get_ui_config(),
                }
        except FilterConfiguration.DoesNotExist:
            logger.warning("Main category filter not found")

        return None

    def validate_filters(self, filters: Dict[str, List[Any]]) -> Dict[str, List[str]]:
        """Validate filter values against configuration."""
        errors = {}

        for filter_name, filter_values in filters.items():
            if filter_name not in self.option_providers:
                errors[filter_name] = [f"Unknown filter: {filter_name}"]
                continue

            provider = self.option_providers[filter_name]
            config = provider.filter_config

            if config.is_required and not filter_values:
                errors[filter_name] = ["This filter is required"]
                continue

            if not config.allow_multiple and len(filter_values) > 1:
                errors[filter_name] = ["Multiple values not allowed for this filter"]
                continue

        return errors

    def invalidate_cache(self, filter_names: Optional[List[str]] = None):
        """Invalidate cache for specified filters."""
        if filter_names is None:
            filter_names = list(self.option_providers.keys())

        for filter_name in filter_names:
            if filter_name in self.option_providers:
                cache_key = self.option_providers[filter_name].get_cache_key()
                cache.delete(cache_key)
    
    # ── store.Product filter methods (US2) ──────────────────────────

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
        """Generate disjunctive facet counts for all filter dimensions.

        Each dimension's counts are computed against a queryset with all OTHER
        active filters applied, but excluding that dimension's own filter (R4).

        Args:
            base_queryset: Unfiltered queryset of active store.Product instances.
            filters: Dict with optional filter keys.

        Returns:
            Dict with five dimensions, each containing {name: {count, name}} entries.
        """
        from django.db.models import Count

        filters = filters or {}
        filter_counts = {
            'subjects': {},
            'categories': {},
            'product_types': {},
            'products': {},
            'modes_of_delivery': {},
        }

        # Subject counts — exclude subjects filter
        subjects_qs = self._apply_filters_excluding(
            base_queryset, filters, 'subjects'
        )
        subject_counts = subjects_qs.values(
            'exam_session_subject__subject__code'
        ).annotate(count=Count('id')).order_by('-count')

        for item in subject_counts:
            code = item['exam_session_subject__subject__code']
            count = item['count']
            if code and count > 0:
                filter_counts['subjects'][code] = {'count': count, 'name': code}

        # Group counts partitioned by FilterConfigurationGroup assignments.
        # All three group-based dimensions use the same mechanism.
        for filter_key in ('categories', 'product_types', 'modes_of_delivery'):
            assigned_groups = list(
                FilterConfigurationGroup.objects.filter(
                    filter_configuration__filter_key=filter_key,
                    filter_configuration__is_active=True,
                ).select_related('filter_group').values_list(
                    'filter_group_id', 'filter_group__name', named=True
                )
            )
            if not assigned_groups:
                continue

            assigned_group_ids = {g.filter_group_id for g in assigned_groups}
            assigned_group_names = {g.filter_group_id: g.filter_group__name for g in assigned_groups}

            # Pre-populate with count=0
            for group_id, group_name in assigned_group_names.items():
                if group_name:
                    filter_counts[filter_key][group_name] = {
                        'count': 0, 'name': group_name
                    }

            dimension_qs = self._apply_filters_excluding(
                base_queryset, filters, filter_key
            )

            # Roll up counts per assigned group
            for group_id in assigned_group_ids:
                group_name = assigned_group_names.get(group_id)
                if not group_name:
                    continue
                rollup_count = dimension_qs.filter(
                    product_product_variation__product_groups__product_group__id__in={group_id}
                ).distinct().count()
                filter_counts[filter_key][group_name] = {
                    'count': rollup_count, 'name': group_name
                }

        # Product counts — exclude products filter
        products_qs = self._apply_filters_excluding(
            base_queryset, filters, 'products'
        )
        product_counts = products_qs.values(
            'product_product_variation__product__id',
            'product_product_variation__product__shortname',
            'product_product_variation__product__fullname'
        ).annotate(count=Count('id', distinct=True)).order_by('-count')

        for item in product_counts:
            product_id = item['product_product_variation__product__id']
            shortname = item['product_product_variation__product__shortname']
            fullname = item['product_product_variation__product__fullname']
            count = item['count']
            if product_id and count > 0:
                filter_counts['products'][str(product_id)] = {
                    'count': count,
                    'name': shortname or fullname or f'Product {product_id}',
                    'display_name': shortname or fullname or f'Product {product_id}'
                }

        return filter_counts

    def reload_configurations(self):
        """Reload filter configurations from database."""
        self.option_providers.clear()
        self._load_filter_configurations()


def get_filter_service() -> ProductFilterService:
    """Get a ProductFilterService instance."""
    return ProductFilterService()