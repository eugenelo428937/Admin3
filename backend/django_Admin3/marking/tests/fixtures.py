"""
Shared test fixtures for the marking app.

`MarkingChainTestCase` seeds the common fixture chain once per test class
via `setUpTestData`. Test classes inherit from this base to avoid
re-building the 10-step `ExamSession → ... → MarkingPaper` chain in every
`setUp`.

Class-level attributes created by `setUpTestData`:
    student_user, student
    exam_session, subject, ess
    cat_product, variation, ppv, store_product
    paper

Each test accesses these via `self.xxx`. Django automatically deep-copies
class-level fixture attributes per test, so in-memory mutations don't leak
between tests.
"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from catalog.models import (
    ExamSession,
    ExamSessionSubject,
    Subject,
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from marking.models import MarkingPaper
from store.models import Product as StoreProduct
from students.models import Student


class MarkingChainTestCase(APITestCase):
    """Base class that seeds the MarkingPaper chain once per test class.

    Subclass and override `setUpTestData` (calling `super().setUpTestData()`)
    to add class-specific fixtures like Marker, Staff, Submission, etc.
    """

    @classmethod
    def setUpTestData(cls):
        cls.student_user = User.objects.create_user(
            username='fixture_student',
            email='fixture_student@example.com',
            password='pw',
        )
        cls.student = Student.objects.create(user=cls.student_user)

        cls.exam_session = ExamSession.objects.create(
            session_code='FIXTURE2026',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        cls.subject = Subject.objects.create(
            code='FIX', description='Fixture subject', active=True,
        )
        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.exam_session, subject=cls.subject,
        )
        cls.cat_product = CatalogProduct.objects.create(
            code='FIX01', fullname='Fixture', shortname='Fixture',
        )
        cls.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Std',
        )
        cls.ppv = ProductProductVariation.objects.create(
            product=cls.cat_product, product_variation=cls.variation,
        )
        cls.store_product = StoreProduct.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv,
        )
        cls.paper = MarkingPaper.objects.create(
            store_product=cls.store_product,
            name='FixPaper',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40),
        )
