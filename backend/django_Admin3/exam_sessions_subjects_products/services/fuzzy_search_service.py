"""
Simple Fuzzy Search Service
Provides basic fuzzy search functionality for product names.
"""

import logging
from django.db.models import Q
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

logger = logging.getLogger('fuzzy_search')


class FuzzySearchService:
    """
    Simple fuzzy search service for products.
    This is a basic implementation for compatibility with existing API endpoints.
    """
    
    def __init__(self, min_score=60):
        self.min_score = min_score
    
    def search_products(self, query, limit=50):
        """
        Perform basic text search on product names.
        Returns products that contain the query string.
        
        Args:
            query (str): Search query
            limit (int): Maximum number of results
            
        Returns:
            dict: Search results with products, counts, and metadata
        """
        if not query or len(query) < 2:
            return self._empty_result(query)
        
        try:
            # Basic text search using icontains
            queryset = ExamSessionSubjectProduct.objects.select_related(
                'exam_session_subject__subject',
                'product'
            ).filter(
                Q(product__fullname__icontains=query) |
                Q(product__shortname__icontains=query) |
                Q(product__description__icontains=query) |
                Q(exam_session_subject__subject__code__icontains=query) |  # Subject CODE search
                Q(exam_session_subject__subject__description__icontains=query)
            ).distinct()[:limit]
            
            products_list = list(queryset)
            total_count = len(products_list)
            
            # Generate basic suggestions
            suggested_filters = self._generate_suggestions(products_list, query)
            
            return {
                'products': products_list,
                'total_count': total_count,
                'suggested_filters': suggested_filters,
                'search_info': {
                    'query': query,
                    'type': 'basic_text_search',
                    'min_score': self.min_score
                }
            }
            
        except Exception as e:
            logger.error(f'Search error: {str(e)}')
            return self._empty_result(query, error=str(e))
    
    def advanced_search(self, query=None, subject_ids=None, category_ids=None, limit=50):
        """
        Perform advanced search with filters.
        
        Args:
            query (str): Optional search query
            subject_ids (list): Optional subject IDs to filter by
            category_ids (list): Optional category IDs (not implemented)
            limit (int): Maximum number of results
            
        Returns:
            dict: Search results
        """
        queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        )
        
        # Apply filters
        filters = Q()
        
        if query and len(query) >= 2:
            filters &= (
                Q(product__fullname__icontains=query) |
                Q(product__shortname__icontains=query) |
                Q(product__description__icontains=query) |
                Q(exam_session_subject__subject__description__icontains=query)
            )
        
        if subject_ids:
            filters &= Q(exam_session_subject__subject__id__in=subject_ids)
        
        if filters:
            queryset = queryset.filter(filters)
        
        queryset = queryset.distinct()[:limit]
        products_list = list(queryset)
        total_count = len(products_list)
        
        suggested_filters = self._generate_suggestions(products_list, query or '')
        
        return {
            'products': products_list,
            'total_count': total_count,
            'suggested_filters': suggested_filters,
            'search_info': {
                'query': query,
                'subject_ids': subject_ids,
                'category_ids': category_ids,
                'type': 'advanced_search'
            }
        }
    
    def _empty_result(self, query, error=None):
        """Return empty search result."""
        return {
            'products': [],
            'total_count': 0,
            'suggested_filters': {
                'subjects': [],
                'product_groups': [],
                'variations': [],
                'products': []
            },
            'search_info': {
                'query': query,
                'type': 'empty_result',
                'error': error
            }
        }
    
    def _generate_suggestions(self, products_list, query):
        """Generate basic filter suggestions from search results."""
        suggestions = {
            'subjects': [],
            'product_groups': [],
            'variations': [],
            'products': []
        }
        
        if not products_list:
            return suggestions
        
        # Extract unique subjects
        subjects = set()
        for product in products_list:
            if hasattr(product.exam_session_subject, 'subject'):
                subject = product.exam_session_subject.subject
                subjects.add((subject.id, subject.code, subject.description))
        
        suggestions['subjects'] = [
            {'id': s[0], 'code': s[1], 'description': s[2]} 
            for s in list(subjects)[:10]
        ]
        
        return suggestions