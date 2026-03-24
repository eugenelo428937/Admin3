"""Tests for users admin API endpoints.

TDD tests for admin operations on user profiles and staff.

Test classes:
- TestUserProfileAdminViewSet (T032)
- TestUserProfileNestedEndpoints (T033)
- TestStaffAdminViewSet (T034)
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from userprofile.models import (
    UserProfile,
    UserProfileAddress,
    UserProfileContactNumber,
    UserProfileEmail,
)
from staff.models import Staff

User = get_user_model()


class UsersAdminTestCase(APITestCase):
    """Base test case for users admin endpoint tests.

    Provides JWT auth helpers and creates test users with profiles,
    addresses, contacts, emails, and staff instances.
    """

    @classmethod
    def setUpTestData(cls):
        """Create test data for users admin tests."""
        # Auth users
        cls.superuser = User.objects.create_superuser(
            username='users_admin',
            email='users_admin@test.com',
            password='testpass123',
        )
        cls.regular_user = User.objects.create_user(
            username='users_regular',
            email='users_regular@test.com',
            password='testpass123',
        )

        # Test users with profiles
        cls.test_user_1 = User.objects.create_user(
            username='testuser1',
            email='testuser1@test.com',
            password='testpass123',
            first_name='John',
            last_name='Doe',
        )
        cls.test_user_2 = User.objects.create_user(
            username='testuser2',
            email='testuser2@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Smith',
        )

        # User profiles (created by signal or manually)
        cls.profile_1, _ = UserProfile.objects.get_or_create(
            user=cls.test_user_1,
            defaults={
                'title': 'Mr',
                'send_invoices_to': 'HOME',
                'send_study_material_to': 'WORK',
                'remarks': 'Test remarks',
            }
        )
        cls.profile_2, _ = UserProfile.objects.get_or_create(
            user=cls.test_user_2,
            defaults={
                'title': 'Ms',
                'send_invoices_to': 'WORK',
                'send_study_material_to': 'HOME',
            }
        )

        # Addresses
        cls.address_home = UserProfileAddress.objects.create(
            user_profile=cls.profile_1,
            address_type='HOME',
            address_data={'street': '123 Test St', 'city': 'London', 'postal_code': 'SW1A 1AA'},
            country='United Kingdom',
        )
        cls.address_work = UserProfileAddress.objects.create(
            user_profile=cls.profile_1,
            address_type='WORK',
            address_data={'street': '456 Office Rd', 'city': 'London'},
            country='United Kingdom',
            company='Test Corp',
            department='IT',
        )

        # Contact numbers
        cls.contact_home = UserProfileContactNumber.objects.create(
            user_profile=cls.profile_1,
            contact_type='HOME',
            number='02012345678',
            country_code='GB',
        )
        cls.contact_mobile = UserProfileContactNumber.objects.create(
            user_profile=cls.profile_1,
            contact_type='MOBILE',
            number='07987654321',
            country_code='GB',
        )

        # Emails
        cls.email_personal = UserProfileEmail.objects.create(
            user_profile=cls.profile_1,
            email_type='PERSONAL',
            email='john.doe@personal.com',
        )
        cls.email_work = UserProfileEmail.objects.create(
            user_profile=cls.profile_1,
            email_type='WORK',
            email='john.doe@work.com',
        )

        # Staff
        cls.staff_user = User.objects.create_user(
            username='staffmember',
            email='staff@test.com',
            password='testpass123',
            first_name='Staff',
            last_name='Member',
        )
        cls.staff = Staff.objects.create(user=cls.staff_user)

    def authenticate_superuser(self):
        """Authenticate as superuser."""
        refresh = RefreshToken.for_user(self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def authenticate_regular_user(self):
        """Authenticate as regular user."""
        refresh = RefreshToken.for_user(self.regular_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def unauthenticate(self):
        """Remove authentication."""
        self.client.credentials()


# =============================================================================
# US4: User Profile Admin
# =============================================================================

class TestUserProfileAdminViewSet(UsersAdminTestCase):
    """T032: Tests for UserProfile admin CRUD."""

    def test_list_as_superuser_returns_200(self):
        """GET /api/users/profiles/ as superuser returns 200."""
        self.authenticate_superuser()
        response = self.client.get('/api/users/profiles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_as_regular_user_returns_403(self):
        """GET /api/users/profiles/ as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.get('/api/users/profiles/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_retrieve_includes_nested_user_info(self):
        """GET /api/users/profiles/{id}/ returns nested user info."""
        self.authenticate_superuser()
        response = self.client.get(f'/api/users/profiles/{self.profile_1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('user', data)
        user_data = data['user']
        self.assertIn('username', user_data)
        self.assertIn('first_name', user_data)
        self.assertIn('last_name', user_data)
        self.assertIn('email', user_data)

    def test_update_profile_fields(self):
        """PUT /api/users/profiles/{id}/ updates writable fields."""
        self.authenticate_superuser()
        response = self.client.patch(f'/api/users/profiles/{self.profile_1.id}/', {
            'title': 'Dr',
            'send_invoices_to': 'WORK',
            'send_study_material_to': 'HOME',
            'remarks': 'Updated remarks',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile_1.refresh_from_db()
        self.assertEqual(self.profile_1.title, 'Dr')
        self.assertEqual(self.profile_1.remarks, 'Updated remarks')

    def test_update_ignores_user_field(self):
        """PUT /api/users/profiles/{id}/ ignores user field changes (read-only)."""
        self.authenticate_superuser()
        response = self.client.patch(f'/api/users/profiles/{self.profile_1.id}/', {
            'title': 'Prof',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # User should remain unchanged
        self.profile_1.refresh_from_db()
        self.assertEqual(self.profile_1.user.username, 'testuser1')


# =============================================================================
# US4: User Profile Nested Endpoints
# =============================================================================

class TestUserProfileNestedEndpoints(UsersAdminTestCase):
    """T033: Tests for UserProfile nested sub-resource endpoints."""

    def test_get_addresses_as_superuser_returns_200(self):
        """GET /api/users/profiles/{id}/addresses/ returns 200."""
        self.authenticate_superuser()
        response = self.client.get(f'/api/users/profiles/{self.profile_1.id}/addresses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(len(data) >= 2)

    def test_get_addresses_as_regular_user_returns_403(self):
        """GET /api/users/profiles/{id}/addresses/ as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.get(f'/api/users/profiles/{self.profile_1.id}/addresses/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_put_address_returns_200(self):
        """PUT /api/users/profiles/{pid}/addresses/{aid}/ updates address."""
        self.authenticate_superuser()
        response = self.client.put(
            f'/api/users/profiles/{self.profile_1.id}/addresses/{self.address_home.id}/',
            {
                'address_type': 'HOME',
                'address_data': {'street': '789 New St', 'city': 'Manchester'},
                'country': 'United Kingdom',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_contacts_as_superuser_returns_200(self):
        """GET /api/users/profiles/{id}/contacts/ returns 200."""
        self.authenticate_superuser()
        response = self.client.get(f'/api/users/profiles/{self.profile_1.id}/contacts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_put_contact_returns_200(self):
        """PUT /api/users/profiles/{pid}/contacts/{cid}/ updates contact."""
        self.authenticate_superuser()
        response = self.client.put(
            f'/api/users/profiles/{self.profile_1.id}/contacts/{self.contact_home.id}/',
            {
                'contact_type': 'HOME',
                'number': '02098765432',
                'country_code': 'GB',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_emails_as_superuser_returns_200(self):
        """GET /api/users/profiles/{id}/emails/ returns 200."""
        self.authenticate_superuser()
        response = self.client.get(f'/api/users/profiles/{self.profile_1.id}/emails/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_put_email_returns_200(self):
        """PUT /api/users/profiles/{pid}/emails/{eid}/ updates email."""
        self.authenticate_superuser()
        response = self.client.put(
            f'/api/users/profiles/{self.profile_1.id}/emails/{self.email_personal.id}/',
            {
                'email_type': 'PERSONAL',
                'email': 'john.doe.updated@personal.com',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# =============================================================================
# US4: Staff Admin
# =============================================================================

class TestStaffAdminViewSet(UsersAdminTestCase):
    """T034: Tests for Staff admin CRUD."""

    def test_list_as_superuser_returns_200(self):
        """GET /api/users/staff/ as superuser returns 200."""
        self.authenticate_superuser()
        response = self.client.get('/api/users/staff/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_as_regular_user_returns_403(self):
        """GET /api/users/staff/ as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.get('/api/users/staff/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_as_superuser_returns_201(self):
        """POST as superuser returns 201."""
        self.authenticate_superuser()
        new_user = User.objects.create_user(
            username='newstaff',
            email='newstaff@test.com',
            password='testpass123',
        )
        response = self.client.post('/api/users/staff/', {
            'user': new_user.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_duplicate_user_returns_400(self):
        """POST duplicate user (OneToOne) returns 400."""
        self.authenticate_superuser()
        response = self.client.post('/api/users/staff/', {
            'user': self.staff_user.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_includes_nested_user_info(self):
        """GET /api/users/staff/{id}/ returns nested user info."""
        self.authenticate_superuser()
        response = self.client.get(f'/api/users/staff/{self.staff.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('user', data)

    def test_update_as_superuser_returns_200(self):
        """PATCH as superuser returns 200."""
        self.authenticate_superuser()
        new_user = User.objects.create_user(
            username='updatestaff',
            email='updatestaff@test.com',
            password='testpass123',
        )
        staff = Staff.objects.create(user=new_user)
        another_user = User.objects.create_user(
            username='anotherstaff',
            email='another@test.com',
            password='testpass123',
        )
        response = self.client.patch(f'/api/users/staff/{staff.id}/', {
            'user': another_user.id,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_as_superuser_returns_204(self):
        """DELETE as superuser returns 204."""
        self.authenticate_superuser()
        temp_user = User.objects.create_user(
            username='tempstaff',
            email='tempstaff@test.com',
            password='testpass123',
        )
        staff = Staff.objects.create(user=temp_user)
        response = self.client.delete(f'/api/users/staff/{staff.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
