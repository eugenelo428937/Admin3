"""Per-filter tests for the admin event list endpoint."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from catalog.models import ExamSession
from tutorials.tests import factories


class _AuthedAdminCase(APITestCase):
    url = '/api/tutorials/admin/events/'

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)


class SubjectCodeFilterTests(_AuthedAdminCase):
    def test_filters_by_single_subject(self):
        from django.utils import timezone
        from datetime import timedelta

        es1 = ExamSession.objects.create(
            session_code='ST01',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        es2 = ExamSession.objects.create(
            session_code='ST02',
            start_date=timezone.now() + timedelta(days=60),
            end_date=timezone.now() + timedelta(days=90),
        )

        sp_cm2 = factories.make_store_product(
            subject=factories.make_subject('CM2'),
            exam_session=es1,
            cat_product_code='ST1CM2',
        )
        sp_sa1 = factories.make_store_product(
            subject=factories.make_subject('SA1'),
            exam_session=es2,
            cat_product_code='ST2SA1',
        )
        factories.make_event(store_product=sp_cm2, code='EV-CM2')
        factories.make_event(store_product=sp_sa1, code='EV-SA1')

        response = self.client.get(self.url, {'subject_codes': 'CM2'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-CM2'])

    def test_filters_by_multiple_subjects(self):
        from django.utils import timezone
        from datetime import timedelta

        es1 = ExamSession.objects.create(
            session_code='MT01',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        es2 = ExamSession.objects.create(
            session_code='MT02',
            start_date=timezone.now() + timedelta(days=60),
            end_date=timezone.now() + timedelta(days=90),
        )
        es3 = ExamSession.objects.create(
            session_code='MT03',
            start_date=timezone.now() + timedelta(days=90),
            end_date=timezone.now() + timedelta(days=120),
        )

        sp_cm2 = factories.make_store_product(
            subject=factories.make_subject('CM2'),
            exam_session=es1,
            cat_product_code='MT1CM2',
        )
        sp_sa1 = factories.make_store_product(
            subject=factories.make_subject('SA1'),
            exam_session=es2,
            cat_product_code='MT2SA1',
        )
        sp_cb1 = factories.make_store_product(
            subject=factories.make_subject('CB1'),
            exam_session=es3,
            cat_product_code='MT3CB1',
        )
        factories.make_event(store_product=sp_cm2, code='EV-CM2')
        factories.make_event(store_product=sp_sa1, code='EV-SA1')
        factories.make_event(store_product=sp_cb1, code='EV-CB1')

        response = self.client.get(self.url, {'subject_codes': 'CM2,SA1'})
        codes = sorted(e['code'] for e in response.data['results'])
        self.assertEqual(codes, ['EV-CM2', 'EV-SA1'])


class CodeIcontainsFilterTests(_AuthedAdminCase):
    def test_substring_match(self):
        from django.utils import timezone
        from datetime import timedelta

        es1 = ExamSession.objects.create(
            session_code='CI01',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        es2 = ExamSession.objects.create(
            session_code='CI02',
            start_date=timezone.now() + timedelta(days=60),
            end_date=timezone.now() + timedelta(days=90),
        )

        sp1 = factories.make_store_product(
            subject=factories.make_subject('CP1'),
            exam_session=es1,
            cat_product_code='CI1CP1',
        )
        sp2 = factories.make_store_product(
            subject=factories.make_subject('CM2'),
            exam_session=es2,
            cat_product_code='CI2CM2',
        )
        factories.make_event(store_product=sp1, code='CP1-01-24A')
        factories.make_event(store_product=sp2, code='CM2-02-24S')
        response = self.client.get(self.url, {'code': 'CP1'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['CP1-01-24A'])

    def test_case_insensitive(self):
        from django.utils import timezone
        from datetime import timedelta

        es1 = ExamSession.objects.create(
            session_code='CI03',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )

        sp1 = factories.make_store_product(
            subject=factories.make_subject('CP1'),
            exam_session=es1,
            cat_product_code='CI3CP1',
        )
        factories.make_event(store_product=sp1, code='CP1-01-24A')
        response = self.client.get(self.url, {'code': 'cp1'})
        self.assertEqual(len(response.data['results']), 1)
