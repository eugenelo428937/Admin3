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


class MarkingVoucherIntegrationTest(APITestCase):
    """Test cases for marking voucher integration in product search"""

    def setUp(self):
        """Set up test data including marking vouchers"""
        from marking_vouchers.models import MarkingVoucher
        from decimal import Decimal

        # Create marking vouchers
        self.voucher1 = MarkingVoucher.objects.create(
            code="VOUCHER001",
            name="Standard Marking Voucher",
            description="Standard marking service voucher",
            price=Decimal("50.00"),
            is_active=True
        )

        self.voucher2 = MarkingVoucher.objects.create(
            code="VOUCHER002",
            name="Premium Marking Voucher",
            description="Premium marking service with feedback",
            price=Decimal("75.00"),
            is_active=True
        )

        # Create inactive voucher (should not appear in results)
        self.inactive_voucher = MarkingVoucher.objects.create(
            code="VOUCHER999",
            name="Inactive Voucher",
            description="This should not appear",
            price=Decimal("100.00"),
            is_active=False
        )

    def test_marking_vouchers_with_marking_filter(self):
        """Test that marking vouchers appear when Marking filter is applied"""
        url = reverse('unified-product-search')
        data = {
            "filters": {
                "categories": ["Marking"]
            },
            "pagination": {
                "page": 1,
                "page_size": 20
            }
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should include marking vouchers in results
        products = response.data['products']
        voucher_products = [p for p in products if p.get('type') == 'MarkingVoucher']

        # Should have 2 active vouchers
        self.assertEqual(len(voucher_products), 2)

        # Verify voucher data structure
        voucher_product = voucher_products[0]
        self.assertIn('code', voucher_product)
        self.assertIn('name', voucher_product)
        self.assertIn('price', voucher_product)
        self.assertIn('is_available', voucher_product)
        self.assertEqual(voucher_product['type'], 'MarkingVoucher')

    def test_marking_vouchers_with_search_query(self):
        """Test that marking vouchers appear in search results"""
        url = reverse('unified-product-search')
        data = {
            "searchQuery": "marking voucher",
            "pagination": {
                "page": 1,
                "page_size": 20
            }
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should include marking vouchers in search results
        products = response.data['products']
        voucher_products = [p for p in products if p.get('type') == 'MarkingVoucher']

        # Should find matching vouchers
        self.assertGreater(len(voucher_products), 0)

    def test_inactive_vouchers_not_included(self):
        """Test that inactive marking vouchers are not included in results"""
        url = reverse('unified-product-search')
        data = {
            "filters": {
                "categories": ["Marking"]
            },
            "pagination": {
                "page": 1,
                "page_size": 20
            }
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        products = response.data['products']
        voucher_codes = [p.get('code') for p in products if p.get('type') == 'MarkingVoucher']

        # Should not include inactive voucher
        self.assertNotIn('VOUCHER999', voucher_codes)

        # Should include active vouchers
        self.assertIn('VOUCHER001', voucher_codes)
        self.assertIn('VOUCHER002', voucher_codes)

    def test_voucher_data_structure(self):
        """Test that voucher data has all required fields for frontend"""
        url = reverse('unified-product-search')
        data = {
            "filters": {
                "categories": ["Marking"]
            },
            "pagination": {
                "page": 1,
                "page_size": 20
            }
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        products = response.data['products']
        voucher_products = [p for p in products if p.get('type') == 'MarkingVoucher']

        self.assertGreater(len(voucher_products), 0)

        voucher = voucher_products[0]

        # Required fields for MarkingVoucherProductCard
        required_fields = ['code', 'name', 'description', 'price', 'is_active', 'is_available', 'type', 'variations']
        for field in required_fields:
            self.assertIn(field, voucher, f"Missing required field: {field}")

        # Verify variations structure
        self.assertIsInstance(voucher['variations'], list)
        self.assertGreater(len(voucher['variations']), 0)

        variation = voucher['variations'][0]
        self.assertIn('prices', variation)
        self.assertIsInstance(variation['prices'], list)
        self.assertGreater(len(variation['prices']), 0)

        price = variation['prices'][0]
        self.assertIn('amount', price)
        self.assertIn('price_type', price)

    def test_no_vouchers_without_marking_filter(self):
        """Test that marking vouchers don't appear without marking-related filters"""
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

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        products = response.data['products']
        voucher_products = [p for p in products if p.get('type') == 'MarkingVoucher']

        # Should not include marking vouchers when no marking filter is applied
        self.assertEqual(len(voucher_products), 0)