import logging
from typing import List, Dict, Any, Tuple
from fuzzywuzzy import fuzz, process
from django.db.models import Q, QuerySet
from .models import ExamSessionSubjectProduct
from subjects.models import Subject
from products.models.product_group import ProductGroup

logger = logging.getLogger(__name__)

class FuzzySearchService:
    """
    Fuzzy search service using FuzzyWuzzy for exam session subject products.
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
        
        Args:
            query: Search query string
            limit: Maximum number of results to return
            
        Returns:
            Dictionary containing search results and suggested filters
        """
        logger.info(f'[FuzzySearchService] Starting search for: "{query}"')
        
        if not query or len(query.strip()) < 2:
            return self._get_empty_results()
        
        query = query.strip().lower()
        
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
            
            # Calculate fuzzy match score
            score = fuzz.partial_ratio(query, searchable_text)
            
            if score >= self.min_score:
                products_with_scores.append((product, score, searchable_text))
                
                # Track subject matches
                subject_code = product.exam_session_subject.subject.code
                subject_description = product.exam_session_subject.subject.description or subject_code
                subject_key = f"{subject_code}|{subject_description}"
                
                if subject_key not in subject_matches:
                    subject_score = max(
                        fuzz.ratio(query, subject_code.lower()),
                        fuzz.ratio(query, subject_description.lower())
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
                        category_score = fuzz.ratio(query, group.name.lower())
                        if category_score >= self.min_score:
                            category_matches[group.name] = {
                                'name': group.name,
                                'score': category_score,
                                'count': 0
                            }
                    
                    if group.name in category_matches:
                        category_matches[group.name]['count'] += 1
        
        # Sort products by fuzzy score (highest first)
        products_with_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Limit results
        top_products = products_with_scores[:limit]
        
        # Prepare product suggestions (serializable format)
        product_suggestions = []
        for product, score, _ in top_products[:5]:  # Top 5 product suggestions
            product_suggestions.append({
                'id': product.id,
                'product_id': product.product.id,
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
            'suggested_filters': {
                'subjects': self._prepare_subject_suggestions(subject_matches),
                'categories': self._prepare_category_suggestions(category_matches),
                'products': product_suggestions
            },
            'search_info': {
                'query': query,
                'min_score': self.min_score,
                'total_scanned': queryset.count(),
                'matches_found': len(products_with_scores)
            }
        }
        
        logger.info(f'[FuzzySearchService] Search completed: {len(top_products)} results returned')
        return results
    
    def _build_searchable_text(self, product: ExamSessionSubjectProduct) -> str:
        """
        Build a comprehensive searchable text string from all relevant fields
        """
        searchable_parts = []
        
        # Product information
        if product.product.fullname:
            searchable_parts.append(product.product.fullname)
        if product.product.shortname:
            searchable_parts.append(product.product.shortname)
        if product.product.code:
            searchable_parts.append(product.product.code)
        if hasattr(product.product, 'description') and product.product.description:
            searchable_parts.append(product.product.description)
        
        # Subject information
        if product.exam_session_subject.subject.code:
            searchable_parts.append(product.exam_session_subject.subject.code)
        if product.exam_session_subject.subject.description:
            searchable_parts.append(product.exam_session_subject.subject.description)
        
        # Product variations information
        try:
            for variation in product.product.product_variations.all():
                if variation.name:
                    searchable_parts.append(variation.name)
                if variation.description:
                    searchable_parts.append(variation.description)
                if variation.variation_type:
                    searchable_parts.append(variation.variation_type)
                if variation.description_short:
                    searchable_parts.append(variation.description_short)
        except Exception:
            pass  # Handle case where variations relationship doesn't exist
        
        # Product group information  
        try:
            for group in product.product.groups.all():
                if group.name:
                    searchable_parts.append(group.name)
        except Exception:
            pass  # Handle case where groups relationship doesn't exist
        
        return ' '.join(searchable_parts).lower()
    
    def _prepare_subject_suggestions(self, subject_matches: Dict) -> List[Dict]:
        """
        Prepare subject suggestions sorted by relevance.
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
        """
        return {
            'products': [],
            'total_count': 0,
            'suggested_filters': {
                'subjects': [],
                'categories': [],
                'products': []
            },
            'search_info': {
                'query': '',
                'min_score': self.min_score,
                'total_scanned': 0,
                'matches_found': 0
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
        logger.info(f'[FuzzySearchService] Advanced search - query: "{query}", subjects: {subject_ids}, categories: {category_ids}')
        
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
            logger.info(f'Applied subject filter: {len(subject_ids)} subjects')
        
        if category_ids:
            queryset = queryset.filter(product__groups__id__in=category_ids).distinct()
            logger.info(f'Applied category filter: {len(category_ids)} categories')
        
        # If no text query, return filtered results
        if not query or len(query.strip()) < 2:
            products = list(queryset[:limit])
            
            # Prepare product suggestions (serializable format)
            product_suggestions = []
            for product in products[:5]:
                product_suggestions.append({
                    'id': product.id,
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
                    }
                }
            }
        
        # Perform fuzzy search on filtered queryset
        query = query.strip().lower()
        products_with_scores = []
        
        for product in queryset:
            searchable_text = self._build_searchable_text(product)
            score = fuzz.partial_ratio(query, searchable_text)
            
            if score >= self.min_score:
                products_with_scores.append((product, score))
        
        # Sort by score
        products_with_scores.sort(key=lambda x: x[1], reverse=True)
        top_products = products_with_scores[:limit]
        
        # Prepare product suggestions (serializable format)
        product_suggestions = []
        for product, score in top_products[:5]:
            product_suggestions.append({
                'id': product.id,
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
            'suggested_filters': {
                'subjects': [],
                'categories': [],
                'products': product_suggestions
            },
            'search_info': {
                'query': query,
                'min_score': self.min_score,
                'filtered_count': queryset.count(),
                'matches_found': len(products_with_scores)
            }
        } 