"""Phase 4b: TutorialEvents.store_product is typed as TutorialProduct.

After retarget, `event.store_product` returns a store.TutorialProduct
instance directly — not a bare Product that needs a downcast. The
subclass-specific fields (format, tutorial_location,
tutorial_course_template) must be readable without a query for the
subclass row.
"""
from django.test import TestCase


class _Fixtures:
    def _ess(self):
        from catalog.exam_session.models import ExamSession
        from catalog.subject.models import Subject
        from catalog.models import ExamSessionSubject
        subject, _ = Subject.objects.get_or_create(
            code='CB1', defaults={'description': 'CB1'},
        )
        es, _ = ExamSession.objects.get_or_create(
            session_code='2026-04',
            defaults={'start_date': '2026-04-01', 'end_date': '2026-04-30'},
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            subject=subject, exam_session=es,
        )
        return ess

    def _ppv(self):
        from catalog.products.models import (
            Product as CatalogProduct,
            ProductVariation,
            ProductProductVariation,
        )
        cp, _ = CatalogProduct.objects.get_or_create(
            code='P4B_T', fullname='Phase 4b Tutorial',
            defaults={'shortname': 'P4B'},
        )
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type='Tutorial', name='Tutorial',
            defaults={'code': 'F2F_3F', 'is_active': True},
        )
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cp, product_variation=pv,
            defaults={'is_active': True},
        )
        return ppv

    def _tutorial_product(self):
        from store.models import TutorialProduct
        ess = self._ess()
        ppv = self._ppv()
        tp = TutorialProduct(
            exam_session_subject=ess,
            product_code='CB1/F2F_3F/2026-04',
            format='F2F_3F',
        )
        tp.save()
        return tp


class TutorialEventStoreProductTypeTests(_Fixtures, TestCase):
    def test_event_store_product_returns_tutorial_product_instance(self):
        from tutorials.models import TutorialEvents, TutorialLocation
        from store.models import TutorialProduct

        tp = self._tutorial_product()
        loc, _ = TutorialLocation.objects.get_or_create(
            code='LDN', defaults={'name': 'London', 'is_active': True},
        )
        event = TutorialEvents.objects.create(
            code='P4B_TEST_EVT',
            store_product=tp,
            lms_start_date='2026-05-01',
            lms_end_date='2026-05-03',
            location=loc,
        )
        event = TutorialEvents.objects.get(pk=event.pk)
        self.assertIsInstance(event.store_product, TutorialProduct)

    def test_event_can_access_subclass_fields_without_downcast(self):
        from tutorials.models import TutorialEvents
        tp = self._tutorial_product()
        event = TutorialEvents.objects.create(
            code='P4B_TEST_EVT2',
            store_product=tp,
            lms_start_date='2026-05-01',
            lms_end_date='2026-05-03',
        )
        event = TutorialEvents.objects.get(pk=event.pk)
        self.assertEqual(event.store_product.format, 'F2F_3F')

    def test_event_subject_code_property_still_works(self):
        from tutorials.models import TutorialEvents
        tp = self._tutorial_product()
        event = TutorialEvents.objects.create(
            code='P4B_TEST_EVT3',
            store_product=tp,
            lms_start_date='2026-05-01',
            lms_end_date='2026-05-03',
        )
        event = TutorialEvents.objects.get(pk=event.pk)
        self.assertEqual(event.subject_code, 'CB1')

    def test_reverse_accessor_returns_events_for_tutorial_product(self):
        from tutorials.models import TutorialEvents
        tp = self._tutorial_product()
        event = TutorialEvents.objects.create(
            code='P4B_TEST_EVT4',
            store_product=tp,
            lms_start_date='2026-05-01',
            lms_end_date='2026-05-03',
        )
        related = list(tp.tutorial_events.all())
        self.assertEqual(len(related), 1)
        self.assertEqual(related[0].pk, event.pk)
