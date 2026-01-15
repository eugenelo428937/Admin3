import logging
from typing import Dict, List, Any, Optional, Union
from django.db.models import Q, QuerySet, Prefetch
from django.core.cache import cache
from django.utils import timezone
from abc import ABC, abstractmethod

from filtering.models import (
    FilterConfiguration,
    FilterGroup,
    FilterConfigurationGroup,
    FilterUsageAnalytics
)
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

logger = logging.getLogger(__name__)


class FilterStrategy(ABC):
    """Abstract base class for filter strategies"""
    
    def __init__(self, filter_config: FilterConfiguration):
        self.filter_config = filter_config
    
    @abstractmethod
    def apply(self, queryset: QuerySet, filter_values: List[Any]) -> QuerySet:
        """Apply the filter to the queryset"""
        pass
    
    def get_options(self) -> List[Dict[str, Any]]:
        """Get available filter options"""
        if self.filter_config.filter_type == 'filter_group':
            return self._get_filter_group_options()
        elif self.filter_config.filter_type == 'subject':
            return self._get_subject_options()
        elif self.filter_config.filter_type == 'product_variation':
            return self._get_variation_options()
        else:
            return []
    
    def _get_filter_group_options(self) -> List[Dict[str, Any]]:
        """Get options from associated filter groups"""
        groups = self.filter_config.filter_groups.all().select_related('parent')
        
        options = []
        for group in groups:
            # Include children if configured
            if self.filter_config.get_ui_config().get('include_children', False):
                descendants = group.get_descendants(include_self=True)
                for desc in descendants:
                    options.append({
                        'id': desc.id,
                        'value': desc.code,
                        'label': desc.name,
                        'code': desc.code,
                        'level': desc.get_level(),
                        'path': desc.get_full_path(),
                        'parent_id': desc.parent_id,
                    })
            else:
                options.append({
                    'id': group.id,
                    'value': group.code,
                    'label': group.name,
                    'code': group.code,
                    'level': group.get_level(),
                    'path': group.get_full_path(),
                    'parent_id': group.parent_id,
                })
        
        # Sort by hierarchy and name
        options.sort(key=lambda x: (x['level'], x['label']))
        return options
    
    def _get_subject_options(self) -> List[Dict[str, Any]]:
        """Get subject options"""
        from subjects.models import Subject
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
        """Get product variation options"""
        from products.models.products import ProductVariation
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
    
    def get_cache_key(self) -> str:
        """Get cache key for this filter type"""
        return f"filter_options_{self.filter_config.name}"
    
    def track_usage(self, filter_values: List[Any], user=None, session_id=None):
        """Track filter usage for analytics"""
        for value in filter_values:
            analytics, created = FilterUsageAnalytics.objects.get_or_create(
                filter_configuration=self.filter_config,
                filter_value=str(value),
                defaults={
                    'user': user,
                    'session_id': session_id or 'anonymous',
                    'usage_count': 0
                }
            )
            analytics.usage_count += 1
            analytics.user = user or analytics.user
            analytics.session_id = session_id or analytics.session_id or 'anonymous'
            analytics.save(update_fields=['usage_count', 'last_used', 'user', 'session_id'])


class FilterGroupStrategy(FilterStrategy):
    """Strategy for filter group based filters (replaces ProductGroupFilterStrategy)"""
    
    def apply(self, queryset: QuerySet, filter_values: List[Union[int, str]]) -> QuerySet:
        """Apply filter group filter"""
        if not filter_values:
            return queryset
        
        # Track usage
        self.track_usage(filter_values)
        
        # Convert codes to IDs for database queries
        group_ids = []
        for value in filter_values:
            try:
                if isinstance(value, str):
                    if value.isdigit():
                        # Legacy numeric ID support
                        group_ids.append(int(value))
                    else:
                        # Code-based filtering - convert code to ID
                        group = FilterGroup.objects.filter(code=value).first()
                        if group:
                            group_ids.append(group.id)
                        else:
                            logger.warning(f"FilterGroup with code '{value}' not found")
                elif isinstance(value, int):
                    group_ids.append(value)
            except (ValueError, TypeError):
                logger.warning(f"Invalid filter group value: {value}")
                continue
        
        if not group_ids:
            return queryset
        
        # Apply hierarchical filtering if configured
        if self.filter_config.get_ui_config().get('include_children', False):
            # Include child groups in filtering
            all_group_ids = self._get_all_descendant_ids(group_ids)
            return queryset.filter(product__groups__id__in=all_group_ids).distinct()
        else:
            return queryset.filter(product__groups__id__in=group_ids).distinct()
    
    def _get_all_descendant_ids(self, parent_ids: List[int]) -> List[int]:
        """Get all descendant group IDs including parents"""
        all_ids = list(parent_ids)
        
        def get_children(parent_id):
            children = FilterGroup.objects.filter(parent_id=parent_id)
            for child in children:
                all_ids.append(child.id)
                get_children(child.id)
        
        for parent_id in parent_ids:
            get_children(parent_id)
        
        return list(set(all_ids))


class SubjectFilterStrategy(FilterStrategy):
    """Strategy for subject based filters"""
    
    def apply(self, queryset: QuerySet, filter_values: List[Union[int, str]]) -> QuerySet:
        """Apply subject filter - supports both IDs and codes"""
        if not filter_values:
            return queryset
        
        # Track usage
        self.track_usage(filter_values)
        
        # Separate IDs and codes
        ids = [v for v in filter_values if isinstance(v, int) or (isinstance(v, str) and v.isdigit())]
        codes = [v for v in filter_values if isinstance(v, str) and not v.isdigit()]
        
        q_filter = Q()
        if ids:
            q_filter |= Q(exam_session_subject__subject__id__in=ids)
        if codes:
            q_filter |= Q(exam_session_subject__subject__code__in=codes)
        
        return queryset.filter(q_filter) if q_filter else queryset


class ProductVariationFilterStrategy(FilterStrategy):
    """Strategy for product variation filters"""
    
    def apply(self, queryset: QuerySet, filter_values: List[int]) -> QuerySet:
        """Apply product variation filter"""
        if not filter_values:
            return queryset
        
        # Track usage
        self.track_usage(filter_values)
        
        return queryset.filter(product__product_variations__id__in=filter_values).distinct()


class TutorialFormatFilterStrategy(FilterStrategy):
    """Strategy for tutorial format filters"""
    
    def apply(self, queryset: QuerySet, filter_values: List[str]) -> QuerySet:
        """Apply tutorial format filter"""
        if not filter_values:
            return queryset
        
        # Track usage
        self.track_usage(filter_values)
        
        # Get format mapping from configuration
        format_mapping = self.filter_config.get_ui_config().get('format_mapping', {
            'face_to_face': 'Face-to-face',
            'live_online': 'Live Online',
            'online_classroom': 'Online Classroom'
        })
        
        tutorial_filters = []
        for format_value in filter_values:
            group_name = format_mapping.get(format_value, format_value)
            tutorial_filters.append(Q(product__groups__name=group_name))
        
        if tutorial_filters:
            combined_filter = tutorial_filters[0]
            for filter_q in tutorial_filters[1:]:
                combined_filter |= filter_q
            return queryset.filter(combined_filter).distinct()
        
        return queryset


class BundleFilterStrategy(FilterStrategy):
    """Strategy for bundle filters"""
    
    def apply(self, queryset: QuerySet, filter_values: List[str]) -> QuerySet:
        """Apply bundle filter"""
        if not filter_values:
            return queryset
        
        # Track usage
        self.track_usage(filter_values)
        
        # The bundle filter is a special case that affects both products and bundles
        # This filter will be handled differently in the views layer
        # For now, we'll just return the queryset as-is since bundle filtering 
        # requires special handling for both products and bundles
        return queryset
    
    def get_options(self) -> List[Dict[str, Any]]:
        """Get bundle filter options"""
        return [
            {
                'id': 'bundle',
                'value': 'bundle',
                'label': 'Bundle',
                'description': 'Show only bundle products'
            }
        ]


class ProductFilterService:
    """
    Product filter service using the unified filter system
    """
    
    def __init__(self):
        self.strategies = {}
        self._load_filter_configurations()
    
    def _load_filter_configurations(self):
        """Load filter configurations from database"""
        configs = FilterConfiguration.objects.filter(is_active=True).prefetch_related(
            Prefetch('filter_groups', queryset=FilterGroup.objects.select_related('parent'))
        )
        
        for config in configs:
            if config.filter_type == 'subject':
                self.strategies[config.name] = SubjectFilterStrategy(config)
            elif config.filter_type == 'filter_group':
                self.strategies[config.name] = FilterGroupStrategy(config)
            elif config.filter_type == 'product_variation':
                self.strategies[config.name] = ProductVariationFilterStrategy(config)
            elif config.filter_type == 'tutorial_format':
                self.strategies[config.name] = TutorialFormatFilterStrategy(config)
            elif config.filter_type == 'bundle':
                self.strategies[config.name] = BundleFilterStrategy(config)
    
    def apply_filters(self, queryset: QuerySet, filters: Dict[str, List[Any]], user=None, session_id=None) -> QuerySet:
        """Apply multiple filters to a queryset"""
        for filter_name, filter_values in filters.items():
            if filter_name in self.strategies and filter_values:
                strategy = self.strategies[filter_name]
                
                # Set user context for analytics
                if hasattr(strategy, 'track_usage'):
                    strategy.user = user
                    strategy.session_id = session_id
                
                queryset = strategy.apply(queryset, filter_values)
        
        return queryset
    
    def get_filter_options(self, filter_names: Optional[List[str]] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Get filter options for specified filters"""
        if filter_names is None:
            filter_names = list(self.strategies.keys())
        
        options = {}
        for filter_name in filter_names:
            if filter_name in self.strategies:
                try:
                    cache_key = self.strategies[filter_name].get_cache_key()
                    cached_options = cache.get(cache_key)
                    
                    if cached_options is None:
                        options[filter_name] = self.strategies[filter_name].get_options()
                        # Cache for 15 minutes
                        cache.set(cache_key, options[filter_name], 900)
                    else:
                        options[filter_name] = cached_options
                        
                except Exception as e:
                    logger.error(f"Error getting options for {filter_name}: {e}")
                    options[filter_name] = []
        
        return options
    
    def get_filter_configuration(self) -> Dict[str, Dict[str, Any]]:
        """Get complete filter configuration for frontend"""
        configs = FilterConfiguration.objects.filter(is_active=True).order_by('display_order').prefetch_related('filter_groups')
        
        result = {}
        for config in configs:
            result[config.name] = {
                'type': config.ui_component,
                'label': config.display_label,
                'description': config.description,
                'display_order': config.display_order,
                'collapsible': config.is_collapsible,
                'default_open': config.is_expanded_by_default,
                'required': config.is_required,
                'allow_multiple': config.allow_multiple,
                'filter_key': config.filter_key,
                'ui_config': config.get_ui_config(),
                'validation_rules': config.validation_rules,
                'dependency_rules': config.dependency_rules,
                'options': self.get_filter_options([config.name]).get(config.name, []),
                # Additional metadata
                'filter_type': config.filter_type,
                'group_count': config.filter_groups.count() if config.filter_type == 'filter_group' else 0,
            }
        
        return result
    
    def get_main_category_filter(self) -> Optional[Dict[str, Any]]:
        """Get the main category filter specifically"""
        try:
            config = FilterConfiguration.objects.get(filter_key='main_category', is_active=True)
            strategy = self.strategies.get('main_category')
            
            if strategy:
                return {
                    'id': config.id,
                    'name': config.name,
                    'label': config.display_label,
                    'options': strategy.get_options(),
                    'ui_config': config.get_ui_config(),
                }
        except FilterConfiguration.DoesNotExist:
            logger.warning("Main category filter not found")
        
        return None
    
    def validate_filters(self, filters: Dict[str, List[Any]]) -> Dict[str, List[str]]:
        """Validate filter values against configuration"""
        errors = {}
        
        for filter_name, filter_values in filters.items():
            if filter_name not in self.strategies:
                errors[filter_name] = [f"Unknown filter: {filter_name}"]
                continue
            
            strategy = self.strategies[filter_name]
            config = strategy.filter_config
            
            # Check if required
            if config.is_required and not filter_values:
                errors[filter_name] = ["This filter is required"]
                continue
            
            # Check multiple values
            if not config.allow_multiple and len(filter_values) > 1:
                errors[filter_name] = ["Multiple values not allowed for this filter"]
                continue
        
        return errors
    
    def invalidate_cache(self, filter_names: Optional[List[str]] = None):
        """Invalidate cache for specified filters"""
        if filter_names is None:
            filter_names = list(self.strategies.keys())
        
        for filter_name in filter_names:
            if filter_name in self.strategies:
                cache_key = self.strategies[filter_name].get_cache_key()
                cache.delete(cache_key)
    
    def reload_configurations(self):
        """Reload filter configurations from database"""
        self.strategies.clear()
        self._load_filter_configurations()


# Convenience functions
def get_filter_service() -> ProductFilterService:
    """Get a ProductFilterService instance"""
    return ProductFilterService()


def get_product_filter_service() -> ProductFilterService:
    """Get a ProductFilterService instance (backward compatibility)"""
    return ProductFilterService()


def apply_filters(queryset: QuerySet, filters: Dict[str, List[Any]], user=None, session_id=None) -> QuerySet:
    """Apply filters to a product queryset - convenience function"""
    service = get_filter_service()
    return service.apply_filters(queryset, filters, user, session_id)


def setup_main_category_filter():
    """
    Set up the MAIN_CATEGORY filter using the filter system.

    NOTE: This function was used for initial data migration during model consolidation.
    The migration helpers (migrate_old_product_groups, setup_main_category_filter) have
    been removed as part of moving filter models to the filtering app.
    """
    logger.info("setup_main_category_filter called - migration complete, no action needed")
    return None