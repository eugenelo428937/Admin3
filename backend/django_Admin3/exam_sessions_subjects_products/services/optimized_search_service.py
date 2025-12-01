"""
Optimized Search Service for Phase 3 Database Performance Optimization
Provides optimized database queries for filtering operations with proper indexing support.
"""

import logging
import time
from django.db.models import Q, Count, Prefetch
from django.core.cache import cache
from django.conf import settings
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct, ExamSessionSubjectBundle
from exam_sessions_subjects_products.serializers import ProductListSerializer
from products.serializers import ExamSessionSubjectBundleSerializer
from products.models.filter_system import FilterConfiguration, FilterGroup

logger = logging.getLogger('optimized_search')


class OptimizedSearchService:
    """
    Service for optimized product search with performance monitoring.
    """
    
    def __init__(self):
        self.cache_timeout = getattr(settings, 'SEARCH_CACHE_TIMEOUT', 300)  # 5 minutes
        self.enable_query_logging = getattr(settings, 'ENABLE_SEARCH_QUERY_LOGGING', True)
    
    def search_products(self, search_query=None, filters=None, navbar_filters=None, pagination=None, options=None):
        """
        Optimized product search with proper index usage and caching.

        Args:
            search_query (str): Search query for fuzzy matching
            filters (dict): Filter criteria
            navbar_filters (dict): Navbar-style filters
            pagination (dict): Pagination parameters
            options (dict): Additional options

        Returns:
            dict: Search results with products, counts, and pagination
        """
        start_time = time.time()

        # Set defaults
        search_query = (search_query or '').strip()
        filters = filters or {}
        navbar_filters = navbar_filters or {}
        pagination = pagination or {'page': 1, 'page_size': 20}
        options = options or {}

        # Debug logging for products filter
        logger.debug(f"[SEARCH] Received filters: {filters}")
        logger.debug(f"[SEARCH] Products filter: {filters.get('products', 'NOT SET')}")
        
        page = pagination.get('page', 1)
        page_size = pagination.get('page_size', 20)
        
        # Build cache key (include search query)
        cache_key = self._build_cache_key(filters, page, page_size, options, search_query)

        # Try cache first
        cached_result = cache.get(cache_key)
        if cached_result and not settings.DEBUG:
            self._log_performance('CACHED', filters, time.time() - start_time, 0)
            return cached_result

        # If search query is present, use fuzzy search for scoring and sorting
        use_fuzzy_search = bool(search_query and len(search_query) >= 2)
        fuzzy_essp_ids = []

        if use_fuzzy_search:
            # Use FuzzySearchService to get relevance-scored results
            from .fuzzy_search_service import FuzzySearchService
            fuzzy_service = FuzzySearchService(min_score=60)
            fuzzy_results = fuzzy_service.search_products(search_query, limit=1000)  # Get all matches

            # Extract ESSP IDs from fuzzy search results (already sorted by relevance)
            fuzzy_essp_ids = [product.id for product in fuzzy_results['products']]

            logger.debug(f'[FUZZY-SEARCH] Query: "{search_query}" found {len(fuzzy_essp_ids)} matches')

        # Build optimized querysets (base, unfiltered) for both products and bundles
        base_queryset = self._build_optimized_queryset(use_fuzzy_sorting=use_fuzzy_search)
        base_bundles_queryset = self._build_bundle_queryset()

        # If using fuzzy search, filter base queryset to matched ESSPs
        if use_fuzzy_search and fuzzy_essp_ids:
            # Preserve fuzzy search ordering by using Case/When
            from django.db.models import Case, When, IntegerField
            preserved_order = Case(*[When(id=pk, then=pos) for pos, pk in enumerate(fuzzy_essp_ids)], output_field=IntegerField())
            base_queryset = base_queryset.filter(id__in=fuzzy_essp_ids).order_by(preserved_order)

        # Create filtered querysets for products and bundles (separate from base for disjunctive faceting)
        filtered_queryset = base_queryset
        filtered_bundles_queryset = base_bundles_queryset

        # Determine bundle filtering strategy
        # 1. If user explicitly searches for bundle keywords -> show all bundles (subject-filtered)
        # 2. If filters or search results exist -> filter bundles by matching content
        # 3. If no filters and no search -> show all bundles (browse all scenario)
        bundle_keyword_search = False
        if search_query and len(search_query) >= 2:
            search_lower = search_query.lower()
            bundle_keywords = ['bundle', 'package', 'combo', 'set']
            bundle_keyword_search = any(keyword in search_lower for keyword in bundle_keywords)
            if bundle_keyword_search:
                logger.debug(f'[BUNDLES] Bundle keyword detected in search query "{search_query}" - showing all bundles')

        # Check if 'Bundle' category filter is active (exclusive filter)
        bundle_filter_active = 'Bundle' in filters.get('categories', [])

        if bundle_filter_active:
            # If bundle filter is active, only return bundles (no products)
            filtered_queryset = filtered_queryset.none()
            logger.debug('[BUNDLES] Bundle category filter active - excluding products')
        else:
            # Apply filters to get matching products
            if filters:
                filtered_queryset = self._apply_optimized_filters(filtered_queryset, filters)

            # Apply navbar filters (for navigation dropdown compatibility)
            if navbar_filters:
                filtered_queryset = self._apply_navbar_filters(filtered_queryset, navbar_filters)

        # Content-based bundle filtering
        # Bundles should only appear when their contents match the current search/filter criteria
        has_active_filters = bool(filters) or bool(navbar_filters) or use_fuzzy_search

        # Special case: if fuzzy search was used but found no results, exclude all bundles
        # (unless user explicitly searched for bundle keywords)
        fuzzy_search_no_results = use_fuzzy_search and not fuzzy_essp_ids

        if bundle_filter_active:
            # Bundle category filter - show all bundles (subject-filtered only)
            if filters:
                filtered_bundles_queryset = self._apply_bundle_filters(filtered_bundles_queryset, filters)
            logger.debug('[BUNDLES] Bundle category selected - showing all bundles')
        elif bundle_keyword_search:
            # User explicitly searching for bundles - show all bundles (subject-filtered)
            if filters:
                filtered_bundles_queryset = self._apply_bundle_filters(filtered_bundles_queryset, filters)
            logger.debug('[BUNDLES] Bundle keyword search - showing all subject-filtered bundles')
        elif fuzzy_search_no_results:
            # Search query returned no product matches - exclude all bundles
            filtered_bundles_queryset = filtered_bundles_queryset.none()
            logger.debug('[BUNDLES] Fuzzy search returned no results - excluding all bundles')
        elif has_active_filters:
            # Content-based filtering: only bundles containing matching products
            # Get the ESSP IDs that match current filters/search
            matching_essp_ids = list(filtered_queryset.values_list('id', flat=True)[:1000])  # Limit for performance

            if matching_essp_ids:
                # Filter bundles to only those containing matching products
                filtered_bundles_queryset = self._filter_bundles_by_matching_products(
                    filtered_bundles_queryset,
                    matching_essp_ids
                )
                # Also apply subject filter for consistency
                if filters:
                    filtered_bundles_queryset = self._apply_bundle_filters(filtered_bundles_queryset, filters)
                logger.debug(f'[BUNDLES] Content-based filtering applied - {len(matching_essp_ids)} matching products')
            else:
                # No matching products = no bundles to show
                filtered_bundles_queryset = filtered_bundles_queryset.none()
                logger.debug('[BUNDLES] No matching products - excluding all bundles')
        # else: No filters and no search = show all bundles (browse all scenario) - no action needed

        # Get counts for pagination (from filtered querysets) - fast COUNT queries only
        products_count = filtered_queryset.count()
        bundles_count = filtered_bundles_queryset.count()

        # Check if marking vouchers should be included
        marking_vouchers_data = self._fetch_marking_vouchers(search_query, filters, navbar_filters)
        vouchers_count = len(marking_vouchers_data) if marking_vouchers_data else 0

        total_count = products_count + bundles_count + vouchers_count

        # Calculate pagination offsets
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        # OPTIMIZATION: Apply pagination BEFORE serialization
        # Order: vouchers first (if search), then bundles, then products
        # This avoids serializing items that won't be shown on the current page

        paginated_items = []
        items_needed = page_size
        current_offset = start_idx

        # 1. Handle marking vouchers (prepended when search query exists)
        if search_query and marking_vouchers_data:
            if current_offset < vouchers_count:
                # Need some vouchers from this page
                voucher_start = current_offset
                voucher_end = min(vouchers_count, current_offset + items_needed)
                paginated_items.extend(marking_vouchers_data[voucher_start:voucher_end])
                items_needed -= (voucher_end - voucher_start)
                current_offset = 0  # Reset offset for next source
            else:
                # Skip vouchers, adjust offset for bundles
                current_offset -= vouchers_count

        # 2. Handle bundles (come before products in sorted order)
        if items_needed > 0 and bundles_count > 0:
            if current_offset < bundles_count:
                # Need some bundles from this page
                bundle_start = current_offset
                bundle_end = min(bundles_count, current_offset + items_needed)
                bundle_slice_size = bundle_end - bundle_start

                # Only serialize the bundles we need (apply LIMIT/OFFSET at queryset level)
                paginated_bundles_qs = filtered_bundles_queryset[bundle_start:bundle_end]
                bundles_serializer = ExamSessionSubjectBundleSerializer(paginated_bundles_qs, many=True)

                for bundle_data in bundles_serializer.data:
                    transformed_bundle = {
                        **bundle_data,
                        'item_type': 'bundle',
                        'is_bundle': True,
                        'type': 'Bundle',
                        'bundle_type': 'exam_session',
                        'product_name': bundle_data.get('bundle_name'),
                        'shortname': bundle_data.get('bundle_name'),
                        'fullname': bundle_data.get('bundle_description', bundle_data.get('bundle_name')),
                        'description': bundle_data.get('bundle_description'),
                        'code': bundle_data.get('subject_code'),
                    }
                    paginated_items.append(transformed_bundle)

                items_needed -= bundle_slice_size
                current_offset = 0  # Reset offset for products
            else:
                # Skip bundles, adjust offset for products
                current_offset -= bundles_count

        # 3. Handle products
        if items_needed > 0 and products_count > 0:
            if current_offset < products_count:
                # Need some products from this page
                product_start = current_offset
                product_end = min(products_count, current_offset + items_needed)

                # Only serialize the products we need (apply LIMIT/OFFSET at queryset level)
                paginated_products_qs = filtered_queryset[product_start:product_end]
                serializer = ProductListSerializer(paginated_products_qs, many=True)
                paginated_items.extend(serializer.data)

        # Handle case where vouchers need to be added but search query didn't prepend them
        if not search_query and marking_vouchers_data and start_idx == 0:
            # On first page without search, prepend vouchers
            paginated_items = marking_vouchers_data[:min(items_needed, vouchers_count)] + paginated_items
            paginated_items = paginated_items[:page_size]  # Trim to page size

        products_data = paginated_items

        # Generate filter counts using BASE querysets (disjunctive faceting)
        # This ensures all filter options remain visible even when filters are applied
        # Pass both product and bundle querysets for accurate counts
        filter_counts = self._generate_optimized_filter_counts(filters, base_queryset, base_bundles_queryset)

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
    
    def _build_optimized_queryset(self, use_fuzzy_sorting=False):
        """
        Build optimized queryset with proper select_related and prefetch_related.
        Uses database indexes created in Phase 3 migration.

        Args:
            use_fuzzy_sorting (bool): If True, skip ordering (fuzzy search will handle it)
        """
        from tutorials.models import TutorialEvent
        from products.models import ProductVariationRecommendation

        queryset = ExamSessionSubjectProduct.objects.select_related(
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
            ),
            # Prefetch recommendations to avoid N+1 queries
            Prefetch(
                'variations__product_product_variation__recommendation',
                queryset=ProductVariationRecommendation.objects.select_related(
                    'recommended_product_product_variation__product',
                    'recommended_product_product_variation__product_variation'
                )
            ),
            # Prefetch tutorial events to avoid N+1 queries for tutorial products
            Prefetch(
                'variations__tutorial_events',
                queryset=TutorialEvent.objects.all()
            )
        )

        # Only apply default sorting if not using fuzzy search (fuzzy search provides its own ordering)
        if not use_fuzzy_sorting:
            queryset = queryset.order_by('exam_session_subject__subject__code', 'product__shortname')

        return queryset

    def _build_bundle_queryset(self):
        """
        Build optimized queryset for bundles with proper relationships.
        Uses Prefetch objects with select_related for efficient nested loading.
        """
        from exam_sessions_subjects_products.models import ExamSessionSubjectBundleProduct

        queryset = ExamSessionSubjectBundle.objects.filter(is_active=True).select_related(
            'bundle__subject',
            'exam_session_subject__exam_session',
            'exam_session_subject__subject'
        ).prefetch_related(
            # Optimized prefetch for bundle products with all needed relations
            Prefetch(
                'bundle_products',
                queryset=ExamSessionSubjectBundleProduct.objects.filter(
                    is_active=True
                ).select_related(
                    # Product info path
                    'exam_session_subject_product_variation__exam_session_subject_product__product',
                    # Variation info path
                    'exam_session_subject_product_variation__product_product_variation__product_variation',
                ).prefetch_related(
                    # Prices for each bundle product variation
                    'exam_session_subject_product_variation__prices'
                ).order_by('sort_order')
            )
        ).order_by('exam_session_subject__subject__code', 'bundle__bundle_name')

        return queryset

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
        
        # Product filters - separate ESSP IDs (from fuzzy search) vs Product IDs (from navbar)
        # ESSP IDs: Filter by ExamSessionSubjectProduct.id (specific instances like CS1 Core Reading)
        if filters.get('essp_ids'):
            logger.debug(f'[SEARCH-DEBUG] ESSP IDs filter received: {filters["essp_ids"]}')
            essp_id_q = Q(id__in=filters['essp_ids'])
            q_filter &= essp_id_q

        # Product IDs: Filter by Product.id (all instances like CB1 Core Reading, CB2 Core Reading, etc.)
        if filters.get('product_ids'):
            logger.debug(f'[SEARCH-DEBUG] Product IDs filter received: {filters["product_ids"]}')
            product_id_q = Q(product__id__in=filters['product_ids'])
            q_filter &= product_id_q

        # Legacy 'products' filter - for backward compatibility (product names)
        if filters.get('products'):
            logger.debug(f'[SEARCH-DEBUG] Products filter (legacy) received: {filters["products"]}')
            product_q = Q()
            for product in filters['products']:
                # Try numeric first (check both ESSP and Product ID for compatibility)
                try:
                    numeric_id = int(product)
                    product_q |= Q(id=numeric_id) | Q(product__id=numeric_id)
                except (ValueError, TypeError):
                    # String: filter by product name
                    product_q |= Q(product__fullname__icontains=product)

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
        # Apply tutorial_format filter (expects code like 'live_online' not name)
        if 'tutorial_format' in navbar_filters:
            try:
                from products.models.filter_system import FilterGroup
                # Look up by code instead of name
                format_group = FilterGroup.objects.get(code=navbar_filters['tutorial_format'])
                queryset = queryset.filter(product__groups=format_group)
            except FilterGroup.DoesNotExist:
                logger.debug(f'[NAVBAR-FILTERS] Tutorial format group with code "{navbar_filters["tutorial_format"]}" not found')
                queryset = queryset.none()
        
        # Apply group filter (expects code for consistency)
        if 'group' in navbar_filters:
            try:
                from products.models.filter_system import FilterGroup
                # First try by code, then fall back to name for backward compatibility
                try:
                    group = FilterGroup.objects.get(code=navbar_filters['group'])
                except FilterGroup.DoesNotExist:
                    # Fall back to name for backward compatibility
                    group = FilterGroup.objects.get(name=navbar_filters['group'])
                queryset = queryset.filter(product__groups=group)
            except FilterGroup.DoesNotExist:
                logger.debug(f'[NAVBAR-FILTERS] Filter group "{navbar_filters["group"]}" not found by code or name')
                queryset = queryset.none()
        
        # Apply tutorial filter (special logic for Tutorial group excluding Online Classroom)
        if 'tutorial' in navbar_filters:
            try:
                from products.models.filter_system import FilterGroup
                tutorial_group = FilterGroup.objects.get(name='Tutorial')
                online_classroom_group = FilterGroup.objects.get(name='Online Classroom')
                queryset = queryset.filter(
                    product__groups=tutorial_group
                ).exclude(
                    product__groups=online_classroom_group
                ).distinct()
            except FilterGroup.DoesNotExist as e:
                logger.debug(f'[NAVBAR-FILTERS] Tutorial group not found: {e}')
                queryset = queryset.none()
        
        # Apply variation filter
        if 'variation' in navbar_filters:
            try:
                variation_id = int(navbar_filters['variation'])
                queryset = queryset.filter(variations__id=variation_id)
            except (ValueError, TypeError):
                logger.debug(f'[NAVBAR-FILTERS] Invalid variation ID: {navbar_filters["variation"]}')
                queryset = queryset.none()

        # Apply distance_learning filter
        if 'distance_learning' in navbar_filters:
            try:
                from products.models.filter_system import FilterGroup
                distance_learning_group = FilterGroup.objects.get(name='Material')
                queryset = queryset.filter(product__groups=distance_learning_group)
            except FilterGroup.DoesNotExist:
                logger.debug('[NAVBAR-FILTERS] Material group not found for distance learning filter')
                queryset = queryset.none()

        # Apply product filter (specific product by ID - for tutorial location navigation)
        if 'product' in navbar_filters:
            try:
                product_id = int(navbar_filters['product'])
                queryset = queryset.filter(product__id=product_id)
            except (ValueError, TypeError):
                logger.debug(f'[NAVBAR-FILTERS] Invalid product ID: {navbar_filters["product"]}')
                queryset = queryset.none()
        
        return queryset.distinct()

    def _apply_bundle_filters(self, queryset, filters):
        """
        Apply filters to bundle queryset (bundles only support subject filtering).
        """
        q_filter = Q()

        # Subject filter for bundles
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

        if q_filter:
            queryset = queryset.filter(q_filter).distinct()

        return queryset

    def _filter_bundles_by_matching_products(self, bundles_queryset, matching_essp_ids):
        """
        Filter bundles to only include those containing products from the matching ESSP IDs.

        This implements content-based bundle filtering: bundles should only appear
        when their contents match the current search/filter criteria.

        Args:
            bundles_queryset: Base bundle queryset
            matching_essp_ids: List of ExamSessionSubjectProduct IDs that match filters/search

        Returns:
            Filtered bundle queryset containing only bundles with matching products
        """
        if not matching_essp_ids:
            logger.debug('[BUNDLES] No matching products - excluding all bundles')
            return bundles_queryset.none()

        from exam_sessions_subjects_products.models import ExamSessionSubjectBundleProduct

        # Find bundle IDs that contain any of the matching products
        # Uses the relationship: ExamSessionSubjectBundleProduct -> ESSPV -> ESSP
        bundle_ids_with_matching_content = ExamSessionSubjectBundleProduct.objects.filter(
            exam_session_subject_product_variation__exam_session_subject_product_id__in=matching_essp_ids,
            is_active=True
        ).values_list('bundle_id', flat=True).distinct()

        matching_bundle_ids = list(bundle_ids_with_matching_content)
        logger.debug(f'[BUNDLES] Content-based filtering: {len(matching_essp_ids)} matching products -> {len(matching_bundle_ids)} bundles')

        return bundles_queryset.filter(id__in=matching_bundle_ids)

    def _fetch_marking_vouchers(self, search_query, filters, navbar_filters=None):
        """
        Fetch marking vouchers when appropriate filters are applied or search query matches.

        Args:
            search_query (str): Search query string
            filters (dict): Applied filters
            navbar_filters (dict): Navbar-style filters (for navigation compatibility)

        Returns:
            list: List of marking voucher data formatted to match ProductListSerializer structure
        """
        try:
            from marking_vouchers.models import MarkingVoucher

            # Determine if marking vouchers should be included
            should_include = False
            navbar_filters = navbar_filters or {}

            # Check if navbar filter includes group='8' (Marking Vouchers navigation)
            if navbar_filters.get('group') == '8':
                should_include = True

            # Check if product_types filter includes '8' (Marking Vouchers from Redux)
            if filters.get('product_types'):
                # Check for both string '8' and integer 8
                if '8' in filters['product_types'] or 8 in filters['product_types']:
                    should_include = True
                # Also check for 'marking' keyword in product_types
                marking_types = [str(pt).lower() for pt in filters['product_types']]
                if any('marking' in pt for pt in marking_types):
                    should_include = True

            # Check if filters include "Marking" or "Marking Vouchers"
            if filters.get('categories'):
                marking_filters = [cat.lower() for cat in filters['categories']]
                if any('marking' in cat for cat in marking_filters):
                    should_include = True

            # Check if search query matches vouchers
            if search_query and len(search_query) >= 2:
                # Search in voucher names, descriptions, or codes
                voucher_matches = MarkingVoucher.objects.filter(
                    Q(name__icontains=search_query) |
                    Q(description__icontains=search_query) |
                    Q(code__icontains=search_query),
                    is_active=True
                )
                if voucher_matches.exists():
                    should_include = True

            if not should_include:
                return []

            # Fetch active marking vouchers
            vouchers = MarkingVoucher.objects.filter(is_active=True)

            # Apply search filter if present
            if search_query and len(search_query) >= 2:
                vouchers = vouchers.filter(
                    Q(name__icontains=search_query) |
                    Q(description__icontains=search_query) |
                    Q(code__icontains=search_query)
                )

            # Format vouchers to match ProductListSerializer structure
            vouchers_data = []
            for voucher in vouchers:
                voucher_data = {
                    'id': f'voucher-{voucher.id}',  # Unique ID to avoid conflicts
                    'essp_id': f'voucher-{voucher.id}',
                    'type': 'MarkingVoucher',  # Critical: This triggers MarkingVoucherProductCard
                    'product_id': voucher.id,
                    'product_code': voucher.code,
                    'product_name': voucher.name,
                    'product_short_name': voucher.name,
                    'product_description': voucher.description or '',
                    'buy_both': False,
                    'subject_id': None,
                    'subject_code': None,
                    'subject_description': None,
                    'exam_session_code': None,
                    'exam_session_id': None,
                    # Pass voucher-specific fields that MarkingVoucherProductCard expects
                    'code': voucher.code,
                    'name': voucher.name,
                    'description': voucher.description,
                    'price': str(voucher.price),
                    'is_active': voucher.is_active,
                    'expiry_date': voucher.expiry_date.isoformat() if voucher.expiry_date else None,
                    'is_available': voucher.is_available,
                    'variations': [{
                        'id': f'voucher-var-{voucher.id}',
                        'variation_type': 'Marking Voucher',
                        'name': 'Marking Voucher',
                        'description': voucher.description or '',
                        'description_short': 'Marking Voucher',
                        'prices': [{
                            'id': f'voucher-price-{voucher.id}',
                            'price_type': 'standard',
                            'amount': str(voucher.price),
                            'currency': 'GBP'
                        }]
                    }]
                }
                vouchers_data.append(voucher_data)

            return vouchers_data

        except Exception as e:
            logger.error(f'[MARKING-VOUCHERS] Error fetching vouchers: {str(e)}')
            return []

    def _generate_optimized_filter_counts(self, applied_filters, base_queryset, base_bundles_queryset=None):
        """
        Generate disjunctive facet counts using optimized GROUP BY queries.
        Uses single aggregation queries instead of multiple COUNT queries per filter.
        Caches results for 5 minutes to reduce database load.
        """
        # Try to get cached filter counts (base counts don't change frequently)
        cache_key = 'filter_counts_base_v2'
        cached_counts = cache.get(cache_key)

        if cached_counts:
            filter_counts = cached_counts.copy()
            # Still need to add product metadata for applied filters
            if applied_filters.get('products'):
                self._add_product_metadata(filter_counts, applied_filters, base_queryset)
            return filter_counts

        filter_counts = {
            'subjects': {},
            'categories': {},
            'product_types': {},
            'products': {},
            'modes_of_delivery': {}
        }

        try:
            # 1. Subject counts - single GROUP BY query for products
            subject_counts = base_queryset.values(
                'exam_session_subject__subject__code'
            ).annotate(count=Count('id')).order_by('-count')

            for item in subject_counts:
                code = item['exam_session_subject__subject__code']
                count = item['count']
                if code and count > 0:
                    filter_counts['subjects'][code] = {
                        'count': count,
                        'name': code
                    }

            # Add bundle counts to subject filter (single GROUP BY query)
            if base_bundles_queryset is not None:
                bundle_subject_counts = base_bundles_queryset.values(
                    'exam_session_subject__subject__code'
                ).annotate(count=Count('id'))

                for item in bundle_subject_counts:
                    code = item['exam_session_subject__subject__code']
                    bundle_count = item['count']
                    if code and bundle_count > 0:
                        if code in filter_counts['subjects']:
                            filter_counts['subjects'][code]['count'] += bundle_count
                        else:
                            filter_counts['subjects'][code] = {
                                'count': bundle_count,
                                'name': code
                            }

            # 2. Filter group counts - single GROUP BY query for ALL groups at once
            # This replaces multiple individual COUNT queries with one aggregated query
            group_counts = base_queryset.values(
                'product__groups__id',
                'product__groups__name'
            ).annotate(count=Count('id', distinct=True)).order_by('-count')

            # Build a lookup dict of group_id -> count
            group_count_lookup = {}
            for item in group_counts:
                group_id = item['product__groups__id']
                group_name = item['product__groups__name']
                count = item['count']
                if group_id and count > 0:
                    group_count_lookup[group_id] = {
                        'count': count,
                        'name': group_name
                    }

            # Cache bundle count (computed once, not per-group)
            bundle_count = base_bundles_queryset.count() if base_bundles_queryset is not None else 0

            # Get active filter configurations and map groups to filter keys
            active_configs = FilterConfiguration.objects.filter(is_active=True).prefetch_related(
                'filterconfigurationgroup_set__filter_group'
            )

            for config in active_configs:
                if config.filter_type == 'filter_group':
                    filter_key = self._get_filter_key_for_config(config.name)
                    if not filter_key:
                        continue

                    # Get filter groups for this configuration
                    for config_group in config.filterconfigurationgroup_set.filter(filter_group__is_active=True):
                        group = config_group.filter_group

                        # Look up count from our pre-computed dict
                        count = group_count_lookup.get(group.id, {}).get('count', 0)

                        # Add bundle count for Bundle category
                        if group.name == 'Bundle':
                            count += bundle_count

                        if count > 0:
                            filter_counts[filter_key][group.name] = {
                                'count': count,
                                'name': group.name,
                                'display_name': group.name
                            }

        except Exception as e:
            logger.error(f"[FILTER-COUNTS] Error generating filter counts: {str(e)}")

        # Cache the base filter counts for 5 minutes (300 seconds)
        cache.set(cache_key, filter_counts, 300)

        # Add product metadata for filtered products (not cached, request-specific)
        if applied_filters.get('products'):
            self._add_product_metadata(filter_counts, applied_filters, base_queryset)

        return filter_counts

    def _add_product_metadata(self, filter_counts, applied_filters, base_queryset):
        """Add product metadata for filtered products (e.g., tutorial locations)."""
        from products.models import Product

        for product_id in applied_filters.get('products', []):
            try:
                product = Product.objects.filter(id=product_id).first()
                if product:
                    # Count products that match this specific product ID
                    count = base_queryset.filter(product_id=product_id).count()
                    filter_counts['products'][str(product_id)] = {
                        'count': count,
                        'name': product.shortname or product.name,
                        'id': product_id
                    }
            except Exception as e:
                logger.error(f"[FILTER-COUNTS] Error adding product metadata for {product_id}: {str(e)}")
    
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
            return count
        except Exception as e:
            logger.debug(f"[FILTER-COUNTS] Error calculating count for {group.name}: {str(e)}")
            return 0
    
    def _build_cache_key(self, filters, page, page_size, options, search_query=''):
        """Build cache key for search results."""
        import hashlib
        import json

        cache_data = {
            'search_query': search_query,
            'filters': filters,
            'page': page,
            'page_size': page_size,
            'options': options,
            'version': '3.1'  # Increment when search logic changes
        }

        cache_string = json.dumps(cache_data, sort_keys=True)
        cache_hash = hashlib.md5(cache_string.encode()).hexdigest()
        return f"optimized_search_{cache_hash}"
    
    def _log_performance(self, operation, filters, duration, result_count):
        """Log performance metrics for monitoring."""
        if self.enable_query_logging:
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
            except Exception as e:
                logger.error(f"Failed to warm cache for {filters}: {str(e)}")


# Service instance
optimized_search_service = OptimizedSearchService()