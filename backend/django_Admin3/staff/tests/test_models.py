from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError, connection


class StaffModelTest(TestCase):
    """Tests for staff.Staff model."""

    def test_create_staff_with_new_fields(self):
        """Staff should have job_title, name_format, show_job_title fields."""
        from staff.models import Staff
        user = User.objects.create_user(
            username='staff_new_1', password='testpass123',
            first_name='John', last_name='Smith',
        )
        staff = Staff.objects.create(
            user=user,
            job_title='Senior Tutor',
            name_format='first_name',
            show_job_title=True,
        )
        staff.refresh_from_db()
        self.assertEqual(staff.job_title, 'Senior Tutor')
        self.assertEqual(staff.name_format, 'first_name')
        self.assertTrue(staff.show_job_title)

    def test_default_field_values(self):
        """New fields should have sensible defaults."""
        from staff.models import Staff
        user = User.objects.create_user(username='staff_defaults', password='testpass123')
        staff = Staff.objects.create(user=user)
        self.assertEqual(staff.job_title, '')
        self.assertEqual(staff.name_format, 'full_name')
        self.assertFalse(staff.show_job_title)

    def test_str_with_full_name(self):
        from staff.models import Staff
        user = User.objects.create_user(
            username='staff_str', password='testpass123',
            first_name='Jane', last_name='Doe',
        )
        staff = Staff.objects.create(user=user)
        self.assertEqual(str(staff), 'Jane Doe')

    def test_str_username_fallback(self):
        from staff.models import Staff
        user = User.objects.create_user(username='jdoe_fb', password='testpass123')
        staff = Staff.objects.create(user=user)
        self.assertEqual(str(staff), 'jdoe_fb')

    def test_one_to_one_constraint(self):
        from staff.models import Staff
        user = User.objects.create_user(username='staff_uniq', password='testpass123')
        Staff.objects.create(user=user)
        with self.assertRaises(IntegrityError):
            Staff.objects.create(user=user)

    def test_db_table_name(self):
        from staff.models import Staff
        self.assertEqual(Staff._meta.db_table, '"acted"."staff"')

    def test_app_label(self):
        from staff.models import Staff
        self.assertEqual(Staff._meta.app_label, 'staff')

    def test_schema_placement(self):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = %s AND table_name = %s",
                ['acted', 'staff'],
            )
            self.assertIsNotNone(cursor.fetchone())
