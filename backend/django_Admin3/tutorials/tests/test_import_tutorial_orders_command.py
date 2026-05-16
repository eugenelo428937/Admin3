"""Tests for the import_tutorial_orders_csv management command."""
import io
import tempfile
from datetime import date, timedelta
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProduct, ProductVariation, ProductProductVariation,
)
from store.models import TutorialProduct
from orders.models import Order, OrderItem
from tutorials.models import TutorialChoice, TutorialEvents


HEADER = "ref,lastname,firstname,email,subject,fullname,xcode,xname,csitting\n"


def _seed_event(subject_code='CP2', sitting_short='24A', event_num='17'):
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
        code='Live', defaults={'fullname': 'Tutorial - Live Online', 'shortname': 'Live'},
    )
    pv, _ = ProductVariation.objects.get_or_create(
        code='LO_6H',
        defaults={'name': 'LO_6H', 'description': '', 'description_short': 'LO_6H',
                  'variation_type': 'Tutorial'},
    )
    ppv, _ = ProductProductVariation.objects.get_or_create(product=cat_prod, product_variation=pv)
    tp = TutorialProduct.objects.filter(exam_session_subject=ess, product_product_variation=ppv).first()
    if tp is None:
        tp = TutorialProduct(exam_session_subject=ess, product_product_variation=ppv,
                             product_code=f'{subject_code}/Live/LO_6H/{sitting_session}',
                             format='LO_6H')
        tp.save()
    return TutorialEvents.objects.create(
        code=f'{subject_code}-{event_num}-{sitting_short}', store_product=tp,
        lms_start_date=date(2024, 1, 1), lms_end_date=date(2024, 2, 1),
    )


class ImportTutorialOrdersCommandTests(TestCase):
    def setUp(self):
        _seed_event(event_num='17')
        _seed_event(event_num='02')
        _seed_event(event_num='12')

    def _write_csv(self, body: str, encoding='utf-8') -> Path:
        f = tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, encoding=encoding)
        f.write(HEADER + body)
        f.close()
        return Path(f.name)

    def test_dry_run_default_no_writes(self):
        body = '76166,"M","T","t@x.com","CP2","1st Choice tutorial (CP2-17)","CP2_LO_1","CP2-17","2024"\n'
        path = self._write_csv(body)
        out = io.StringIO()
        call_command('import_tutorial_orders_csv', str(path), stdout=out)
        self.assertEqual(Order.objects.count(), 0)
        text = out.getvalue()
        self.assertIn('DRY RUN', text)
        self.assertIn('orders_created=1', text)

    def test_commit_creates_orders(self):
        body = (
            '76166,"M","T","t@x.com","CP2","1st Choice tutorial (CP2-17)","CP2_LO_1","CP2-17","2024"\n'
            '76166,"M","T","t@x.com","CP2","2nd Choice tutorial (CP2-02)","CP2_LO_2","CP2-02","2024"\n'
            '76166,"M","T","t@x.com","CP2","3rd Choice tutorial (CP2-12)","CP2_LO_1","CP2-12","2024"\n'
        )
        path = self._write_csv(body)
        out = io.StringIO()
        call_command('import_tutorial_orders_csv', str(path), '--commit', stdout=out)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.count(), 3)
        self.assertEqual(TutorialChoice.objects.count(), 3)

    def test_supports_cp1252_encoding(self):
        # Real legacy CSV has accented characters in cp1252.
        body = (
            '76166,"De \xe9migr\xe9","T","t@x.com","CP2","1st Choice tutorial (CP2-17)",'
            '"CP2_LO_1","CP2-17","2024"\n'
        )
        path = self._write_csv(body, encoding='cp1252')
        out = io.StringIO()
        call_command('import_tutorial_orders_csv', str(path),
                     '--commit', '--encoding', 'cp1252', stdout=out)
        self.assertEqual(TutorialChoice.objects.count(), 1)

    def test_missing_file_errors_cleanly(self):
        out = io.StringIO()
        err = io.StringIO()
        with self.assertRaises(Exception) as ctx:
            call_command('import_tutorial_orders_csv', '/nonexistent.csv', stdout=out, stderr=err)
        self.assertIn('not exist', str(ctx.exception).lower())
