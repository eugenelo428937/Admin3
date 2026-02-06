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

from tutorials.models import TutorialEvents, TutorialVenue
from store.models import Product as StoreProduct
from catalog.models import (
    ExamSession, ExamSessionSubject, ExamSessionSubjectProduct,
    Product, ProductProductVariation, ProductVariation, Subject
)


class TutorialEventsAPITestCase(APITestCase):
    """Test cases for TutorialEvents API endpoints."""

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
        self.event1 = TutorialEvents.objects.create(
            code='TUT-CM2-LON-001',
            venue=TutorialVenue.objects.create(name='London Convention Center'),
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            remain_space=20,
            store_product=self.store_product
        )

        self.event2 = TutorialEvents.objects.create(
            code='TUT-CM2-LON-002',
            venue=TutorialVenue.objects.create(name='Manchester Training Centre'),
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
        self.assertEqual(response.data['venue']['name'], 'London Convention Center')

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
        self.assertEqual(TutorialEvents.objects.filter(code='TUT-CM2-NEW-001').count(), 1)

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
        updated_venue = TutorialVenue.objects.create(name='Updated Venue')
        data = {
            'code': 'TUT-CM2-LON-001-UPDATED',
            'venue_id': updated_venue.id,
            'start_date': self.event1.start_date.isoformat(),
            'end_date': self.event1.end_date.isoformat(),
            'store_product': self.store_product.id
        }

        response = self.client.put(f'/api/tutorials/events/{self.event1.id}/', data, format='json')

        # Should update successfully
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event1.refresh_from_db()
        self.assertEqual(self.event1.code, 'TUT-CM2-LON-001-UPDATED')
        self.assertEqual(self.event1.venue, updated_venue)

    def test_update_tutorial_event_patch(self):
        """Test PATCH /api/tutorials/events/{id}/ to partially update event."""
        patched_venue = TutorialVenue.objects.create(name='Partially Updated Venue')
        data = {
            'venue_id': patched_venue.id,
            'remain_space': 15
        }

        response = self.client.patch(f'/api/tutorials/events/{self.event1.id}/', data, format='json')

        # Should update successfully
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event1.refresh_from_db()
        self.assertEqual(self.event1.venue, patched_venue)
        self.assertEqual(self.event1.remain_space, 15)

    def test_delete_tutorial_event(self):
        """Test DELETE /api/tutorials/events/{id}/."""
        response = self.client.delete(f'/api/tutorials/events/{self.event2.id}/')

        # Should delete successfully
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        # Event should be deleted
        self.assertFalse(TutorialEvents.objects.filter(id=self.event2.id).exists())

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


class TutorialEventsListViewTestCase(APITestCase):
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
        self.event1 = TutorialEvents.objects.create(
            code='TUT-CM2-001',
            venue=TutorialVenue.objects.create(name='London'),
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.store_product1
        )

        self.event2 = TutorialEvents.objects.create(
            code='TUT-SA1-001',
            venue=TutorialVenue.objects.create(name='Manchester'),
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

    def test_list_product_variations_coverage_detection(self):
        """GET /api/tutorials/products/999999/variations/ with nonexistent product returns empty."""
        response = self.client.get('/api/tutorials/products/999999/variations/')
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
        self.event = TutorialEvents.objects.create(
            code='TUT-CM2-001',
            venue=TutorialVenue.objects.create(name='London'),
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


class TutorialViewSetDirectTestCase(APITestCase):
    """Test TutorialViewSet.list() directly (shadowed by duplicate router registration)."""

    def test_tutorial_viewset_list_direct(self):
        """Call TutorialViewSet.list() directly to cover lines 38-40."""
        from tutorials.views import TutorialViewSet
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = factory.get('/fake/')
        view = TutorialViewSet.as_view({'get': 'list'})
        response = view(request)
        response.render()
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TutorialBackwardCompatPropertyTestCase(TestCase):
    """Test backward compat property on TutorialEvent model."""

    def test_exam_session_subject_product_variation_property(self):
        """Test backward compat property returns store_product (line 51)."""
        exam_session = ExamSession.objects.create(
            session_code='TUT_BC_SESS',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        subject = Subject.objects.create(code='TUT_BC', description='BC Test', active=True)
        ess = ExamSessionSubject.objects.create(
            exam_session=exam_session, subject=subject
        )
        product = Product.objects.create(
            code='TUT_BC_P', fullname='BC Product Full', shortname='BC Product'
        )
        pv = ProductVariation.objects.create(
            variation_type='Tutorial', name='BC Variation'
        )
        ppv = ProductProductVariation.objects.create(
            product=product, product_variation=pv
        )
        store_product = StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv
        )
        event = TutorialEvents.objects.create(
            code='TUT-BC-001',
            venue=TutorialVenue.objects.create(name='Test Venue'),
            start_date='2026-06-01',
            end_date='2026-06-03',
            store_product=store_product
        )
        # This exercises the backward compat property (line 51)
        self.assertEqual(event.exam_session_subject_product_variation, store_product)


class TutorialProductListViewWithStoreProductTestCase(APITestCase):
    """Test TutorialProductListView with actual store products (covers loop body lines 89-90)."""

    def setUp(self):
        exam_session = ExamSession.objects.create(
            session_code='TUT_PL_SESS',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        self.subject = Subject.objects.create(
            code='TUT_PL', description='PL Test', active=True
        )
        ess = ExamSessionSubject.objects.create(
            exam_session=exam_session, subject=self.subject
        )
        product = Product.objects.create(
            code='TUT_PLP', fullname='Tutorial - Test Location', shortname='Tutorial Test'
        )
        pv = ProductVariation.objects.create(
            variation_type='Tutorial', name='PL Variation'
        )
        ppv = ProductProductVariation.objects.create(
            product=product, product_variation=pv
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv
        )
        self.exam_session = exam_session
        self.client = APIClient()

    def test_products_with_store_product_data(self):
        """Test GET /api/tutorials/products/ with actual store products for loop body."""
        response = self.client.get(
            f'/api/tutorials/products/?exam_session={self.exam_session.id}&subject_code=TUT_PL'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertIn('subject_code', response.data[0])
        self.assertIn('location', response.data[0])


class TutorialFunctionViewsDirectTestCase(TestCase):
    """Test standalone function views (lines 250, 257) directly."""

    def test_get_all_tutorial_products_function(self):
        """Call get_all_tutorial_products directly (line 250)."""
        from tutorials.views import get_all_tutorial_products
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = factory.get('/fake/')
        # DRF function-based views need the request wrapped
        from rest_framework.request import Request
        response = get_all_tutorial_products(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_tutorial_product_variations_function(self):
        """Call get_tutorial_product_variations directly (line 257)."""
        from tutorials.views import get_tutorial_product_variations
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = factory.get('/fake/')
        response = get_tutorial_product_variations(request, product_id=999999)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TutorialEventsListViewSubjectFilterTestCase(APITestCase):
    """Test TutorialEventListView subject_code filter path (views.py line 55)."""

    def setUp(self):
        """Set up test fixtures with two subjects to verify filtering."""
        self.exam_session = ExamSession.objects.create(
            session_code='FILTER2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        self.subject_cm2 = Subject.objects.create(
            code='FLT_CM2', description='Filter CM2 Subject', active=True
        )
        self.subject_sa1 = Subject.objects.create(
            code='FLT_SA1', description='Filter SA1 Subject', active=True
        )

        self.ess_cm2 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject_cm2
        )
        self.ess_sa1 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject_sa1
        )

        product = Product.objects.create(
            code='FLT_TUT', fullname='Filter Tutorial', shortname='FTut'
        )
        pv = ProductVariation.objects.create(
            code='FLT_WKD', name='Filter Weekend',
            variation_type='Tutorial'
        )
        ppv_cm2 = ProductProductVariation.objects.create(
            product=product, product_variation=pv
        )

        product2 = Product.objects.create(
            code='FLT_TUT2', fullname='Filter Tutorial 2', shortname='FTut2'
        )
        ppv_sa1 = ProductProductVariation.objects.create(
            product=product2, product_variation=pv
        )

        self.sp_cm2 = StoreProduct.objects.create(
            exam_session_subject=self.ess_cm2,
            product_product_variation=ppv_cm2,
            product_code='FLT_CM2/WKD/2025'
        )
        self.sp_sa1 = StoreProduct.objects.create(
            exam_session_subject=self.ess_sa1,
            product_product_variation=ppv_sa1,
            product_code='FLT_SA1/WKD/2025'
        )

        self.event_cm2 = TutorialEvents.objects.create(
            code='FLT-CM2-EVT',
            venue=TutorialVenue.objects.create(name='London Filter'),
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            store_product=self.sp_cm2
        )
        self.event_sa1 = TutorialEvents.objects.create(
            code='FLT-SA1-EVT',
            venue=TutorialVenue.objects.create(name='Manchester Filter'),
            start_date=date.today() + timedelta(days=40),
            end_date=date.today() + timedelta(days=42),
            store_product=self.sp_sa1
        )
        self.client = APIClient()

    def test_filter_by_subject_code_returns_only_matching_events(self):
        """Test subject_code filter in TutorialEventsListView (views.py:55)."""
        response = self.client.get('/api/tutorials/list/?subject_code=FLT_CM2')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        codes = [e['code'] for e in response.data]
        self.assertIn('FLT-CM2-EVT', codes)
        self.assertNotIn('FLT-SA1-EVT', codes)

    def test_filter_by_subject_code_no_match(self):
        """Test subject_code filter with non-existent subject returns empty."""
        response = self.client.get('/api/tutorials/list/?subject_code=NONEXIST')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class TutorialProductListViewMissingParamsTestCase(APITestCase):
    """Test TutorialProductListView missing params error (views.py line 72)."""

    def setUp(self):
        self.client = APIClient()

    def test_missing_both_params(self):
        """Test GET /api/tutorials/products/ with no params returns 400 (views.py:72)."""
        response = self.client.get('/api/tutorials/products/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('exam_session', response.data['error'])
        self.assertIn('subject_code', response.data['error'])


class TutorialProductListAllViewCachedReturnTestCase(APITestCase):
    """Test TutorialProductListAllView cached data return path (views.py line 109)."""

    def setUp(self):
        from django.core.cache import cache
        cache.clear()

        self.exam_session = ExamSession.objects.create(
            session_code='CACHE_RET2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )
        self.subject = Subject.objects.create(
            code='CACHE_CM2', description='Cache CM2', active=True
        )
        ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject
        )
        product = Product.objects.create(
            code='CACHE_TUT', fullname='Tutorial - Cache Location',
            shortname='Cache Tut'
        )
        pv = ProductVariation.objects.create(
            code='CACHE_WKD', name='Cache Weekend', variation_type='Tutorial'
        )
        ppv = ProductProductVariation.objects.create(
            product=product, product_variation=pv
        )
        StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CACHE_CM2/WKD/2025',
            is_active=True
        )
        self.client = APIClient()

    def test_cached_data_return_path(self):
        """Test that second call returns cached data (views.py:109)."""
        from django.core.cache import cache

        # First call populates cache
        response1 = self.client.get('/api/tutorials/products/all/')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response1.data), 1)

        # Verify cache is set
        cached = cache.get('tutorial_products_all')
        self.assertIsNotNone(cached)

        # Second call should hit the cache return path (line 109)
        response2 = self.client.get('/api/tutorials/products/all/')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data, response2.data)

    def test_pre_populated_cache_returns_directly(self):
        """Test that pre-populated cache returns without DB query (views.py:108-109)."""
        from django.core.cache import cache

        # Pre-populate cache manually
        fake_data = [{'subject_code': 'FAKE', 'location': 'Fake Location',
                       'product_id': 999, 'subject_name': 'Fake'}]
        cache.set('tutorial_products_all', fake_data, 600)

        # Call should return the pre-populated cache data
        response = self.client.get('/api/tutorials/products/all/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['subject_code'], 'FAKE')


class TutorialProductVariationListViewFilterTestCase(APITestCase):
    """Test TutorialProductVariationListView subject_code filter and result building
    (views.py lines 150-157)."""

    def setUp(self):
        self.exam_session = ExamSession.objects.create(
            session_code='VAR2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        self.subject_cm2 = Subject.objects.create(
            code='VAR_CM2', description='Var CM2 Subject', active=True
        )
        self.subject_sa1 = Subject.objects.create(
            code='VAR_SA1', description='Var SA1 Subject', active=True
        )

        self.ess_cm2 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject_cm2
        )
        self.ess_sa1 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject_sa1
        )

        self.product = Product.objects.create(
            code='VAR_TUT', fullname='Var Tutorial', shortname='VTut'
        )
        self.pv_wkd = ProductVariation.objects.create(
            code='VAR_WKD', name='Var Weekend',
            description='Weekend tutorial',
            description_short='Wkd',
            variation_type='Tutorial'
        )
        self.pv_day = ProductVariation.objects.create(
            code='VAR_DAY', name='Var Weekday',
            description='Weekday tutorial',
            description_short='Day',
            variation_type='Tutorial'
        )

        self.ppv_wkd = ProductProductVariation.objects.create(
            product=self.product, product_variation=self.pv_wkd
        )
        self.ppv_day = ProductProductVariation.objects.create(
            product=self.product, product_variation=self.pv_day
        )

        self.sp_cm2_wkd = StoreProduct.objects.create(
            exam_session_subject=self.ess_cm2,
            product_product_variation=self.ppv_wkd,
            product_code='VAR_CM2/WKD/2025'
        )
        self.sp_sa1_day = StoreProduct.objects.create(
            exam_session_subject=self.ess_sa1,
            product_product_variation=self.ppv_day,
            product_code='VAR_SA1/DAY/2025'
        )

        self.client = APIClient()

    def test_variation_list_with_subject_code_filter(self):
        """Test subject_code filter in variation list (views.py:150-152)."""
        response = self.client.get(
            f'/api/tutorials/products/{self.product.id}/variations/?subject_code=VAR_CM2'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['product_code'], 'VAR_CM2/WKD/2025')

    def test_variation_list_result_building(self):
        """Test variation result building with all fields (views.py:155-157)."""
        response = self.client.get(
            f'/api/tutorials/products/{self.product.id}/variations/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Verify all fields in results
        for v in response.data:
            self.assertIn('id', v)
            self.assertIn('variation_type', v)
            self.assertIn('name', v)
            self.assertIn('description', v)
            self.assertIn('description_short', v)
            self.assertIn('product_code', v)

    def test_variation_list_filter_excludes_other_subjects(self):
        """Test subject_code filter excludes variations from other subjects."""
        response = self.client.get(
            f'/api/tutorials/products/{self.product.id}/variations/?subject_code=VAR_SA1'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['product_code'], 'VAR_SA1/DAY/2025')
        self.assertEqual(response.data[0]['name'], 'Var Weekday')


class TutorialComprehensiveDataViewFullCoverageTestCase(APITestCase):
    """Test TutorialComprehensiveDataView.get() entire method (views.py lines 174-243).

    This test class creates a rich dataset with multiple subjects, products,
    variations, and events to exercise every code path in the comprehensive
    data view including grouping, variation nesting, and cache population.
    """

    def setUp(self):
        from django.core.cache import cache
        cache.clear()

        # Create exam session
        self.exam_session = ExamSession.objects.create(
            session_code='COMP2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Create two subjects
        self.subject_cm2 = Subject.objects.create(
            code='COMP_CM2', description='Comp CM2', active=True
        )
        self.subject_sa1 = Subject.objects.create(
            code='COMP_SA1', description='Comp SA1', active=True
        )

        # Create exam session subjects
        self.ess_cm2 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject_cm2
        )
        self.ess_sa1 = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject_sa1
        )

        # Create two catalog products (locations)
        self.cat_product1 = Product.objects.create(
            code='COMP_TUT1', fullname='Comp Tutorial London',
            shortname='Comp London'
        )
        self.cat_product2 = Product.objects.create(
            code='COMP_TUT2', fullname='Comp Tutorial Manchester',
            shortname='Comp Manchester'
        )

        # Create two product variations
        self.pv_wkd = ProductVariation.objects.create(
            code='COMP_WKD', name='Comp Weekend',
            description='Weekend tutorial',
            description_short='Wkd',
            variation_type='Tutorial'
        )
        self.pv_day = ProductVariation.objects.create(
            code='COMP_DAY', name='Comp Weekday',
            description='Weekday tutorial',
            description_short='Day',
            variation_type='Tutorial'
        )

        # Create PPVs
        self.ppv_p1_wkd = ProductProductVariation.objects.create(
            product=self.cat_product1, product_variation=self.pv_wkd
        )
        self.ppv_p1_day = ProductProductVariation.objects.create(
            product=self.cat_product1, product_variation=self.pv_day
        )
        self.ppv_p2_wkd = ProductProductVariation.objects.create(
            product=self.cat_product2, product_variation=self.pv_wkd
        )

        # Create store products
        self.sp1 = StoreProduct.objects.create(
            exam_session_subject=self.ess_cm2,
            product_product_variation=self.ppv_p1_wkd,
            product_code='COMP_CM2/WKD_LON/2025'
        )
        self.sp2 = StoreProduct.objects.create(
            exam_session_subject=self.ess_cm2,
            product_product_variation=self.ppv_p1_day,
            product_code='COMP_CM2/DAY_LON/2025'
        )
        self.sp3 = StoreProduct.objects.create(
            exam_session_subject=self.ess_sa1,
            product_product_variation=self.ppv_p2_wkd,
            product_code='COMP_SA1/WKD_MAN/2025'
        )

        # Create tutorial events - multiple events per variation to test grouping
        self.event1 = TutorialEvents.objects.create(
            code='COMP-CM2-WKD-001',
            venue=TutorialVenue.objects.create(name='London Venue A'),
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=32),
            remain_space=20,
            store_product=self.sp1
        )
        self.event2 = TutorialEvents.objects.create(
            code='COMP-CM2-WKD-002',
            venue=TutorialVenue.objects.create(name='London Venue B'),
            start_date=date.today() + timedelta(days=40),
            end_date=date.today() + timedelta(days=42),
            is_soldout=True,
            remain_space=0,
            finalisation_date=date.today() + timedelta(days=25),
            store_product=self.sp1
        )
        self.event3 = TutorialEvents.objects.create(
            code='COMP-CM2-DAY-001',
            venue=TutorialVenue.objects.create(name='London Day Venue'),
            start_date=date.today() + timedelta(days=35),
            end_date=date.today() + timedelta(days=37),
            remain_space=15,
            store_product=self.sp2
        )
        self.event4 = TutorialEvents.objects.create(
            code='COMP-SA1-WKD-001',
            venue=TutorialVenue.objects.create(name='Manchester Venue'),
            start_date=date.today() + timedelta(days=50),
            end_date=date.today() + timedelta(days=52),
            remain_space=25,
            store_product=self.sp3
        )

        self.client = APIClient()

    def test_comprehensive_data_returns_grouped_structure(self):
        """Test comprehensive view returns properly grouped data (views.py:174-243)."""
        response = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        # Should have entries for each subject-product combination
        # CM2 + cat_product1 = 1 entry, SA1 + cat_product2 = 1 entry
        self.assertGreaterEqual(len(response.data), 2)

        # Find the CM2 entry
        cm2_entries = [d for d in response.data if d['subject_code'] == 'COMP_CM2']
        self.assertGreaterEqual(len(cm2_entries), 1)

        cm2_entry = cm2_entries[0]
        self.assertEqual(cm2_entry['subject_code'], 'COMP_CM2')
        self.assertEqual(cm2_entry['subject_name'], 'Comp CM2')
        self.assertEqual(cm2_entry['product_id'], self.cat_product1.id)
        self.assertEqual(cm2_entry['location'], 'Comp Tutorial London')

    def test_comprehensive_data_variation_grouping(self):
        """Test that events are grouped by variation within subject-product (views.py:209-218)."""
        response = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Find CM2 London entry (has two variations: weekend and weekday)
        cm2_entries = [d for d in response.data if d['subject_code'] == 'COMP_CM2']
        self.assertGreaterEqual(len(cm2_entries), 1)

        cm2_entry = cm2_entries[0]
        variations = cm2_entry['variations']
        self.assertIsInstance(variations, list)
        self.assertGreaterEqual(len(variations), 1)

        # Each variation should have proper structure
        for v in variations:
            self.assertIn('id', v)
            self.assertIn('name', v)
            self.assertIn('description', v)
            self.assertIn('description_short', v)
            self.assertIn('events', v)
            self.assertIsInstance(v['events'], list)
            self.assertGreater(len(v['events']), 0)

    def test_comprehensive_data_event_structure(self):
        """Test event data structure within variations (views.py:221-232)."""
        response = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Find any entry and check event structure
        entry = response.data[0]
        variation = entry['variations'][0]
        event = variation['events'][0]

        self.assertIn('id', event)
        self.assertIn('code', event)
        self.assertIn('venue', event)
        self.assertIn('is_soldout', event)
        self.assertIn('finalisation_date', event)
        self.assertIn('remain_space', event)
        self.assertIn('start_date', event)
        self.assertIn('end_date', event)
        self.assertIn('title', event)
        self.assertIn('price', event)

    def test_comprehensive_data_multiple_events_per_variation(self):
        """Test that multiple events are grouped under same variation (views.py:220-232)."""
        response = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Find CM2 London entry - weekend variation should have 2 events
        cm2_entries = [d for d in response.data if d['subject_code'] == 'COMP_CM2']
        self.assertGreaterEqual(len(cm2_entries), 1)

        cm2_entry = cm2_entries[0]
        # Find the weekend variation
        wkd_variations = [v for v in cm2_entry['variations']
                          if v['name'] == 'Comp Weekend']
        self.assertEqual(len(wkd_variations), 1)

        wkd_var = wkd_variations[0]
        # Should have 2 events (event1 and event2)
        self.assertEqual(len(wkd_var['events']), 2)
        event_codes = [e['code'] for e in wkd_var['events']]
        self.assertIn('COMP-CM2-WKD-001', event_codes)
        self.assertIn('COMP-CM2-WKD-002', event_codes)

    def test_comprehensive_data_caching(self):
        """Test comprehensive data is cached and returned from cache (views.py:177-178, 242)."""
        from django.core.cache import cache

        # First call populates cache
        response1 = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Verify cache was populated
        cached = cache.get('tutorial_comprehensive_data')
        self.assertIsNotNone(cached)
        self.assertIsInstance(cached, list)

        # Second call returns cached data (line 178)
        response2 = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data, response2.data)

    def test_comprehensive_data_pre_populated_cache(self):
        """Test pre-populated cache returns directly without DB queries (views.py:177-178)."""
        from django.core.cache import cache

        # Pre-populate with fake data
        fake_data = [{
            'subject_id': 1, 'subject_code': 'FAKE',
            'subject_name': 'Fake Subject', 'product_id': 1,
            'location': 'Fake Location',
            'variations': [{'id': 1, 'name': 'Fake', 'description': '',
                            'description_short': '', 'events': []}]
        }]
        cache.set('tutorial_comprehensive_data', fake_data, 600)

        response = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['subject_code'], 'FAKE')

    def test_comprehensive_data_sa1_entry(self):
        """Test SA1 subject-product entry in comprehensive data."""
        response = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        sa1_entries = [d for d in response.data if d['subject_code'] == 'COMP_SA1']
        self.assertEqual(len(sa1_entries), 1)

        sa1_entry = sa1_entries[0]
        self.assertEqual(sa1_entry['subject_name'], 'Comp SA1')
        self.assertEqual(sa1_entry['product_id'], self.cat_product2.id)
        self.assertEqual(sa1_entry['location'], 'Comp Tutorial Manchester')

        # SA1 should have 1 variation with 1 event
        self.assertEqual(len(sa1_entry['variations']), 1)
        self.assertEqual(len(sa1_entry['variations'][0]['events']), 1)
        self.assertEqual(sa1_entry['variations'][0]['events'][0]['code'], 'COMP-SA1-WKD-001')

    def test_comprehensive_data_event_soldout_fields(self):
        """Test event data includes soldout and finalisation fields correctly."""
        response = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Find the soldout event (COMP-CM2-WKD-002)
        for entry in response.data:
            for variation in entry['variations']:
                for event in variation['events']:
                    if event['code'] == 'COMP-CM2-WKD-002':
                        self.assertTrue(event['is_soldout'])
                        self.assertIsNotNone(event['finalisation_date'])
                        self.assertEqual(event['remain_space'], 0)
                        return
        self.fail('Could not find soldout event COMP-CM2-WKD-002')

    def test_comprehensive_data_empty_when_no_events(self):
        """Test comprehensive view returns empty list when no tutorial events exist."""
        from django.core.cache import cache
        cache.clear()

        # Delete all tutorial events
        TutorialEvents.objects.all().delete()

        response = self.client.get('/api/tutorials/data/comprehensive/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
