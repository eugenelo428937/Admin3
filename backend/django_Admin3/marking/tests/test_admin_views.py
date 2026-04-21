"""Tests for marking admin-panel API endpoints."""
from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatalogProduct,
    ProductVariation, ProductProductVariation,
)
from marking.models import (
    Marker, MarkingPaper, MarkingPaperFeedback,
    MarkingPaperGrading, MarkingPaperSubmission,
)
from staff.models import Staff
from store.models import Product as StoreProduct
from students.models import Student


class MarkingAdminViewsTestCase(APITestCase):
    """Permission + listing + filter smoke tests for admin endpoints."""

    def setUp(self):
        self.superuser = User.objects.create_superuser(
            username='root', email='root@example.com', password='pw',
        )
        self.staff_only = User.objects.create_user(
            username='staff', email='staff@example.com', password='pw',
            is_staff=True,
        )

        self.student_user = User.objects.create_user(
            username='stu', email='s@example.com', password='pw',
        )
        self.student = Student.objects.create(user=self.student_user)

        self.marker_user = User.objects.create_user(
            username='mkr', email='m@example.com', password='pw',
        )
        self.marker = Marker.objects.create(
            user=self.marker_user, initial='MKR',
        )

        self.staff_user = User.objects.create_user(
            username='stf', email='stf@example.com', password='pw',
            is_staff=True,
        )
        self.staff = Staff.objects.create(user=self.staff_user)

        self.exam_session = ExamSession.objects.create(
            session_code='JAN2026',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        self.subject = Subject.objects.create(
            code='CP1', description='Actuarial Practice', active=True,
        )
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject,
        )
        self.cat_product = CatalogProduct.objects.create(
            code='PA01', fullname='A', shortname='A',
        )
        self.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Std',
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.cat_product, product_variation=self.variation,
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
        )
        self.paper = MarkingPaper.objects.create(
            store_product=self.store_product, name='AdminP',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40),
        )
        self.submission = MarkingPaperSubmission.objects.create(
            student=self.student, marking_paper=self.paper,
            submission_date=timezone.now(),
        )
        self.grading = MarkingPaperGrading.objects.create(
            submission=self.submission, marker=self.marker,
            allocate_date=timezone.now(), allocate_by=self.staff,
            score=75,
        )
        self.feedback = MarkingPaperFeedback.objects.create(
            grading=self.grading, grade='G',
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
        self.assertEqual(first['marking_paper_name'], 'AdminP')

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
