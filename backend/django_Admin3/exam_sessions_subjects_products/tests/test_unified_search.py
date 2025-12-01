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


class BundleContentFilteringTest(APITestCase):
    """
    Test cases for content-based bundle filtering.

    Bundles should only appear in search/filter results when their contents
    match the search query or filter criteria, NOT just because they exist.
    """

    def setUp(self):
        """Set up test data including products, bundles, and their relationships"""
        from django.utils import timezone
        from products.models import (
            Product, ProductVariation, ProductProductVariation,
            ProductBundle, FilterGroup
        )
        from exam_sessions_subjects_products.models import (
            ExamSessionSubjectProductVariation,
            ExamSessionSubjectBundle,
            ExamSessionSubjectBundleProduct
        )

        # Create exam session and subjects
        self.exam_session = ExamSession.objects.create(
            session_code="TEST2025",
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=365)
        )

        self.subject_cm2 = Subject.objects.create(
            code="CM2",
            description="Commercial Management 2"
        )

        self.subject_sa1 = Subject.objects.create(
            code="SA1",
            description="Specialist Applications 1"
        )

        self.ess_cm2 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject_cm2
        )

        self.ess_sa1 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject_sa1
        )

        # Create filter groups (categories)
        self.category_materials = FilterGroup.objects.create(
            name="Core Study Materials",
            is_active=True
        )

        self.category_tutorial = FilterGroup.objects.create(
            name="Tutorial",
            is_active=True
        )

        # Create product variation
        self.variation_printed = ProductVariation.objects.create(
            name="Printed",
            code="PRINTED",
            variation_type="Printed"
        )

        # Create products with categories
        self.product_core_reading = Product.objects.create(
            code="CR001",
            fullname="Core Reading CM2",
            shortname="Core Reading"
        )
        self.product_core_reading.groups.add(self.category_materials)

        self.product_tutorial = Product.objects.create(
            code="TUT001",
            fullname="Tutorial CM2",
            shortname="Tutorial"
        )
        self.product_tutorial.groups.add(self.category_tutorial)

        self.product_sa1_materials = Product.objects.create(
            code="SA1MAT",
            fullname="SA1 Study Materials",
            shortname="SA1 Materials"
        )
        self.product_sa1_materials.groups.add(self.category_materials)

        # Create ProductProductVariations
        self.ppv_core_reading = ProductProductVariation.objects.create(
            product=self.product_core_reading,
            product_variation=self.variation_printed
        )

        self.ppv_tutorial = ProductProductVariation.objects.create(
            product=self.product_tutorial,
            product_variation=self.variation_printed
        )

        self.ppv_sa1_materials = ProductProductVariation.objects.create(
            product=self.product_sa1_materials,
            product_variation=self.variation_printed
        )

        # Create ExamSessionSubjectProducts
        self.essp_core_reading = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.ess_cm2,
            product=self.product_core_reading
        )

        self.essp_tutorial = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.ess_cm2,
            product=self.product_tutorial
        )

        self.essp_sa1_materials = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.ess_sa1,
            product=self.product_sa1_materials
        )

        # Create ExamSessionSubjectProductVariations
        self.esspv_core_reading = ExamSessionSubjectProductVariation.objects.create(
            exam_session_subject_product=self.essp_core_reading,
            product_product_variation=self.ppv_core_reading
        )

        self.esspv_tutorial = ExamSessionSubjectProductVariation.objects.create(
            exam_session_subject_product=self.essp_tutorial,
            product_product_variation=self.ppv_tutorial
        )

        self.esspv_sa1_materials = ExamSessionSubjectProductVariation.objects.create(
            exam_session_subject_product=self.essp_sa1_materials,
            product_product_variation=self.ppv_sa1_materials
        )

        # Create master bundles
        self.bundle_cm2_materials = ProductBundle.objects.create(
            bundle_name="CM2 Materials Bundle",
            subject=self.subject_cm2,
            bundle_description="All CM2 study materials",
            is_active=True
        )

        self.bundle_cm2_tutorial = ProductBundle.objects.create(
            bundle_name="CM2 Tutorial Bundle",
            subject=self.subject_cm2,
            bundle_description="CM2 tutorial package",
            is_active=True
        )

        self.bundle_sa1_materials = ProductBundle.objects.create(
            bundle_name="SA1 Materials Bundle",
            subject=self.subject_sa1,
            bundle_description="All SA1 study materials",
            is_active=True
        )

        # Create ExamSessionSubjectBundles
        self.ess_bundle_cm2_materials = ExamSessionSubjectBundle.objects.create(
            bundle=self.bundle_cm2_materials,
            exam_session_subject=self.ess_cm2,
            is_active=True
        )

        self.ess_bundle_cm2_tutorial = ExamSessionSubjectBundle.objects.create(
            bundle=self.bundle_cm2_tutorial,
            exam_session_subject=self.ess_cm2,
            is_active=True
        )

        self.ess_bundle_sa1_materials = ExamSessionSubjectBundle.objects.create(
            bundle=self.bundle_sa1_materials,
            exam_session_subject=self.ess_sa1,
            is_active=True
        )

        # Link bundles to their products via ExamSessionSubjectBundleProduct
        # CM2 Materials Bundle contains Core Reading
        ExamSessionSubjectBundleProduct.objects.create(
            bundle=self.ess_bundle_cm2_materials,
            exam_session_subject_product_variation=self.esspv_core_reading,
            is_active=True
        )

        # CM2 Tutorial Bundle contains Tutorial
        ExamSessionSubjectBundleProduct.objects.create(
            bundle=self.ess_bundle_cm2_tutorial,
            exam_session_subject_product_variation=self.esspv_tutorial,
            is_active=True
        )

        # SA1 Materials Bundle contains SA1 Materials
        ExamSessionSubjectBundleProduct.objects.create(
            bundle=self.ess_bundle_sa1_materials,
            exam_session_subject_product_variation=self.esspv_sa1_materials,
            is_active=True
        )

    def test_bundles_excluded_when_search_has_no_matching_content(self):
        """
        Bundles should NOT appear when search query doesn't match any bundle contents.

        Searching for 'marking voucher' should return no bundles since no bundle
        contains marking voucher products.
        """
        url = reverse('unified-product-search')
        data = {
            "searchQuery": "marking voucher",
            "pagination": {"page": 1, "page_size": 20}
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        products = response.data['products']
        bundles = [p for p in products if p.get('is_bundle') or p.get('type') == 'Bundle']

        # Should have NO bundles when search doesn't match bundle content
        self.assertEqual(len(bundles), 0,
            f"Expected 0 bundles for 'marking voucher' search, got {len(bundles)}: "
            f"{[b.get('product_name') for b in bundles]}")

    def test_bundles_included_when_search_matches_content(self):
        """
        Bundles should appear when their contents match the search query.

        Searching for 'Core Reading' should show bundles containing Core Reading products.
        """
        url = reverse('unified-product-search')
        data = {
            "searchQuery": "Core Reading",
            "pagination": {"page": 1, "page_size": 20}
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        products = response.data['products']
        bundles = [p for p in products if p.get('is_bundle') or p.get('type') == 'Bundle']

        # Should include CM2 Materials Bundle (contains Core Reading)
        bundle_names = [b.get('product_name') or b.get('bundle_name') for b in bundles]
        self.assertIn('CM2 Materials Bundle', bundle_names,
            f"Expected 'CM2 Materials Bundle' in results, got: {bundle_names}")

    def test_bundles_included_when_category_filter_matches_content(self):
        """
        Bundles should appear when their contents match category filters.

        Filtering by 'Core Study Materials' should show bundles containing
        products in that category.
        """
        url = reverse('unified-product-search')
        data = {
            "filters": {
                "categories": ["Core Study Materials"]
            },
            "pagination": {"page": 1, "page_size": 20}
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        products = response.data['products']
        bundles = [p for p in products if p.get('is_bundle') or p.get('type') == 'Bundle']

        # Should include bundles containing Core Study Materials
        # CM2 Materials Bundle and SA1 Materials Bundle both contain materials
        self.assertGreater(len(bundles), 0,
            "Expected bundles containing Core Study Materials products")

        bundle_names = [b.get('product_name') or b.get('bundle_name') for b in bundles]
        # CM2 Materials Bundle contains Core Reading which is in Core Study Materials
        self.assertIn('CM2 Materials Bundle', bundle_names,
            f"Expected 'CM2 Materials Bundle' in filtered results, got: {bundle_names}")

    def test_bundles_excluded_when_category_filter_has_no_matching_content(self):
        """
        Bundles should NOT appear when filter criteria exclude all bundle contents.

        Filtering by 'Tutorial' category should only show bundles with tutorial products.
        """
        url = reverse('unified-product-search')
        data = {
            "filters": {
                "categories": ["Tutorial"]
            },
            "pagination": {"page": 1, "page_size": 20}
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        products = response.data['products']
        bundles = [p for p in products if p.get('is_bundle') or p.get('type') == 'Bundle']

        bundle_names = [b.get('product_name') or b.get('bundle_name') for b in bundles]

        # Should only include CM2 Tutorial Bundle (the only one with tutorial content)
        # Should NOT include CM2 Materials Bundle or SA1 Materials Bundle
        self.assertNotIn('CM2 Materials Bundle', bundle_names,
            "CM2 Materials Bundle should not appear for Tutorial filter")
        self.assertNotIn('SA1 Materials Bundle', bundle_names,
            "SA1 Materials Bundle should not appear for Tutorial filter")

    def test_bundles_all_included_with_bundle_keyword_search(self):
        """
        All bundles should appear when user explicitly searches for 'bundle'.

        This is an override - user is explicitly looking for bundles.
        """
        url = reverse('unified-product-search')
        data = {
            "searchQuery": "bundle",
            "pagination": {"page": 1, "page_size": 20}
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        products = response.data['products']
        bundles = [p for p in products if p.get('is_bundle') or p.get('type') == 'Bundle']

        # Should include all active bundles when searching for 'bundle'
        self.assertGreaterEqual(len(bundles), 3,
            f"Expected at least 3 bundles for 'bundle' search, got {len(bundles)}")

    def test_bundles_shown_when_no_filters_applied(self):
        """
        All bundles should appear when no filters are applied (browse all scenario).
        """
        url = reverse('unified-product-search')
        data = {
            "filters": {},
            "pagination": {"page": 1, "page_size": 50}
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        products = response.data['products']
        bundles = [p for p in products if p.get('is_bundle') or p.get('type') == 'Bundle']

        # Should include all active bundles when browsing without filters
        self.assertGreaterEqual(len(bundles), 3,
            f"Expected at least 3 bundles when browsing all, got {len(bundles)}")

    def test_bundles_filtered_by_subject_and_content(self):
        """
        Subject filter should limit bundles, and content filter should further refine.

        Filtering by subject CM2 and category 'Core Study Materials' should only
        show CM2 bundles with materials content.
        """
        url = reverse('unified-product-search')
        data = {
            "filters": {
                "subjects": ["CM2"],
                "categories": ["Core Study Materials"]
            },
            "pagination": {"page": 1, "page_size": 20}
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        products = response.data['products']
        bundles = [p for p in products if p.get('is_bundle') or p.get('type') == 'Bundle']

        bundle_names = [b.get('product_name') or b.get('bundle_name') for b in bundles]

        # Should include CM2 Materials Bundle
        self.assertIn('CM2 Materials Bundle', bundle_names,
            f"Expected 'CM2 Materials Bundle', got: {bundle_names}")

        # Should NOT include SA1 bundles (wrong subject)
        self.assertNotIn('SA1 Materials Bundle', bundle_names,
            "SA1 bundle should not appear with CM2 subject filter")

        # Should NOT include CM2 Tutorial Bundle (wrong category)
        self.assertNotIn('CM2 Tutorial Bundle', bundle_names,
            "CM2 Tutorial Bundle should not appear with Materials filter")