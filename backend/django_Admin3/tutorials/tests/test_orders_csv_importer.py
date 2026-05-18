"""Tests for tutorials.services.orders_csv_importer (the orchestrator).

Per Q2 (one Order per (student, sitting)), Q4 (1 OrderItem per choice;
purchasable = chosen event's store_product), Q5=A (additive — no truncation).
"""
from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProduct, ProductVariation, ProductProductVariation,
)
from store.models import TutorialProduct
from orders.models import Order, OrderItem
from students.models import Student
from tutorials.models import TutorialChoice, TutorialEvents
from tutorials.services.orders_csv_parser import OrdersParseResult, ParsedOrderRow
from tutorials.services.orders_csv_importer import (
    import_parsed_orders, OrdersImportReport,
)


def _seed_event(subject_code='CP2', sitting_short='24A', event_num='17',
                location_code='Live', variation_code='LO_6H'):
    sitting_session = sitting_short[:-1] if sitting_short.endswith('A') else sitting_short
    es, _ = ExamSession.objects.get_or_create(
        session_code=sitting_session,
        defaults={'start_date': timezone.now(), 'end_date': timezone.now() + timedelta(days=60)},
    )
    subj, _ = Subject.objects.get_or_create(
        code=subject_code, defaults={'description': subject_code, 'active': True},
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
    # Multiple events under the same subject/location/variation/sitting share
    # one store_product — match the real-data shape.
    # Phase 5 Task 4b: TutorialProduct has no PPV — look up by code.
    code = f'{subject_code}/{location_code}/{variation_code}/{sitting_session}'
    tp = TutorialProduct.objects.filter(product_code=code).first()
    if tp is None:
        tp = TutorialProduct(
            exam_session_subject=ess,
            product_code=code,
            format=variation_code,
        )
        tp.save()
    return TutorialEvents.objects.create(
        code=f'{subject_code}-{event_num}-{sitting_short}',
        store_product=tp,
        lms_start_date=date(2024, 1, 1), lms_end_date=date(2024, 2, 1),
    )


def _row(student_ref=76166, subject_code='CP2', choice_rank=1,
         event_code_xname='CP2-17', sitting_year='2024',
         firstname='Tanya', lastname='Manchanda', email='t@x.com'):
    return ParsedOrderRow(
        student_ref=student_ref, firstname=firstname, lastname=lastname, email=email,
        subject_code=subject_code, choice_rank=choice_rank,
        event_code_xname=event_code_xname, variation_code_xcode='ANY',
        sitting_year=sitting_year,
    )


class OrdersOrchestratorTests(TestCase):
    def setUp(self):
        self.event_17 = _seed_event(event_num='17')
        self.event_02 = _seed_event(event_num='02')
        self.event_12 = _seed_event(event_num='12')

    def test_dry_run_makes_no_db_writes(self):
        parsed = OrdersParseResult(rows=[_row(choice_rank=1, event_code_xname='CP2-17')])
        report = import_parsed_orders(parsed, dry_run=True)
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(OrderItem.objects.count(), 0)
        self.assertEqual(TutorialChoice.objects.count(), 0)
        self.assertTrue(report.dry_run)
        self.assertEqual(report.orders_created, 1)
        self.assertEqual(report.order_items_created, 1)
        self.assertEqual(report.choices_created, 1)

    def test_commit_creates_one_order_one_item_one_choice_for_single_row(self):
        parsed = OrdersParseResult(rows=[_row(choice_rank=1, event_code_xname='CP2-17')])
        import_parsed_orders(parsed, dry_run=False)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.count(), 1)
        self.assertEqual(TutorialChoice.objects.count(), 1)
        oi = OrderItem.objects.get()
        self.assertEqual(oi.purchasable_id, self.event_17.store_product_id)

    def test_one_order_per_student_sitting_three_items_for_three_choices(self):
        parsed = OrdersParseResult(rows=[
            _row(choice_rank=1, event_code_xname='CP2-17'),
            _row(choice_rank=2, event_code_xname='CP2-02'),
            _row(choice_rank=3, event_code_xname='CP2-12'),
        ])
        import_parsed_orders(parsed, dry_run=False)
        # ONE Order (one student, one sitting), THREE OrderItems, THREE Choices
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.count(), 3)
        self.assertEqual(TutorialChoice.objects.count(), 3)

    def test_two_subjects_same_student_same_sitting_one_order_two_groups(self):
        # Different subject → still under the same Order, but distinct OrderItems.
        _seed_event(subject_code='CS2', event_num='82')
        parsed = OrdersParseResult(rows=[
            _row(subject_code='CP2', choice_rank=1, event_code_xname='CP2-17'),
            _row(subject_code='CS2', choice_rank=1, event_code_xname='CS2-82'),
        ])
        import_parsed_orders(parsed, dry_run=False)
        self.assertEqual(Order.objects.count(), 1)  # one Order per (student, sitting)
        self.assertEqual(OrderItem.objects.count(), 2)
        self.assertEqual(TutorialChoice.objects.count(), 2)

    def test_two_sittings_same_student_two_orders(self):
        # 2024 vs 2024S → different sittings → different Orders
        _seed_event(event_num='42', sitting_short='24S')
        parsed = OrdersParseResult(rows=[
            _row(choice_rank=1, event_code_xname='CP2-17', sitting_year='2024'),
            _row(choice_rank=1, event_code_xname='CP2-42', sitting_year='2024S'),
        ])
        import_parsed_orders(parsed, dry_run=False)
        self.assertEqual(Order.objects.count(), 2)

    def test_unresolvable_event_records_error_and_skips_row(self):
        parsed = OrdersParseResult(rows=[
            _row(choice_rank=1, event_code_xname='CP2-99'),  # doesn't exist
        ])
        report = import_parsed_orders(parsed, dry_run=False)
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(report.rows_skipped_errors, 1)
        self.assertTrue(any('CP2-99-24A' in e['errors'][0]
                            for e in report.row_errors))

    def test_partial_success_one_row_resolves_one_doesnt(self):
        parsed = OrdersParseResult(rows=[
            _row(choice_rank=1, event_code_xname='CP2-17'),  # OK
            _row(choice_rank=2, event_code_xname='CP2-99'),  # bad
        ])
        report = import_parsed_orders(parsed, dry_run=False)
        # Order is still created (for the OK row), bad row recorded as error
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.count(), 1)
        self.assertEqual(report.rows_skipped_errors, 1)
        self.assertEqual(report.orders_created, 1)

    def test_additive_subsequent_runs_create_new_orders(self):
        """Q5=A: additive only. Re-running creates new Orders (no dedup logic
        baked in — operator is responsible for clean-up if re-running)."""
        parsed = OrdersParseResult(rows=[_row(choice_rank=1, event_code_xname='CP2-17')])
        import_parsed_orders(parsed, dry_run=False)
        import_parsed_orders(parsed, dry_run=False)
        self.assertEqual(Order.objects.count(), 2)
        self.assertEqual(OrderItem.objects.count(), 2)
        self.assertEqual(TutorialChoice.objects.count(), 2)
