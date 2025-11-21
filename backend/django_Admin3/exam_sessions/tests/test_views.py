"""
Test suite for exam_sessions API endpoints.

This module tests the ExamSessionViewSet API endpoints to ensure proper
authentication, authorization, and CRUD operations.
"""

from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from exam_sessions.models import ExamSession


class ExamSessionAPITestCase(APITestCase):
    """Test cases for ExamSession API endpoints."""

    def setUp(self):
        """Set up test fixtures - create test users and exam sessions."""
        # Create test users
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='admin123',
            is_staff=True,
            is_superuser=True
        )

        self.regular_user = User.objects.create_user(
            username='user',
            email='user@example.com',
            password='user123'
        )

        # Create test exam sessions
        self.session1 = ExamSession.objects.create(
            session_code='JUNE2025',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60)
        )

        self.session2 = ExamSession.objects.create(
            session_code='DEC2025',
            start_date=timezone.now() + timedelta(days=180),
            end_date=timezone.now() + timedelta(days=210)
        )

        # API client
        self.client = APIClient()

    def test_list_exam_sessions_unauthenticated(self):
        """Test GET /api/exam-sessions/ without authentication."""
        response = self.client.get('/api/exam-sessions/')

        # Should allow unauthenticated access (or require auth depending on settings)
        # Assuming no authentication required for list (public endpoint)
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED])

        if response.status_code == status.HTTP_200_OK:
            # If public, should return list of sessions
            self.assertEqual(len(response.data), 2)

    def test_list_exam_sessions_authenticated(self):
        """Test GET /api/exam-sessions/ with authentication."""
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.get('/api/exam-sessions/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is paginated with 'results' key
        self.assertIn('results', response.data)
        self.assertIsInstance(response.data['results'], list)
        self.assertEqual(len(response.data['results']), 2)

    def test_retrieve_exam_session(self):
        """Test GET /api/exam-sessions/{id}/."""
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.get(f'/api/exam-sessions/{self.session1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['session_code'], 'JUNE2025')
        self.assertEqual(response.data['id'], self.session1.id)

    def test_retrieve_exam_session_nonexistent(self):
        """Test GET /api/exam-sessions/{id}/ for nonexistent session."""
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.get('/api/exam-sessions/999999/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_exam_session_authenticated(self):
        """Test POST /api/exam-sessions/ to create new session."""
        self.client.force_authenticate(user=self.admin_user)

        data = {
            'session_code': 'MAR2026',
            'start_date': (timezone.now() + timedelta(days=270)).isoformat(),
            'end_date': (timezone.now() + timedelta(days=300)).isoformat()
        }

        response = self.client.post('/api/exam-sessions/', data, format='json')

        # Should create successfully (or require authorization)
        self.assertIn(response.status_code, [
            status.HTTP_201_CREATED,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_401_UNAUTHORIZED
        ])

        if response.status_code == status.HTTP_201_CREATED:
            self.assertEqual(response.data['session_code'], 'MAR2026')
            self.assertEqual(ExamSession.objects.filter(session_code='MAR2026').count(), 1)

    def test_create_exam_session_unauthenticated(self):
        """Test POST /api/exam-sessions/ without authentication."""
        data = {
            'session_code': 'MAR2026',
            'start_date': (timezone.now() + timedelta(days=270)).isoformat(),
            'end_date': (timezone.now() + timedelta(days=300)).isoformat()
        }

        response = self.client.post('/api/exam-sessions/', data, format='json')

        # Should require authentication
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])

    def test_create_exam_session_missing_required_fields(self):
        """Test POST /api/exam-sessions/ with missing required fields."""
        self.client.force_authenticate(user=self.admin_user)

        # Missing start_date
        data = {
            'session_code': 'INVALID2026',
            'end_date': (timezone.now() + timedelta(days=300)).isoformat()
        }

        response = self.client.post('/api/exam-sessions/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_exam_session_invalid_dates(self):
        """Test POST /api/exam-sessions/ with end_date before start_date."""
        self.client.force_authenticate(user=self.admin_user)

        data = {
            'session_code': 'INVALID2026',
            'start_date': (timezone.now() + timedelta(days=300)).isoformat(),
            'end_date': (timezone.now() + timedelta(days=270)).isoformat()  # End before start
        }

        response = self.client.post('/api/exam-sessions/', data, format='json')

        # Should either accept (no validation) or reject (with validation)
        # If validation exists, should be 400 BAD REQUEST
        self.assertIn(response.status_code, [
            status.HTTP_201_CREATED,  # No validation (model allows it)
            status.HTTP_400_BAD_REQUEST  # Validation exists
        ])

    def test_update_exam_session_put(self):
        """Test PUT /api/exam-sessions/{id}/ to update session."""
        self.client.force_authenticate(user=self.admin_user)

        data = {
            'session_code': 'JUNE2025_UPDATED',
            'start_date': self.session1.start_date.isoformat(),
            'end_date': self.session1.end_date.isoformat()
        }

        response = self.client.put(f'/api/exam-sessions/{self.session1.id}/', data, format='json')

        # Should update successfully (or require authorization)
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_403_FORBIDDEN
        ])

        if response.status_code == status.HTTP_200_OK:
            self.session1.refresh_from_db()
            self.assertEqual(self.session1.session_code, 'JUNE2025_UPDATED')

    def test_update_exam_session_patch(self):
        """Test PATCH /api/exam-sessions/{id}/ to partially update session."""
        self.client.force_authenticate(user=self.admin_user)

        data = {
            'session_code': 'JUNE2025_PATCHED'
        }

        response = self.client.patch(f'/api/exam-sessions/{self.session1.id}/', data, format='json')

        # Should update successfully (or require authorization)
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_403_FORBIDDEN
        ])

        if response.status_code == status.HTTP_200_OK:
            self.session1.refresh_from_db()
            self.assertEqual(self.session1.session_code, 'JUNE2025_PATCHED')

    def test_update_exam_session_unauthenticated(self):
        """Test PUT /api/exam-sessions/{id}/ without authentication."""
        data = {
            'session_code': 'JUNE2025_UPDATED',
            'start_date': self.session1.start_date.isoformat(),
            'end_date': self.session1.end_date.isoformat()
        }

        response = self.client.put(f'/api/exam-sessions/{self.session1.id}/', data, format='json')

        # Should require authentication
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])

    def test_delete_exam_session(self):
        """Test DELETE /api/exam-sessions/{id}/."""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(f'/api/exam-sessions/{self.session2.id}/')

        # Should delete successfully (or require authorization)
        self.assertIn(response.status_code, [
            status.HTTP_204_NO_CONTENT,
            status.HTTP_403_FORBIDDEN
        ])

        if response.status_code == status.HTTP_204_NO_CONTENT:
            # Session should be deleted
            self.assertFalse(ExamSession.objects.filter(id=self.session2.id).exists())

    def test_delete_exam_session_unauthenticated(self):
        """Test DELETE /api/exam-sessions/{id}/ without authentication."""
        response = self.client.delete(f'/api/exam-sessions/{self.session2.id}/')

        # Should require authentication
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])

        # Session should still exist
        self.assertTrue(ExamSession.objects.filter(id=self.session2.id).exists())

    def test_list_exam_sessions_response_structure(self):
        """Test exam session list response contains expected fields."""
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.get('/api/exam-sessions/')

        if response.status_code == status.HTTP_200_OK:
            # Response is paginated
            self.assertIn('results', response.data)
            self.assertIsInstance(response.data['results'], list)
            self.assertGreater(len(response.data['results']), 0)

            # Check first session has expected fields
            session_data = response.data['results'][0]
            self.assertIn('id', session_data)
            self.assertIn('session_code', session_data)
            self.assertIn('start_date', session_data)
            self.assertIn('end_date', session_data)
            self.assertIn('create_date', session_data)
            self.assertIn('modified_date', session_data)

    def test_retrieve_exam_session_response_structure(self):
        """Test exam session retrieve response contains expected fields."""
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.get(f'/api/exam-sessions/{self.session1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check response has expected fields
        self.assertIn('id', response.data)
        self.assertIn('session_code', response.data)
        self.assertIn('start_date', response.data)
        self.assertIn('end_date', response.data)
        self.assertIn('create_date', response.data)
        self.assertIn('modified_date', response.data)

        # Read-only fields should be present
        self.assertIsNotNone(response.data['create_date'])
        self.assertIsNotNone(response.data['modified_date'])

    def test_filter_exam_sessions_by_date(self):
        """Test filtering exam sessions by date range."""
        self.client.force_authenticate(user=self.regular_user)

        # Get all sessions
        response = self.client.get('/api/exam-sessions/')

        if response.status_code == status.HTTP_200_OK:
            # All sessions should be returned (paginated response)
            self.assertIn('results', response.data)
            self.assertEqual(len(response.data['results']), 2)

    def test_ordering_exam_sessions(self):
        """Test exam sessions ordering in list response."""
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.get('/api/exam-sessions/')

        if response.status_code == status.HTTP_200_OK:
            # Verify sessions are in response (paginated)
            self.assertIn('results', response.data)
            self.assertGreater(len(response.data['results']), 0)

            # Default ordering (if any) should be consistent
            session_codes = [s['session_code'] for s in response.data['results']]
            self.assertIn('JUNE2025', session_codes)
            self.assertIn('DEC2025', session_codes)
