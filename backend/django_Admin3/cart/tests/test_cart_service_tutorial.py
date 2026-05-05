"""Behavioral tests for CartService tutorial flow.

Verifies that adding a tutorial product creates relational
CartTutorialChoice rows (and rebuilds the legacy metadata view).
Authentication and student-linkage are required.
"""
from datetime import date, timedelta

from django.contrib.auth.models import AnonymousUser, User
from django.core.exceptions import ValidationError
from django.test import RequestFactory, TestCase
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProduct, ProductVariation, ProductProductVariation,
)
from cart.services.cart_service import cart_service
from cart.models import Cart, CartItem
from store.models import Product as StoreProduct
from students.models import Student
from tutorials.models import CartTutorialChoice, TutorialEvents


def _seed_tutorial_product(subject_code='CB1', sitting='24'):
    es = ExamSession.objects.create(
        session_code=sitting,
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=60),
    )
    subj, _ = Subject.objects.get_or_create(
        code=subject_code,
        defaults={'description': f'{subject_code} subject', 'active': True},
    )
    ess = ExamSessionSubject.objects.create(exam_session=es, subject=subj)
    cat, _ = CatProduct.objects.get_or_create(
        code='Live',
        defaults={'fullname': 'Tutorial - Live Online', 'shortname': 'Live'},
    )
    pv, _ = ProductVariation.objects.get_or_create(
        code='LO_6H',
        defaults={'name': 'LO_6H', 'description': '',
                  'description_short': 'LO_6H',
                  'variation_type': 'Tutorial'},
    )
    ppv, _ = ProductProductVariation.objects.get_or_create(
        product=cat, product_variation=pv,
    )
    sp = StoreProduct(
        exam_session_subject=ess, product_product_variation=ppv,
        product_code=f'{subject_code}/Live/LO_6H/{sitting}',
    )
    sp.save()
    event_a = TutorialEvents.objects.create(
        code=f'{subject_code}-01-{sitting}A',
        store_product=sp,
        start_date=date(2024, 1, 1), end_date=date(2024, 2, 1),
    )
    event_b = TutorialEvents.objects.create(
        code=f'{subject_code}-02-{sitting}A',
        store_product=sp,
        start_date=date(2024, 1, 8), end_date=date(2024, 2, 8),
    )
    return sp, event_a, event_b, subj


def _payload(subject_code, choices):
    """Build a metadata payload in the same shape the frontend sends."""
    return {
        'type': 'tutorial',
        'subjectCode': subject_code,
        'newLocation': {
            'location': 'London',
            'choices': choices,
            'choiceCount': len(choices),
        },
    }


class TutorialAddRequiresAuthTests(TestCase):
    def setUp(self):
        self.sp, self.event_a, _, _ = _seed_tutorial_product()
        self.cart = Cart.objects.create(session_key='guest-session')

    def test_guest_cart_rejects_tutorial_add(self):
        with self.assertRaises(ValidationError) as ctx:
            cart_service.add_item(
                self.cart, self.sp.id, quantity=1,
                actual_price='10.00',
                metadata=_payload('CB1', [
                    {'choice': '1st', 'eventId': self.event_a.id,
                     'variationId': 1},
                ]),
            )
        self.assertIn('logged-in', str(ctx.exception).lower())

    def test_user_without_student_rejects_tutorial_add(self):
        user = User.objects.create_user(username='nostudent',
                                        email='ns@t.com')
        cart = Cart.objects.create(user=user)
        with self.assertRaises(ValidationError) as ctx:
            cart_service.add_item(
                cart, self.sp.id, quantity=1, actual_price='10.00',
                metadata=_payload('CB1', [
                    {'choice': '1st', 'eventId': self.event_a.id,
                     'variationId': 1},
                ]),
            )
        self.assertIn('student', str(ctx.exception).lower())


class TutorialAddCreatesChoicesTests(TestCase):
    def setUp(self):
        self.sp, self.event_a, self.event_b, self.subj = (
            _seed_tutorial_product()
        )
        self.user = User.objects.create_user(username='alice',
                                             email='a@t.com')
        self.student = Student.objects.create(user=self.user)
        self.cart = Cart.objects.create(user=self.user)

    def test_add_creates_one_cart_item_and_choice_rows(self):
        item, err = cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': 1},
                {'choice': '2nd', 'eventId': self.event_b.id,
                 'variationId': 2},
            ]),
        )
        self.assertIsNone(err)
        self.assertEqual(CartItem.objects.filter(cart=self.cart).count(),
                         1)
        choices = list(item.tutorial_choices.order_by('choice_rank'))
        self.assertEqual([c.choice_rank for c in choices], [1, 2])
        self.assertEqual(
            [c.tutorial_event_id for c in choices],
            [self.event_a.id, self.event_b.id],
        )
        self.assertEqual(set(c.student_id for c in choices),
                         {self.student.pk})

    def test_subsequent_add_for_same_subject_merges_into_same_cart_item(self):
        cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': 1},
            ]),
        )
        item, _ = cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '2nd', 'eventId': self.event_b.id,
                 'variationId': 2},
            ]),
        )
        self.assertEqual(CartItem.objects.filter(cart=self.cart).count(),
                         1)
        self.assertEqual(item.tutorial_choices.count(), 2)

    def test_resending_same_rank_replaces_event(self):
        cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': 1},
            ]),
        )
        item, _ = cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_b.id,
                 'variationId': 2},
            ]),
        )
        ranks = list(item.tutorial_choices.values_list(
            'choice_rank', 'tutorial_event_id'))
        self.assertEqual(ranks, [(1, self.event_b.id)])

    def test_invalid_rank_label_raises(self):
        with self.assertRaises(ValidationError):
            cart_service.add_item(
                self.cart, self.sp.id, quantity=1, actual_price='10.00',
                metadata=_payload('CB1', [
                    {'choice': '4th', 'eventId': self.event_a.id,
                     'variationId': 1},
                ]),
            )

    def test_metadata_view_is_rebuilt_after_upsert(self):
        item, _ = cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': 1},
                {'choice': '2nd', 'eventId': self.event_b.id,
                 'variationId': 2},
            ]),
        )
        item.refresh_from_db()
        meta = item.metadata or {}
        self.assertEqual(meta.get('type'), 'tutorial')
        self.assertEqual(meta.get('subjectCode'), 'CB1')
        # locations[].choices[] reflects the relational rows
        choices_in_meta = sum(
            len(loc.get('choices', [])) for loc in meta.get('locations', [])
        )
        self.assertEqual(choices_in_meta, 2)
        self.assertEqual(meta.get('totalChoiceCount'), 2)
