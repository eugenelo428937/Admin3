"""Tests for marking admin-panel API endpoints."""
from django.contrib.auth.models import User
from django.utils import timezone

from marking.models import (
    Marker, MarkingPaperFeedback,
    MarkingPaperGrading, MarkingPaperSubmission,
)
from marking.tests.fixtures import MarkingChainTestCase
from staff.models import Staff
from students.models import Student


class MarkingAdminViewsTestCase(MarkingChainTestCase):
    """Permission + listing + filter smoke tests for admin endpoints."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        cls.superuser = User.objects.create_superuser(
            username='fixture_root',
            email='fixture_root@example.com',
            password='pw',
        )
        cls.staff_only = User.objects.create_user(
            username='fixture_staff_only',
            email='fixture_staff_only@example.com',
            password='pw',
            is_staff=True,
        )

        cls.marker_user = User.objects.create_user(
            username='fixture_marker_admin',
            email='fixture_marker_admin@example.com',
            password='pw',
        )
        cls.marker = Marker.objects.create(
            user=cls.marker_user, initial='MKR',
        )

        cls.staff_user = User.objects.create_user(
            username='fixture_staff_admin',
            email='fixture_staff_admin@example.com',
            password='pw',
            is_staff=True,
        )
        cls.staff = Staff.objects.create(user=cls.staff_user)

        cls.submission = MarkingPaperSubmission.objects.create(
            student=cls.student,
            marking_paper=cls.paper,
            submission_date=timezone.now(),
        )
        cls.grading = MarkingPaperGrading.objects.create(
            submission=cls.submission,
            marker=cls.marker,
            allocate_date=timezone.now(),
            allocate_by=cls.staff,
            score=75,
        )
        cls.feedback = MarkingPaperFeedback.objects.create(
            grading=cls.grading,
            grade='G',
            submission_date=timezone.now(),
        )

    # Permissions

    def test_markers_list_requires_superuser(self):
        url = '/api/markings/admin-markers/'
        resp = self.client.get(url)
        self.assertIn(resp.status_code, (401, 403))
        self.client.force_authenticate(user=self.staff_only)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 403)
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

    # Listing

    def test_submissions_list_returns_seeded_row(self):
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get('/api/markings/admin-submissions/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        results = data.get('results', data)
        self.assertGreaterEqual(len(results), 1)
        first = results[0]
        self.assertEqual(first['student'], self.student.pk)
        self.assertEqual(first['marking_paper_name'], 'FixPaper')

    def test_gradings_list_returns_seeded_row(self):
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get('/api/markings/admin-gradings/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        results = data.get('results', data)
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]['marker_initial'], 'MKR')
        self.assertEqual(results[0]['score'], 75)

    def test_feedback_list_returns_seeded_row(self):
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get('/api/markings/admin-feedback/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        results = data.get('results', data)
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]['grade'], 'G')
        self.assertEqual(results[0]['grade_display'], 'Good')

    def test_markers_retrieve_detail(self):
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get(f'/api/markings/admin-markers/{self.marker.id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['initial'], 'MKR')

    # Filtering (smoke)

    def test_gradings_filter_by_marker(self):
        # Seed a second marker+submission+grading — filter must exclude it.
        other_marker_user = User.objects.create_user(
            username='mkr2', email='m2@example.com', password='pw',
        )
        other_marker = Marker.objects.create(
            user=other_marker_user, initial='OTH',
        )
        other_student_user = User.objects.create_user(
            username='stu3', email='s3@example.com', password='pw',
        )
        other_student = Student.objects.create(user=other_student_user)
        other_submission = MarkingPaperSubmission.objects.create(
            student=other_student, marking_paper=self.paper,
            submission_date=timezone.now(),
        )
        MarkingPaperGrading.objects.create(
            submission=other_submission, marker=other_marker,
            allocate_date=timezone.now(), allocate_by=self.staff,
        )

        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get(
            f'/api/markings/admin-gradings/?marker={self.marker.id}'
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        results = data.get('results', data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['marker'], self.marker.id)

    def test_submissions_filter_by_student(self):
        # Seed a second student with a submission — filter must exclude it.
        other_user = User.objects.create_user(
            username='stu2', email='s2@example.com', password='pw',
        )
        other_student = Student.objects.create(user=other_user)
        MarkingPaperSubmission.objects.create(
            student=other_student, marking_paper=self.paper,
            submission_date=timezone.now(),
        )

        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get(
            f'/api/markings/admin-submissions/?student={self.student.pk}'
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        results = data.get('results', data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['student'], self.student.pk)

    def test_feedback_filter_by_grade(self):
        # Seed a second feedback with a different grade — filter must exclude it.
        other_student_user = User.objects.create_user(
            username='stu4', email='s4@example.com', password='pw',
        )
        other_student = Student.objects.create(user=other_student_user)
        other_submission = MarkingPaperSubmission.objects.create(
            student=other_student, marking_paper=self.paper,
            submission_date=timezone.now(),
        )
        other_grading = MarkingPaperGrading.objects.create(
            submission=other_submission, marker=self.marker,
            allocate_date=timezone.now(), allocate_by=self.staff,
        )
        MarkingPaperFeedback.objects.create(
            grading=other_grading, grade='P',
            submission_date=timezone.now(),
        )

        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get('/api/markings/admin-feedback/?grade=G')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        results = data.get('results', data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['grade'], 'G')
