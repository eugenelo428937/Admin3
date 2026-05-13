"""Tests for choice_resolver.

After 2026-05-08 simplification:
- Return None on zero matches (no warning).
- Return single match on exactly one match.
- Return None on multi-match WITH a warning (operator decides linkage later).

ChoiceResolution no longer carries `order_item` — callers use
`result.choice.order_item` if `result.choice` is not None.
"""
from django.test import TestCase

from tutorials.models import TutorialChoice
from tutorials.services.choice_resolver import resolve_choice_for_registration
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class ResolveChoiceTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)

    def test_returns_none_when_no_choice_exists(self):
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertIsNone(result.choice)
        self.assertEqual(result.warning, '')

    def test_returns_single_match(self):
        oi = _make_order_item(self.student, self.sp)
        choice = TutorialChoice.objects.create(
            order_item=oi, student=self.student, tutorial_event=self.event, choice_rank=1,
        )
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertEqual(result.choice, choice)
        self.assertEqual(result.warning, '')

    def test_returns_none_when_multiple_matches_and_warns(self):
        oi1 = _make_order_item(self.student, self.sp)
        oi2 = _make_order_item(self.student, self.sp)
        TutorialChoice.objects.create(
            order_item=oi1, student=self.student, tutorial_event=self.event, choice_rank=2,
        )
        TutorialChoice.objects.create(
            order_item=oi2, student=self.student, tutorial_event=self.event, choice_rank=1,
        )
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertIsNone(result.choice)
        self.assertIn('multiple', result.warning.lower())

    def test_skips_cancelled_order_items(self):
        oi = _make_order_item(self.student, self.sp)
        oi.is_cancelled = True
        oi.save()
        TutorialChoice.objects.create(
            order_item=oi, student=self.student, tutorial_event=self.event, choice_rank=1,
        )
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertIsNone(result.choice)

    def test_ignores_choices_for_other_events(self):
        other_event = factories.make_event(store_product=self.sp, code='OTHER-EV')
        oi = _make_order_item(self.student, self.sp)
        TutorialChoice.objects.create(
            order_item=oi, student=self.student, tutorial_event=other_event, choice_rank=1,
        )
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertIsNone(result.choice)
