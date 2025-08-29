"""
Optimized Search Service for Phase 3 Database Performance Optimization
Provides optimized database queries for filtering operations with proper indexing support.
"""

import logging
import time
from django.db.models import Q, Count, Prefetch
from django.core.cache import cache
from django.conf import settings
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from exam_sessions_subjects_products.serializers import ProductListSerializer
from products.models.filter_system import FilterConfiguration, FilterGroup

logger = logging.getLogger('optimized_search')


class OptimizedSearchService:
    """
    Service for optimized product search with performance monitoring.
    """
    
    def __init__(self):
        self.cache_timeout = getattr(settings, 'SEARCH_CACHE_TIMEOUT', 300)  # 5 minutes
        self.enable_query_logging = getattr(settings, 'ENABLE_SEARCH_QUERY_LOGGING', True)
    
    def search_products(self, filters=None, navbar_filters=None, pagination=None, options=None):
        """
        Optimized product search with proper index usage and caching.
        
        Args:
            filters (dict): Filter criteria
            pagination (dict): Pagination parameters
            options (dict): Additional options
            
        Returns:
            dict: Search results with products, counts, and pagination
        """
        start_time = time.time()
        
        # Set defaults
        filters = filters or {}
        navbar_filters = navbar_filters or {}
        pagination = pagination or {'page': 1, 'page_size': 20}
        options = options or {}
        
        page = pagination.get('page', 1)
        page_size = pagination.get('page_size', 20)
        
        # Build cache key
        cache_key = self._build_cache_key(filters, page, page_size, options)
        
        # Try cache first
        cached_result = cache.get(cache_key)
        if cached_result and not settings.DEBUG:
            self._log_performance('CACHED', filters, time.time() - start_time, 0)
            return cached_result
        
        # Build optimized queryset
        queryset = self._build_optimized_queryset()
        
        # Apply filters
        if filters:
            queryset = self._apply_optimized_filters(queryset, filters)
        
        # Apply navbar filters (for navigation dropdown compatibility)
        if navbar_filters:
            queryset = self._apply_navbar_filters(queryset, navbar_filters)
        
        # Get counts for pagination
        total_count = queryset.count()
        
        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_queryset = queryset[start_idx:end_idx]
        
        # Serialize results
        serializer = ProductListSerializer(paginated_queryset, many=True)
        products_data = serializer.data
        
        # Generate filter counts
        filter_counts = self._generate_optimized_filter_counts(filters, queryset)
        
        # Build response
        result = {
            'products': products_data,
            'filter_counts': filter_counts,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'has_next': end_idx < total_count,
                'has_previous': page > 1,
                'total_pages': (total_count + page_size - 1) // page_size
            },
            'performance': {
                'duration': time.time() - start_time,
                'cached': False
            }
        }
        
        # Cache the result
        cache.set(cache_key, result, self.cache_timeout)
        
        # Log performance
        self._log_performance('EXECUTED', filters, result['performance']['duration'], len(products_data))
        
        return result
    
    def _build_optimized_queryset(self):
        """
        Build optimized queryset with proper select_related and prefetch_related.
        Uses database indexes created in Phase 3 migration.
        """
        return ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',  # Index: idx_exam_session_subjects_lookup
            'exam_session_subject__exam_session',
            'product'  # Index: idx_essp_product
        ).prefetch_related(
            Prefetch(
                'variations__product_product_variation__product_variation',
                # Uses index: idx_esspv_filtering
            ),
            Prefetch(
                'variations__prices',
                # Uses index: idx_prices_variation_type
            )
        ).order_by('-created_at')  # Index: idx_essp_created
    
    def _apply_optimized_filters(self, queryset, filters):
        """
        Apply filters using optimized queries that leverage database indexes.
        """
        q_filter = Q()
        
        # Subject filter - uses idx_exam_session_subjects_lookup and idx_subjects_code
        if filters.get('subjects'):
            subject_q = Q()
            subject_values = filters['subjects']
            
            # Separate IDs and codes for optimized lookups
            subject_ids = [v for v in subject_values if isinstance(v, int) or (isinstance(v, str) and v.isdigit())]
            subject_codes = [v for v in subject_values if isinstance(v, str) and not v.isdigit()]
            
            if subject_ids:
                subject_q |= Q(exam_session_subject__subject__id__in=subject_ids)
            if subject_codes:
                subject_q |= Q(exam_session_subject__subject__code__in=subject_codes)
            
            if subject_q:
                q_filter &= subject_q
        
        # Category filter - uses database relationships through FilterGroup
        if filters.get('categories'):
            category_q = Q()
            for category_name in filters['categories']:
                # Find FilterGroup by name and filter products that belong to that group
                category_q |= Q(product__groups__name__iexact=category_name)
            
            if category_q:
                q_filter &= category_q
        
        # Product type filter - uses database relationships through FilterGroup  
        if filters.get('product_types'):
            product_type_q = Q()
            for product_type_name in filters['product_types']:
                # Find FilterGroup by name and filter products that belong to that group
                product_type_q |= Q(product__groups__name__iexact=product_type_name)
            
            if product_type_q:
                q_filter &= product_type_q
        
        # Specific product filter
        if filters.get('products'):
            product_q = Q()
            for product in filters['products']:
                # Check if the filter value is a product ID (numeric) or product name (string)
                try:
                    # If it's numeric, filter by product ID
                    product_id = int(product)
                    product_q |= Q(product_id=product_id)
                    logger.info(f"[FILTER] Filtering by product ID: {product_id}")
                except (ValueError, TypeError):
                    # If it's not numeric, filter by product name using covering index
                    product_q |= Q(product__fullname__icontains=product)
                    logger.info(f"[FILTER] Filtering by product name: {product}")
            
            if product_q:
                q_filter &= product_q
        
        # Mode of delivery filter - uses variation indexes
        if filters.get('modes_of_delivery'):
            mode_q = Q()
            for mode in filters['modes_of_delivery']:
                # Uses idx_esspv_filtering and related variation indexes
                mode_q |= Q(variations__product_product_variation__product_variation__name__icontains=mode)
            
            if mode_q:
                q_filter &= mode_q
        
        if q_filter:
            queryset = queryset.filter(q_filter).distinct()
        
        return queryset
    
    def _apply_navbar_filters(self, queryset, navbar_filters):
        """
        Apply navbar-style filters for navigation dropdown compatibility.
        These filters use the same logic as the main list() method.
        """
        logger.info(f'🔍 [NAVBAR-FILTERS] Applying navbar filters: {navbar_filters}')
        
        # Apply tutorial_format filter
        if 'tutorial_format' in navbar_filters:
            try:
                from products.models.filter_system import FilterGroup
                format_group = FilterGroup.objects.get(name=navbar_filters['tutorial_format'])
                queryset = queryset.filter(product__productproductgroup__product_group=format_group)
                logger.info(f'🔍 [NAVBAR-FILTERS] Applied tutorial_format filter "{navbar_filters["tutorial_format"]}" - queryset count: {queryset.count()}')
            except FilterGroup.DoesNotExist:
                logger.warning(f'🔍 [NAVBAR-FILTERS] Tutorial format group "{navbar_filters["tutorial_format"]}" not found')
                queryset = queryset.none()
        
        # Apply group filter
        if 'group' in navbar_filters:
            try:
                from products.models.filter_system import FilterGroup
                group = FilterGroup.objects.get(name=navbar_filters['group'])
                queryset = queryset.filter(product__productproductgroup__product_group=group)
                logger.info(f'🔍 [NAVBAR-FILTERS] Applied group filter "{navbar_filters["group"]}" - queryset count: {queryset.count()}')
            except FilterGroup.DoesNotExist:
                logger.warning(f'🔍 [NAVBAR-FILTERS] Filter group "{navbar_filters["group"]}" not found')
                queryset = queryset.none()
        
        # Apply tutorial filter (special logic for Tutorial group excluding Online Classroom)
        if 'tutorial' in navbar_filters:
            try:
                from products.models.filter_system import FilterGroup
                tutorial_group = FilterGroup.objects.get(name='Tutorial')
                online_classroom_group = FilterGroup.objects.get(name='Online Classroom')
                queryset = queryset.filter(
                    product__productproductgroup__product_group=tutorial_group
                ).exclude(
                    product__productproductgroup__product_group=online_classroom_group
                ).distinct()
                logger.info(f'🔍 [NAVBAR-FILTERS] Applied tutorial filter - queryset count: {queryset.count()}')
            except FilterGroup.DoesNotExist as e:
                logger.warning(f'🔍 [NAVBAR-FILTERS] Tutorial group not found: {e}')
                queryset = queryset.none()
        
        # Apply variation filter
        if 'variation' in navbar_filters:
            try:
                variation_id = int(navbar_filters['variation'])
                queryset = queryset.filter(variations__id=variation_id)
                logger.info(f'🔍 [NAVBAR-FILTERS] Applied variation filter ID {variation_id} - queryset count: {queryset.count()}')
            except (ValueError, TypeError):
                logger.warning(f'🔍 [NAVBAR-FILTERS] Invalid variation ID: {navbar_filters["variation"]}')
                queryset = queryset.none()
        
        # Apply distance_learning filter
        if 'distance_learning' in navbar_filters:
            try:
                from products.models.filter_system import FilterGroup
                distance_learning_group = FilterGroup.objects.get(name='Material')
                queryset = queryset.filter(product__productproductgroup__product_group=distance_learning_group)
                logger.info(f'🔍 [NAVBAR-FILTERS] Applied distance_learning filter - queryset count: {queryset.count()}')
            except FilterGroup.DoesNotExist:
                logger.warning(f'🔍 [NAVBAR-FILTERS] Material group not found for distance learning filter')
                queryset = queryset.none()
        
        return queryset.distinct()
    
    def _generate_optimized_filter_counts(self, applied_filters, base_queryset):
        """
        Generate disjunctive facet counts using the FilterConfiguration system.
        Reads from acted_filter_configuration to get dynamic filter options.
        """
        filter_counts = {
            'subjects': {},
            'categories': {},
            'product_types': {},
            'products': {},
            'modes_of_delivery': {}
        }
        
        try:
            logger.info(f"[FILTER-COUNTS] Generating filter counts from {base_queryset.count()} products")
            
            # Get active filter configurations from database
            active_configs = FilterConfiguration.objects.filter(is_active=True)
            logger.info(f"[FILTER-COUNTS] Found {active_configs.count()} active filter configurations")
            
            for config in active_configs:
                logger.info(f"[FILTER-COUNTS] Processing {config.display_label} (type: {config.filter_type})")
                
                if config.filter_type == 'subject':
                    # Subject filter - get subjects from database
                    subject_counts = base_queryset.values(
                        'exam_session_subject__subject__code'
                    ).annotate(count=Count('id')).order_by('-count')
                    
                    for item in subject_counts:
                        code = item['exam_session_subject__subject__code']
                        count = item['count']
                        if code and count > 0:
                            filter_counts['subjects'][code] = count
                            logger.info(f"[FILTER-COUNTS] Subject {code}: {count} products")
                
                elif config.filter_type == 'filter_group':
                    # Get the mapping for this configuration
                    filter_key = self._get_filter_key_for_config(config.name)
                    
                    if filter_key:
                        # Get filter groups associated with this configuration
                        config_groups = config.filterconfigurationgroup_set.filter(
                            filter_group__is_active=True
                        ).select_related('filter_group').order_by('display_order')
                        
                        logger.info(f"[FILTER-COUNTS] Found {config_groups.count()} groups for {config.name}")
                        
                        for config_group in config_groups:
                            group = config_group.filter_group
                            
                            # Calculate count for this filter group
                            count = self._calculate_filter_group_count(base_queryset, config, group)
                            
                            if count > 0:
                                filter_counts[filter_key][group.name] = count
                                logger.info(f"[FILTER-COUNTS] {config.display_label} - {group.name}: {count} products")
            
            # Fallback: If no configurations found, still provide subjects
            if not filter_counts['subjects'] and base_queryset.exists():
                logger.warning("[FILTER-COUNTS] No subject configuration found, using fallback")
                subject_counts = base_queryset.values(
                    'exam_session_subject__subject__code'
                ).annotate(count=Count('id')).order_by('-count')[:20]
                
                for item in subject_counts:
                    code = item['exam_session_subject__subject__code']
                    count = item['count']
                    if code:
                        filter_counts['subjects'][code] = count
            
        except Exception as e:
            logger.error(f"[FILTER-COUNTS] Error generating filter counts: {str(e)}")
            import traceback
            logger.error(f"[FILTER-COUNTS] Traceback: {traceback.format_exc()}")
        
        logger.info(f"[FILTER-COUNTS] Final filter counts: {filter_counts}")
        return filter_counts
    
    def _get_filter_key_for_config(self, config_name):
        """Map filter configuration names to frontend filter keys"""
        mapping = {
            'PRODUCT_CATEGORY': 'categories',
            'PRODUCT_TYPE': 'product_types',
            'DELIVERY_MODE': 'modes_of_delivery',
            'SUBJECT_FILTER': 'subjects',
        }
        return mapping.get(config_name)
    
    def _calculate_filter_group_count(self, base_queryset, config, group):
        """Calculate product count for a specific filter group using proper database relationships"""
        try:
            # Use the proper database relationships through acted_product_productgroup
            # Products are linked to FilterGroups through Product.groups many-to-many relationship
            count = base_queryset.filter(
                product__groups=group
            ).distinct().count()
            
            logger.info(f"[FILTER-COUNTS] {config.display_label} - {group.name}: {count} products (using DB relationship)")
            return count
                
        except Exception as e:
            logger.warning(f"[FILTER-COUNTS] Error calculating count for {group.name}: {str(e)}")
            import traceback
            logger.warning(f"[FILTER-COUNTS] Traceback: {traceback.format_exc()}")
            return 0
    
    def _build_cache_key(self, filters, page, page_size, options):
        """Build cache key for search results."""
        import hashlib
        import json
        
        cache_data = {
            'filters': filters,
            'page': page,
            'page_size': page_size,
            'options': options,
            'version': '3.0'  # Increment when search logic changes
        }
        
        cache_string = json.dumps(cache_data, sort_keys=True)
        cache_hash = hashlib.md5(cache_string.encode()).hexdigest()
        return f"optimized_search_{cache_hash}"
    
    def _log_performance(self, operation, filters, duration, result_count):
        """Log performance metrics for monitoring."""
        if self.enable_query_logging:
            filter_summary = ', '.join([f"{k}({len(v)})" for k, v in filters.items() if v])
            logger.info(
                f"SEARCH {operation}: {duration:.3f}s, "
                f"Results: {result_count}, "
                f"Filters: [{filter_summary}]"
            )
            
            if duration > 0.5:
                logger.warning(
                    f"SLOW SEARCH: {duration:.3f}s - "
                    f"Filters: {filters}"
                )


class CacheManager:
    """
    Manages cache invalidation for search results.
    """
    
    @staticmethod
    def invalidate_search_cache():
        """Invalidate all search-related cache keys."""
        # In a production environment, you might want to use cache tagging
        # For now, we'll just clear keys by pattern
        cache.clear()
        logger.info("Search cache invalidated")
    
    @staticmethod
    def warm_popular_searches():
        """Pre-warm cache with popular search combinations."""
        search_service = OptimizedSearchService()
        
        popular_combinations = [
            {'subjects': ['CM2']},
            {'subjects': ['SA1']},
            {'subjects': ['CA1']},
            {'subjects': ['CM2'], 'categories': ['Materials']},
            {'categories': ['Tutorial']},
        ]
        
        for filters in popular_combinations:
            try:
                search_service.search_products(filters=filters)
                logger.info(f"Warmed cache for filters: {filters}")
            except Exception as e:
                logger.error(f"Failed to warm cache for {filters}: {str(e)}")


# Service instance
optimized_search_service = OptimizedSearchService()