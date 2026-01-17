"""
Test suite for tutorials API endpoints.

This module tests the TutorialEventViewSet and related API endpoints to ensure proper
functionality, authentication, and data retrieval.

Updated 2026-01-16: Changed imports from exam_sessions_subjects_products to store/catalog
as part of T087 legacy app cleanup. Tests now use store.Product instead of
ExamSessionSubjectProductVariation.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta, date
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from tutorials.models import TutorialEvent
from store.models import Product as StoreProduct
from catalog.models import (
    ExamSession, ExamSessionSubject, ExamSessionSubjectProduct,
    Product, ProductProductVariation, ProductVariation
)
from subjects.models import Subject


class TutorialEventAPITestCase(APITestCase):
    """Test cases for TutorialEvent API endpoints."""

    def setUp(self):
        """Set up test fixtures - create tutorial events."""
        # Create exam session
        self.exam_session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Create subject
        self.subject = Subject.objects.create(
            code='CM2',
            description='Financial Engineering',
            active=True
        )

        # Create exam session subject
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )

        # Create product (tutorial location product template)
        self.product = Product.objects.create(
            code='TUT001',
            fullname='Tutorial - London',
            shortname='Tutorial London'
        )

        # Create product variation (tutorial type)
        self.product_variation = ProductVariation.objects.create(
            code='WKD',
            name='Weekend Tutorial',
            description='Weekend intensive tutorial',
            description_short='Weekend',
            variation_type='Tutorial'
        )

        # Create ProductProductVariation
        self.product_product_variation = ProductProductVariation.objects.create(
            product=self.product,
            product_variation=self.product_variation
        )

        # Create store.Product (replaces old ESSP + ESSPV chain)
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.product_product_variation,
            product_code='CM2/TWKDTUT001/JUNE2025'
        )

        # Create tutorial events
        self.event1 = TutorialEvent.objects.create(
            code='TUT-CM2-LON-001',
            venue='London Convention Center',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            remain_space=20,
            store_product=self.store_product
        )

        self.event2 = TutorialEvent.objects.create(
            code='TUT-CM2-LON-002',
            venue='Manchester Training Centre',
            start_date=date.today() + timedelta(days=40),
            end_date=date.today() + timedelta(days=42),
            is_soldout=True,
            remain_space=0,
            store_product=self.store_product
        )

        # API client
        self.client = APIClient()

    def test_list_tutorial_events(self):
        """Test GET /api/tutorials/events/."""
        response = self.client.get('/api/tutorials/events/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is paginated
        self.assertIn('results', response.data)
        self.assertGreaterEqual(len(response.data['results']), 2)

    def test_retrieve_tutorial_event(self):
        """Test GET /api/tutorials/events/{id}/."""
        response = self.client.get(f'/api/tutorials/events/{self.event1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'TUT-CM2-LON-001')
        self.assertEqual(response.data['venue'], 'London Convention Center')

    def test_retrieve_tutorial_event_nonexistent(self):
        """Test GET /api/tutorials/events/{id}/ for nonexistent event."""
        response = self.client.get('/api/tutorials/events/999999/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_tutorial_event(self):
        """Test POST /api/tutorials/events/ to create new event."""
        data = {
            'code': 'TUT-CM2-NEW-001',
            'venue': 'Birmingham Conference Hall',
            'start_date': (date.today() + timedelta(days=50)).isoformat(),
            'end_date': (date.today() + timedelta(days=52)).isoformat(),
            'remain_space': 25,
            'store_product': self.store_product.id
        }

        response = self.client.post('/api/tutorials/events/', data, format='json')

        # Should create successfully (AllowAny permission)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'TUT-CM2-NEW-001')
        self.assertEqual(TutorialEvent.objects.filter(code='TUT-CM2-NEW-001').count(), 1)

    def test_create_tutorial_event_missing_required_fields(self):
        """Test POST /api/tutorials/events/ with missing required fields."""
        # Missing start_date
        data = {
            'code': 'TUT-INVALID-001',
            'venue': 'Test Venue',
            'end_date': (date.today() + timedelta(days=52)).isoformat(),
            'store_product': self.store_product.id
        }

        response = self.client.post('/api/tutorials/events/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_tutorial_event_duplicate_code(self):
        """Test POST /api/tutorials/events/ with duplicate code."""
        data = {
            'code': 'TUT-CM2-LON-001',  # Duplicate code
            'venue': 'Test Venue',
            'start_date': (date.today() + timedelta(days=50)).isoformat(),
            'end_date': (date.today() + timedelta(days=52)).isoformat(),
            'store_product': self.store_product.id
        }

        response = self.client.post('/api/tutorials/events/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_tutorial_event_put(self):
        """Test PUT /api/tutorials/events/{id}/ to update event."""
        data = {
            'code': 'TUT-CM2-LON-001-UPDATED',
            'venue': 'Updated Venue',
            'start_date': self.event1.start_date.isoformat(),
            'end_date': self.event1.end_date.isoformat(),
            'store_product': self.store_product.id
        }

        response = self.client.put(f'/api/tutorials/events/{self.event1.id}/', data, format='json')

        # Should update successfully
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event1.refresh_from_db()
        self.assertEqual(self.event1.code, 'TUT-CM2-LON-001-UPDATED')
        self.assertEqual(self.event1.venue, 'Updated Venue')

    def test_update_tutorial_event_patch(self):
        """Test PATCH /api/tutorials/events/{id}/ to partially update event."""
        data = {
            'venue': 'Partially Updated Venue',
            'remain_space': 15
        }

        response = self.client.patch(f'/api/tutorials/events/{self.event1.id}/', data, format='json')

        # Should update successfully
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event1.refresh_from_db()
        self.assertEqual(self.event1.venue, 'Partially Updated Venue')
        self.assertEqual(self.event1.remain_space, 15)

    def test_delete_tutorial_event(self):
        """Test DELETE /api/tutorials/events/{id}/."""
        response = self.client.delete(f'/api/tutorials/events/{self.event2.id}/')

        # Should delete successfully
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        # Event should be deleted
        self.assertFalse(TutorialEvent.objects.filter(id=self.event2.id).exists())

    def test_list_tutorial_events_response_structure(self):
        """Test tutorial event list response contains expected fields."""
        response = self.client.get('/api/tutorials/events/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is paginated
        self.assertIn('results', response.data)
        self.assertGreater(len(response.data['results']), 0)

        # Check first event has expected fields
        event_data = response.data['results'][0]
        self.assertIn('id', event_data)
        self.assertIn('code', event_data)
        self.assertIn('venue', event_data)
        self.assertIn('is_soldout', event_data)
        self.assertIn('remain_space', event_data)
        self.assertIn('start_date', event_data)
        self.assertIn('end_date', event_data)

    def test_retrieve_tutorial_event_response_structure(self):
        """Test tutorial event retrieve response contains expected fields."""
        response = self.client.get(f'/api/tutorials/events/{self.event1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check response has expected fields
        self.assertIn('id', response.data)
        self.assertIn('code', response.data)
        self.assertIn('venue', response.data)
        self.assertIn('is_soldout', response.data)
        self.assertIn('finalisation_date', response.data)
        self.assertIn('remain_space', response.data)
        self.assertIn('start_date', response.data)
        self.assertIn('end_date', response.data)
        self.assertIn('created_at', response.data)
        self.assertIn('updated_at', response.data)

    def test_permission_classes_allow_any(self):
        """Test API endpoints are accessible without authentication (AllowAny)."""
        # Test without authentication
        response = self.client.get('/api/tutorials/events/')

        # Should allow access (AllowAny permission)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_tutorial_event_ordering(self):
        """Test tutorial events ordering in list response."""
        response = self.client.get('/api/tutorials/events/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify events are in response (paginated)
        self.assertIn('results', response.data)
        self.assertGreater(len(response.data['results']), 0)

        # Default ordering should be by start_date and code
        # event1 has earlier start_date (30 days) than event2 (40 days)
        codes = [e['code'] for e in response.data['results']]
        self.assertIn('TUT-CM2-LON-001', codes)
        self.assertIn('TUT-CM2-LON-002', codes)


class TutorialEventListViewTestCase(APITestCase):
    """Test cases for TutorialEventListView (/api/tutorials/list/)."""

    def setUp(self):
        """Set up test fixtures."""
        # Create exam session
        self.exam_session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Create subjects
        self.subject1 = Subject.objects.create(
            code='CM2',
            description='Financial Engineering',
            active=True
        )

        self.subject2 = Subject.objects.create(
            code='SA1',
            description='Actuarial Statistics',
            active=True
        )

        # Create exam session subjects
        self.exam_session_subject1 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject1
        )

        self.exam_session_subject2 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject2
        )

        # Create products (templates)
        self.product1 = Product.objects.create(
            code='TUT001',
            fullname='Tutorial - London',
            shortname='Tutorial London'
        )

        self.product2 = Product.objects.create(
            code='TUT002',
            fullname='Tutorial - Manchester',
            shortname='Tutorial Manchester'
        )

        # Create product variation
        self.product_variation = ProductVariation.objects.create(
            code='WKD',
            name='Weekend Tutorial',
            description='Weekend intensive tutorial',
            description_short='Weekend',
            variation_type='Tutorial'
        )

        # Create ProductProductVariations
        self.ppv1 = ProductProductVariation.objects.create(
            product=self.product1,
            product_variation=self.product_variation
        )

        self.ppv2 = ProductProductVariation.objects.create(
            product=self.product2,
            product_variation=self.product_variation
        )

        # Create store.Product instances (replaces old ESSP + ESSPV chain)
        self.store_product1 = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject1,
            product_product_variation=self.ppv1,
            product_code='CM2/TWKDTUT001/JUNE2025'
        )

        self.store_product2 = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject2,
            product_product_variation=self.ppv2,
            product_code='SA1/TWKDTUT002/JUNE2025'
        )

        # Create tutorial events
        self.event1 = TutorialEvent.objects.create(
            code='TUT-CM2-001',
            venue='London',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product1
        )

        self.event2 = TutorialEvent.objects.create(
            code='TUT-SA1-001',
            venue='Manchester',
            start_date=date.today() + timedelta(days=40),
            end_date=date.today() + timedelta(days=42),
            store_product=self.store_product2
        )

        self.client = APIClient()

    def test_list_all_tutorial_events(self):
        """Test GET /api/tutorials/list/ without filters."""
        response = self.client.get('/api/tutorials/list/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 2)

    def test_list_tutorial_events_filter_by_subject(self):
        """Test GET /api/tutorials/list/?subject_code=CM2."""
        response = self.client.get('/api/tutorials/list/?subject_code=CM2')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        # Should only return CM2 events
        codes = [e['code'] for e in response.data]
        self.assertIn('TUT-CM2-001', codes)
        self.assertNotIn('TUT-SA1-001', codes)


class TutorialProductListViewTestCase(APITestCase):
    """Test cases for TutorialProductListView (/api/tutorials/products/)."""

    def setUp(self):
        """Set up test fixtures."""
        # Create exam session
        self.exam_session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Create subject
        self.subject = Subject.objects.create(
            code='CM2',
            description='Financial Engineering',
            active=True
        )

        # Create exam session subject
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )

        # Create tutorial product
        self.product = Product.objects.create(
            code='TUT001',
            fullname='Tutorial - London',
            shortname='Tutorial London'
        )

        # Create ESSP
        self.essp = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.product
        )

        self.client = APIClient()

    def test_list_tutorial_products_with_required_params(self):
        """Test GET /api/tutorials/products/?exam_session={id}&subject_code={code}."""
        response = self.client.get(
            f'/api/tutorials/products/?exam_session={self.exam_session.id}&subject_code=CM2'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_list_tutorial_products_missing_exam_session(self):
        """Test GET /api/tutorials/products/ without exam_session parameter."""
        response = self.client.get('/api/tutorials/products/?subject_code=CM2')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_list_tutorial_products_missing_subject_code(self):
        """Test GET /api/tutorials/products/ without subject_code parameter."""
        response = self.client.get(f'/api/tutorials/products/?exam_session={self.exam_session.id}')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class TutorialProductListAllViewTestCase(APITestCase):
    """Test cases for TutorialProductListAllView (/api/tutorials/products/all/)."""

    def setUp(self):
        """Set up test fixtures."""
        from django.core.cache import cache
        # Clear cache before each test
        cache.clear()

        # Create exam session
        self.exam_session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Create subject
        self.subject = Subject.objects.create(
            code='CM2',
            description='Financial Engineering',
            active=True
        )

        # Create exam session subject
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )

        # Create tutorial catalog product
        self.product = Product.objects.create(
            code='TUT001',
            fullname='Tutorial - London',
            shortname='Tutorial London'
        )

        # Create product variation
        from catalog.models import ProductVariation, ProductProductVariation
        self.variation = ProductVariation.objects.create(
            code='LDN',
            name='London',
            variation_type='Tutorial'
        )

        # Create product-product-variation link
        self.ppv = ProductProductVariation.objects.create(
            product=self.product,
            product_variation=self.variation
        )

        # Create store.Product (the actual purchasable item)
        from store.models import Product as StoreProduct
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.ppv,
            product_code='CM2/TUT001LDN/JUNE2025',
            is_active=True
        )

        self.client = APIClient()

    def test_list_all_tutorial_products(self):
        """Test GET /api/tutorials/products/all/ returns all tutorial products."""
        response = self.client.get('/api/tutorials/products/all/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)

        # Verify response structure
        if len(response.data) > 0:
            product_data = response.data[0]
            self.assertIn('subject_code', product_data)
            self.assertIn('subject_name', product_data)
            self.assertIn('location', product_data)
            self.assertIn('product_id', product_data)

    def test_list_all_tutorial_products_uses_cache(self):
        """Test that subsequent requests use cached data."""
        from django.core.cache import cache

        # First request - should populate cache
        response1 = self.client.get('/api/tutorials/products/all/')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Verify cache was set
        cached_data = cache.get('tutorial_products_all')
        self.assertIsNotNone(cached_data)

        # Second request - should use cache
        response2 = self.client.get('/api/tutorials/products/all/')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data, response2.data)

    def test_list_all_tutorial_products_cache_cleared(self):
        """Test that cache can be cleared."""
        from django.core.cache import cache

        # Populate cache
        response1 = self.client.get('/api/tutorials/products/all/')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Clear cache
        cache.delete('tutorial_products_all')

        # Verify cache is cleared
        cached_data = cache.get('tutorial_products_all')
        self.assertIsNone(cached_data)


class TutorialProductVariationListViewTestCase(APITestCase):
    """Test cases for TutorialProductVariationListView."""

    def setUp(self):
        """Set up test fixtures."""
        # Create exam session
        self.exam_session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Create subject
        self.subject = Subject.objects.create(
            code='CM2',
            description='Financial Engineering',
            active=True
        )

        # Create exam session subject
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )

        # Create product (template)
        self.product = Product.objects.create(
            code='TUT001',
            fullname='Tutorial - London',
            shortname='Tutorial London'
        )

        # Create product variation
        self.product_variation = ProductVariation.objects.create(
            code='WKD',
            name='Weekend Tutorial',
            description='Weekend intensive tutorial',
            description_short='Weekend',
            variation_type='Tutorial'
        )

        # Create ProductProductVariation
        self.ppv = ProductProductVariation.objects.create(
            product=self.product,
            product_variation=self.product_variation
        )

        # Create store.Product (replaces old ESSP + ESSPV chain)
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.ppv,
            product_code='TUT-CM2-WKD'
        )

        self.client = APIClient()

    def test_list_product_variations(self):
        """Test GET /api/tutorials/products/{id}/variations/."""
        response = self.client.get(f'/api/tutorials/products/{self.product.id}/variations/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)

        # Verify response structure
        variation_data = response.data[0]
        self.assertIn('id', variation_data)
        self.assertIn('variation_type', variation_data)
        self.assertIn('name', variation_data)
        self.assertIn('description', variation_data)
        self.assertIn('description_short', variation_data)
        self.assertIn('product_code', variation_data)

    def test_list_product_variations_with_subject_filter(self):
        """Test filtering variations by subject_code."""
        response = self.client.get(
            f'/api/tutorials/products/{self.product.id}/variations/?subject_code=CM2'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        # Should only return CM2 variations
        for variation in response.data:
            self.assertEqual(variation['product_code'], 'TUT-CM2-WKD')

    def test_list_product_variations_no_results(self):
        """Test listing variations for product with no variations."""
        # Create product with no variations
        empty_product = Product.objects.create(
            code='EMPTY',
            fullname='Empty Product',
            shortname='Empty'
        )

        response = self.client.get(f'/api/tutorials/products/{empty_product.id}/variations/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class TutorialComprehensiveDataViewTestCase(APITestCase):
    """Test cases for TutorialComprehensiveDataView."""

    def setUp(self):
        """Set up test fixtures."""
        from django.core.cache import cache
        cache.clear()

        # Create exam session
        self.exam_session = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Create subject
        self.subject = Subject.objects.create(
            code='CM2',
            description='Financial Engineering',
            active=True
        )

        # Create exam session subject
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )

        # Create product (template)
        self.product = Product.objects.create(
            code='TUT001',
            fullname='Tutorial - London',
            shortname='Tutorial London'
        )

        # Create product variation
        self.product_variation = ProductVariation.objects.create(
            code='WKD',
            name='Weekend Tutorial',
            description='Weekend intensive tutorial',
            description_short='Weekend',
            variation_type='Tutorial'
        )

        # Create ProductProductVariation
        self.ppv = ProductProductVariation.objects.create(
            product=self.product,
            product_variation=self.product_variation
        )

        # Create store.Product (replaces old ESSP + ESSPV chain)
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.ppv,
            product_code='CM2/TWKDTUT001/JUNE2025-comp'
        )

        # Create tutorial event
        self.event = TutorialEvent.objects.create(
            code='TUT-CM2-001',
            venue='London',
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product
        )

        self.client = APIClient()

    def test_get_comprehensive_data(self):
        """Test GET /api/tutorials/data/comprehensive/."""
        response = self.client.get('/api/tutorials/data/comprehensive/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)

        # Verify response structure
        data_item = response.data[0]
        self.assertIn('subject_id', data_item)
        self.assertIn('subject_code', data_item)
        self.assertIn('subject_name', data_item)
        self.assertIn('product_id', data_item)
        self.assertIn('location', data_item)
        self.assertIn('variations', data_item)

        # Verify variations structure
        self.assertIsInstance(data_item['variations'], list)
        if len(data_item['variations']) > 0:
            variation = data_item['variations'][0]
            self.assertIn('id', variation)
            self.assertIn('name', variation)
            self.assertIn('description', variation)
            self.assertIn('description_short', variation)
            self.assertIn('events', variation)

            # Verify events structure
            self.assertIsInstance(variation['events'], list)
            if len(variation['events']) > 0:
                event = variation['events'][0]
                self.assertIn('id', event)
                self.assertIn('code', event)
                self.assertIn('venue', event)
                self.assertIn('is_soldout', event)
                self.assertIn('start_date', event)
                self.assertIn('end_date', event)

    def test_comprehensive_data_uses_cache(self):
        """Test that comprehensive data view uses cache."""
        from django.core.cache import cache

        # First request
        response1 = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Verify cache was set
        cached_data = cache.get('tutorial_comprehensive_data')
        self.assertIsNotNone(cached_data)

        # Second request should use cache
        response2 = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data, response2.data)


class TutorialCacheClearViewTestCase(APITestCase):
    """Test cases for cache clearing functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.client = APIClient()

    def test_clear_cache(self):
        """Test POST /api/tutorials/cache/clear/."""
        from django.core.cache import cache

        # Set some cache data
        cache.set('tutorial_products_all', ['test'], 600)

        # Clear cache
        response = self.client.post('/api/tutorials/cache/clear/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)

        # Verify cache was cleared
        cached_data = cache.get('tutorial_products_all')
        self.assertIsNone(cached_data)
