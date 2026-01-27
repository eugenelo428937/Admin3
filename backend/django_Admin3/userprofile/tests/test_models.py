"""
Test suite for userprofile models.

This module tests the UserProfile, UserProfileAddress, UserProfileContactNumber,
and UserProfileEmail models to ensure proper field validations, relationships,
and model behavior.
"""

from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError

from userprofile.models import (
    UserProfile,
    UserProfileAddress,
    UserProfileContactNumber,
    UserProfileEmail
)


class UserProfileTestCase(TestCase):
    """Test cases for UserProfile model."""

    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_user_profile_creation(self):
        """Test UserProfile auto-creation via signal with default values."""
        # Profile is automatically created by signal when User is created
        profile = self.user.userprofile

        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.send_invoices_to, 'HOME')
        self.assertEqual(profile.send_study_material_to, 'HOME')
        self.assertIsNone(profile.title)
        self.assertIsNone(profile.remarks)

    def test_user_profile_creation_with_all_fields(self):
        """Test UserProfile update with all fields."""
        # Profile is automatically created by signal, so update it
        profile = self.user.userprofile
        profile.title = 'Mr'
        profile.send_invoices_to = 'WORK'
        profile.send_study_material_to = 'WORK'
        profile.remarks = 'Test remarks for user profile'
        profile.save()

        # Refresh from DB to confirm save
        profile.refresh_from_db()

        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.title, 'Mr')
        self.assertEqual(profile.send_invoices_to, 'WORK')
        self.assertEqual(profile.send_study_material_to, 'WORK')
        self.assertEqual(profile.remarks, 'Test remarks for user profile')

    def test_one_to_one_relationship_with_user(self):
        """Test OneToOneField relationship with User model."""
        # Profile is automatically created by signal
        profile = self.user.userprofile

        # Test forward relationship
        self.assertEqual(profile.user, self.user)

        # Test reverse relationship via userprofile attribute
        self.assertEqual(self.user.userprofile, profile)

    def test_cascade_delete_user(self):
        """Test cascading delete - deleting user deletes profile."""
        # Profile is automatically created by signal
        profile = self.user.userprofile
        profile_id = profile.id

        # Delete user
        self.user.delete()

        # Profile should be deleted
        self.assertFalse(UserProfile.objects.filter(id=profile_id).exists())

    def test_title_max_length(self):
        """Test title field respects 16 character maximum."""
        title = 'A' * 16
        profile = self.user.userprofile
        profile.title = title
        profile.save()
        profile.refresh_from_db()
        self.assertEqual(len(profile.title), 16)

    def test_remarks_max_length(self):
        """Test remarks field respects 500 character maximum."""
        remarks = 'A' * 500
        profile = self.user.userprofile
        profile.remarks = remarks
        profile.save()
        profile.refresh_from_db()
        self.assertEqual(len(profile.remarks), 500)

    def test_send_invoices_to_choices(self):
        """Test send_invoices_to accepts valid choices."""
        # Test HOME choice (default)
        profile_home = self.user.userprofile
        self.assertEqual(profile_home.send_invoices_to, 'HOME')

        # Test WORK choice
        user2 = User.objects.create_user(username='user2', password='pass123')
        profile_work = user2.userprofile
        profile_work.send_invoices_to = 'WORK'
        profile_work.save()
        profile_work.refresh_from_db()
        self.assertEqual(profile_work.send_invoices_to, 'WORK')

    def test_send_study_material_to_choices(self):
        """Test send_study_material_to accepts valid choices."""
        # Test HOME choice (default)
        profile_home = self.user.userprofile
        self.assertEqual(profile_home.send_study_material_to, 'HOME')

        # Test WORK choice
        user2 = User.objects.create_user(username='user2', password='pass123')
        profile_work = user2.userprofile
        profile_work.send_study_material_to = 'WORK'
        profile_work.save()
        profile_work.refresh_from_db()
        self.assertEqual(profile_work.send_study_material_to, 'WORK')

    def test_str_method(self):
        """Test __str__ method returns username."""
        profile = self.user.userprofile
        self.assertEqual(str(profile), 'testuser')

    def test_db_table_name(self):
        """Test custom database table name."""
        self.assertEqual(
            UserProfile._meta.db_table,
            '"acted"."user_profile"'
        )

    def test_verbose_name(self):
        """Test model verbose name."""
        self.assertEqual(
            UserProfile._meta.verbose_name,
            'User Profile'
        )

    def test_verbose_name_plural(self):
        """Test model verbose name plural."""
        self.assertEqual(
            UserProfile._meta.verbose_name_plural,
            'User Profiles'
        )


class UserProfileAddressTestCase(TestCase):
    """Test cases for UserProfileAddress model."""

    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Profile is automatically created by signal
        self.profile = self.user.userprofile

    def test_address_creation_with_required_fields(self):
        """Test UserProfileAddress creation with required fields."""
        address = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='HOME',
            country='United Kingdom'
        )

        self.assertEqual(address.user_profile, self.profile)
        self.assertEqual(address.address_type, 'HOME')
        self.assertEqual(address.country, 'United Kingdom')
        self.assertEqual(address.address_data, {})  # Default empty dict

    def test_address_creation_with_json_data(self):
        """Test UserProfileAddress creation with JSON address data."""
        address_data = {
            'building': '10',
            'street': 'Downing Street',
            'city': 'London',
            'postal_code': 'SW1A 2AA'
        }

        address = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='HOME',
            country='United Kingdom',
            address_data=address_data
        )

        self.assertEqual(address.address_data, address_data)
        self.assertEqual(address.get_address_field('street'), 'Downing Street')
        self.assertEqual(address.get_address_field('postal_code'), 'SW1A 2AA')

    def test_work_address_with_company(self):
        """Test work address with company and department."""
        address = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='WORK',
            country='United Kingdom',
            company='Tech Corp Ltd',
            department='Engineering'
        )

        self.assertEqual(address.company, 'Tech Corp Ltd')
        self.assertEqual(address.department, 'Engineering')

    def test_foreign_key_relationship_to_profile(self):
        """Test ForeignKey relationship with UserProfile."""
        address = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='HOME',
            country='United Kingdom'
        )

        # Test forward relationship
        self.assertEqual(address.user_profile, self.profile)

        # Test reverse relationship
        self.assertIn(address, self.profile.addresses.all())

    def test_cascade_delete_profile(self):
        """Test cascading delete - deleting profile deletes addresses."""
        address = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='HOME',
            country='United Kingdom'
        )
        address_id = address.id

        # Delete profile
        self.profile.delete()

        # Address should be deleted
        self.assertFalse(UserProfileAddress.objects.filter(id=address_id).exists())

    def test_multiple_addresses_per_profile(self):
        """Test creating multiple addresses for same profile."""
        home_address = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='HOME',
            country='United Kingdom'
        )

        work_address = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='WORK',
            country='United Kingdom'
        )

        addresses = self.profile.addresses.all()
        self.assertEqual(addresses.count(), 2)
        self.assertIn(home_address, addresses)
        self.assertIn(work_address, addresses)

    def test_get_formatted_address(self):
        """Test get_formatted_address method."""
        address_data = {
            'building': '221B',
            'street': 'Baker Street',
            'city': 'London',
            'postal_code': 'NW1 6XE'
        }

        address = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='HOME',
            country='United Kingdom',
            address_data=address_data
        )

        formatted = address.get_formatted_address()
        self.assertIn('221B', formatted)
        self.assertIn('Baker Street', formatted)
        self.assertIn('London', formatted)
        self.assertIn('NW1 6XE', formatted)

    def test_postal_code_property(self):
        """Test postal_code property supports multiple field names."""
        # Test with 'postal_code' key
        address1 = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='HOME',
            country='United Kingdom',
            address_data={'postal_code': 'SW1A 2AA'}
        )
        self.assertEqual(address1.postal_code, 'SW1A 2AA')

        # Test with 'postcode' key
        user2 = User.objects.create_user(username='user2', password='pass123')
        profile2 = user2.userprofile
        address2 = UserProfileAddress.objects.create(
            user_profile=profile2,
            address_type='HOME',
            country='United Kingdom',
            address_data={'postcode': 'NW1 6XE'}
        )
        self.assertEqual(address2.postal_code, 'NW1 6XE')

    def test_city_property(self):
        """Test city property supports multiple field names."""
        # Test with 'city' key
        address1 = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='HOME',
            country='United Kingdom',
            address_data={'city': 'London'}
        )
        self.assertEqual(address1.city, 'London')

        # Test with 'town' key
        user2 = User.objects.create_user(username='user2', password='pass123')
        profile2 = user2.userprofile
        address2 = UserProfileAddress.objects.create(
            user_profile=profile2,
            address_type='HOME',
            country='United Kingdom',
            address_data={'town': 'Manchester'}
        )
        self.assertEqual(address2.city, 'Manchester')

    def test_state_province_property(self):
        """Test state_province property supports multiple field names."""
        # Test with 'state' key
        address1 = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='HOME',
            country='United States',
            address_data={'state': 'California'}
        )
        self.assertEqual(address1.state_province, 'California')

        # Test with 'county' key
        user2 = User.objects.create_user(username='user2', password='pass123')
        profile2 = user2.userprofile
        address2 = UserProfileAddress.objects.create(
            user_profile=profile2,
            address_type='HOME',
            country='United Kingdom',
            address_data={'county': 'Greater London'}
        )
        self.assertEqual(address2.state_province, 'Greater London')

    def test_str_method(self):
        """Test __str__ method format."""
        address = UserProfileAddress.objects.create(
            user_profile=self.profile,
            address_type='HOME',
            country='United Kingdom'
        )
        expected = "testuser - HOME address"
        self.assertEqual(str(address), expected)

    def test_db_table_name(self):
        """Test custom database table name."""
        self.assertEqual(
            UserProfileAddress._meta.db_table,
            '"acted"."user_profile_address"'
        )


class UserProfileContactNumberTestCase(TestCase):
    """Test cases for UserProfileContactNumber model."""

    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Profile is automatically created by signal
        self.profile = self.user.userprofile

    def test_contact_number_creation(self):
        """Test UserProfileContactNumber creation."""
        contact = UserProfileContactNumber.objects.create(
            user_profile=self.profile,
            contact_type='MOBILE',
            number='+44 7700 900000'
        )

        self.assertEqual(contact.user_profile, self.profile)
        self.assertEqual(contact.contact_type, 'MOBILE')
        self.assertEqual(contact.number, '+44 7700 900000')

    def test_foreign_key_relationship_to_profile(self):
        """Test ForeignKey relationship with UserProfile."""
        contact = UserProfileContactNumber.objects.create(
            user_profile=self.profile,
            contact_type='MOBILE',
            number='+44 7700 900000'
        )

        # Test forward relationship
        self.assertEqual(contact.user_profile, self.profile)

        # Test reverse relationship
        self.assertIn(contact, self.profile.contact_numbers.all())

    def test_cascade_delete_profile(self):
        """Test cascading delete - deleting profile deletes contact numbers."""
        contact = UserProfileContactNumber.objects.create(
            user_profile=self.profile,
            contact_type='MOBILE',
            number='+44 7700 900000'
        )
        contact_id = contact.id

        # Delete profile
        self.profile.delete()

        # Contact should be deleted
        self.assertFalse(UserProfileContactNumber.objects.filter(id=contact_id).exists())

    def test_multiple_contact_numbers_per_profile(self):
        """Test creating multiple contact numbers for same profile."""
        mobile = UserProfileContactNumber.objects.create(
            user_profile=self.profile,
            contact_type='MOBILE',
            number='+44 7700 900000'
        )

        home = UserProfileContactNumber.objects.create(
            user_profile=self.profile,
            contact_type='HOME',
            number='+44 20 7946 0958'
        )

        work = UserProfileContactNumber.objects.create(
            user_profile=self.profile,
            contact_type='WORK',
            number='+44 20 7946 0123'
        )

        contacts = self.profile.contact_numbers.all()
        self.assertEqual(contacts.count(), 3)
        self.assertIn(mobile, contacts)
        self.assertIn(home, contacts)
        self.assertIn(work, contacts)

    def test_contact_type_choices(self):
        """Test contact_type accepts valid choices."""
        # Test HOME
        home = UserProfileContactNumber.objects.create(
            user_profile=self.profile,
            contact_type='HOME',
            number='+44 20 7946 0958'
        )
        self.assertEqual(home.contact_type, 'HOME')

        # Test WORK
        work = UserProfileContactNumber.objects.create(
            user_profile=self.profile,
            contact_type='WORK',
            number='+44 20 7946 0123'
        )
        self.assertEqual(work.contact_type, 'WORK')

        # Test MOBILE
        mobile = UserProfileContactNumber.objects.create(
            user_profile=self.profile,
            contact_type='MOBILE',
            number='+44 7700 900000'
        )
        self.assertEqual(mobile.contact_type, 'MOBILE')

    def test_number_max_length(self):
        """Test number field respects 32 character maximum."""
        number = '1' * 32
        contact = UserProfileContactNumber.objects.create(
            user_profile=self.profile,
            contact_type='MOBILE',
            number=number
        )
        self.assertEqual(len(contact.number), 32)

    def test_str_method(self):
        """Test __str__ method format."""
        contact = UserProfileContactNumber.objects.create(
            user_profile=self.profile,
            contact_type='MOBILE',
            number='+44 7700 900000'
        )
        expected = "testuser - MOBILE phone"
        self.assertEqual(str(contact), expected)

    def test_db_table_name(self):
        """Test custom database table name."""
        self.assertEqual(
            UserProfileContactNumber._meta.db_table,
            '"acted"."user_profile_contact_number"'
        )


class UserProfileEmailTestCase(TestCase):
    """Test cases for UserProfileEmail model."""

    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Profile is automatically created by signal
        self.profile = self.user.userprofile

    def test_email_creation(self):
        """Test UserProfileEmail creation."""
        email = UserProfileEmail.objects.create(
            user_profile=self.profile,
            email_type='PERSONAL',
            email='personal@example.com'
        )

        self.assertEqual(email.user_profile, self.profile)
        self.assertEqual(email.email_type, 'PERSONAL')
        self.assertEqual(email.email, 'personal@example.com')

    def test_foreign_key_relationship_to_profile(self):
        """Test ForeignKey relationship with UserProfile."""
        email = UserProfileEmail.objects.create(
            user_profile=self.profile,
            email_type='PERSONAL',
            email='personal@example.com'
        )

        # Test forward relationship
        self.assertEqual(email.user_profile, self.profile)

        # Test reverse relationship
        self.assertIn(email, self.profile.emails.all())

    def test_cascade_delete_profile(self):
        """Test cascading delete - deleting profile deletes emails."""
        email = UserProfileEmail.objects.create(
            user_profile=self.profile,
            email_type='PERSONAL',
            email='personal@example.com'
        )
        email_id = email.id

        # Delete profile
        self.profile.delete()

        # Email should be deleted
        self.assertFalse(UserProfileEmail.objects.filter(id=email_id).exists())

    def test_multiple_emails_per_profile(self):
        """Test creating multiple emails for same profile."""
        personal = UserProfileEmail.objects.create(
            user_profile=self.profile,
            email_type='PERSONAL',
            email='personal@example.com'
        )

        work = UserProfileEmail.objects.create(
            user_profile=self.profile,
            email_type='WORK',
            email='work@company.com'
        )

        emails = self.profile.emails.all()
        self.assertEqual(emails.count(), 2)
        self.assertIn(personal, emails)
        self.assertIn(work, emails)

    def test_email_type_choices(self):
        """Test email_type accepts valid choices."""
        # Test PERSONAL
        personal = UserProfileEmail.objects.create(
            user_profile=self.profile,
            email_type='PERSONAL',
            email='personal@example.com'
        )
        self.assertEqual(personal.email_type, 'PERSONAL')

        # Test WORK
        work = UserProfileEmail.objects.create(
            user_profile=self.profile,
            email_type='WORK',
            email='work@company.com'
        )
        self.assertEqual(work.email_type, 'WORK')

    def test_email_field_validation(self):
        """Test email field is EmailField type."""
        email = UserProfileEmail.objects.create(
            user_profile=self.profile,
            email_type='PERSONAL',
            email='test@example.com'
        )
        self.assertIsInstance(email.email, str)
        self.assertIn('@', email.email)

    def test_email_max_length(self):
        """Test email field respects 128 character maximum."""
        # Create email at exactly 128 characters
        local_part = 'a' * 116  # 116 + '@' + 'example.com' = 128
        email_address = f"{local_part}@example.com"

        email = UserProfileEmail.objects.create(
            user_profile=self.profile,
            email_type='PERSONAL',
            email=email_address
        )
        self.assertEqual(len(email.email), 128)

    def test_str_method(self):
        """Test __str__ method format."""
        email = UserProfileEmail.objects.create(
            user_profile=self.profile,
            email_type='PERSONAL',
            email='personal@example.com'
        )
        expected = "testuser - PERSONAL email"
        self.assertEqual(str(email), expected)

    def test_db_table_name(self):
        """Test custom database table name."""
        self.assertEqual(
            UserProfileEmail._meta.db_table,
            '"acted"."user_profile_email"'
        )
