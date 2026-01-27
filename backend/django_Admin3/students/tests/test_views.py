"""Tests for students API endpoints."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from students.models import Student

User = get_user_model()


class TestStudentViewSet(APITestCase):
    """Test student API endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
        )
        self.student = Student.objects.create(
            user=self.user,
            student_type='S',
        )

    def test_list_students_authenticated(self):
        """GET /api/students/ with authentication returns 200."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/students/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_students_unauthenticated(self):
        """GET /api/students/ without authentication returns 401."""
        response = self.client.get('/api/students/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
