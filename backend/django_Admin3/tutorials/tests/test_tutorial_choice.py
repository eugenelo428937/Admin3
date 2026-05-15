"""Tests for TutorialChoice model.

The student's preference (1st/2nd/3rd) for a tutorial event, captured per
order_item. Online Classroom events are excluded application-side via
clean(). Subject mismatches between the chosen event and the order_item's
purchasable subject are also rejected.
"""
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from datetime import date, timedelta

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProduct, ProductVariation, ProductProductVariation,
)
from store.models import TutorialProduct
from students.models import Student
from orders.models import Order, OrderItem
from tutorials.models import TutorialChoice, TutorialEvents


def _seed_tutorial_event(subject_code='CB1', sitting_code='24',
                         variation_type='Tutorial', variation_code='LO_6H',
                         format='LO_6H'):
    """Build a fully-wired TutorialEvent with linked store.TutorialProduct."""
    es = ExamSession.objects.create(
        session_code=sitting_code,
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=60),
    )
    subj, _ = Subject.objects.get_or_create(
        code=subject_code, defaults={'description': f'{subject_code} subject', 'active': True},
    )
    ess = ExamSessionSubject.objects.create(exam_session=es, subject=subj)
    cat_prod, _ = CatProduct.objects.get_or_create(
        code='Live', defaults={'fullname': 'Tutorial - Live Online', 'shortname': 'Live'},
    )
    pv, _ = ProductVariation.objects.get_or_create(
        code=variation_code,
        defaults={'name': variation_code, 'description': '', 'description_short': variation_code,
                  'variation_type': variation_type},
    )
    ppv, _ = ProductProductVariation.objects.get_or_create(
        product=cat_prod, product_variation=pv,
    )
    sp = TutorialProduct(
        exam_session_subject=ess, product_product_variation=ppv,
        product_code=f'{subject_code}/Live/{variation_code}/{sitting_code}',
        format=format,
    )
    sp.save()
    event = TutorialEvents.objects.create(
        code=f'{subject_code}-01-{sitting_code}A',
        store_product=sp,
        start_date=date(2024, 1, 1),
        end_date=date(2024, 2, 1),
    )
    return event, sp, subj


def _make_student(username='alice'):
    user = User.objects.create_user(username=username, email=f'{username}@t.com')
    return Student.objects.create(user=user)


def _make_order_item(student: Student, store_product: TutorialProduct) -> OrderItem:
    order = Order.objects.create(user=student.user)
    return OrderItem.objects.create(order=order, purchasable=store_product.purchasable_ptr)


class TutorialChoiceTests(TestCase):
    def setUp(self):
        self.student = _make_student()
        self.event_a, self.sp, self.subj = _seed_tutorial_event()
        # Second event in the same product so unique_together(order_item, event) tests work.
        self.event_b = TutorialEvents.objects.create(
            code='CB1-02-24A', store_product=self.sp,
            start_date=date(2024, 1, 8), end_date=date(2024, 2, 8),
        )
        self.order_item = _make_order_item(self.student, self.sp)

    def test_create_with_valid_rank(self):
        c = TutorialChoice.objects.create(
            order_item=self.order_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1,
        )
        self.assertEqual(c.choice_rank, 1)

    def test_rejects_rank_outside_1_to_3(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialChoice.objects.create(
                    order_item=self.order_item, student=self.student,
                    tutorial_event=self.event_a, choice_rank=4,
                )

    def test_unique_rank_per_order_item(self):
        TutorialChoice.objects.create(
            order_item=self.order_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialChoice.objects.create(
                    order_item=self.order_item, student=self.student,
                    tutorial_event=self.event_b, choice_rank=1,
                )

    def test_unique_event_per_order_item(self):
        TutorialChoice.objects.create(
            order_item=self.order_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialChoice.objects.create(
                    order_item=self.order_item, student=self.student,
                    tutorial_event=self.event_a, choice_rank=2,
                )

    def test_clean_rejects_online_classroom_event(self):
        # Build an OC variation event in the same subject.
        oc_pv, _ = ProductVariation.objects.get_or_create(
            code='OC',
            defaults={'name': 'OC', 'description': '', 'description_short': 'OC',
                      'variation_type': 'Online Classroom Recording'},
        )
        oc_cat, _ = CatProduct.objects.get_or_create(
            code='OC', defaults={'fullname': 'Online Classroom', 'shortname': 'OC'},
        )
        oc_ppv, _ = ProductProductVariation.objects.get_or_create(
            product=oc_cat, product_variation=oc_pv,
        )
        oc_sp = TutorialProduct(
            exam_session_subject=self.sp.exam_session_subject,
            product_product_variation=oc_ppv,
            product_code='CB1/OC/OC/24',
            format='OC',
        )
        oc_sp.save()
        oc_event = TutorialEvents.objects.create(
            code='CB1-OC-24A', store_product=oc_sp,
            start_date=date(2024, 1, 1), end_date=date(2024, 2, 1),
        )
        choice = TutorialChoice(
            order_item=self.order_item, student=self.student,
            tutorial_event=oc_event, choice_rank=1,
        )
        with self.assertRaises(ValidationError) as ctx:
            choice.full_clean()
        self.assertIn('Online Classroom', str(ctx.exception))

    def test_clean_rejects_event_with_mismatched_subject(self):
        # Build an event in a different subject (SA1) but reuse the same order_item (CB1).
        other_event, _, _ = _seed_tutorial_event(subject_code='SA1')
        choice = TutorialChoice(
            order_item=self.order_item, student=self.student,
            tutorial_event=other_event, choice_rank=1,
        )
        with self.assertRaises(ValidationError) as ctx:
            choice.full_clean()
        self.assertIn('subject', str(ctx.exception).lower())
