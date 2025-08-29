"""
Test cases for the unified product search endpoint
"""
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from unittest.mock import patch, MagicMock
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from exam_sessions_subjects.models import ExamSessionSubject
from subjects.models import Subject
from products.models.products import Product
from exam_sessions.models import ExamSession


class UnifiedSearchEndpointTest(APITestCase):
    
    def setUp(self):
        """Set up test data"""
        # Create mock objects for testing
        self.exam_session = ExamSession.objects.create(
            name="Test Exam Session",
            start_date="2024-01-01",
            end_date="2024-12-31"
        )
        
        self.subject = Subject.objects.create(
            code="CM2",
            shortname="Commercial Management 2", 
            fullname="Commercial Management 2"
        )
        
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )
        
        self.product = Product.objects.create(
            code="TEST001",
            fullname="Test Product"
        )
        
        self.essp = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.product
        )

    def test_unified_search_basic_request(self):
        """Test basic unified search request works"""
        url = reverse('unified-product-search')
        data = {
            "filters": {
                "subjects": ["CM2"]
            },
            "pagination": {
                "page": 1,
                "page_size": 20
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        # Should return 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should have expected response structure
        self.assertIn('products', response.data)
        self.assertIn('filter_counts', response.data)  
        self.assertIn('pagination', response.data)
        
        # Pagination should have correct structure
        pagination = response.data['pagination']
        self.assertIn('page', pagination)
        self.assertIn('page_size', pagination)
        self.assertIn('total_count', pagination)
        self.assertIn('has_next', pagination)
        self.assertIn('has_previous', pagination)

    def test_unified_search_empty_request(self):
        """Test unified search with empty filters"""
        url = reverse('unified-product-search')
        data = {}
        
        response = self.client.post(url, data, format='json')
        
        # Should return 200 OK even with empty request
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('products', response.data)

    def test_unified_search_invalid_pagination(self):
        """Test unified search with invalid pagination parameters"""
        url = reverse('unified-product-search')
        data = {
            "pagination": {
                "page": -1,  # Invalid page
                "page_size": 200  # Too large
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        # Should return 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_unified_search_invalid_filter_type(self):
        """Test unified search with invalid filter types"""
        url = reverse('unified-product-search')
        data = {
            "filters": {
                "invalid_filter": ["test"]  # Invalid filter type
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        # Should return 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    @patch('exam_sessions_subjects_products.views.get_filter_service')
    def test_unified_search_with_filter_service(self, mock_filter_service):
        """Test that unified search uses the filter service correctly"""
        # Mock the filter service
        mock_service = MagicMock()
        mock_service.apply_filters.return_value = ExamSessionSubjectProduct.objects.all()
        mock_filter_service.return_value = mock_service
        
        url = reverse('unified-product-search')
        data = {
            "filters": {
                "subjects": ["CM2"],
                "categories": ["Materials"]
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify filter service was called with correct legacy filters
        mock_service.apply_filters.assert_called_once()
        args, kwargs = mock_service.apply_filters.call_args
        legacy_filters = args[1]  # Second argument should be the legacy filters
        
        # Should convert new format to legacy format
        self.assertIn('SUBJECT_FILTER', legacy_filters)
        self.assertEqual(legacy_filters['SUBJECT_FILTER'], ['CM2'])
        self.assertIn('category', legacy_filters)
        self.assertEqual(legacy_filters['category'], ['Materials'])

    def test_unified_search_caching(self):
        """Test that identical requests use caching"""
        url = reverse('unified-product-search')
        data = {
            "filters": {
                "subjects": ["CM2"]
            },
            "pagination": {
                "page": 1,
                "page_size": 20
            }
        }
        
        # Make first request
        response1 = self.client.post(url, data, format='json')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # Make identical second request - should use cache
        response2 = self.client.post(url, data, format='json')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # Results should be identical
        self.assertEqual(response1.data, response2.data)

    def test_unified_search_filter_counts_structure(self):
        """Test that filter counts have correct structure"""
        url = reverse('unified-product-search')
        data = {
            "filters": {},
            "pagination": {
                "page": 1, 
                "page_size": 20
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        filter_counts = response.data['filter_counts']
        
        # Should have all expected filter count categories
        expected_categories = ['subjects', 'categories', 'product_types', 'products', 'modes_of_delivery']
        for category in expected_categories:
            self.assertIn(category, filter_counts)
            self.assertIsInstance(filter_counts[category], dict)