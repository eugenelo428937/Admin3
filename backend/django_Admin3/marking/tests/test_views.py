"""
Test suite for marking API endpoints.

This module tests the MarkingPaperViewSet API endpoints to ensure proper
functionality for deadlines retrieval.
"""

from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from marking.models import MarkingPaper
from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatalogProduct, ProductVariation, ProductProductVariation
)
from store.models import Product as StoreProduct


class MarkingPaperAPITestCase(APITestCase):
    """Test cases for MarkingPaper API endpoints."""

    def setUp(self):
        """Set up test fixtures - create marking papers."""
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

        # Create catalog products + variation chain for store.Product
        self.cat_product1 = CatalogProduct.objects.create(
            code='PROD001',
            fullname='Test Product 1 Full Name',
            shortname='Test Product 1'
        )
        self.cat_product2 = CatalogProduct.objects.create(
            code='PROD002',
            fullname='Test Product 2 Full Name',
            shortname='Test Product 2'
        )
        self.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Standard Marking'
        )
        self.ppv1 = ProductProductVariation.objects.create(
            product=self.cat_product1, product_variation=self.variation
        )
        self.ppv2 = ProductProductVariation.objects.create(
            product=self.cat_product2, product_variation=self.variation
        )

        # Create store products (replace old ESSPs)
        self.store_product1 = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.ppv1
        )
        self.store_product2 = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.ppv2
        )

        # Create marking papers
        self.paper1 = MarkingPaper.objects.create(
            store_product=self.store_product1,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        self.paper2 = MarkingPaper.objects.create(
            store_product=self.store_product1,
            name='Paper2',
            deadline=timezone.now() + timedelta(days=50),
            recommended_submit_date=timezone.now() + timedelta(days=45)
        )

        self.paper3 = MarkingPaper.objects.create(
            store_product=self.store_product2,
            name='Paper3',
            deadline=timezone.now() + timedelta(days=60),
            recommended_submit_date=timezone.now() + timedelta(days=55)
        )

        # API client
        self.client = APIClient()

    def test_list_marking_papers(self):
        """Test GET /api/markings/papers/ (if list endpoint exists)."""
        response = self.client.get('/api/markings/papers/')

        # ReadOnlyModelViewSet provides list endpoint
        if response.status_code == status.HTTP_200_OK:
            # Response is paginated
            self.assertIn('results', response.data)
            self.assertGreaterEqual(len(response.data['results']), 3)

    def test_retrieve_marking_paper(self):
        """Test GET /api/markings/papers/{id}/."""
        response = self.client.get(f'/api/markings/papers/{self.paper1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Paper1')

    def test_deadlines_action_with_valid_store_product_id(self):
        """Test GET /api/markings/papers/deadlines/?store_product_id={id}."""
        response = self.client.get(f'/api/markings/papers/deadlines/?store_product_id={self.store_product1.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)  # store_product1 has 2 papers

        # Verify paper names are in response
        paper_names = [p['name'] for p in response.data]
        self.assertIn('Paper1', paper_names)
        self.assertIn('Paper2', paper_names)

    def test_deadlines_action_without_any_id(self):
        """Test GET /api/markings/papers/deadlines/ without any id parameter."""
        response = self.client.get('/api/markings/papers/deadlines/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'store_product_id or essp_id is required')

    def test_deadlines_action_with_invalid_store_product_id(self):
        """Test GET /api/markings/papers/deadlines/?store_product_id={invalid_id}."""
        response = self.client.get('/api/markings/papers/deadlines/?store_product_id=999999')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'Store product not found')

    def test_deadlines_action_with_store_product_no_papers(self):
        """Test deadlines action for store product with no marking papers."""
        # Create third product for store product with no papers
        cat_product3 = CatalogProduct.objects.create(
            code='PROD003',
            fullname='Test Product 3 Full Name',
            shortname='Test Product 3'
        )
        ppv3 = ProductProductVariation.objects.create(
            product=cat_product3, product_variation=self.variation
        )

        # Create store product with no papers
        store_product_no_papers = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=ppv3
        )

        response = self.client.get(f'/api/markings/papers/deadlines/?store_product_id={store_product_no_papers.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 0)  # No papers

    def test_bulk_deadlines_action_with_valid_store_product_ids(self):
        """Test POST /api/markings/papers/bulk-deadlines/ with valid store product ids."""
        data = {
            'store_product_ids': [self.store_product1.id, self.store_product2.id]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)

        # Should have mappings for both store products
        self.assertIn(self.store_product1.id, response.data)
        self.assertIn(self.store_product2.id, response.data)

        # store_product1 should have 2 papers
        self.assertEqual(len(response.data[self.store_product1.id]), 2)

        # store_product2 should have 1 paper
        self.assertEqual(len(response.data[self.store_product2.id]), 1)

    def test_bulk_deadlines_action_without_any_ids(self):
        """Test POST /api/markings/papers/bulk-deadlines/ without any ids."""
        response = self.client.post('/api/markings/papers/bulk-deadlines/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'store_product_ids or essp_ids is required and must be a list')

    def test_bulk_deadlines_action_with_invalid_ids_type(self):
        """Test POST /api/markings/papers/bulk-deadlines/ with non-list store_product_ids."""
        data = {
            'store_product_ids': 'not_a_list'
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_bulk_deadlines_action_with_empty_list(self):
        """Test POST /api/markings/papers/bulk-deadlines/ with empty list."""
        data = {
            'store_product_ids': []
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_bulk_deadlines_action_with_nonexistent_ids(self):
        """Test POST /api/markings/papers/bulk-deadlines/ with nonexistent IDs."""
        data = {
            'store_product_ids': [999998, 999999]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return empty dict (no papers found)
        self.assertIsInstance(response.data, dict)
        self.assertEqual(len(response.data), 0)

    def test_bulk_deadlines_action_mixed_valid_invalid_ids(self):
        """Test POST /api/markings/papers/bulk-deadlines/ with mixed valid/invalid IDs."""
        data = {
            'store_product_ids': [self.store_product1.id, 999999]  # One valid, one invalid
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)

        # Should have mapping only for valid store product
        self.assertIn(self.store_product1.id, response.data)
        self.assertNotIn(999999, response.data)

    def test_deadlines_response_structure(self):
        """Test deadlines action response contains expected fields."""
        response = self.client.get(f'/api/markings/papers/deadlines/?store_product_id={self.store_product1.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)

        # Check first paper has expected fields
        paper_data = response.data[0]
        self.assertIn('id', paper_data)
        self.assertIn('name', paper_data)
        self.assertIn('deadline', paper_data)
        self.assertIn('recommended_submit_date', paper_data)

    def test_bulk_deadlines_response_structure(self):
        """Test bulk deadlines action response structure."""
        data = {
            'store_product_ids': [self.store_product1.id]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Response should be dict with store product IDs as keys
        self.assertIsInstance(response.data, dict)
        self.assertIn(self.store_product1.id, response.data)

        # Each store product should have list of papers
        papers = response.data[self.store_product1.id]
        self.assertIsInstance(papers, list)
        self.assertGreater(len(papers), 0)

        # Each paper should have expected fields
        paper_data = papers[0]
        self.assertIn('id', paper_data)
        self.assertIn('name', paper_data)
        self.assertIn('deadline', paper_data)
        self.assertIn('recommended_submit_date', paper_data)

    def test_readonly_viewset_no_create(self):
        """Test ReadOnlyModelViewSet does not allow POST to create papers."""
        data = {
            'store_product': self.store_product1.id,
            'name': 'NewPaper',
            'deadline': (timezone.now() + timedelta(days=70)).isoformat(),
            'recommended_submit_date': (timezone.now() + timedelta(days=65)).isoformat()
        }

        response = self.client.post('/api/markings/papers/', data, format='json')

        # Should not allow creation (ReadOnlyModelViewSet)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_readonly_viewset_no_update(self):
        """Test ReadOnlyModelViewSet does not allow PUT/PATCH updates."""
        data = {
            'name': 'UpdatedName'
        }

        response = self.client.patch(f'/api/markings/papers/{self.paper1.id}/', data, format='json')

        # Should not allow updates (ReadOnlyModelViewSet)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_readonly_viewset_no_delete(self):
        """Test ReadOnlyModelViewSet does not allow DELETE."""
        response = self.client.delete(f'/api/markings/papers/{self.paper1.id}/')

        # Should not allow deletion (ReadOnlyModelViewSet)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Paper should still exist
        self.assertTrue(MarkingPaper.objects.filter(id=self.paper1.id).exists())

    def test_permission_classes_allow_any(self):
        """Test API endpoints are accessible without authentication (AllowAny)."""
        # Test without authentication
        response = self.client.get(f'/api/markings/papers/deadlines/?store_product_id={self.store_product1.id}')

        # Should allow access (AllowAny permission)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class DeadlinesEsspBackwardCompatTestCase(APITestCase):
    """Tests for the essp_id backward compatibility code path in the deadlines action."""

    def setUp(self):
        """Set up test fixtures including ESSP records for backward compat testing."""
        from catalog.models import ExamSessionSubjectProduct

        # Create exam session
        self.exam_session = ExamSession.objects.create(
            session_code='APR2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Create subject
        self.subject = Subject.objects.create(
            code='SA1',
            description='Health and Care',
            active=True
        )

        # Create exam session subject
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )

        # Create catalog product + variation chain
        self.cat_product = CatalogProduct.objects.create(
            code='M001',
            fullname='Marking Product 1 Full',
            shortname='Marking Product 1'
        )
        self.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Standard Marking Compat'
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.cat_product, product_variation=self.variation
        )

        # Create store product
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.ppv
        )

        # Create ExamSessionSubjectProduct (ESSP) linking same ESS and catalog product
        self.essp = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.cat_product
        )

        # Create marking papers linked to the store product
        self.paper1 = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='EsspP1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )
        self.paper2 = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='EsspP2',
            deadline=timezone.now() + timedelta(days=50),
            recommended_submit_date=timezone.now() + timedelta(days=45)
        )

        self.client = APIClient()

    def test_deadlines_with_valid_essp_id(self):
        """Test GET /api/markings/papers/deadlines/?essp_id={id} returns papers via ESSP mapping."""
        response = self.client.get(f'/api/markings/papers/deadlines/?essp_id={self.essp.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)

        paper_names = [p['name'] for p in response.data]
        self.assertIn('EsspP1', paper_names)
        self.assertIn('EsspP2', paper_names)

    def test_deadlines_with_nonexistent_essp_id(self):
        """Test GET /api/markings/papers/deadlines/?essp_id={invalid} returns 404."""
        response = self.client.get('/api/markings/papers/deadlines/?essp_id=999999')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'ExamSessionSubjectProduct not found')

    def test_deadlines_with_essp_id_no_matching_store_product(self):
        """Test deadlines with ESSP that has no corresponding store product returns 404."""
        from catalog.models import ExamSessionSubjectProduct

        # Create a second catalog product with no store product mapping
        cat_product_orphan = CatalogProduct.objects.create(
            code='M999',
            fullname='Orphan Product Full',
            shortname='Orphan Product'
        )
        essp_orphan = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=cat_product_orphan
        )

        response = self.client.get(f'/api/markings/papers/deadlines/?essp_id={essp_orphan.id}')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'No store product found for ESSP')

    def test_deadlines_essp_id_response_structure(self):
        """Test deadlines via essp_id returns proper paper data structure."""
        response = self.client.get(f'/api/markings/papers/deadlines/?essp_id={self.essp.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)

        paper_data = response.data[0]
        self.assertIn('id', paper_data)
        self.assertIn('name', paper_data)
        self.assertIn('deadline', paper_data)
        self.assertIn('recommended_submit_date', paper_data)


class BulkDeadlinesEsspBackwardCompatTestCase(APITestCase):
    """Tests for the essp_ids backward compatibility code path in the bulk_deadlines action."""

    def setUp(self):
        """Set up test fixtures including ESSP records for bulk backward compat testing."""
        from catalog.models import ExamSessionSubjectProduct

        # Create exam session
        self.exam_session = ExamSession.objects.create(
            session_code='SEP2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        # Create subject
        self.subject = Subject.objects.create(
            code='CB2',
            description='Business Economics',
            active=True
        )

        # Create exam session subject
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )

        # Create two catalog products with variation chains
        self.cat_product1 = CatalogProduct.objects.create(
            code='BM01',
            fullname='Bulk Marking 1 Full',
            shortname='Bulk Marking 1'
        )
        self.cat_product2 = CatalogProduct.objects.create(
            code='BM02',
            fullname='Bulk Marking 2 Full',
            shortname='Bulk Marking 2'
        )
        self.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Bulk Marking Variation'
        )
        self.ppv1 = ProductProductVariation.objects.create(
            product=self.cat_product1, product_variation=self.variation
        )
        self.ppv2 = ProductProductVariation.objects.create(
            product=self.cat_product2, product_variation=self.variation
        )

        # Create store products
        self.store_product1 = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.ppv1
        )
        self.store_product2 = StoreProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product_product_variation=self.ppv2
        )

        # Create ESSP records
        self.essp1 = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.cat_product1
        )
        self.essp2 = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.cat_product2
        )

        # Create marking papers for each store product
        self.paper1 = MarkingPaper.objects.create(
            store_product=self.store_product1,
            name='BulkP1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )
        self.paper2 = MarkingPaper.objects.create(
            store_product=self.store_product1,
            name='BulkP2',
            deadline=timezone.now() + timedelta(days=50),
            recommended_submit_date=timezone.now() + timedelta(days=45)
        )
        self.paper3 = MarkingPaper.objects.create(
            store_product=self.store_product2,
            name='BulkP3',
            deadline=timezone.now() + timedelta(days=55),
            recommended_submit_date=timezone.now() + timedelta(days=50)
        )

        self.client = APIClient()

    def test_bulk_deadlines_with_valid_essp_ids(self):
        """Test POST /api/markings/papers/bulk-deadlines/ with valid essp_ids."""
        data = {
            'essp_ids': [self.essp1.id, self.essp2.id]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)

        # Response keys should be ESSP IDs (mapped back from store product IDs)
        self.assertIn(self.essp1.id, response.data)
        self.assertIn(self.essp2.id, response.data)

        # essp1 maps to store_product1 which has 2 papers
        self.assertEqual(len(response.data[self.essp1.id]), 2)
        paper_names = [p['name'] for p in response.data[self.essp1.id]]
        self.assertIn('BulkP1', paper_names)
        self.assertIn('BulkP2', paper_names)

        # essp2 maps to store_product2 which has 1 paper
        self.assertEqual(len(response.data[self.essp2.id]), 1)
        self.assertEqual(response.data[self.essp2.id][0]['name'], 'BulkP3')

    def test_bulk_deadlines_with_single_essp_id(self):
        """Test bulk deadlines with a single ESSP ID in the list."""
        data = {
            'essp_ids': [self.essp1.id]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)
        self.assertIn(self.essp1.id, response.data)
        self.assertEqual(len(response.data[self.essp1.id]), 2)

    def test_bulk_deadlines_with_nonexistent_essp_ids(self):
        """Test bulk deadlines with non-existent ESSP IDs returns empty mapping."""
        data = {
            'essp_ids': [999997, 999998]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)
        self.assertEqual(len(response.data), 0)

    def test_bulk_deadlines_essp_ids_with_no_store_product_match(self):
        """Test bulk deadlines with ESSP that has no corresponding store product."""
        from catalog.models import ExamSessionSubjectProduct

        # Create orphan catalog product with ESSP but no store product
        cat_product_orphan = CatalogProduct.objects.create(
            code='BM99',
            fullname='Bulk Orphan Full',
            shortname='Bulk Orphan'
        )
        essp_orphan = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=cat_product_orphan
        )

        data = {
            'essp_ids': [essp_orphan.id]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)
        # Orphan ESSP has no store product, so no mapping created
        self.assertEqual(len(response.data), 0)

    def test_bulk_deadlines_essp_ids_mixed_valid_and_orphan(self):
        """Test bulk deadlines with mix of valid ESSP and orphan ESSP (no store product)."""
        from catalog.models import ExamSessionSubjectProduct

        # Create orphan
        cat_product_orphan = CatalogProduct.objects.create(
            code='BMX1',
            fullname='Mixed Orphan Full',
            shortname='Mixed Orphan'
        )
        essp_orphan = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=cat_product_orphan
        )

        data = {
            'essp_ids': [self.essp1.id, essp_orphan.id]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)
        # Only essp1 should have results (orphan has no store product)
        self.assertIn(self.essp1.id, response.data)
        self.assertNotIn(essp_orphan.id, response.data)

    def test_bulk_deadlines_essp_response_structure(self):
        """Test bulk deadlines via essp_ids returns proper data structure."""
        data = {
            'essp_ids': [self.essp1.id]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        papers = response.data[self.essp1.id]
        self.assertIsInstance(papers, list)
        self.assertGreater(len(papers), 0)

        paper_data = papers[0]
        self.assertIn('id', paper_data)
        self.assertIn('name', paper_data)
        self.assertIn('deadline', paper_data)
        self.assertIn('recommended_submit_date', paper_data)

    def test_bulk_deadlines_essp_ids_empty_list(self):
        """Test bulk deadlines with empty essp_ids list returns error."""
        data = {
            'essp_ids': []
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_bulk_deadlines_essp_ids_not_a_list(self):
        """Test bulk deadlines with non-list essp_ids returns error."""
        data = {
            'essp_ids': 'not_a_list'
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_bulk_deadlines_essp_ids_exception_handling(self):
        """Test bulk deadlines exception handler when ESSP lookup fails unexpectedly."""
        from unittest.mock import patch

        data = {
            'essp_ids': [self.essp1.id]
        }

        # Patch ExamSessionSubjectProduct.objects.filter to raise an exception
        with patch(
            'catalog.models.ExamSessionSubjectProduct.objects.filter',
            side_effect=Exception('Database connection lost')
        ):
            response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('ESSP lookup failed', response.data['error'])
        self.assertIn('detail', response.data)
        self.assertIn('Database connection lost', response.data['detail'])
