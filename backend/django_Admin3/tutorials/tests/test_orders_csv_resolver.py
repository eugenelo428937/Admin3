"""Tests for tutorials.services.orders_csv_resolver.

Resolves a ParsedOrderRow into the (Student, TutorialEvent, store.Product)
triple needed to write Order/OrderItem/TutorialChoice. Per Q3=A, missing
Students are auto-created (User + Student with unusable password). Per
Q4, the OrderItem's purchasable is the chosen event's store_product.
"""
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProduct, ProductVariation, ProductProductVariation,
)
from store.models import TutorialProduct
from students.models import Student
from tutorials.models import TutorialEvents
from tutorials.services.orders_csv_parser import ParsedOrderRow
from tutorials.services.orders_csv_resolver import (
    resolve_order_row, OrderResolution, make_event_code_candidates,
)


def _seed_event(subject_code='CP2', sitting_short='24A', event_num='17',
                location_code='Live', variation_code='LO_6H'):
    """Build a TutorialEvent with all its catalog/store dependencies."""
    sitting_session = sitting_short[:-1] if sitting_short.endswith('A') else sitting_short
    es, _ = ExamSession.objects.get_or_create(
        session_code=sitting_session,
        defaults={'start_date': timezone.now(), 'end_date': timezone.now() + timedelta(days=60)},
    )
    subj, _ = Subject.objects.get_or_create(
        code=subject_code, defaults={'description': f'{subject_code}', 'active': True},
    )
    ess, _ = ExamSessionSubject.objects.get_or_create(exam_session=es, subject=subj)
    cat_prod, _ = CatProduct.objects.get_or_create(
        code=location_code, defaults={'fullname': f'Tutorial - {location_code}', 'shortname': location_code},
    )
    pv, _ = ProductVariation.objects.get_or_create(
        code=variation_code,
        defaults={'name': variation_code, 'description': '', 'description_short': variation_code,
                  'variation_type': 'Tutorial'},
    )
    ppv, _ = ProductProductVariation.objects.get_or_create(product=cat_prod, product_variation=pv)
    tp = TutorialProduct(
        exam_session_subject=ess,
        product_code=f'{subject_code}/{location_code}/{variation_code}/{sitting_session}',
        format=variation_code,
    )
    tp.save()
    event = TutorialEvents.objects.create(
        code=f'{subject_code}-{event_num}-{sitting_short}',
        store_product=tp,
        lms_start_date=date(2024, 1, 1), lms_end_date=date(2024, 2, 1),
    )
    return event


def _make_row(**overrides) -> ParsedOrderRow:
    defaults = dict(
        student_ref=76166, firstname='Tanya', lastname='Manchanda',
        email='tanya@x.com', subject_code='CP2', choice_rank=1,
        event_code_xname='CP2-17', variation_code_xcode='CP2_LO_1',
        sitting_year='2024',
    )
    defaults.update(overrides)
    return ParsedOrderRow(**defaults)


class EventCodeCandidatesTests(TestCase):
    def test_april_sitting_appends_A(self):
        # csitting='2024' (year only) → April sitting → '24A'
        self.assertEqual(make_event_code_candidates('CP2-17', '2024'), ['CP2-17-24A'])

    def test_september_sitting_keeps_S(self):
        # csitting='2024S' → September → '24S'
        self.assertEqual(make_event_code_candidates('CP2-17', '2024S'), ['CP2-17-24S'])

    def test_supports_25_and_26_sittings(self):
        self.assertEqual(make_event_code_candidates('CB1-01', '2025'), ['CB1-01-25A'])
        self.assertEqual(make_event_code_candidates('CB1-01', '2025S'), ['CB1-01-25S'])
        self.assertEqual(make_event_code_candidates('CB1-01', '2026'), ['CB1-01-26A'])


class OrdersResolverTests(TestCase):
    def test_resolves_existing_event_and_existing_student(self):
        event = _seed_event()
        existing_user = User.objects.create_user(username='alice', email='alice@x.com')
        existing_student = Student.objects.create(user=existing_user)
        row = _make_row(student_ref=existing_student.student_ref)

        resolution = resolve_order_row(row)
        self.assertEqual(resolution.errors, [])
        self.assertEqual(resolution.student, existing_student)
        self.assertEqual(resolution.tutorial_event, event)
        self.assertEqual(resolution.store_product, event.store_product)

    def test_auto_creates_missing_student_with_unusable_password(self):
        _seed_event()
        # student_ref 999999 doesn't exist
        row = _make_row(student_ref=999999, firstname='New', lastname='Student',
                        email='new@x.com')
        resolution = resolve_order_row(row)
        self.assertEqual(resolution.errors, [])
        new_student = Student.objects.get(student_ref=999999)
        self.assertEqual(new_student.user.first_name, 'New')
        self.assertEqual(new_student.user.last_name, 'Student')
        self.assertEqual(new_student.user.email, 'new@x.com')
        self.assertFalse(new_student.user.has_usable_password())

    def test_missing_event_records_error(self):
        # No event exists with code CP2-99-24A
        row = _make_row(event_code_xname='CP2-99')
        resolution = resolve_order_row(row)
        self.assertIsNone(resolution.tutorial_event)
        self.assertTrue(any('CP2-99-24A' in e for e in resolution.errors))

    def test_september_sitting_resolves_24S_event(self):
        sep_event = _seed_event(event_num='42', sitting_short='24S')
        row = _make_row(event_code_xname='CP2-42', sitting_year='2024S')
        resolution = resolve_order_row(row)
        self.assertEqual(resolution.errors, [])
        self.assertEqual(resolution.tutorial_event, sep_event)
