import logging
from typing import Dict, List, Any, Optional, Union
from django.db.models import Q, QuerySet
from django.core.cache import cache
from abc import ABC, abstractmethod

from products.models.product_group import ProductGroup
from products.models.product_variation import ProductVariation
from products.models.product_group_filter import ProductGroupFilter
from subjects.models import Subject
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

logger = logging.getLogger(__name__)


class FilterStrategy(ABC):
    """Abstract base class for filter strategies"""
    
    @abstractmethod
    def apply(self, queryset: QuerySet, filter_values: List[Any]) -> QuerySet:
        """Apply the filter to the queryset"""
        pass
    
    @abstractmethod
    def get_options(self) -> List[Dict[str, Any]]:
        """Get available filter options"""
        pass
    
    @abstractmethod
    def get_cache_key(self) -> str:
        """Get cache key for this filter type"""
        pass


class SubjectFilterStrategy(FilterStrategy):
    """Filter strategy for subjects"""
    
    def apply(self, queryset: QuerySet, filter_values: List[Union[int, str]]) -> QuerySet:
        """Apply subject filter - supports both IDs and codes"""
        if not filter_values:
            return queryset
        
        # Separate IDs and codes
        ids = [v for v in filter_values if isinstance(v, int) or (isinstance(v, str) and v.isdigit())]
        codes = [v for v in filter_values if isinstance(v, str) and not v.isdigit()]
        
        q_filter = Q()
        if ids:
            q_filter |= Q(exam_session_subject__subject__id__in=ids)
        if codes:
            q_filter |= Q(exam_session_subject__subject__code__in=codes)
        
        return queryset.filter(q_filter) if q_filter else queryset
    
    def get_options(self) -> List[Dict[str, Any]]:
        """Get all available subjects"""
        cache_key = self.get_cache_key()
        options = cache.get(cache_key)
        
        if options is None:
            subjects = Subject.objects.all().order_by('code')
            options = [
                {
                    'id': subject.id,
                    'code': subject.code,
                    'name': subject.description or subject.code,
                    'label': f"{subject.code} - {subject.description}" if subject.description else subject.code
                }
                for subject in subjects
            ]
            cache.set(cache_key, options, 900)  # Cache for 15 minutes
        
        return options
    
    def get_cache_key(self) -> str:
        return "filter_options_subjects"


class ProductGroupFilterStrategy(FilterStrategy):
    """Filter strategy for product groups (main category, delivery method, etc.)"""
    
    def __init__(self, filter_type: str):
        self.filter_type = filter_type
    
    def apply(self, queryset: QuerySet, filter_values: List[int]) -> QuerySet:
        """Apply product group filter"""
        if not filter_values:
            return queryset
        
        return queryset.filter(product__groups__id__in=filter_values).distinct()
    
    def get_options(self) -> List[Dict[str, Any]]:
        """Get available product groups for this filter type"""
        cache_key = self.get_cache_key()
        options = cache.get(cache_key)
        
        if options is None:
            # Get groups through filter configuration
            group_filters = ProductGroupFilter.objects.filter(
                filter_type=self.filter_type,
                is_active=True
            ).prefetch_related('groups')
            
            options = []
            for group_filter in group_filters:
                for group in group_filter.groups.all():
                    options.append({
                        'id': group.id,
                        'name': group.name,
                        'label': group.name,
                        'parent_id': group.parent_id
                    })
            
            # Remove duplicates and sort
            seen = set()
            unique_options = []
            for option in options:
                if option['id'] not in seen:
                    seen.add(option['id'])
                    unique_options.append(option)
            
            options = sorted(unique_options, key=lambda x: x['name'])
            cache.set(cache_key, options, 900)  # Cache for 15 minutes
        
        return options
    
    def get_cache_key(self) -> str:
        return f"filter_options_product_group_{self.filter_type}"


class ProductVariationFilterStrategy(FilterStrategy):
    """Filter strategy for product variations"""
    
    def __init__(self, variation_type: Optional[str] = None):
        self.variation_type = variation_type
    
    def apply(self, queryset: QuerySet, filter_values: List[int]) -> QuerySet:
        """Apply product variation filter"""
        if not filter_values:
            return queryset
        
        return queryset.filter(product__product_variations__id__in=filter_values).distinct()
    
    def get_options(self) -> List[Dict[str, Any]]:
        """Get available product variations"""
        cache_key = self.get_cache_key()
        options = cache.get(cache_key)
        
        if options is None:
            variations_query = ProductVariation.objects.filter(is_active=True)
            
            if self.variation_type:
                variations_query = variations_query.filter(variation_type=self.variation_type)
            
            variations = variations_query.order_by('name')
            options = [
                {
                    'id': variation.id,
                    'name': variation.name,
                    'label': variation.name,
                    'type': variation.variation_type,
                    'description': variation.description
                }
                for variation in variations
            ]
            cache.set(cache_key, options, 900)  # Cache for 15 minutes
        
        return options
    
    def get_cache_key(self) -> str:
        base_key = "filter_options_product_variation"
        return f"{base_key}_{self.variation_type}" if self.variation_type else base_key


class TutorialFormatFilterStrategy(FilterStrategy):
    """Specialized filter strategy for tutorial formats"""
    
    def apply(self, queryset: QuerySet, filter_values: List[str]) -> QuerySet:
        """Apply tutorial format filter"""
        if not filter_values:
            return queryset
        
        # Tutorial format filtering based on product groups
        tutorial_filters = []
        for format_value in filter_values:
            if format_value == 'face_to_face':
                tutorial_filters.append(Q(product__groups__name='Face to Face'))
            elif format_value == 'live_online':
                tutorial_filters.append(Q(product__groups__name='Live Online'))
            elif format_value == 'online_classroom':
                tutorial_filters.append(Q(product__groups__name='Online Classroom'))
        
        if tutorial_filters:
            combined_filter = tutorial_filters[0]
            for filter_q in tutorial_filters[1:]:
                combined_filter |= filter_q
            return queryset.filter(combined_filter).distinct()
        
        return queryset
    
    def get_options(self) -> List[Dict[str, Any]]:
        """Get tutorial format options"""
        return [
            {'id': 'face_to_face', 'name': 'Face to Face', 'label': 'Face to Face'},
            {'id': 'live_online', 'name': 'Live Online', 'label': 'Live Online'},
            {'id': 'online_classroom', 'name': 'Online Classroom', 'label': 'Online Classroom'}
        ]
    
    def get_cache_key(self) -> str:
        return "filter_options_tutorial_format"


class ProductFilterService:
    """Centralized service for product filtering"""
    
    def __init__(self):
        self.strategies = {
            'subject': SubjectFilterStrategy(),
            'main_category': ProductGroupFilterStrategy('MAIN_CATEGORY'),
            'delivery_method': ProductGroupFilterStrategy('DELIVERY_METHOD'),
            'product_type': ProductGroupFilterStrategy('TYPE'),
            'tutorial_format': TutorialFormatFilterStrategy(),
            'variation': ProductVariationFilterStrategy(),
            'marking_variation': ProductVariationFilterStrategy('Marking'),
            'tutorial_variation': ProductVariationFilterStrategy('Tutorial'),
            'materials_variation': ProductVariationFilterStrategy('Materials')
        }
    
    def apply_filters(self, queryset: QuerySet, filters: Dict[str, List[Any]]) -> QuerySet:
        """Apply multiple filters to a queryset"""
        logger.info(f"Applying filters: {filters}")
        
        for filter_type, filter_values in filters.items():
            if filter_type in self.strategies and filter_values:
                logger.info(f"Applying {filter_type} filter with values: {filter_values}")
                queryset = self.strategies[filter_type].apply(queryset, filter_values)
        
        return queryset
    
    def get_filter_options(self, filter_types: Optional[List[str]] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Get filter options for specified filter types"""
        if filter_types is None:
            filter_types = list(self.strategies.keys())
        
        options = {}
        for filter_type in filter_types:
            if filter_type in self.strategies:
                try:
                    options[filter_type] = self.strategies[filter_type].get_options()
                except Exception as e:
                    logger.error(f"Error getting options for {filter_type}: {e}")
                    options[filter_type] = []
        
        return options
    
    def get_filter_configuration(self) -> Dict[str, Dict[str, Any]]:
        """Get complete filter configuration for frontend"""
        return {
            'subject': {
                'type': 'multi_select',
                'label': 'Subject',
                'display_order': 1,
                'collapsible': True,
                'default_open': True
            },
            'main_category': {
                'type': 'multi_select',
                'label': 'Product Type',
                'display_order': 2,
                'collapsible': True,
                'default_open': True
            },
            'delivery_method': {
                'type': 'multi_select',
                'label': 'Delivery Mode',
                'display_order': 3,
                'collapsible': True,
                'default_open': True
            },
            'tutorial_format': {
                'type': 'multi_select',
                'label': 'Tutorial Format',
                'display_order': 4,
                'collapsible': True,
                'default_open': False,
                'depends_on': 'main_category',
                'depends_on_values': ['Tutorial']
            },
            'variation': {
                'type': 'multi_select',
                'label': 'Product Subtype',
                'display_order': 5,
                'collapsible': True,
                'default_open': False
            }
        }
    
    def invalidate_cache(self, filter_types: Optional[List[str]] = None):
        """Invalidate cache for specified filter types"""
        if filter_types is None:
            filter_types = list(self.strategies.keys())
        
        for filter_type in filter_types:
            if filter_type in self.strategies:
                cache_key = self.strategies[filter_type].get_cache_key()
                cache.delete(cache_key)
                logger.info(f"Cache invalidated for {filter_type}: {cache_key}")


# Helper functions for backward compatibility
def get_product_filter_service() -> ProductFilterService:
    """Get a ProductFilterService instance"""
    return ProductFilterService()


def apply_product_filters(queryset: QuerySet, filters: Dict[str, List[Any]]) -> QuerySet:
    """Apply filters to a product queryset - convenience function"""
    service = get_product_filter_service()
    return service.apply_filters(queryset, filters)