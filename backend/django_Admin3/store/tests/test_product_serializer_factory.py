"""Phase 3.2: subclass-aware serializer factory for store.Product."""
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

    def _ppv(self, variation_type='Printed', code='P'):
        from catalog.products.models import (
            Product as CatalogProduct,
            ProductVariation,
            ProductProductVariation,
        )
        cp, _ = CatalogProduct.objects.get_or_create(
            code=f'P32T_{variation_type[:5]}',
            fullname=f'Phase 3.2 Test {variation_type}',
            defaults={'shortname': 'P32 Test'},
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

    def _material(self):
        from store.models import MaterialProduct
        ess = self._ess()
        ppv, _ = self._ppv('Printed', 'P')
        return MaterialProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CB1/PP32M/2026-04',
        )

    def _tutorial(self):
        from store.models import TutorialProduct
        ess = self._ess(subject_code='CM2', session_code='2026-04')
        ppv, _ = self._ppv('Tutorial', 'F2F_3F')
        tp = TutorialProduct(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CM2/P32T2/2026-04',
            format='F2F_3F',
        )
        tp.save()
        return tp

    def _marking(self):
        from marking.models import MarkingTemplate
        from store.models import MarkingProduct
        ess = self._ess(subject_code='CS1', session_code='2026-04')
        ppv, cp = self._ppv('Marking', 'M')
        mt, _ = MarkingTemplate.objects.get_or_create(
            pk=cp.pk,
            defaults={'code': cp.code, 'name': cp.fullname,
                      'description': '', 'is_active': True},
        )
        return MarkingProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CS1/MP32T/2026-04',
            marking_template=mt,
            paper_count=4,
        )


class SerializerForFactoryTests(_Fixtures, TestCase):
    def test_factory_returns_material_serializer_for_material_row(self):
        from store.serializers.product import (
            MaterialProductSerializer, serializer_for,
        )
        m = self._material()
        self.assertIs(serializer_for(m), MaterialProductSerializer)

    def test_factory_returns_tutorial_serializer_for_tutorial_row(self):
        from store.serializers.product import (
            TutorialProductSerializer, serializer_for,
        )
        t = self._tutorial()
        self.assertIs(serializer_for(t), TutorialProductSerializer)

    def test_factory_returns_marking_serializer_for_marking_row(self):
        from store.serializers.product import (
            MarkingProductSerializer, serializer_for,
        )
        k = self._marking()
        self.assertIs(serializer_for(k), MarkingProductSerializer)

    def test_factory_falls_back_to_base_for_bare_product(self):
        """If a Product row has no subclass row, factory returns the
        base ProductSerializer rather than raising."""
        from store.serializers.product import ProductSerializer, serializer_for
        from store.models import Product
        ess = self._ess(subject_code='CT1')
        ppv, _ = self._ppv('Printed', 'P')
        p = Product(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CT1/BARE32/2026-04',
        )
        p.save()
        from store.models import MaterialProduct, TutorialProduct, MarkingProduct
        self.assertFalse(MaterialProduct.objects.filter(pk=p.pk).exists())
        self.assertFalse(TutorialProduct.objects.filter(pk=p.pk).exists())
        self.assertFalse(MarkingProduct.objects.filter(pk=p.pk).exists())
        self.assertIs(serializer_for(p), ProductSerializer)


class SubclassSerializerFieldsTests(_Fixtures, TestCase):
    def test_material_serializer_exposes_base_fields(self):
        from store.serializers.product import MaterialProductSerializer
        m = self._material()
        data = MaterialProductSerializer(m).data
        self.assertEqual(data['product_code'], 'CB1/PP32M/2026-04')
        self.assertEqual(data['subject_code'], 'CB1')
        self.assertEqual(data['session_code'], '2026-04')
        self.assertEqual(data['variation_type'], 'Printed')
        self.assertEqual(data['kind'], 'material')

    def test_tutorial_serializer_exposes_format_field(self):
        from store.serializers.product import TutorialProductSerializer
        t = self._tutorial()
        data = TutorialProductSerializer(t).data
        self.assertEqual(data['format'], 'F2F_3F')
        self.assertEqual(data['kind'], 'tutorial')
        self.assertIsNone(data['tutorial_location'])
        self.assertIsNone(data['tutorial_course_template'])

    def test_marking_serializer_exposes_template_and_paper_count(self):
        from store.serializers.product import MarkingProductSerializer
        k = self._marking()
        data = MarkingProductSerializer(k).data
        self.assertEqual(data['paper_count'], 4)
        self.assertEqual(data['kind'], 'marking')
        self.assertEqual(data['marking_template'], k.marking_template_id)
        self.assertEqual(data['marking_template_code'], k.marking_template.code)


class BackwardCompatibilityTests(_Fixtures, TestCase):
    """ProductSerializer must continue to work on any subclass row."""

    def test_product_serializer_on_material_row_still_works(self):
        from store.serializers.product import ProductSerializer
        m = self._material()
        data = ProductSerializer(m).data
        self.assertEqual(data['product_code'], 'CB1/PP32M/2026-04')

    def test_product_serializer_on_tutorial_row_still_works(self):
        from store.serializers.product import ProductSerializer
        t = self._tutorial()
        data = ProductSerializer(t).data
        self.assertEqual(data['product_code'], 'CM2/P32T2/2026-04')

    def test_product_serializer_on_marking_row_still_works(self):
        from store.serializers.product import ProductSerializer
        k = self._marking()
        data = ProductSerializer(k).data
        self.assertEqual(data['product_code'], 'CS1/MP32T/2026-04')
