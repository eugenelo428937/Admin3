"""
Test suite for students models.

This module tests the Student model to ensure proper field validations,
relationships, and model behavior.
"""

from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError
from students.models import Student


class StudentTestCase(TestCase):
    """Test cases for Student model."""

    def setUp(self):
        """Set up test fixtures - create test users."""
        self.user1 = User.objects.create_user(
            username='test_student1',
            email='student1@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        self.user2 = User.objects.create_user(
            username='test_student2',
            email='student2@example.com',
            password='testpass123',
            first_name='Jane',
            last_name='Smith'
        )

    def test_student_creation_with_required_fields(self):
        """Test Student creation with only required field (user)."""
        student = Student.objects.create(user=self.user1)

        self.assertEqual(student.user, self.user1)
        self.assertIsNotNone(student.student_ref)  # AutoField should be set
        self.assertEqual(student.student_type, 'regular')  # Default value
        self.assertEqual(student.apprentice_type, 'none')  # Default value
        self.assertIsNotNone(student.create_date)  # Auto-generated
        self.assertIsNotNone(student.modified_date)  # Auto-generated

    def test_student_creation_with_all_fields(self):
        """Test Student creation with all fields."""
        student = Student.objects.create(
            user=self.user1,
            student_type='S',
            apprentice_type='L4',
            remarks='Test student for L4 apprenticeship'
        )

        self.assertEqual(student.user, self.user1)
        self.assertEqual(student.student_type, 'S')
        self.assertEqual(student.apprentice_type, 'L4')
        self.assertEqual(student.remarks, 'Test student for L4 apprenticeship')

    def test_student_type_choices(self):
        """Test student_type field accepts valid choices."""
        valid_types = ['S', 'Q', 'I']

        for student_type in valid_types:
            student = Student.objects.create(
                user=User.objects.create_user(
                    username=f'test_{student_type}',
                    email=f'{student_type}@example.com',
                    password='testpass'
                ),
                student_type=student_type
            )
            self.assertEqual(student.student_type, student_type)

    def test_student_type_default_value(self):
        """Test student_type defaults to 'regular'."""
        student = Student.objects.create(user=self.user1)
        self.assertEqual(student.student_type, 'regular')

    def test_apprentice_type_choices(self):
        """Test apprentice_type field accepts valid choices."""
        valid_types = ['none', 'L4', 'L7']

        for apprentice_type in valid_types:
            student = Student.objects.create(
                user=User.objects.create_user(
                    username=f'test_apprentice_{apprentice_type}',
                    email=f'apprentice_{apprentice_type}@example.com',
                    password='testpass'
                ),
                apprentice_type=apprentice_type
            )
            self.assertEqual(student.apprentice_type, apprentice_type)

    def test_apprentice_type_default_value(self):
        """Test apprentice_type defaults to 'none'."""
        student = Student.objects.create(user=self.user1)
        self.assertEqual(student.apprentice_type, 'none')

    def test_user_one_to_one_relationship(self):
        """Test OneToOne relationship with User model."""
        student = Student.objects.create(user=self.user1)

        # Access student from user
        self.assertEqual(self.user1.student, student)

        # Access user from student
        self.assertEqual(student.user, self.user1)

    def test_user_one_to_one_uniqueness(self):
        """Test OneToOne constraint - one user can only have one student record."""
        # Create first student for user1
        Student.objects.create(user=self.user1)

        # Attempt to create second student for same user should fail
        with self.assertRaises(IntegrityError):
            Student.objects.create(user=self.user1)

    def test_user_cascade_delete(self):
        """Test cascading delete - deleting user deletes student."""
        student = Student.objects.create(user=self.user1)
        student_ref = student.student_ref

        # Delete the user
        self.user1.delete()

        # Student should also be deleted
        with self.assertRaises(Student.DoesNotExist):
            Student.objects.get(student_ref=student_ref)

    def test_auto_timestamp_fields(self):
        """Test create_date and modified_date are automatically set."""
        student = Student.objects.create(user=self.user1)

        self.assertIsNotNone(student.create_date)
        self.assertIsNotNone(student.modified_date)

        # Create and modified dates should be approximately equal initially
        time_diff = student.modified_date - student.create_date
        self.assertLess(time_diff.total_seconds(), 1)

    def test_modified_date_updates_on_save(self):
        """Test modified_date updates when student is saved."""
        import time

        student = Student.objects.create(user=self.user1)
        original_modified = student.modified_date

        # Wait a bit then update
        time.sleep(0.1)
        student.remarks = 'Updated remarks'
        student.save()

        # Modified date should have changed
        student.refresh_from_db()
        self.assertGreater(student.modified_date, original_modified)

    def test_remarks_field_optional(self):
        """Test remarks field is optional (blank and null)."""
        student = Student.objects.create(user=self.user1)
        self.assertIsNone(student.remarks)

        # Can save with blank remarks
        student.remarks = ''
        student.save()
        self.assertEqual(student.remarks, '')

    def test_str_method_formatting(self):
        """Test __str__ method returns user full name and student_ref."""
        student = Student.objects.create(user=self.user1)

        expected = f"John Doe ({student.student_ref})"
        self.assertEqual(str(student), expected)

    def test_str_method_with_no_full_name(self):
        """Test __str__ method when user has no first/last name."""
        user_no_name = User.objects.create_user(
            username='no_name',
            email='noname@example.com',
            password='testpass'
        )
        student = Student.objects.create(user=user_no_name)

        # get_full_name() returns empty string if no first/last name
        expected = f" ({student.student_ref})"
        self.assertEqual(str(student), expected)

    def test_verbose_name(self):
        """Test model verbose name is set correctly."""
        self.assertEqual(Student._meta.verbose_name, 'Student')

    def test_verbose_name_plural(self):
        """Test model verbose name plural is set correctly."""
        self.assertEqual(Student._meta.verbose_name_plural, 'Students')

    def test_db_table_name(self):
        """Test custom database table name."""
        self.assertEqual(Student._meta.db_table, '"acted"."students"')

    def test_student_ref_is_primary_key(self):
        """Test student_ref is the primary key."""
        student = Student.objects.create(user=self.user1)

        # Primary key should be student_ref
        self.assertEqual(student.pk, student.student_ref)

        # student_ref should be auto-generated
        self.assertIsNotNone(student.student_ref)
        self.assertIsInstance(student.student_ref, int)

    def test_student_type_invalid_choice_warning(self):
        """Test that invalid student_type choice is allowed at model level but invalid."""
        # Note: Django doesn't enforce choices at model level, only at form/admin level
        # This test verifies the model accepts any value but documents the choices
        student = Student.objects.create(
            user=self.user1,
            student_type='INVALID'  # Not in STUDENT_TYPES choices
        )

        # Model saves successfully (no validation)
        self.assertEqual(student.student_type, 'INVALID')

        # But full_clean() should raise ValidationError
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            student.full_clean()

    def test_apprentice_type_invalid_choice_warning(self):
        """Test that invalid apprentice_type choice is allowed at model level but invalid."""
        student = Student.objects.create(
            user=self.user1,
            apprentice_type='INVALID'  # Not in APPRENTICE_TYPES choices
        )

        # Model saves successfully (no validation)
        self.assertEqual(student.apprentice_type, 'INVALID')

        # But full_clean() should raise ValidationError
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            student.full_clean()

    def test_multiple_students_creation(self):
        """Test creating multiple student records."""
        student1 = Student.objects.create(user=self.user1, student_type='S')
        student2 = Student.objects.create(user=self.user2, student_type='Q')

        self.assertEqual(Student.objects.count(), 2)
        self.assertNotEqual(student1.student_ref, student2.student_ref)

    def test_student_type_display_value(self):
        """Test get_student_type_display() returns human-readable value."""
        student = Student.objects.create(user=self.user1, student_type='S')
        self.assertEqual(student.get_student_type_display(), 'STUDENTS')

        student.student_type = 'Q'
        student.save()
        self.assertEqual(student.get_student_type_display(), 'QUALIFIED')

        student.student_type = 'I'
        student.save()
        self.assertEqual(student.get_student_type_display(), 'INACTIVE')

    def test_apprentice_type_display_value(self):
        """Test get_apprentice_type_display() returns human-readable value."""
        student = Student.objects.create(user=self.user1, apprentice_type='none')
        self.assertEqual(student.get_apprentice_type_display(), 'None')

        student.apprentice_type = 'L4'
        student.save()
        self.assertEqual(student.get_apprentice_type_display(), 'LEVEL 4')

        student.apprentice_type = 'L7'
        student.save()
        self.assertEqual(student.get_apprentice_type_display(), 'LEVEL 7')
