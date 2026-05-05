"""Tests for the seed_orders_event_stubs management command.

Creates stub TutorialEvents for the 4 codes referenced by tutorial_orders.csv
that have no matching real event in tutorial_import.csv. Stubs are flagged
``cancelled=True`` so they're excluded from registration/attendance flows.
"""
import io
from datetime import date, timedelta

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from catalog.models import (
    ExamSession, Subject,
    Product as CatProduct, ProductVariation,
)
from tutorials.models import TutorialEvents


class SeedOrdersEventStubsTests(TestCase):
    """Master catalog must be set up first; the seed command then chains
    ess + ppv + store_product + event using get_or_create."""

    def setUp(self):
        # Master data the seed command depends on.
        for code in ('CP2', 'CS1', 'CS2'):
            Subject.objects.get_or_create(
                code=code, defaults={'description': code, 'active': True},
            )
        for sitting in ('25S', '26'):
            ExamSession.objects.get_or_create(
                session_code=sitting,
                defaults={'start_date': timezone.now(), 'end_date': timezone.now() + timedelta(days=60)},
            )
        for code in ('LO_6H', 'F2F_6H'):
            ProductVariation.objects.get_or_create(
                code=code,
                defaults={'name': code, 'description': '', 'description_short': code,
                          'variation_type': 'Tutorial'},
            )
        for code, full in [('Live', 'Tutorial - Live Online'), ('Lon', 'Tutorial - London')]:
            CatProduct.objects.get_or_create(
                code=code, defaults={'fullname': full, 'shortname': code},
            )

    def test_creates_all_four_stub_events_with_cancelled_true(self):
        out = io.StringIO()
        call_command('seed_orders_event_stubs', stdout=out)

        for code in ('CP2-24-25S', 'CP2-30-26A', 'CS1-41-25S', 'CS2-30-25S'):
            ev = TutorialEvents.objects.get(code=code)
            self.assertTrue(ev.cancelled, msg=f"{code} should be cancelled=True")
            self.assertIsNotNone(ev.store_product)

    def test_idempotent_running_twice_does_not_duplicate(self):
        call_command('seed_orders_event_stubs', stdout=io.StringIO())
        first_count = TutorialEvents.objects.filter(cancelled=True).count()
        call_command('seed_orders_event_stubs', stdout=io.StringIO())
        self.assertEqual(TutorialEvents.objects.filter(cancelled=True).count(), first_count)

    def test_summary_output(self):
        out = io.StringIO()
        call_command('seed_orders_event_stubs', stdout=out)
        text = out.getvalue()
        self.assertIn('CP2-24-25S', text)
        self.assertIn('created=4', text)
