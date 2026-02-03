"""
Additional tests to improve coverage for students app.

Covers:
- students/admin.py: lines 17-20 (get_student_ref method)
- students/serializers.py: lines 14-21, 24-27, 45-49 (create, update methods)
- students/utils.py: lines 3-19 (add_student function)
- students/views.py: line 23 (student_type query param filter)

Uses SimpleTestCase with mocking to avoid database dependency issues.
"""

from unittest.mock import patch, MagicMock, PropertyMock
from django.test import SimpleTestCase, TestCase
from students.admin import CustomUserAdmin
from students.serializers import UserSerializer, StudentSerializer
from students.utils import add_student


class TestCustomUserAdminGetStudentRef(SimpleTestCase):
    """Test CustomUserAdmin.get_student_ref method (admin.py lines 17-20)."""

    def test_get_student_ref_returns_student_ref_when_student_exists(self):
        """get_student_ref returns student_ref when user has a student profile."""
        admin_instance = CustomUserAdmin(MagicMock(), MagicMock())
        mock_user = MagicMock()
        mock_user.student.student_ref = 12345
        result = admin_instance.get_student_ref(mock_user)
        self.assertEqual(result, 12345)

    def test_get_student_ref_returns_none_when_no_student(self):
        """get_student_ref returns None when user has no student profile."""
        from students.models import Student
        admin_instance = CustomUserAdmin(MagicMock(), MagicMock())
        mock_user = MagicMock()
        mock_user.student = PropertyMock(side_effect=Student.DoesNotExist)
        # Simulate DoesNotExist being raised on attribute access
        type(mock_user).student = PropertyMock(side_effect=Student.DoesNotExist)
        result = admin_instance.get_student_ref(mock_user)
        self.assertIsNone(result)

    def test_get_student_ref_short_description(self):
        """get_student_ref has correct short_description attribute."""
        admin_instance = CustomUserAdmin(MagicMock(), MagicMock())
        self.assertEqual(
            admin_instance.get_student_ref.short_description,
            'Student Ref'
        )

    def test_admin_list_display(self):
        """CustomUserAdmin has correct list_display configuration."""
        expected = ('username', 'email', 'first_name', 'last_name', 'get_student_ref')
        self.assertEqual(CustomUserAdmin.list_display, expected)

    def test_admin_inlines(self):
        """CustomUserAdmin has StudentInline configured."""
        from students.admin import StudentInline
        self.assertIn(StudentInline, CustomUserAdmin.inlines)


class TestUserSerializerCreate(SimpleTestCase):
    """Test UserSerializer.create method (serializers.py lines 14-21)."""

    @patch('students.serializers.User.objects')
    def test_create_user_with_all_fields(self, mock_user_objects):
        """create() calls User.objects.create_user with all provided fields."""
        mock_user = MagicMock()
        mock_user_objects.create_user.return_value = mock_user

        serializer = UserSerializer()
        validated_data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'securepass123',
            'first_name': 'New',
            'last_name': 'User',
        }
        result = serializer.create(validated_data)

        mock_user_objects.create_user.assert_called_once_with(
            username='newuser',
            email='new@example.com',
            password='securepass123',
            first_name='New',
            last_name='User',
        )
        self.assertEqual(result, mock_user)

    @patch('students.serializers.User.objects')
    def test_create_user_with_minimal_fields(self, mock_user_objects):
        """create() uses defaults for optional fields (email, first_name, last_name)."""
        mock_user = MagicMock()
        mock_user_objects.create_user.return_value = mock_user

        serializer = UserSerializer()
        validated_data = {
            'username': 'minimaluser',
            'password': 'pass123',
        }
        result = serializer.create(validated_data)

        mock_user_objects.create_user.assert_called_once_with(
            username='minimaluser',
            email='',
            password='pass123',
            first_name='',
            last_name='',
        )
        self.assertEqual(result, mock_user)


class TestUserSerializerUpdate(SimpleTestCase):
    """Test UserSerializer.update method (serializers.py lines 24-27)."""

    def test_update_with_password(self):
        """update() calls set_password when password is in validated_data."""
        mock_instance = MagicMock()
        mock_instance.email = 'old@example.com'
        mock_instance.first_name = 'Old'

        serializer = UserSerializer()
        validated_data = {
            'password': 'newpassword123',
            'email': 'updated@example.com',
        }

        # We need to patch super().update to return the instance
        with patch.object(
            UserSerializer.__bases__[0], 'update', return_value=mock_instance
        ) as mock_super_update:
            result = serializer.update(mock_instance, validated_data)

        mock_instance.set_password.assert_called_once_with('newpassword123')
        # password should have been popped from validated_data
        self.assertNotIn('password', validated_data)
        mock_super_update.assert_called_once_with(
            mock_instance, {'email': 'updated@example.com'}
        )

    def test_update_without_password(self):
        """update() does not call set_password when password is not provided."""
        mock_instance = MagicMock()

        serializer = UserSerializer()
        validated_data = {
            'email': 'updated@example.com',
        }

        with patch.object(
            UserSerializer.__bases__[0], 'update', return_value=mock_instance
        ) as mock_super_update:
            result = serializer.update(mock_instance, validated_data)

        mock_instance.set_password.assert_not_called()
        mock_super_update.assert_called_once_with(
            mock_instance, {'email': 'updated@example.com'}
        )


class TestStudentSerializerUpdate(SimpleTestCase):
    """Test StudentSerializer.update method (serializers.py lines 45-49)."""

    def test_update_all_student_fields(self):
        """update() sets student_type, apprentice_type, and remarks."""
        mock_instance = MagicMock()
        mock_instance.student_type = 'S'
        mock_instance.apprentice_type = 'none'
        mock_instance.remarks = 'old remarks'

        serializer = StudentSerializer()
        validated_data = {
            'student_type': 'Q',
            'apprentice_type': 'L4',
            'remarks': 'Updated remarks',
        }

        result = serializer.update(mock_instance, validated_data)

        self.assertEqual(mock_instance.student_type, 'Q')
        self.assertEqual(mock_instance.apprentice_type, 'L4')
        self.assertEqual(mock_instance.remarks, 'Updated remarks')
        mock_instance.save.assert_called_once()
        self.assertEqual(result, mock_instance)

    def test_update_partial_student_fields(self):
        """update() preserves existing values for fields not in validated_data."""
        mock_instance = MagicMock()
        mock_instance.student_type = 'S'
        mock_instance.apprentice_type = 'L7'
        mock_instance.remarks = 'existing remarks'

        serializer = StudentSerializer()
        validated_data = {
            'remarks': 'new remarks only',
        }

        result = serializer.update(mock_instance, validated_data)

        # student_type and apprentice_type should use existing instance values
        self.assertEqual(mock_instance.student_type, 'S')
        self.assertEqual(mock_instance.apprentice_type, 'L7')
        self.assertEqual(mock_instance.remarks, 'new remarks only')
        mock_instance.save.assert_called_once()

    def test_update_with_empty_validated_data(self):
        """update() preserves all existing values when no fields provided."""
        mock_instance = MagicMock()
        mock_instance.student_type = 'I'
        mock_instance.apprentice_type = 'none'
        mock_instance.remarks = 'keep this'

        serializer = StudentSerializer()
        validated_data = {}

        result = serializer.update(mock_instance, validated_data)

        self.assertEqual(mock_instance.student_type, 'I')
        self.assertEqual(mock_instance.apprentice_type, 'none')
        self.assertEqual(mock_instance.remarks, 'keep this')
        mock_instance.save.assert_called_once()


class TestAddStudentUtil(SimpleTestCase):
    """Test add_student utility function (utils.py lines 3-19)."""

    @patch('students.utils.Student.objects.create')
    @patch('students.utils.User.objects.create_user')
    @patch('students.utils.transaction')
    def test_add_student_success(self, mock_transaction, mock_create_user, mock_create_student):
        """add_student creates user and student within a transaction."""
        mock_user = MagicMock()
        mock_create_user.return_value = mock_user
        mock_student = MagicMock()
        mock_create_student.return_value = mock_student

        result = add_student(
            username='testuser',
            password='pass123',
            email='test@example.com',
            student_type='S',
        )

        mock_create_user.assert_called_once_with(
            username='testuser',
            password='pass123',
            email='test@example.com',
        )
        mock_create_student.assert_called_once_with(
            user=mock_user,
            student_type='S',
        )
        self.assertEqual(result, mock_student)

    @patch('students.utils.Student.objects.create')
    @patch('students.utils.User.objects.create_user')
    @patch('students.utils.transaction')
    def test_add_student_success_minimal(self, mock_transaction, mock_create_user, mock_create_student):
        """add_student works with only required arguments."""
        mock_user = MagicMock()
        mock_create_user.return_value = mock_user
        mock_student = MagicMock()
        mock_create_student.return_value = mock_student

        result = add_student(
            username='minimal',
            password='pass',
            email='min@example.com',
        )

        mock_create_user.assert_called_once_with(
            username='minimal',
            password='pass',
            email='min@example.com',
        )
        mock_create_student.assert_called_once_with(user=mock_user)
        self.assertEqual(result, mock_student)

    @patch('students.utils.User.objects.create_user')
    def test_add_student_returns_none_on_user_creation_error(self, mock_create_user):
        """add_student returns None when user creation fails."""
        mock_create_user.side_effect = Exception("Duplicate username")

        result = add_student(
            username='duplicate',
            password='pass',
            email='dup@example.com',
        )

        self.assertIsNone(result)

    @patch('students.utils.Student.objects.create')
    @patch('students.utils.User.objects.create_user')
    def test_add_student_returns_none_on_student_creation_error(
        self, mock_create_user, mock_create_student
    ):
        """add_student returns None when student creation fails."""
        mock_user = MagicMock()
        mock_create_user.return_value = mock_user
        mock_create_student.side_effect = Exception("DB error")

        result = add_student(
            username='testuser2',
            password='pass',
            email='test2@example.com',
            student_type='S',
        )

        self.assertIsNone(result)

    @patch('students.utils.Student.objects.create')
    @patch('students.utils.User.objects.create_user')
    @patch('students.utils.transaction')
    def test_add_student_with_extra_student_data(self, mock_transaction, mock_create_user, mock_create_student):
        """add_student passes additional kwargs to Student.objects.create."""
        mock_user = MagicMock()
        mock_create_user.return_value = mock_user
        mock_student = MagicMock()
        mock_create_student.return_value = mock_student

        result = add_student(
            username='full',
            password='pass',
            email='full@example.com',
            student_type='Q',
            apprentice_type='L7',
            remarks='Test remarks',
        )

        mock_create_student.assert_called_once_with(
            user=mock_user,
            student_type='Q',
            apprentice_type='L7',
            remarks='Test remarks',
        )
        self.assertEqual(result, mock_student)


class TestStudentViewSetQueryFilter(SimpleTestCase):
    """Test StudentViewSet.get_queryset filter (views.py line 23)."""

    def test_get_queryset_with_student_type_filter(self):
        """get_queryset filters by student_type when query param is present."""
        from students.views import StudentViewSet

        viewset = StudentViewSet()
        mock_request = MagicMock()
        mock_request.query_params = {'student_type': 'S'}
        viewset.request = mock_request

        mock_queryset = MagicMock()
        mock_filtered_queryset = MagicMock()
        mock_queryset.filter.return_value = mock_filtered_queryset

        with patch('students.views.Student.objects') as mock_objects:
            mock_objects.all.return_value = mock_queryset
            result = viewset.get_queryset()

        mock_queryset.filter.assert_called_once_with(student_type='S')
        self.assertEqual(result, mock_filtered_queryset)

    def test_get_queryset_without_student_type_filter(self):
        """get_queryset returns all students when no student_type param."""
        from students.views import StudentViewSet

        viewset = StudentViewSet()
        mock_request = MagicMock()
        mock_request.query_params = {}
        viewset.request = mock_request

        mock_queryset = MagicMock()

        with patch('students.views.Student.objects') as mock_objects:
            mock_objects.all.return_value = mock_queryset
            result = viewset.get_queryset()

        mock_queryset.filter.assert_not_called()
        self.assertEqual(result, mock_queryset)


class TestUserSerializerFields(SimpleTestCase):
    """Test UserSerializer field configuration."""

    def test_password_field_is_write_only(self):
        """Password field should be write-only."""
        serializer = UserSerializer()
        password_field = serializer.fields['password']
        self.assertTrue(password_field.write_only)

    def test_serializer_fields(self):
        """UserSerializer has the expected fields."""
        serializer = UserSerializer()
        expected_fields = {'id', 'username', 'email', 'password', 'first_name', 'last_name'}
        self.assertEqual(set(serializer.fields.keys()), expected_fields)


class TestStudentSerializerFields(SimpleTestCase):
    """Test StudentSerializer field configuration."""

    def test_serializer_fields(self):
        """StudentSerializer has the expected fields."""
        serializer = StudentSerializer()
        expected_fields = {
            'student_ref', 'user', 'student_type', 'apprentice_type',
            'create_date', 'modified_date', 'remarks'
        }
        self.assertEqual(set(serializer.fields.keys()), expected_fields)

    def test_read_only_fields(self):
        """student_ref, create_date, modified_date are read-only."""
        serializer = StudentSerializer()
        self.assertTrue(serializer.fields['student_ref'].read_only)
        self.assertTrue(serializer.fields['create_date'].read_only)
        self.assertTrue(serializer.fields['modified_date'].read_only)

    def test_user_field_is_read_only(self):
        """User field is read-only (managed by users app)."""
        serializer = StudentSerializer()
        self.assertTrue(serializer.fields['user'].read_only)

    def test_optional_fields(self):
        """student_type, apprentice_type, remarks are not required."""
        serializer = StudentSerializer()
        self.assertFalse(serializer.fields['student_type'].required)
        self.assertFalse(serializer.fields['apprentice_type'].required)
        self.assertFalse(serializer.fields['remarks'].required)


class TestStudentInlineAdmin(SimpleTestCase):
    """Test StudentInline admin configuration."""

    def test_student_inline_model(self):
        """StudentInline uses Student model."""
        from students.admin import StudentInline
        from students.models import Student
        self.assertEqual(StudentInline.model, Student)

    def test_student_inline_cannot_delete(self):
        """StudentInline has can_delete set to False."""
        from students.admin import StudentInline
        self.assertFalse(StudentInline.can_delete)

    def test_student_inline_verbose_name(self):
        """StudentInline has correct verbose_name_plural."""
        from students.admin import StudentInline
        self.assertEqual(StudentInline.verbose_name_plural, 'Student Profile')


class TestAddStudentWithDB(TestCase):
    """Test add_student with actual DB to cover transaction.atomic path (utils.py lines 9-16).

    SimpleTestCase restricts DB access, preventing transaction.atomic() from
    executing. This TestCase exercises the real transaction path.
    """

    def test_add_student_creates_user_and_student(self):
        """add_student creates both User and Student in a transaction."""
        from students.models import Student
        from django.contrib.auth.models import User

        student = add_student(
            username='db_test_user',
            password='securepass123',
            email='dbtest@example.com',
            student_type='S',
        )
        self.assertIsNotNone(student)
        self.assertEqual(student.student_type, 'S')
        self.assertTrue(User.objects.filter(username='db_test_user').exists())
        self.assertTrue(Student.objects.filter(user__username='db_test_user').exists())

    def test_add_student_with_extra_fields(self):
        """add_student passes extra kwargs to Student.objects.create."""
        student = add_student(
            username='db_extra_user',
            password='pass123',
            email='extra@example.com',
            student_type='Q',
            remarks='Test remarks',
        )
        self.assertIsNotNone(student)
        self.assertEqual(student.student_type, 'Q')
        self.assertEqual(student.remarks, 'Test remarks')

    def test_add_student_duplicate_username_returns_none(self):
        """add_student returns None when username already exists."""
        from django.contrib.auth.models import User
        User.objects.create_user('dup_user', 'dup@example.com', 'pass')
        result = add_student(
            username='dup_user',
            password='pass123',
            email='dup2@example.com',
        )
        self.assertIsNone(result)
