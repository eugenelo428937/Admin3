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

from store.models import Product as StoreProduct, Bundle as StoreBundle
from catalog.models import Subject
from products.models.filter_system import FilterGroup, FilterConfiguration
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
        self.min_fuzzy_score = 60

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

        # Check for bundle-only filter
        bundle_filter_active = 'Bundle' in filters.get('categories', [])

        if bundle_filter_active:
            # Only return bundles
            filtered_queryset = base_queryset.none()
        else:
            # Apply filters
            filtered_queryset = self._apply_filters(base_queryset, filters)
            filtered_queryset = self._apply_navbar_filters(filtered_queryset, navbar_filters)

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
        filter_counts = self._generate_filter_counts(self._build_optimized_queryset())

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
        """Calculate fuzzy match score using multiple algorithms."""
        catalog_product = store_product.product_product_variation.product
        subject_code = store_product.exam_session_subject.subject.code.lower()
        product_name = (catalog_product.shortname or catalog_product.fullname or '').lower()

        scores = []

        # Subject code exact match bonus
        if query.startswith(subject_code):
            scores.append(95)

        # Token sort ratio (handles word order)
        scores.append(fuzz.token_sort_ratio(query, searchable_text))

        # Partial ratio (substring matching)
        scores.append(fuzz.partial_ratio(query, product_name))

        # Token set ratio (handles extra words)
        scores.append(fuzz.token_set_ratio(query, searchable_text))

        return max(scores) if scores else 0

    def _apply_filters(self, queryset, filters: Dict) -> Any:
        """Apply filter criteria to queryset."""
        q_filter = Q()

        # Subject filter
        if filters.get('subjects'):
            subject_q = Q()
            for subject in filters['subjects']:
                if isinstance(subject, int) or (isinstance(subject, str) and subject.isdigit()):
                    subject_q |= Q(exam_session_subject__subject__id=int(subject))
                else:
                    subject_q |= Q(exam_session_subject__subject__code=subject)
            q_filter &= subject_q

        # Category filter (via product groups)
        if filters.get('categories'):
            category_q = Q()
            for category in filters['categories']:
                if category != 'Bundle':  # Bundle handled separately
                    category_q |= Q(product_product_variation__product__groups__name__iexact=category)
            if category_q:
                q_filter &= category_q

        # Product type filter (via product groups)
        if filters.get('product_types'):
            type_q = Q()
            for product_type in filters['product_types']:
                type_q |= Q(product_product_variation__product__groups__name__iexact=product_type)
            q_filter &= type_q

        # Product ID filter
        if filters.get('product_ids'):
            q_filter &= Q(product_product_variation__product__id__in=filters['product_ids'])

        # Store product ID filter (essp_ids for backward compatibility)
        if filters.get('essp_ids'):
            q_filter &= Q(id__in=filters['essp_ids'])

        # Mode of delivery filter (variation type)
        if filters.get('modes_of_delivery'):
            mode_q = Q()
            for mode in filters['modes_of_delivery']:
                mode_q |= Q(product_product_variation__product_variation__name__icontains=mode)
            q_filter &= mode_q

        if q_filter:
            queryset = queryset.filter(q_filter).distinct()

        return queryset

    def _apply_navbar_filters(self, queryset, navbar_filters: Dict) -> Any:
        """Apply navbar dropdown filters."""
        if not navbar_filters:
            return queryset

        # Group filter
        if 'group' in navbar_filters:
            try:
                group = FilterGroup.objects.get(
                    Q(code=navbar_filters['group']) | Q(name=navbar_filters['group'])
                )
                queryset = queryset.filter(product_product_variation__product__groups=group)
            except FilterGroup.DoesNotExist:
                queryset = queryset.none()

        # Tutorial format filter
        if 'tutorial_format' in navbar_filters:
            try:
                format_group = FilterGroup.objects.get(code=navbar_filters['tutorial_format'])
                queryset = queryset.filter(product_product_variation__product__groups=format_group)
            except FilterGroup.DoesNotExist:
                queryset = queryset.none()

        # Product filter
        if 'product' in navbar_filters:
            try:
                product_id = int(navbar_filters['product'])
                queryset = queryset.filter(product_product_variation__product__id=product_id)
            except (ValueError, TypeError):
                queryset = queryset.none()

        # Distance learning filter
        if 'distance_learning' in navbar_filters:
            try:
                dl_group = FilterGroup.objects.get(name='Material')
                queryset = queryset.filter(product_product_variation__product__groups=dl_group)
            except FilterGroup.DoesNotExist:
                queryset = queryset.none()

        return queryset.distinct()

    def _get_bundles(self, filters: Dict, search_query: str,
                     bundle_filter_active: bool, no_fuzzy_results: bool) -> List[Dict]:
        """Get bundles matching filters."""
        if no_fuzzy_results and not bundle_filter_active:
            return []

        bundles_queryset = StoreBundle.objects.filter(
            is_active=True
        ).select_related(
            'bundle_template__subject',
            'exam_session_subject__exam_session',
            'exam_session_subject__subject'
        ).prefetch_related(
            'bundle_products__product__prices'
        )

        # Apply subject filter
        if filters.get('subjects'):
            subject_q = Q()
            for subject in filters['subjects']:
                if isinstance(subject, int) or (isinstance(subject, str) and subject.isdigit()):
                    subject_q |= Q(exam_session_subject__subject__id=int(subject))
                else:
                    subject_q |= Q(exam_session_subject__subject__code=subject)
            bundles_queryset = bundles_queryset.filter(subject_q)

        # Serialize bundles
        bundles_data = []
        for bundle in bundles_queryset:
            bundle_data = {
                'id': f'bundle-{bundle.id}',
                'essp_id': f'bundle-{bundle.id}',
                'item_type': 'bundle',
                'is_bundle': True,
                'type': 'Bundle',
                'bundle_type': 'store',
                'product_name': bundle.name,
                'shortname': bundle.name,
                'fullname': bundle.description or bundle.name,
                'description': bundle.description,
                'code': bundle.exam_session_subject.subject.code,
                'subject_code': bundle.exam_session_subject.subject.code,
                'subject_id': bundle.exam_session_subject.subject.id,
                'exam_session_code': bundle.exam_session_subject.exam_session.session_code,
                'exam_session_id': bundle.exam_session_subject.exam_session.id,
                'bundle_products': [
                    {
                        'id': bp.product.id,
                        'product_code': bp.product.product_code,
                        'sort_order': bp.sort_order,
                    }
                    for bp in bundle.bundle_products.filter(is_active=True)
                ]
            }
            bundles_data.append(bundle_data)

        return bundles_data

    def _generate_filter_counts(self, base_queryset) -> Dict[str, Dict]:
        """Generate disjunctive facet counts."""
        filter_counts = {
            'subjects': {},
            'categories': {},
            'product_types': {},
            'products': {},
            'modes_of_delivery': {}
        }

        # Subject counts
        subject_counts = base_queryset.values(
            'exam_session_subject__subject__code'
        ).annotate(count=Count('id')).order_by('-count')

        for item in subject_counts:
            code = item['exam_session_subject__subject__code']
            count = item['count']
            if code and count > 0:
                filter_counts['subjects'][code] = {'count': count, 'name': code}

        # Group counts (categories and product types)
        group_counts = base_queryset.values(
            'product_product_variation__product__groups__id',
            'product_product_variation__product__groups__name'
        ).annotate(count=Count('id', distinct=True)).order_by('-count')

        for item in group_counts:
            group_name = item['product_product_variation__product__groups__name']
            count = item['count']
            if group_name and count > 0:
                # Map to appropriate filter key based on configuration
                filter_counts['categories'][group_name] = {
                    'count': count, 'name': group_name
                }

        # Add bundle count
        bundle_count = StoreBundle.objects.filter(is_active=True).count()
        if bundle_count > 0:
            filter_counts['categories']['Bundle'] = {
                'count': bundle_count, 'name': 'Bundle'
            }

        return filter_counts

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
