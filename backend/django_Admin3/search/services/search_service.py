"""
Search Service - Direct store.Product queries.

This service queries store.Product directly for product search,
eliminating the dependency on exam_sessions_subjects_products.
"""
import logging
import time
from collections import defaultdict
from typing import Dict, Any, List, Optional

from django.db.models import Q, Count, Prefetch
from django.core.cache import cache
from django.conf import settings
from fuzzywuzzy import fuzz

import warnings

from store.models import Product as StoreProduct, Bundle as StoreBundle
from catalog.models import Subject
from filtering.models import FilterGroup, FilterConfiguration, FilterConfigurationGroup
from filtering.services.filter_service import ProductFilterService
from search.serializers import StoreProductListSerializer

logger = logging.getLogger('search')


class SearchService:
    """
    Product search service querying store.Product directly.

    Features:
    - Fuzzy search with FuzzyWuzzy
    - Subject, category, and product type filtering
    - Bundle support
    - Disjunctive faceted filter counts
    - Caching for performance
    """

    def __init__(self):
        self.cache_timeout = getattr(settings, 'SEARCH_CACHE_TIMEOUT', 300)
        self.min_fuzzy_score = 45
        self.filter_service = ProductFilterService()

    def unified_search(self, search_query='', filters=None, pagination=None,
                       options=None, navbar_filters=None) -> Dict[str, Any]:
        """
        Execute unified search with filters and pagination.

        Args:
            search_query: Text query for fuzzy matching
            filters: Dict of filter criteria (subjects, categories, etc.)
            pagination: Dict with page and page_size
            options: Dict with include_bundles, include_analytics
            navbar_filters: Dict with navbar dropdown filters

        Returns:
            Dict with products, filter_counts, and pagination info
        """
        start_time = time.time()

        # Set defaults
        search_query = (search_query or '').strip()
        filters = filters or {}
        pagination = pagination or {'page': 1, 'page_size': 20}
        options = options or {'include_bundles': True}
        navbar_filters = navbar_filters or {}

        page = pagination.get('page', 1)
        page_size = pagination.get('page_size', 20)

        logger.debug(f'[SEARCH] unified_search query="{search_query}" filters={filters}')

        # Build base queryset with optimized prefetches
        base_queryset = self._build_optimized_queryset()

        # Apply fuzzy search if query provided
        use_fuzzy = bool(search_query and len(search_query) >= 2)
        fuzzy_product_ids = []

        if use_fuzzy:
            fuzzy_product_ids = self._fuzzy_search_ids(base_queryset, search_query)
            if fuzzy_product_ids:
                # Preserve fuzzy ordering
                from django.db.models import Case, When, IntegerField
                preserved_order = Case(
                    *[When(id=pk, then=pos) for pos, pk in enumerate(fuzzy_product_ids)],
                    output_field=IntegerField()
                )
                base_queryset = base_queryset.filter(id__in=fuzzy_product_ids).order_by(preserved_order)
            else:
                # No fuzzy matches
                base_queryset = base_queryset.none()

        # Check for bundle filter — "Bundle" is a virtual category handled
        # separately (bundles aren't in FilterGroup), so we strip it from
        # the group-based filter and fetch bundles via _get_bundles().
        bundle_filter_active = 'Bundle' in filters.get('categories', [])
        non_bundle_categories = [c for c in filters.get('categories', []) if c != 'Bundle']

        # Translate navbar filters and merge with panel filters
        translated_navbar = self._translate_navbar_filters(navbar_filters)
        if translated_navbar:
            for key, values in translated_navbar.items():
                if key in filters and isinstance(filters[key], list):
                    filters[key] = filters[key] + [v for v in values if v not in filters[key]]
                else:
                    filters[key] = values

        if bundle_filter_active and not non_bundle_categories:
            # ONLY Bundle selected — no individual products
            filtered_queryset = base_queryset.none()
        else:
            # Apply merged filters through ProductFilterService
            filtered_queryset = self.filter_service.apply_store_product_filters(
                base_queryset, filters
            )

        # Get bundles if enabled
        bundles_data = []
        if options.get('include_bundles', True):
            bundles_data = self._get_bundles(
                filters, search_query, bundle_filter_active,
                use_fuzzy and not fuzzy_product_ids
            )

        # Serialize products (grouped by catalog.Product + exam_session_subject)
        products_list = list(filtered_queryset)
        products_data = StoreProductListSerializer.serialize_grouped_products(products_list)

        # Combine bundles and products
        if use_fuzzy and fuzzy_product_ids:
            # Preserve fuzzy relevance ordering
            all_items = products_data + bundles_data
        else:
            # Sort alphabetically by subject code
            all_items = bundles_data + products_data
            all_items.sort(key=lambda x: (
                x.get('subject_code') or x.get('code') or '',
                0 if x.get('is_bundle') else 1,
                x.get('product_short_name') or x.get('product_name') or ''
            ))

        total_count = len(all_items)

        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_items = all_items[start_idx:end_idx]

        # Generate filter counts (disjunctive faceting)
        filter_counts = self._generate_filter_counts(self._build_optimized_queryset(), filters=filters)

        result = {
            'products': paginated_items,
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

        return result

    def _build_optimized_queryset(self):
        """Build queryset with optimized prefetches."""
        from catalog.models import ProductVariationRecommendation

        return StoreProduct.objects.filter(
            is_active=True
        ).select_related(
            'exam_session_subject__subject',
            'exam_session_subject__exam_session',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).prefetch_related(
            'prices',
            'product_product_variation__product__groups',
            Prefetch(
                'product_product_variation__recommendation',
                queryset=ProductVariationRecommendation.objects.select_related(
                    'recommended_product_product_variation__product',
                    'recommended_product_product_variation__product_variation'
                )
            )
        ).order_by(
            'exam_session_subject__subject__code',
            'product_product_variation__product__shortname'
        )

    def _fuzzy_search_ids(self, queryset, query: str) -> List[int]:
        """
        Perform fuzzy search and return matching store.Product IDs
        sorted by relevance score.
        """
        query_lower = query.lower()
        products_with_scores = []

        for sp in queryset:
            searchable_text = self._build_searchable_text(sp)
            score = self._calculate_fuzzy_score(query_lower, searchable_text, sp)

            if score >= self.min_fuzzy_score:
                products_with_scores.append((sp.id, score))

        # Sort by score descending
        products_with_scores.sort(key=lambda x: x[1], reverse=True)

        return [pid for pid, _ in products_with_scores]

    def _build_searchable_text(self, store_product: StoreProduct) -> str:
        """Build searchable text from store.Product fields."""
        parts = []

        catalog_product = store_product.product_product_variation.product
        pv = store_product.product_product_variation.product_variation

        if catalog_product.fullname:
            parts.append(catalog_product.fullname)
        if catalog_product.shortname:
            parts.append(catalog_product.shortname)
        if store_product.exam_session_subject.subject.code:
            parts.append(store_product.exam_session_subject.subject.code)
        if pv.name:
            parts.append(pv.name)

        return ' '.join(parts).lower()

    def _calculate_fuzzy_score(self, query: str, searchable_text: str,
                               store_product: StoreProduct) -> int:
        """Calculate fuzzy match score using weighted composite formula.

        Formula (R1):
            score = 0.15 * subject_bonus + 0.40 * token_sort + 0.25 * partial_name + 0.20 * token_set

        This replaces the previous max(scores) approach which flattened ranking
        by letting subject_bonus (95) dominate all other signals.
        """
        catalog_product = store_product.product_product_variation.product
        subject_code = store_product.exam_session_subject.subject.code.lower()
        product_name = (catalog_product.shortname or catalog_product.fullname or '').lower()

        # Subject code exact match bonus (binary: 0 or 100)
        subject_bonus = 100 if query.startswith(subject_code) else 0

        # Token sort ratio (handles word order)
        token_sort = fuzz.token_sort_ratio(query, searchable_text)

        # Partial ratio (substring matching on product name)
        partial_name = fuzz.partial_ratio(query, product_name)

        # Token set ratio (handles extra words)
        token_set = fuzz.token_set_ratio(query, searchable_text)

        # Weighted composite (R1)
        score = (
            0.15 * subject_bonus
            + 0.40 * token_sort
            + 0.25 * partial_name
            + 0.20 * token_set
        )

        return int(round(score))

    def _apply_filters(self, queryset, filters: Dict) -> Any:
        """Apply filter criteria to queryset.

        .. deprecated::
            Delegates to ProductFilterService.apply_store_product_filters().
            Use self.filter_service.apply_store_product_filters() directly.
        """
        warnings.warn(
            "SearchService._apply_filters is deprecated. "
            "Use ProductFilterService.apply_store_product_filters() instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.filter_service.apply_store_product_filters(queryset, filters)

    def _translate_navbar_filters(self, navbar_filters):
        """Translate navbar GET parameters to standard filter dict format (R5).

        Translation mapping:
            group           -> categories[]
            tutorial_format -> categories[]
            product         -> product_ids[]
            distance_learning -> categories['Material']

        Args:
            navbar_filters: Dict from GET query params.

        Returns:
            Standard filter dict compatible with apply_store_product_filters().
        """
        if not navbar_filters:
            return {}

        result = {}
        categories = []

        if 'group' in navbar_filters:
            categories.append(navbar_filters['group'])

        if 'tutorial_format' in navbar_filters:
            categories.append(navbar_filters['tutorial_format'])

        if 'distance_learning' in navbar_filters:
            categories.append('Material')

        if categories:
            result['categories'] = categories

        if 'product' in navbar_filters:
            result['product_ids'] = [navbar_filters['product']]

        return result

    def _apply_navbar_filters(self, queryset, navbar_filters: Dict) -> Any:
        """Apply navbar dropdown filters.

        .. deprecated::
            Delegates to _translate_navbar_filters() + apply_store_product_filters().
        """
        if not navbar_filters:
            return queryset

        warnings.warn(
            "SearchService._apply_navbar_filters is deprecated. "
            "Use _translate_navbar_filters() + apply_store_product_filters() instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        translated = self._translate_navbar_filters(navbar_filters)
        if translated:
            return self.filter_service.apply_store_product_filters(queryset, translated)
        return queryset

    def _get_bundles(self, filters: Dict, search_query: str,
                     bundle_filter_active: bool, no_fuzzy_results: bool) -> List[Dict]:
        """Get bundles matching filters using single-product matching semantics.

        Single-product matching: a bundle qualifies if at least one of its
        component products satisfies ALL active filter conditions simultaneously.
        This prevents false matches where different products satisfy different
        filter dimensions.
        """
        if no_fuzzy_results and not bundle_filter_active:
            return []

        bundles_queryset = StoreBundle.objects.filter(
            is_active=True
        ).select_related(
            'bundle_template__subject',
            'exam_session_subject__exam_session',
            'exam_session_subject__subject'
        ).prefetch_related(
            'bundle_products__product__prices',
            'bundle_products__product__product_product_variation__product',
            'bundle_products__product__product_product_variation__product_variation',
        )

        # Apply subject filter (at bundle level — bundles have their own ESS)
        if filters.get('subjects'):
            subject_q = Q()
            for subject in filters['subjects']:
                if isinstance(subject, int) or (isinstance(subject, str) and subject.isdigit()):
                    subject_q |= Q(exam_session_subject__subject__id=int(subject))
                else:
                    subject_q |= Q(exam_session_subject__subject__code=subject)
            bundles_queryset = bundles_queryset.filter(subject_q)

        # Apply non-subject filters via single-product matching on component products
        matching_product_ids = self._get_bundle_matching_product_ids(filters)
        if matching_product_ids is not None:
            # Filter bundles to those containing at least one matching product
            bundles_queryset = bundles_queryset.filter(
                bundle_products__product__id__in=matching_product_ids,
                bundle_products__is_active=True
            ).distinct()

        # Serialize bundles with format expected by BundleCard.js
        bundles_data = []
        for bundle in bundles_queryset:
            # Build components array with nested product, product_variation, and prices
            components = []
            active_bundle_products = bundle.bundle_products.filter(is_active=True).order_by('sort_order')

            for bp in active_bundle_products:
                store_product = bp.product
                ppv = store_product.product_product_variation

                # Get product fullname
                product_fullname = store_product.product_code
                product_id = store_product.id
                if ppv and ppv.product:
                    product_fullname = ppv.product.fullname or store_product.product_code
                    product_id = ppv.product.id

                # Get product variation info
                product_variation = None
                if ppv and ppv.product_variation:
                    pv = ppv.product_variation
                    product_variation = {
                        'id': pv.id,
                        'name': pv.name,
                        'variation_type': pv.variation_type,
                        'description_short': pv.description_short,
                    }

                # Get prices
                prices = [
                    {
                        'price_type': price.price_type,
                        'amount': str(price.amount),
                        'currency': price.currency,
                    }
                    for price in store_product.prices.all()
                ]

                component = {
                    'id': store_product.id,
                    'product_code': store_product.product_code,
                    'product': {
                        'id': product_id,
                        'fullname': product_fullname,
                    },
                    'product_variation': product_variation,
                    'prices': prices,
                    'default_price_type': bp.default_price_type,
                    'quantity': bp.quantity,
                    'sort_order': bp.sort_order,
                }
                components.append(component)

            bundle_data = {
                'id': bundle.id,  # Numeric ID for API calls
                'essp_id': bundle.id,
                'item_type': 'bundle',
                'is_bundle': True,
                'type': 'Bundle',
                'bundle_type': 'store',
                'name': bundle.name,
                'bundle_name': bundle.name,  # BundleCard.js expects this
                'shortname': bundle.name,
                'fullname': bundle.description or bundle.name,
                'description': bundle.description,
                'code': bundle.exam_session_subject.subject.code,
                'subject_code': bundle.exam_session_subject.subject.code,
                'subject_id': bundle.exam_session_subject.subject.id,
                'exam_session_code': bundle.exam_session_subject.exam_session.session_code,
                'exam_session_id': bundle.exam_session_subject.exam_session.id,
                'components': components,  # BundleCard.js expects 'components'
                'components_count': len(components),  # BundleCard.js expects this
            }
            bundles_data.append(bundle_data)

        return bundles_data

    def _generate_filter_counts(self, base_queryset, filters=None) -> Dict[str, Dict]:
        """Generate disjunctive facet counts for all filter dimensions.

        .. deprecated::
            Delegates to ProductFilterService.generate_filter_counts().
            Use self.filter_service.generate_filter_counts() directly.
        """
        warnings.warn(
            "SearchService._generate_filter_counts is deprecated. "
            "Use ProductFilterService.generate_filter_counts() instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        filter_counts = self.filter_service.generate_filter_counts(base_queryset, filters)

        # Add bundle count (bundle logic stays in SearchService)
        filters = filters or {}
        bundle_count = self._get_filtered_bundle_count(filters)
        if bundle_count > 0:
            filter_counts['categories']['Bundle'] = {
                'count': bundle_count, 'name': 'Bundle'
            }

        return filter_counts

    def _apply_filters_excluding(self, queryset, filters: Dict, exclude_dimension: str):
        """Apply all filters EXCEPT the excluded dimension.

        .. deprecated::
            Delegates to ProductFilterService._apply_filters_excluding().
        """
        warnings.warn(
            "SearchService._apply_filters_excluding is deprecated. "
            "Use ProductFilterService._apply_filters_excluding() instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.filter_service._apply_filters_excluding(queryset, filters, exclude_dimension)

    @staticmethod
    def _resolve_group_ids_with_hierarchy(group_names, exclude_names=None):
        """Resolve group names to IDs, expanding each group to include descendants.

        Uses FilterGroup.get_descendants() to expand parent selections
        to include all child group IDs. This enables hierarchical filtering
        where selecting "Material" also matches products in child groups
        like "Core Study Materials" and "Revision Materials".

        Args:
            group_names: List of group names to resolve.
            exclude_names: Optional list of names to skip (e.g., ['Bundle']).

        Returns:
            Set of FilterGroup IDs (including descendants).
        """
        exclude_names = set(exclude_names or [])
        resolved_ids = set()

        for name in group_names:
            if name in exclude_names:
                continue
            try:
                group = FilterGroup.objects.get(name__iexact=name)
                descendants = group.get_descendants(include_self=True)
                resolved_ids.update(g.id for g in descendants)
            except FilterGroup.DoesNotExist:
                continue

        return resolved_ids

    def _get_bundle_matching_product_ids(self, filters: Dict) -> Optional[set]:
        """Find store.Product IDs that satisfy ALL non-subject filter dimensions.

        Used for single-product matching: a bundle qualifies only if at least
        one of its component products matches ALL active filter conditions
        simultaneously.

        M2M group filters (categories, product_types) use separate .filter()
        calls so Django creates independent JOINs — same fix as _apply_filters.

        Args:
            filters: Dict of active filters.

        Returns:
            Set of matching store.Product IDs, or None if no non-subject
            filters are active (meaning all bundles qualify).
        """
        # Collect non-subject filter conditions
        has_non_subject_filters = any(
            filters.get(key) for key in ('categories', 'product_types', 'products', 'modes_of_delivery')
        )
        if not has_non_subject_filters:
            return None  # No filtering needed

        # Start with all active store products
        product_qs = StoreProduct.objects.filter(is_active=True)
        q_filter = Q()

        # Product ID filter
        product_ids = filters.get('product_ids') or filters.get('products')
        if product_ids:
            int_product_ids = []
            for pid in product_ids:
                if isinstance(pid, int):
                    int_product_ids.append(pid)
                elif isinstance(pid, str) and pid.isdigit():
                    int_product_ids.append(int(pid))
            if int_product_ids:
                q_filter &= Q(product_product_variation__product__id__in=int_product_ids)

        # Mode of delivery filter (variation type)
        if filters.get('modes_of_delivery'):
            mode_q = Q()
            for mode in filters['modes_of_delivery']:
                mode_q |= Q(product_product_variation__product_variation__variation_type__iexact=mode)
                mode_q |= Q(product_product_variation__product_variation__name__icontains=mode)
            q_filter &= mode_q

        if q_filter:
            product_qs = product_qs.filter(q_filter)

        # M2M group filters — separate .filter() calls for independent JOINs
        # Category filter (via groups with hierarchy)
        if filters.get('categories'):
            category_group_ids = self._resolve_group_ids_with_hierarchy(
                filters['categories'], exclude_names=['Bundle']
            )
            if category_group_ids:
                product_qs = product_qs.filter(
                    product_product_variation__product__groups__id__in=category_group_ids
                )

        # Product type filter (via groups with hierarchy)
        if filters.get('product_types'):
            type_group_ids = self._resolve_group_ids_with_hierarchy(
                filters['product_types']
            )
            if type_group_ids:
                product_qs = product_qs.filter(
                    product_product_variation__product__groups__id__in=type_group_ids
                )

        return set(product_qs.distinct().values_list('id', flat=True))

    def _get_filtered_bundle_count(self, filters: Dict) -> int:
        """Count bundles that match ALL active filter dimensions.

        Uses the same single-product matching semantics as _get_bundles():
        a bundle is counted only if at least one component product satisfies
        ALL active filter conditions simultaneously.

        Args:
            filters: Dict of active filters.

        Returns:
            Count of matching active bundles.
        """
        bundles_qs = StoreBundle.objects.filter(is_active=True)

        # Apply subject filter at bundle level
        if filters.get('subjects'):
            subject_q = Q()
            for subject in filters['subjects']:
                if isinstance(subject, int) or (isinstance(subject, str) and subject.isdigit()):
                    subject_q |= Q(exam_session_subject__subject__id=int(subject))
                else:
                    subject_q |= Q(exam_session_subject__subject__code=subject)
            bundles_qs = bundles_qs.filter(subject_q)

        # Apply non-subject filters via single-product matching
        matching_product_ids = self._get_bundle_matching_product_ids(filters)
        if matching_product_ids is not None:
            bundles_qs = bundles_qs.filter(
                bundle_products__product__id__in=matching_product_ids,
                bundle_products__is_active=True
            ).distinct()

        return bundles_qs.count()

    def fuzzy_search(self, query: str, min_score: int = 60, limit: int = 50) -> Dict[str, Any]:
        """
        Execute fuzzy search with typo tolerance.

        Args:
            query: Search query string
            min_score: Minimum match score (0-100)
            limit: Maximum results to return

        Returns:
            Dict with products, total_count, suggested_filters, search_info
        """
        if not query or len(query.strip()) < 2:
            return self._empty_fuzzy_results()

        self.min_fuzzy_score = min_score
        query_lower = query.strip().lower()

        base_queryset = self._build_optimized_queryset()
        products_with_scores = []

        for sp in base_queryset:
            searchable_text = self._build_searchable_text(sp)
            score = self._calculate_fuzzy_score(query_lower, searchable_text, sp)

            if score >= min_score:
                products_with_scores.append((sp, score))

        # Sort by score
        products_with_scores.sort(key=lambda x: x[1], reverse=True)
        top_products = products_with_scores[:limit]

        # Serialize
        products_list = [item[0] for item in top_products]
        products_data = StoreProductListSerializer.serialize_grouped_products(products_list)

        return {
            'products': products_data,
            'total_count': len(products_with_scores),
            'suggested_filters': {
                'subjects': [],
                'categories': [],
                'products': products_data[:5]
            },
            'search_info': {
                'query': query,
                'min_score': min_score,
                'matches_found': len(products_with_scores),
                'algorithm': 'fuzzy_store_product'
            }
        }

    def advanced_fuzzy_search(self, query: Optional[str] = None,
                               subject_ids: Optional[List[int]] = None,
                               category_ids: Optional[List[int]] = None,
                               min_score: int = 65, limit: int = 50) -> Dict[str, Any]:
        """
        Execute advanced fuzzy search with pre-filtering.
        """
        base_queryset = self._build_optimized_queryset()

        # Apply pre-filters
        if subject_ids:
            base_queryset = base_queryset.filter(
                exam_session_subject__subject__id__in=subject_ids
            )

        if category_ids:
            base_queryset = base_queryset.filter(
                product_product_variation__product__groups__id__in=category_ids
            ).distinct()

        if not query or len(query.strip()) < 2:
            # No fuzzy search, just return filtered results
            products_list = list(base_queryset[:limit])
            products_data = StoreProductListSerializer.serialize_grouped_products(products_list)

            return {
                'products': products_data,
                'total_count': base_queryset.count(),
                'suggested_filters': {'subjects': [], 'categories': [], 'products': []},
                'search_info': {
                    'query': query or '',
                    'filtered_by': {'subjects': bool(subject_ids), 'categories': bool(category_ids)},
                    'algorithm': 'filtered_no_query'
                }
            }

        # Fuzzy search on filtered queryset
        self.min_fuzzy_score = min_score
        query_lower = query.strip().lower()
        products_with_scores = []

        for sp in base_queryset:
            searchable_text = self._build_searchable_text(sp)
            score = self._calculate_fuzzy_score(query_lower, searchable_text, sp)

            if score >= min_score:
                products_with_scores.append((sp, score))

        products_with_scores.sort(key=lambda x: x[1], reverse=True)
        top_products = products_with_scores[:limit]

        products_list = [item[0] for item in top_products]
        products_data = StoreProductListSerializer.serialize_grouped_products(products_list)

        return {
            'products': products_data,
            'total_count': len(products_with_scores),
            'suggested_filters': {'subjects': [], 'categories': [], 'products': []},
            'search_info': {
                'query': query,
                'min_score': min_score,
                'matches_found': len(products_with_scores),
                'algorithm': 'fuzzy_with_filters'
            }
        }

    def get_default_search_data(self, limit: int = 5) -> Dict[str, Any]:
        """
        Get default search data for initial page load.
        """
        response_data = {
            'popular_products': [],
            'total_count': 0,
            'suggested_filters': {
                'subjects': [],
                'product_groups': [],
                'variations': [],
                'products': []
            },
            'search_info': {'query': '', 'type': 'default'}
        }

        # Get subjects
        try:
            subjects = Subject.objects.all()[:limit]
            response_data['suggested_filters']['subjects'] = [
                {'id': s.id, 'code': s.code, 'description': s.description}
                for s in subjects
            ]
        except Exception as e:
            logger.warning(f'[SEARCH] Error getting subjects: {e}')

        # Get product groups
        try:
            groups = FilterGroup.objects.filter(is_active=True)[:limit]
            response_data['suggested_filters']['product_groups'] = [
                {'id': g.id, 'name': g.name, 'description': g.description or g.name}
                for g in groups
            ]
        except Exception as e:
            logger.warning(f'[SEARCH] Error getting product groups: {e}')

        # Get popular products
        try:
            queryset = self._build_optimized_queryset()[:limit]
            products_list = list(queryset)
            products_data = StoreProductListSerializer.serialize_grouped_products(products_list)
            response_data['popular_products'] = products_data
            response_data['total_count'] = len(products_data)
        except Exception as e:
            logger.warning(f'[SEARCH] Error getting popular products: {e}')

        return response_data

    def _empty_fuzzy_results(self) -> Dict[str, Any]:
        """Return empty fuzzy search results."""
        return {
            'products': [],
            'total_count': 0,
            'suggested_filters': {'subjects': [], 'categories': [], 'products': []},
            'search_info': {
                'query': '',
                'min_score': self.min_fuzzy_score,
                'matches_found': 0,
                'algorithm': 'fuzzy_store_product'
            }
        }


# Singleton instance
search_service = SearchService()
