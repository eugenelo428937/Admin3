# students/tests/test_auth.py
"""
Test suite for students authentication endpoints.

Moved from students/tests.py to students/tests/test_auth.py
to resolve Python module import conflict.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from students.models import Student
import json

class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.login_url = reverse('auth-viewset')
        self.logout_url = reverse('auth-logout')
        # session-info endpoint may not exist - using auth endpoint
        self.session_url = reverse('auth-viewset')
        
        # Create test user
        self.user_data = {
            'username': 'testuser',
            'password': 'testpass123',
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
        self.user = User.objects.create_user(**self.user_data)
        
        # Create associated student
        self.student = Student.objects.create(
            user=self.user,
            student_type='regular',
            apprentice_type='none'
        )

    def test_login_success(self):
        response = self.client.post(
            self.login_url,
            data=json.dumps({
                'username': 'test@example.com',  # API uses email as username
                'password': 'testpass123'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # API returns token, refresh, and user (no 'status' field)
        self.assertIn('token', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'testuser')

    def test_login_invalid_credentials(self):
        response = self.client.post(
            self.login_url,
            data=json.dumps({
                'username': 'testuser',
                'password': 'wrongpass'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout(self):
        # First login
        self.client.force_authenticate(user=self.user)
        
        # Then logout
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')

    def test_get_csrf_token_authenticated(self):
        """GET on auth endpoint returns CSRF token (JWT auth, not session-based)"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.session_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # CSRF endpoint returns csrfToken and sessionKey
        self.assertIn('csrfToken', response.data)
        self.assertIn('sessionKey', response.data)

    def test_get_csrf_token_unauthenticated(self):
        """CSRF endpoint is public - returns 200 even without auth"""
        response = self.client.get(self.session_url)
        # CSRF endpoint has AllowAny permission, returns 200
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('csrfToken', response.data)
