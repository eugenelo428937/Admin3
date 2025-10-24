"""
Enhanced Fuzzy Search Service with True Typo Tolerance

This service provides intelligent fuzzy matching that handles:
- Typos and misspellings (e.g., "Exams" matches "Exam")
- Plural/singular variations (e.g., "Tutorials" matches "Tutorial")
- Word order variations
- Partial word matches
- Case-insensitive matching
"""

import logging
from typing import List, Dict, Any, Tuple
from fuzzywuzzy import fuzz, process
from django.db.models import Q, QuerySet
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from subjects.models import Subject
from products.models.filter_system import FilterGroup

logger = logging.getLogger(__name__)


class FuzzySearchService:
    """
    Enhanced fuzzy search service with true typo tolerance using FuzzyWuzzy.

    Uses multiple fuzzy matching strategies:
    1. Token sort ratio - handles word order and plurals
    2. Partial ratio - handles substring matches
    3. Token set ratio - handles partial word matches
    """

    def __init__(self, min_score: int = 60):
        """
        Initialize the fuzzy search service.

        Args:
            min_score: Minimum fuzzy match score (0-100) to consider a match
        """
        self.min_score = min_score

    def search_products(self, query: str, limit: int = 50) -> Dict[str, Any]:
        """
        Perform fuzzy search across products, subjects, and categories.

        Handles typos, plurals, and word variations using multiple fuzzy algorithms.

        Args:
            query: Search query string
            limit: Maximum number of results to return

        Returns:
            Dictionary containing search results and suggested filters
        """
        if not query or len(query.strip()) < 3:
            return self._get_empty_results()

        query = query.strip().lower()

        # Log search start
        logger.info(f'🔍 [SEARCH-START] Query: "{query}" | Min score: {self.min_score} | Limit: {limit}')
        logger.info(f'=' * 80)

        # Get all available products with related data
        queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        ).prefetch_related(
            'product__groups',
            'product__product_variations'
        )

        # Build searchable text for each product
        products_with_scores = []
        subject_matches = {}
        category_matches = {}

        for product in queryset:
            # Create searchable text combining multiple fields
            searchable_text = self._build_searchable_text(product)

            # Calculate fuzzy score using multiple algorithms for better typo tolerance
            # Pass product for field-specific weighting (subject bonus)
            score_result = self._calculate_fuzzy_score(query, searchable_text, product=product)
            score = score_result['score']

            if score >= self.min_score:
                # Store product with score and algorithm details
                # IMPORTANT: Sort by uncapped_score for accurate ranking of high-scoring products
                products_with_scores.append((
                    product,
                    score,
                    score_result.get('uncapped_score', score),  # Use uncapped score for sorting
                    searchable_text,
                    score_result['token_sort'],
                    score_result['partial'],
                    score_result['token_set']
                ))

                # Track subject matches
                subject_code = product.exam_session_subject.subject.code
                subject_description = product.exam_session_subject.subject.description or subject_code
                subject_key = f"{subject_code}|{subject_description}"

                if subject_key not in subject_matches:
                    # Use token sort ratio for subject matching (handles word order)
                    subject_score = max(
                        fuzz.token_sort_ratio(query, subject_code.lower()),
                        fuzz.token_sort_ratio(query, subject_description.lower())
                    )
                    if subject_score >= self.min_score:
                        subject_matches[subject_key] = {
                            'code': subject_code,
                            'name': subject_description,
                            'score': subject_score,
                            'count': 0
                        }

                if subject_key in subject_matches:
                    subject_matches[subject_key]['count'] += 1

                # Track category matches
                for group in product.product.groups.all():
                    if group.name not in category_matches:
                        # Use token sort ratio for category matching
                        category_score = fuzz.token_sort_ratio(query, group.name.lower())
                        if category_score >= self.min_score:
                            category_matches[group.name] = {
                                'name': group.name,
                                'score': category_score,
                                'count': 0
                            }

                    if group.name in category_matches:
                        category_matches[group.name]['count'] += 1

        # Sort products by uncapped fuzzy score (highest first) for accurate ranking
        # x[2] is uncapped_score, x[1] is capped display score
        products_with_scores.sort(key=lambda x: x[2], reverse=True)

        # Limit results
        top_products = products_with_scores[:limit]

        # Prepare product suggestions (top 5 with ESSP IDs for correct filtering)
        product_suggestions = []
        for product, score, _, _, _, _, _ in top_products[:5]:
            product_suggestions.append({
                'id': product.id,  # ESSP ID (ExamSessionSubjectProduct.id)
                'essp_id': product.id,  # Explicit ESSP ID for clarity
                'product_id': product.product.id,  # Product table ID (for reference only)
                'product_code': product.product.code,
                'product_name': product.product.shortname or product.product.fullname,
                'subject_code': product.exam_session_subject.subject.code,
                'subject_name': product.exam_session_subject.subject.description or product.exam_session_subject.subject.code,
                'score': score,
                'type': 'product'
            })

        # Prepare results
        results = {
            'products': [item[0] for item in top_products],
            'total_count': len(products_with_scores),
            'suggested_products': product_suggestions,  # For search modal
            'suggested_filters': {
                'subjects': self._prepare_subject_suggestions(subject_matches),
                'categories': self._prepare_category_suggestions(category_matches),
                'products': product_suggestions
            },
            'search_info': {
                'query': query,
                'min_score': self.min_score,
                'total_scanned': queryset.count(),
                'matches_found': len(products_with_scores),
                'algorithm': 'multi_fuzzy_with_typo_tolerance'
            }
        }

        # Log search results summary
        logger.info(f'=' * 80)
        logger.info(f'🎯 [SEARCH-RESULTS] Query: "{query}"')
        logger.info(f'   Total scanned: {queryset.count()} | Matches found: {len(products_with_scores)} | Returned: {len(top_products)}')

        if top_products:
            logger.info(f'\n   Top {min(30, len(top_products))} Results:')
            for idx, (product, score, _, _, token_sort, partial, token_set) in enumerate(top_products[:30], 1):
                subject_code = product.exam_session_subject.subject.code
                product_name = product.product.shortname or product.product.fullname
                logger.info(f'   {idx:2d}. Score: {score:3d} | [{subject_code:4s}] {product_name}')
                logger.info(f'       Algorithms: token_sort={token_sort:3d}, partial={partial:3d}, token_set={token_set:3d}')
        else:
            logger.info(f'   No products matched the query (min_score: {self.min_score})')

        logger.info(f'=' * 80 + '\n')

        return results

    def _apply_field_bonus(self, query: str, field_value: str, field_name: str,
                          base_score: float, threshold: int = 65,
                          max_bonus: float = 30.0) -> float:
        """
        Apply bonus weighting to scores when query matches a high-priority field.

        Args:
            query: Search query (already lowercased)
            field_value: Field value to check (already lowercased)
            field_name: Name of field for logging (e.g., "subject", "product_name")
            base_score: Current score before bonus
            threshold: Minimum match score to apply bonus (default: 70)
            max_bonus: Maximum bonus points to add (default: 15.0)

        Returns:
            Score with bonus applied (capped at 100)
        """
        if not field_value:
            return base_score

        # Calculate match score for this field
        field_score = fuzz.token_sort_ratio(query, field_value)

        # Apply bonus if field matches well
        if field_score >= threshold:
            bonus = (field_score - threshold) * (max_bonus / 30.0)  # Scale to max_bonus
            new_score = min(100, base_score + bonus)
            return new_score

        return base_score

    def _calculate_fuzzy_score(self, query: str, searchable_text: str, product=None) -> Dict[str, Any]:
        """
        Calculate fuzzy match score using field-specific algorithms.

        NEW APPROACH: Match query against individual fields using appropriate algorithms:
        - Subject code: Basic ratio (exact matching) - HIGHEST priority
        - Product shortname: Partial ratio (substring matching) - HIGH priority
        - Product fullname: Token set ratio (handles extra words) - MEDIUM priority
        - Combined searchable text: Token set ratio (fallback) - LOW priority

        Takes the BEST score across all fields.

        Args:
            query: Search query (already lowercased)
            searchable_text: Combined searchable text (for fallback)
            product: ExamSessionSubjectProduct instance for field-specific matching

        Returns:
            Dict with 'score', 'token_sort', 'partial', 'token_set' keys
        """
        if not product:
            # Fallback: use token_set_ratio for generic search
            token_set_score = fuzz.token_set_ratio(query, searchable_text)
            return {'score': token_set_score, 'token_sort': 0, 'partial': 0, 'token_set': token_set_score}

        # Extract individual fields for matching
        subject_code = product.exam_session_subject.subject.code
        subject_code_lower = subject_code.lower()
        subject_desc = (product.exam_session_subject.subject.description or '').lower()
        product_shortname = (product.product.shortname or '').lower()
        product_fullname = (product.product.fullname or '').lower()

        field_scores = []
        query_tokens = query.split()

        # 1. SUBJECT CODE - Use basic ratio (exact matching is critical)
        # For queries starting with subject code (e.g., "CS1 co", "CS1 mocks")
        subject_code_score = fuzz.ratio(query, subject_code_lower)
        # Also check if query STARTS with subject code
        if query.startswith(subject_code_lower):
            subject_code_score = max(subject_code_score, 95)
        # Check if query contains subject code as first token
        if query_tokens and query_tokens[0] == subject_code_lower:
            subject_code_score = max(subject_code_score, 90)

        # CRITICAL: Detect multi-token queries starting with subject code
        # e.g., "CS1 cor" should prioritize product name matching for "cor"
        has_subject_prefix = len(query_tokens) > 1 and query_tokens[0] == subject_code_lower

        if has_subject_prefix:
            # Multi-token query starting with subject code
            # Extract remaining query after subject code
            remaining_query = ' '.join(query_tokens[1:])  # e.g., "cor" from "cs1 cor"

            # REDUCE subject code weight since it's just a filter
            field_scores.append(('subject_code', subject_code_score, 0.8))  # Reduced to 0.8x

            # INCREASE product name matching weight for remaining query
            if product_shortname:
                remainder_shortname_score = fuzz.partial_ratio(remaining_query, product_shortname)
                field_scores.append(('product_shortname_remainder', remainder_shortname_score, 3.0))  # 3.0x HIGH weight!

            if product_fullname:
                remainder_fullname_score = fuzz.token_set_ratio(remaining_query, product_fullname)
                field_scores.append(('product_fullname_remainder', remainder_fullname_score, 2.5))  # 2.5x HIGH weight!

            # Also check full product name against full query (lower weight)
            if product_shortname:
                shortname_score = fuzz.partial_ratio(query, product_shortname)
                field_scores.append(('product_shortname', shortname_score, 0.5))  # Low weight
        else:
            # Single token or doesn't start with subject code - use normal weights
            field_scores.append(('subject_code', subject_code_score, 1.5))

            # 3. PRODUCT SHORTNAME - Use partial ratio (best for short query vs short name)
            if product_shortname:
                shortname_score = fuzz.partial_ratio(query, product_shortname)
                field_scores.append(('product_shortname', shortname_score, 1.2))  # 1.2x weight

        # 2. SUBJECT DESCRIPTION - Use partial ratio (substring matching)
        if subject_desc:
            subject_desc_score = fuzz.partial_ratio(query, subject_desc)
            field_scores.append(('subject_desc', subject_desc_score, 0.8))  # 0.8x weight

        # 4. PRODUCT FULLNAME - Use token_set_ratio (handles extra words)
        if product_fullname and not has_subject_prefix:
            fullname_score = fuzz.token_set_ratio(query, product_fullname)
            field_scores.append(('product_fullname', fullname_score, 1.0))  # 1.0x weight

        # 5. COMBINED QUERY vs SUBJECT+PRODUCT (for multi-word queries like "CS1 Core Reading")
        combined_target = f"{subject_code_lower} {product_shortname or product_fullname}"
        combined_score = fuzz.token_set_ratio(query, combined_target)
        field_scores.append(('combined', combined_score, 1.3))  # 1.3x weight

        # Calculate weighted scores and find best match
        best_score = 0
        best_field = None
        weighted_scores = []

        for field_name, score, weight in field_scores:
            weighted = score * weight
            weighted_scores.append((field_name, score, weighted))
            if weighted > best_score:
                best_score = weighted
                best_field = field_name

        # IMPORTANT: Store uncapped weighted score for sorting (differentiate high-scoring products)
        # Cap only the display score for consistency with 0-100 scale
        uncapped_score = best_score
        final_score = min(100, int(best_score))

        # Store individual algorithm scores for logging (use representative values)
        token_sort_score = combined_score  # Token sort not used but needed for logging
        partial_score = max((s for f, s, w in field_scores if 'shortname' in f or 'desc' in f), default=0)
        token_set_score = max((s for f, s, w in field_scores if 'fullname' in f or 'combined' in f), default=0)

        return {
            'score': final_score,
            'uncapped_score': uncapped_score,  # For accurate sorting of high-scoring products
            'token_sort': token_sort_score,
            'partial': partial_score,
            'token_set': token_set_score
        }

    def _build_searchable_text(self, product: ExamSessionSubjectProduct) -> str:
        """
        Build a comprehensive searchable text string from all relevant fields.

        Args:
            product: ExamSessionSubjectProduct instance

        Returns:
            Lowercase searchable text string
        """
        searchable_parts = []

        # Product name
        if product.product.fullname:
            searchable_parts.append(product.product.fullname)

        # Subject code
        if product.exam_session_subject.subject.code:
            searchable_parts.append(product.exam_session_subject.subject.code)
       
        # Product variations information
        try:
            for variation in product.product.product_variations.all():
                if variation.name:
                    searchable_parts.append(variation.name)                
        except Exception:
            pass  # Handle case where variations relationship doesn't exist

        # Product group information
        # try:
        #     for group in product.product.groups.all():
        #         if group.name:
        #             searchable_parts.append(group.name)
        # except Exception:
        #     pass  # Handle case where groups relationship doesn't exist

        return ' '.join(searchable_parts).lower()

    def _prepare_subject_suggestions(self, subject_matches: Dict) -> List[Dict]:
        """
        Prepare subject suggestions sorted by relevance.

        Args:
            subject_matches: Dictionary of subject matches with scores

        Returns:
            List of subject suggestion dictionaries
        """
        suggestions = []
        for subject_key, data in subject_matches.items():
            suggestions.append({
                'id': data['code'],
                'code': data['code'],
                'name': data['name'],
                'type': 'subject',
                'score': data['score'],
                'count': data['count']
            })

        # Sort by score then by count
        suggestions.sort(key=lambda x: (x['score'], x['count']), reverse=True)
        return suggestions[:10]  # Top 10 subject suggestions

    def _prepare_category_suggestions(self, category_matches: Dict) -> List[Dict]:
        """
        Prepare category suggestions sorted by relevance.

        Args:
            category_matches: Dictionary of category matches with scores

        Returns:
            List of category suggestion dictionaries
        """
        suggestions = []
        for group_name, data in category_matches.items():
            suggestions.append({
                'id': group_name,
                'name': group_name,
                'type': 'category',
                'score': data['score'],
                'count': data['count']
            })

        # Sort by score then by count
        suggestions.sort(key=lambda x: (x['score'], x['count']), reverse=True)
        return suggestions[:10]  # Top 10 category suggestions

    def _get_empty_results(self) -> Dict[str, Any]:
        """
        Return empty results structure.

        Returns:
            Empty results dictionary
        """
        return {
            'products': [],
            'total_count': 0,
            'suggested_products': [],
            'suggested_filters': {
                'subjects': [],
                'categories': [],
                'products': []
            },
            'search_info': {
                'query': '',
                'min_score': self.min_score,
                'total_scanned': 0,
                'matches_found': 0,
                'algorithm': 'multi_fuzzy_with_typo_tolerance'
            }
        }

    def advanced_search(self,
                       query: str = None,
                       subject_ids: List[int] = None,
                       category_ids: List[int] = None,
                       limit: int = 50) -> Dict[str, Any]:
        """
        Perform advanced search with filters.

        Args:
            query: Optional text query for fuzzy matching
            subject_ids: List of subject IDs to filter by
            category_ids: List of category IDs to filter by
            limit: Maximum number of results

        Returns:
            Filtered and scored results
        """
        # Start with base queryset
        queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        ).prefetch_related(
            'product__groups',
            'product__product_variations'
        )

        # Apply filters
        if subject_ids:
            queryset = queryset.filter(exam_session_subject__subject__id__in=subject_ids)

        if category_ids:
            queryset = queryset.filter(product__groups__id__in=category_ids).distinct()

        # If no text query, return filtered results
        if not query or len(query.strip()) < 3:
            products = list(queryset[:limit])

            # Prepare product suggestions with ESSP IDs
            product_suggestions = []
            for product in products[:5]:
                product_suggestions.append({
                    'id': product.id,  # ESSP ID
                    'essp_id': product.id,
                    'product_id': product.product.id,
                    'product_code': product.product.code,
                    'product_name': product.product.shortname or product.product.fullname,
                    'subject_code': product.exam_session_subject.subject.code,
                    'subject_name': product.exam_session_subject.subject.description or product.exam_session_subject.subject.code,
                    'type': 'product'
                })

            return {
                'products': products,
                'total_count': queryset.count(),
                'suggested_products': product_suggestions,
                'suggested_filters': {
                    'subjects': [],
                    'categories': [],
                    'products': product_suggestions
                },
                'search_info': {
                    'query': query or '',
                    'filtered_by': {
                        'subjects': bool(subject_ids),
                        'categories': bool(category_ids)
                    },
                    'algorithm': 'filtered_no_query'
                }
            }

        # Perform fuzzy search on filtered queryset
        query = query.strip().lower()
        products_with_scores = []

        for product in queryset:
            searchable_text = self._build_searchable_text(product)
            # Pass product for field-specific weighting (subject bonus)
            score_result = self._calculate_fuzzy_score(query, searchable_text, product=product)
            score = score_result['score']

            if score >= self.min_score:
                products_with_scores.append((
                    product,
                    score,
                    score_result.get('uncapped_score', score),  # Use uncapped score for sorting
                    score_result['token_sort'],
                    score_result['partial'],
                    score_result['token_set']
                ))

        # Sort by uncapped score (highest first) for accurate ranking
        products_with_scores.sort(key=lambda x: x[2], reverse=True)
        top_products = products_with_scores[:limit]

        # Prepare product suggestions with ESSP IDs
        product_suggestions = []
        for product, score, _, _, _, _ in top_products[:5]:
            product_suggestions.append({
                'id': product.id,  # ESSP ID
                'essp_id': product.id,
                'product_id': product.product.id,
                'product_code': product.product.code,
                'product_name': product.product.shortname or product.product.fullname,
                'subject_code': product.exam_session_subject.subject.code,
                'subject_name': product.exam_session_subject.subject.description or product.exam_session_subject.subject.code,
                'score': score,
                'type': 'product'
            })

        return {
            'products': [item[0] for item in top_products],
            'total_count': len(products_with_scores),
            'suggested_products': product_suggestions,
            'suggested_filters': {
                'subjects': [],
                'categories': [],
                'products': product_suggestions
            },
            'search_info': {
                'query': query,
                'min_score': self.min_score,
                'filtered_count': queryset.count(),
                'matches_found': len(products_with_scores),
                'algorithm': 'multi_fuzzy_with_filters'
            }
        }
