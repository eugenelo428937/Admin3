from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from ..models import Subject
from ..serializers import SubjectSerializer

User = get_user_model()

class SubjectModelTests(TestCase):
    """Test the Subject model."""
    
    def setUp(self):
        self.subject_data = {
            'code': 'TEST101',
            'description': 'Basic mathematics concepts',
            'active': True
        }
        self.subject = Subject.objects.create(**self.subject_data)
        
    def test_subject_creation(self):
        """Test that a subject can be created."""
        self.assertEqual(self.subject.code, 'TEST101')  # Fixed: match setUp data
        self.assertEqual(self.subject.description, 'Basic mathematics concepts')
        self.assertTrue(self.subject.active)
        
    def test_str_representation(self):
        """Test the string representation of the subject."""
        expected_str = f"{self.subject.code}: {self.subject.description}"
        self.assertEqual(str(self.subject), expected_str)
    
    def test_ordering(self):
        """Test that subjects are ordered by code."""
        Subject.objects.create(
            code='PHYS101',
            description='Physics fundamentals'
        )
        subjects = Subject.objects.all()
        # PHYS101 < TEST101 alphabetically
        self.assertEqual(subjects[0].code, 'PHYS101')
        self.assertEqual(subjects[1].code, 'TEST101')


class SubjectSerializerTests(TestCase):
    """Test the SubjectSerializer."""
    
    def setUp(self):
        self.subject_data = {
            'code': 'CS101',
            'description': 'Programming fundamentals',
            'active': True
        }
        self.subject = Subject.objects.create(**self.subject_data)
        self.serializer = SubjectSerializer(instance=self.subject)
        
    def test_serializer_contains_expected_fields(self):
        """Test that the serializer contains the expected fields."""
        data = self.serializer.data
        # Catalog SubjectSerializer fields: id, code, description, name
        expected_fields = ['id', 'code', 'description', 'name']
        self.assertEqual(set(data.keys()), set(expected_fields))
    
    def test_code_field_content(self):
        """Test the content of the code field."""
        data = self.serializer.data
        self.assertEqual(data['code'], self.subject_data['code'])
    
    def test_serializer_validation(self):
        """Test serializer validation."""
        # Test with invalid data (missing required field)
        invalid_data = {
            'description': 'Just a description'
        }
        serializer = SubjectSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('code', serializer.errors)
        
        # Test with valid data
        valid_data = {
            'code': 'HIST101',
            'description': 'Introduction to History'
        }
        serializer = SubjectSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid())


class SubjectAPITests(APITestCase):
    """Test the Subject API endpoints."""

    def setUp(self):
        """Set up test data and authenticate."""
        self.client = APIClient()

        # Create a superuser for write operations (catalog requires IsSuperUser)
        self.user = User.objects.create_superuser(
            username='testuser',
            email='test@example.com',
            password='testpassword123'
        )

        # Authenticate the client
        self.client.force_authenticate(user=self.user)
        
        # Create some subjects with unique codes
        self.subject1 = Subject.objects.create(
            code='API101',  # Changed from MATH101
            description='Basic mathematics concepts'
        )
        
        self.subject2 = Subject.objects.create(
            code='API102',  # Changed from ENG101
            description='Learn to write effectively'
        )
        
        # URL for subjects list
        self.subjects_url = reverse('subject-list')
    
    def test_get_all_subjects(self):
        """Test retrieving all subjects."""
        response = self.client.get(self.subjects_url)
        subjects = Subject.objects.all()
        serializer = SubjectSerializer(subjects, many=True)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(len(response.data), 2)
    
    def test_create_subject(self):
        """Test creating a new subject."""
        data = {
            'code': 'CS101',
            'description': 'Programming basics',
            'active': True
        }
        response = self.client.post(self.subjects_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Subject.objects.count(), 3)
        self.assertEqual(response.data['code'], data['code'])
    
    def test_get_single_subject(self):
        """Test retrieving a specific subject."""
        url = reverse('subject-detail', args=[self.subject1.id])
        response = self.client.get(url)
        serializer = SubjectSerializer(self.subject1)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, serializer.data)
    
    def test_update_subject(self):
        """Test updating a subject."""
        url = reverse('subject-detail', args=[self.subject1.id])
        updated_data = {
            'code': 'MATH101',
            'description': 'Complex mathematics concepts',
        }
        response = self.client.put(url, updated_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.subject1.refresh_from_db()
        self.assertEqual(self.subject1.description, updated_data['description'])
        # Note: 'active' field not in serializer, so not tested via API
    
    def test_partial_update_subject(self):
        """Test partially updating a subject."""
        url = reverse('subject-detail', args=[self.subject1.id])
        data = {'description': 'Updated description'}  # Update description

        response = self.client.patch(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.subject1.refresh_from_db()
        self.assertEqual(self.subject1.description, 'Updated description')
    
    def test_delete_subject(self):
        """Test deleting a subject."""
        url = reverse('subject-detail', args=[self.subject1.id])
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Subject.objects.count(), 1)
    
    def test_unique_code_constraint(self):
        """Test that subject code must be unique."""
        data = {
            'code': 'API101',  # This code already exists
            'description': 'Another math course'
        }
        response = self.client.post(self.subjects_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)

    def test_unauthorized_read_access(self):
        """Test that unauthorized users CAN read (AllowAny for reads)."""
        # Create a new unauthenticated client
        client = APIClient()
        response = client.get(self.subjects_url)

        # Catalog API allows unauthenticated reads
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthorized_write_access(self):
        """Test that unauthorized users cannot write (IsSuperUser required)."""
        # Create a new unauthenticated client
        client = APIClient()
        data = {'code': 'UNAUTH01', 'description': 'Unauthorized test'}
        response = client.post(self.subjects_url, data, format='json')

        # Catalog API requires IsSuperUser for writes
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
