"""UnifiedProductSerializer must expose exam-session start_date / end_date
so the frontend can do the date-window check on the product card.
"""
from datetime import datetime, timezone as dt_timezone

from django.test import TestCase

from catalog.exam_session.models import ExamSession
from catalog.subject.models import Subject
from catalog.models import ExamSessionSubject
from catalog.products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from store.models import Product as StoreProduct, Purchasable
from store.serializers import UnifiedProductSerializer


class UnifiedSerializerDatesTests(TestCase):
    def test_serializer_emits_start_and_end_date(self):
        es = ExamSession.objects.create(
            session_code='2099-04',
            start_date=datetime(2099, 1, 1, tzinfo=dt_timezone.utc),
            end_date=datetime(2099, 12, 31, tzinfo=dt_timezone.utc),
        )
        s = Subject.objects.create(code='ZZ2', description='T', active=True)
        ess = ExamSessionSubject.objects.create(exam_session=es, subject=s)
        cp = CatalogProduct.objects.create(fullname='X', shortname='X', code='XX')
        v = ProductVariation.objects.create(
            variation_type='eBook', name='X eBook', code='X-EBK',
        )
        ppv = ProductProductVariation.objects.create(product=cp, product_variation=v)
        sp = StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            kind=Purchasable.Kind.MATERIAL,
            name='X eBook',
        )
        data = UnifiedProductSerializer(sp).data
        self.assertIn('start_date', data)
        self.assertIn('end_date', data)
        self.assertTrue(data['start_date'].startswith('2099-01-01'))
        self.assertTrue(data['end_date'].startswith('2099-12-31'))
