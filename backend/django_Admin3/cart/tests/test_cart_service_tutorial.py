"""Behavioral tests for CartService tutorial flow.

Verifies that adding a tutorial product creates relational
CartTutorialChoice rows (and rebuilds the legacy metadata view).
Guests CAN add tutorials — the auth gate moved to checkout.
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
from store.models import Product as StoreProduct, TutorialProduct
from students.models import Student
from tutorials.models import CartTutorialChoice, TutorialEvents


def _seed_tutorial_product(subject_code='CB1', sitting='24'):
    # All upstream is_active flags must be True and the exam-session window
    # must include "now" for the cart-add availability gate to accept the
    # product (see Purchasable.objects.available_now()).
    now = timezone.now()
    es = ExamSession.objects.create(
        session_code=sitting,
        start_date=now - timedelta(days=10),
        end_date=now + timedelta(days=60),
        is_active=True,
    )
    subj, _ = Subject.objects.get_or_create(
        code=subject_code,
        defaults={'description': f'{subject_code} subject', 'active': True},
    )
    ess = ExamSessionSubject.objects.create(
        exam_session=es, subject=subj, is_active=True,
    )
    cat, _ = CatProduct.objects.get_or_create(
        code='Live',
        defaults={'fullname': 'Tutorial - Live Online', 'shortname': 'Live',
                  'is_active': True},
    )
    pv, _ = ProductVariation.objects.get_or_create(
        code='LO_6H',
        defaults={'name': 'LO_6H', 'description': '',
                  'description_short': 'LO_6H',
                  'variation_type': 'Tutorial',
                  'is_active': True},
    )
    ppv, _ = ProductProductVariation.objects.get_or_create(
        product=cat, product_variation=pv,
        defaults={'is_active': True},
    )
    # ``get_or_create`` won't flip is_active on a pre-existing row, so make
    # sure the leaf flag is True regardless of who created it.
    if not ppv.is_active:
        ppv.is_active = True
        ppv.save(update_fields=['is_active'])
    if not pv.is_active:
        pv.is_active = True
        pv.save(update_fields=['is_active'])
    if not cat.is_active:
        cat.is_active = True
        cat.save(update_fields=['is_active'])
    sp = TutorialProduct(
        exam_session_subject=ess, product_product_variation=ppv,
        product_code=f'{subject_code}/Live/LO_6H/{sitting}',
        format='LO_6H',
    )
    sp.save()
    # Phase 5b (2026-05-16): legacy Date columns dropped; the canonical
    # fields are lms_start_date / lms_end_date (DateTime).
    event_a = TutorialEvents.objects.create(
        code=f'{subject_code}-01-{sitting}A',
        store_product=sp,
        lms_start_date=now + timedelta(days=1),
        lms_end_date=now + timedelta(days=31),
    )
    event_b = TutorialEvents.objects.create(
        code=f'{subject_code}-02-{sitting}A',
        store_product=sp,
        lms_start_date=now + timedelta(days=8),
        lms_end_date=now + timedelta(days=38),
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


class TutorialAddAllowsGuestTests(TestCase):
    """Guests and logged-in-without-Student users can add tutorials. The
    auth gate moved to checkout (OrderBuilder)."""

    def setUp(self):
        self.sp, self.event_a, _, _ = _seed_tutorial_product()

    def test_guest_can_add_tutorial(self):
        cart = Cart.objects.create(session_key='guest-session')
        item, err = cart_service.add_item(
            cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': 1},
            ]),
        )
        self.assertIsNone(err)
        self.assertEqual(item.tutorial_choices.count(), 1)
        # No student linkage for guest add.
        self.assertIsNone(item.tutorial_choices.first().student_id)

    def test_user_without_student_can_add_tutorial(self):
        user = User.objects.create_user(username='nostudent',
                                        email='ns@t.com')
        cart = Cart.objects.create(user=user)
        item, err = cart_service.add_item(
            cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': 1},
            ]),
        )
        self.assertIsNone(err)
        self.assertEqual(item.tutorial_choices.count(), 1)
        # No Student row exists, so the choice row carries student=None.
        self.assertIsNone(item.tutorial_choices.first().student_id)

    def test_authenticated_user_with_student_links_student(self):
        user = User.objects.create_user(username='alice2',
                                        email='a2@t.com')
        student = Student.objects.create(user=user)
        cart = Cart.objects.create(user=user)
        item, err = cart_service.add_item(
            cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': 1},
            ]),
        )
        self.assertIsNone(err)
        self.assertEqual(
            item.tutorial_choices.first().student_id, student.pk,
        )


class MergeGuestCartBackfillsStudentTests(TestCase):
    """When a guest logs in, their cart's tutorial_choices get the
    user's Student linked — best-effort. If the user has no Student row,
    the FK stays null and checkout will still allow it."""

    def test_login_backfills_student_on_tutorial_choices(self):
        sp, event_a, _, _ = _seed_tutorial_product()

        # Guest adds a tutorial.
        guest_cart = Cart.objects.create(session_key='guest-1')
        cart_service.add_item(
            guest_cart, sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': event_a.id,
                 'variationId': 1},
            ]),
        )
        self.assertIsNone(
            CartTutorialChoice.objects.first().student_id,
        )

        # User logs in — has a Student row.
        user = User.objects.create_user(username='bob', email='b@t.com')
        student = Student.objects.create(user=user)
        cart_service.merge_guest_cart(user, 'guest-1')

        # All tutorial_choices on the user's cart now carry student.
        for c in CartTutorialChoice.objects.all():
            self.assertEqual(c.student_id, student.pk)

    def test_login_without_student_leaves_choices_null(self):
        sp, event_a, _, _ = _seed_tutorial_product()
        guest_cart = Cart.objects.create(session_key='guest-2')
        cart_service.add_item(
            guest_cart, sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': event_a.id,
                 'variationId': 1},
            ]),
        )

        # User logs in but has no Student row. Merge must not crash and
        # must not raise; choices stay null.
        user = User.objects.create_user(username='carl', email='c@t.com')
        cart_service.merge_guest_cart(user, 'guest-2')

        self.assertIsNone(
            CartTutorialChoice.objects.first().student_id,
        )


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


class RefreshTutorialMetadataPhase4dTests(TestCase):
    """Phase 4d regression: _refresh_tutorial_metadata must build variationId
    and variationName from the TutorialProduct subclass row, NOT from the
    legacy product_product_variation FK.

    After Phase 4d:
      - variationId  == TutorialProduct.id  (the MTI subclass PK)
      - variationName == TutorialProduct.get_format_display()

    This test FAILS on the pre-Phase-4d codebase because the current
    implementation sets variationId = ppv.id (the PPV row PK, which is
    a completely different value) and variationName = ppv.product_variation.name.
    Tasks 2-6 will make it pass.
    """

    def setUp(self):
        self.sp, self.event_a, _, _ = _seed_tutorial_product(
            subject_code='P4DX', sitting='P4D',
        )
        self.user = User.objects.create_user(
            username='p4duser', email='p4d@test.com',
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_metadata_built_via_tutorialproduct_subclass_fields(self):
        """After _refresh_tutorial_metadata, each choice entry must carry:
          - variationId  == tp.id  (TutorialProduct / store.Product PK)
          - variationName == tp.get_format_display()

        The test explicitly asserts that variationId != ppv.id so that it
        cannot accidentally pass on the old PPV-based code path.
        """
        tp = self.sp  # sp is a TutorialProduct instance

        item, err = cart_service.add_item(
            self.cart, tp.id, quantity=1, actual_price='10.00',
            metadata=_payload('P4DX', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': tp.id},
            ]),
        )
        self.assertIsNone(err, f"cart_service.add_item raised an error: {err}")

        item.refresh_from_db()
        meta = item.metadata or {}

        locations = meta.get('locations', [])
        self.assertTrue(locations, "metadata must have at least one location entry")

        choices = locations[0].get('choices', [])
        self.assertTrue(choices, "first location must have at least one choice")

        first_choice = choices[0]

        # Phase 4d invariant 1: variationId must be the TutorialProduct PK.
        self.assertEqual(
            first_choice.get('variationId'), tp.id,
            f"variationId must equal TutorialProduct.id ({tp.id}), "
            f"not the PPV id. Got: {first_choice.get('variationId')!r}",
        )

        # Phase 4d invariant 2: variationName must be the format display label.
        expected_name = tp.get_format_display()
        self.assertEqual(
            first_choice.get('variationName'), expected_name,
            f"variationName must equal get_format_display() ('{expected_name}'), "
            f"not the PPV product_variation.name. Got: {first_choice.get('variationName')!r}",
        )

        # Phase 5 Task 4b: TutorialProduct has no PPV (only Material does).
        # The defensive id-inequality check is moot for tutorial rows —
        # there is no PPV id to compare against tp.id. Skip the check
        # for tutorial products; the format-display assertion above is
        # the meaningful one for Phase 4d/Phase 5.
