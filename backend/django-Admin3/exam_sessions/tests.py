# exam_sessions/tests.py
from django.test import TestCase
from django.utils import timezone
from datetime import datetime, timedelta
from .models import ExamSession
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth.models import User

class ExamSessionTests(TestCase):
    def setUp(self):
        # Create test data
        self.start_date = timezone.now()
        self.end_date = self.start_date + timedelta(hours=2)
        self.exam_session = ExamSession.objects.create(
            session_code='TEST001',
            start_date=self.start_date,
            end_date=self.end_date
        )

    def test_exam_session_creation(self):
        """Test that an exam session can be created"""
        self.assertEqual(self.exam_session.session_code, 'TEST001')
        self.assertEqual(self.exam_session.start_date, self.start_date)
        self.assertEqual(self.exam_session.end_date, self.end_date)

    def test_string_representation(self):
        """Test the string representation of ExamSession"""
        expected_string = f"TEST001 ({self.start_date} - {self.end_date})"
        self.assertEqual(str(self.exam_session), expected_string)

    def test_dates_validation(self):
        """Test that end_date is after start_date"""
        self.assertTrue(self.exam_session.end_date > self.exam_session.start_date)

    def test_auto_dates(self):
        """Test that create_date and modified_date are automatically set"""
        self.assertIsNotNone(self.exam_session.create_date)
        self.assertIsNotNone(self.exam_session.modified_date)

# test API endpoints
class ExamSessionAPITests(APITestCase):
    def setUp(self):
        # Create a user for authentication
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.client.force_authenticate(user=self.user)
        
        # Test data
        self.valid_payload = {
            'session_code': 'TEST001',
            'start_date': '2024-01-01T10:00:00Z',
            'end_date': '2024-01-01T12:00:00Z'
        }

    def test_create_exam_session(self):
        """Test creating an exam session through API"""
        url = reverse('exam-sessions-list')
        response = self.client.post(url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ExamSession.objects.count(), 1)
        self.assertEqual(ExamSession.objects.get().session_code, 'TEST001')

    def test_get_exam_sessions(self):
        """Test retrieving exam sessions list"""
        url = reverse('exam-sessions-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_exam_session_detail(self):
        """Test retrieving a specific exam session"""
        exam_session = ExamSession.objects.create(**self.valid_payload)
        url = reverse('exam-sessions-detail', kwargs={'pk': exam_session.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
