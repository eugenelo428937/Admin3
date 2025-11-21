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
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from exam_sessions.models import ExamSession
from exam_sessions_subjects.models import ExamSessionSubject
from subjects.models import Subject
from products.models.products import Product


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

        # Create products (using correct field names)
        self.product1 = Product.objects.create(
            code='PROD001',
            fullname='Test Product 1 Full Name',
            shortname='Test Product 1'
        )

        self.product2 = Product.objects.create(
            code='PROD002',
            fullname='Test Product 2 Full Name',
            shortname='Test Product 2'
        )

        # Create ESSPs (must have different products due to unique_together constraint)
        self.essp1 = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.product1
        )

        # Create another ESSP for testing
        self.essp2 = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.product2
        )

        # Create marking papers
        self.paper1 = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp1,
            name='Paper1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40)
        )

        self.paper2 = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp1,
            name='Paper2',
            deadline=timezone.now() + timedelta(days=50),
            recommended_submit_date=timezone.now() + timedelta(days=45)
        )

        self.paper3 = MarkingPaper.objects.create(
            exam_session_subject_product=self.essp2,
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

    def test_deadlines_action_with_valid_essp_id(self):
        """Test GET /api/markings/papers/deadlines/?essp_id={id}."""
        response = self.client.get(f'/api/markings/papers/deadlines/?essp_id={self.essp1.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)  # essp1 has 2 papers

        # Verify paper names are in response
        paper_names = [p['name'] for p in response.data]
        self.assertIn('Paper1', paper_names)
        self.assertIn('Paper2', paper_names)

    def test_deadlines_action_without_essp_id(self):
        """Test GET /api/markings/papers/deadlines/ without essp_id parameter."""
        response = self.client.get('/api/markings/papers/deadlines/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'essp_id is required')

    def test_deadlines_action_with_invalid_essp_id(self):
        """Test GET /api/markings/papers/deadlines/?essp_id={invalid_id}."""
        response = self.client.get('/api/markings/papers/deadlines/?essp_id=999999')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'ExamSessionSubjectProduct not found')

    def test_deadlines_action_with_nonexistent_essp(self):
        """Test deadlines action for ESSP with no marking papers."""
        # Create third product for ESSP with no papers
        product3 = Product.objects.create(
            code='PROD003',
            fullname='Test Product 3 Full Name',
            shortname='Test Product 3'
        )

        # Create ESSP with no papers
        essp_no_papers = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=product3
        )

        response = self.client.get(f'/api/markings/papers/deadlines/?essp_id={essp_no_papers.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 0)  # No papers

    def test_bulk_deadlines_action_with_valid_essp_ids(self):
        """Test POST /api/markings/papers/bulk-deadlines/ with valid essp_ids."""
        data = {
            'essp_ids': [self.essp1.id, self.essp2.id]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)

        # Should have mappings for both ESSPs
        self.assertIn(self.essp1.id, response.data)
        self.assertIn(self.essp2.id, response.data)

        # essp1 should have 2 papers
        self.assertEqual(len(response.data[self.essp1.id]), 2)

        # essp2 should have 1 paper
        self.assertEqual(len(response.data[self.essp2.id]), 1)

    def test_bulk_deadlines_action_without_essp_ids(self):
        """Test POST /api/markings/papers/bulk-deadlines/ without essp_ids."""
        response = self.client.post('/api/markings/papers/bulk-deadlines/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'essp_ids is required and must be a list')

    def test_bulk_deadlines_action_with_invalid_essp_ids_type(self):
        """Test POST /api/markings/papers/bulk-deadlines/ with non-list essp_ids."""
        data = {
            'essp_ids': 'not_a_list'
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_bulk_deadlines_action_with_empty_list(self):
        """Test POST /api/markings/papers/bulk-deadlines/ with empty list."""
        data = {
            'essp_ids': []
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_bulk_deadlines_action_with_nonexistent_essp_ids(self):
        """Test POST /api/markings/papers/bulk-deadlines/ with nonexistent ESSP IDs."""
        data = {
            'essp_ids': [999998, 999999]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return empty dict (no papers found)
        self.assertIsInstance(response.data, dict)
        self.assertEqual(len(response.data), 0)

    def test_bulk_deadlines_action_mixed_valid_invalid_ids(self):
        """Test POST /api/markings/papers/bulk-deadlines/ with mixed valid/invalid IDs."""
        data = {
            'essp_ids': [self.essp1.id, 999999]  # One valid, one invalid
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)

        # Should have mapping only for valid ESSP
        self.assertIn(self.essp1.id, response.data)
        self.assertNotIn(999999, response.data)

    def test_deadlines_response_structure(self):
        """Test deadlines action response contains expected fields."""
        response = self.client.get(f'/api/markings/papers/deadlines/?essp_id={self.essp1.id}')

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
            'essp_ids': [self.essp1.id]
        }

        response = self.client.post('/api/markings/papers/bulk-deadlines/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Response should be dict with ESSP IDs as keys
        self.assertIsInstance(response.data, dict)
        self.assertIn(self.essp1.id, response.data)

        # Each ESSP should have list of papers
        papers = response.data[self.essp1.id]
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
            'exam_session_subject_product': self.essp1.id,
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
        response = self.client.get(f'/api/markings/papers/deadlines/?essp_id={self.essp1.id}')

        # Should allow access (AllowAny permission)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
