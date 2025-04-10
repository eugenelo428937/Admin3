from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

class AuthenticationTests(APITestCase):
    def setUp(self):
        """Set up test data and client"""
        self.client = APIClient()
        self.login_url = reverse('auth-viewset')
        self.register_url = reverse('auth-register')
        self.refresh_url = reverse('auth-refresh')
        self.logout_url = reverse('auth-logout')
        self.csrf_url = reverse('auth-csrf')

        # Test user data
        self.user_data = {
            'username': 'testuser@example.com',
            'email': 'testuser@example.com',
            'password': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'User'
        }

        # Create a user for login tests
        self.user = User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )

    def test_register_user(self):
        """Test user registration"""
        new_user_data = {
            'username': 'newuser@example.com',
            'email': 'newuser@example.com',
            'password': 'NewPass123!',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = self.client.post(self.register_url, new_user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue('token' in response.data)
        self.assertTrue('refresh' in response.data)
        self.assertTrue('user' in response.data)

    def test_register_duplicate_email(self):
        """Test registration with duplicate email"""
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success(self):
        """Test successful login"""
        login_data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue('token' in response.data)
        self.assertTrue('refresh' in response.data)
        self.assertTrue('user' in response.data)

    def test_login_wrong_password(self):
        """Test login with wrong password"""
        login_data = {
            'email': self.user_data['email'],
            'password': 'wrongpassword'
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        """Test login with non-existent user"""
        login_data = {
            'email': 'nonexistent@example.com',
            'password': 'TestPass123!'
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token(self):
        """Test token refresh"""
        # First login to get refresh token
        login_data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        login_response = self.client.post(self.login_url, login_data, format='json')
        refresh_token = login_response.data['refresh']

        # Try to get new access token
        refresh_data = {'refresh': refresh_token}
        response = self.client.post(self.refresh_url, refresh_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue('token' in response.data)

    def test_logout(self):
        """Test logout"""
        # First login to get token
        login_data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        login_response = self.client.post(self.login_url, login_data, format='json')
        refresh_token = login_response.data['refresh']

        # Try to logout
        logout_data = {'refresh': refresh_token}
        response = self.client.post(self.logout_url, logout_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')

    def test_csrf_token(self):
        """Test CSRF token endpoint"""
        response = self.client.get(self.csrf_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue('csrfToken' in response.data)

    def test_register_validation(self):
        """Test registration validation"""
        invalid_data = {
            'username': 'invalid',
            'email': 'invalid-email',
            'password': '123',  # Too short
            'first_name': '',
            'last_name': ''
        }
        response = self.client.post(self.register_url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
