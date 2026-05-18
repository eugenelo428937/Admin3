"""Phase 4a: tests for the three subclass-aware filter handlers."""
from django.test import TestCase


class _Fixtures:
    """Shared fixture builders."""

    def _ess(self, subject_code='CB1', session_code='2026-04'):
        from catalog.exam_session.models import ExamSession
        from catalog.subject.models import Subject
        from catalog.models import ExamSessionSubject
        subject, _ = Subject.objects.get_or_create(
            code=subject_code, defaults={'description': subject_code},
        )
        es, _ = ExamSession.objects.get_or_create(
            session_code=session_code,
            defaults={'start_date': '2026-04-01', 'end_date': '2026-04-30'},
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            subject=subject, exam_session=es,
        )
        return ess

    def _ppv(self, variation_type, code):
        from catalog.products.models import (
            Product as CatalogProduct,
            ProductVariation,
            ProductProductVariation,
        )
        cp, _ = CatalogProduct.objects.get_or_create(
            code=f'P4A_{code}',
            defaults={'fullname': f'Phase 4a {variation_type}', 'shortname': 'P4A'},
        )
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type=variation_type, name=variation_type,
            defaults={'code': code, 'is_active': True},
        )
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cp, product_variation=pv,
            defaults={'is_active': True},
        )
        return ppv, cp

    def _tutorial(self, subject_code, format_code, location=None):
        from store.models import TutorialProduct
        ess = self._ess(subject_code=subject_code)
        ppv, _ = self._ppv('Tutorial', format_code)
        tp = TutorialProduct(
            exam_session_subject=ess,
            product_code=f'{subject_code}/{format_code}/2026-04',
            format=format_code,
            tutorial_location=location,
        )
        tp.save()
        return tp

    def _marking(self, subject_code, template_code='X'):
        from marking.models import MarkingTemplate
        from store.models import MarkingProduct
        ess = self._ess(subject_code=subject_code)
        ppv, cp = self._ppv('Marking', 'M')
        mt, _ = MarkingTemplate.objects.get_or_create(
            code=template_code, name=f'{template_code} Marking',
            defaults={'description': '', 'is_active': True},
        )
        return MarkingProduct.objects.create(
            exam_session_subject=ess,
            product_code=f'{subject_code}/M{template_code}/2026-04',
            marking_template=mt,
        )

    def _tutorial_location(self, code='LDN'):
        from tutorials.models import TutorialLocation
        loc, _ = TutorialLocation.objects.get_or_create(
            code=code, defaults={'name': f'{code} Centre', 'is_active': True},
        )
        return loc


class TutorialFormatHandlerTests(_Fixtures, TestCase):
    def test_get_options_enumerates_format_choices(self):
        from filtering.services.filter_handlers import TutorialFormatHandler
        from filtering.models import FilterConfiguration

        config = FilterConfiguration.objects.create(
            name='tutorial_format_test',
            display_label='Tutorial Format',
            filter_type='tutorial_format',
            filter_key='tutorial_format',
        )
        h = TutorialFormatHandler()
        opts = h.get_options(config)
        self.assertEqual(len(opts), 23)
        values = {o['value'] for o in opts}
        self.assertIn('F2F_3F', values)
        self.assertIn('LO_2H', values)
        self.assertIn('OC', values)

    def test_build_q_filters_by_format(self):
        from filtering.services.filter_handlers import TutorialFormatHandler
        from filtering.models import FilterConfiguration
        from store.models import Product

        t_f2f = self._tutorial('CB1', 'F2F_3F')
        t_lo  = self._tutorial('CB1', 'LO_2H')
        config = FilterConfiguration.objects.create(
            name='tutorial_format_test_b',
            display_label='Tutorial Format',
            filter_type='tutorial_format',
            filter_key='tutorial_format',
        )
        h = TutorialFormatHandler()
        q = h.build_q(config, ['F2F_3F'])
        ids = set(Product.objects.filter(q).values_list('pk', flat=True))
        self.assertIn(t_f2f.pk, ids)
        self.assertNotIn(t_lo.pk, ids)

    def test_count_path_works_in_values_aggregate(self):
        from django.db.models import Count
        from filtering.services.filter_handlers import TutorialFormatHandler
        from filtering.models import FilterConfiguration
        from store.models import Product

        self._tutorial('CB1', 'F2F_3F')
        self._tutorial('CB2', 'F2F_3F')
        self._tutorial('CB1', 'LO_2H')
        config = FilterConfiguration.objects.create(
            name='tutorial_format_test_c',
            display_label='Tutorial Format',
            filter_type='tutorial_format',
            filter_key='tutorial_format',
        )
        h = TutorialFormatHandler()
        path = h.count_path(config)
        rows = (
            Product.objects.values(path)
            .annotate(c=Count('id', distinct=True))
        )
        counts = {r[path]: r['c'] for r in rows if r[path]}
        self.assertEqual(counts.get('F2F_3F'), 2)
        self.assertEqual(counts.get('LO_2H'), 1)


class TutorialLocationHandlerTests(_Fixtures, TestCase):
    def test_get_options_lists_active_locations(self):
        from filtering.services.filter_handlers import TutorialLocationHandler
        from filtering.models import FilterConfiguration

        loc = self._tutorial_location('LDN')
        config = FilterConfiguration.objects.create(
            name='tutorial_location_test',
            display_label='Tutorial Location',
            filter_type='tutorial_location',
            filter_key='tutorial_location',
        )
        h = TutorialLocationHandler()
        opts = h.get_options(config)
        codes = {o['value'] for o in opts}
        self.assertIn('LDN', codes)
        for o in opts:
            self.assertIn('label', o)

    def test_build_q_filters_by_location_code(self):
        from filtering.services.filter_handlers import TutorialLocationHandler
        from filtering.models import FilterConfiguration
        from store.models import Product

        loc_ldn = self._tutorial_location('LDN')
        loc_mch = self._tutorial_location('MCH')
        t_ldn = self._tutorial('CB1', 'F2F_3F', location=loc_ldn)
        t_mch = self._tutorial('CB2', 'F2F_3F', location=loc_mch)
        config = FilterConfiguration.objects.create(
            name='tutorial_location_test_b',
            display_label='Tutorial Location',
            filter_type='tutorial_location',
            filter_key='tutorial_location',
        )
        h = TutorialLocationHandler()
        q = h.build_q(config, ['LDN'])
        ids = set(Product.objects.filter(q).values_list('pk', flat=True))
        self.assertIn(t_ldn.pk, ids)
        self.assertNotIn(t_mch.pk, ids)


class MarkingTemplateHandlerTests(_Fixtures, TestCase):
    def test_get_options_lists_active_templates_by_code(self):
        from filtering.services.filter_handlers import MarkingTemplateHandler
        from filtering.models import FilterConfiguration

        self._marking('CB1', template_code='ZTESTX')
        config = FilterConfiguration.objects.create(
            name='marking_template_test',
            display_label='Marking Template',
            filter_type='marking_template',
            filter_key='marking_template',
        )
        h = MarkingTemplateHandler()
        opts = h.get_options(config)
        codes = {o['value'] for o in opts}
        self.assertIn('ZTESTX', codes)

    def test_build_q_filters_by_template_code(self):
        from filtering.services.filter_handlers import MarkingTemplateHandler
        from filtering.models import FilterConfiguration
        from store.models import Product

        k_a = self._marking('CB1', template_code='ZTESTA')
        k_b = self._marking('CB2', template_code='ZTESTB')
        config = FilterConfiguration.objects.create(
            name='marking_template_test_b',
            display_label='Marking Template',
            filter_type='marking_template',
            filter_key='marking_template',
        )
        h = MarkingTemplateHandler()
        q = h.build_q(config, ['ZTESTA'])
        ids = set(Product.objects.filter(q).values_list('pk', flat=True))
        self.assertIn(k_a.pk, ids)
        self.assertNotIn(k_b.pk, ids)


class DispatchRegistrationTests(TestCase):
    def test_tutorial_format_is_registered(self):
        from filtering.services.filter_handlers import (
            FILTER_HANDLERS, TutorialFormatHandler,
        )
        self.assertIsInstance(FILTER_HANDLERS['tutorial_format'], TutorialFormatHandler)

    def test_tutorial_location_is_registered(self):
        from filtering.services.filter_handlers import (
            FILTER_HANDLERS, TutorialLocationHandler,
        )
        self.assertIsInstance(FILTER_HANDLERS['tutorial_location'], TutorialLocationHandler)

    def test_marking_template_is_registered(self):
        from filtering.services.filter_handlers import (
            FILTER_HANDLERS, MarkingTemplateHandler,
        )
        self.assertIsInstance(FILTER_HANDLERS['marking_template'], MarkingTemplateHandler)
