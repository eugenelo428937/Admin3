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

        response = self.client.get(self.url, {'subject_codes': 'CM2', 'sitting_id': 'all'})
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

        response = self.client.get(self.url, {'subject_codes': 'CM2,SA1', 'sitting_id': 'all'})
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
        response = self.client.get(self.url, {'code': 'CP1', 'sitting_id': 'all'})
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
        response = self.client.get(self.url, {'code': 'cp1', 'sitting_id': 'all'})
        self.assertEqual(len(response.data['results']), 1)


class StartDateRangeFilterTests(_AuthedAdminCase):
    def test_start_from_includes_equal_date(self):
        from datetime import date
        from django.utils import timezone
        from datetime import timedelta

        # Create separate exam sessions for each event to avoid duplicate product codes
        es1 = ExamSession.objects.create(
            session_code='SD01',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        es2 = ExamSession.objects.create(
            session_code='SD02',
            start_date=timezone.now() + timedelta(days=60),
            end_date=timezone.now() + timedelta(days=90),
        )

        sp1 = factories.make_store_product(
            subject=factories.make_subject('SD1'),
            exam_session=es1,
            cat_product_code='SD1-PAST',
        )
        sp2 = factories.make_store_product(
            subject=factories.make_subject('SD2'),
            exam_session=es2,
            cat_product_code='SD2-CURR',
        )

        e1 = factories.make_event(store_product=sp1, code='EV-PAST')
        e1.start_date = date(2026, 1, 1); e1.end_date = date(2026, 1, 2); e1.save()
        e2 = factories.make_event(store_product=sp2, code='EV-CURR')
        e2.start_date = date(2026, 6, 1); e2.end_date = date(2026, 6, 2); e2.save()

        response = self.client.get(self.url, {'start_from': '2026-06-01', 'sitting_id': 'all'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-CURR'])

    def test_start_to_includes_equal_date(self):
        from datetime import date
        from django.utils import timezone
        from datetime import timedelta

        # Create separate exam sessions for each event to avoid duplicate product codes
        es1 = ExamSession.objects.create(
            session_code='SD03',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        es2 = ExamSession.objects.create(
            session_code='SD04',
            start_date=timezone.now() + timedelta(days=60),
            end_date=timezone.now() + timedelta(days=90),
        )

        sp1 = factories.make_store_product(
            subject=factories.make_subject('SD3'),
            exam_session=es1,
            cat_product_code='SD3-PAST2',
        )
        sp2 = factories.make_store_product(
            subject=factories.make_subject('SD4'),
            exam_session=es2,
            cat_product_code='SD4-CURR2',
        )

        e1 = factories.make_event(store_product=sp1, code='EV-PAST2')
        e1.start_date = date(2026, 1, 1); e1.end_date = date(2026, 1, 2); e1.save()
        e2 = factories.make_event(store_product=sp2, code='EV-CURR2')
        e2.start_date = date(2026, 6, 1); e2.end_date = date(2026, 6, 2); e2.save()

        response = self.client.get(self.url, {'start_to': '2026-01-31', 'sitting_id': 'all'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-PAST2'])


class FinalisationDateFilterTests(_AuthedAdminCase):
    def test_finalisation_range(self):
        from datetime import date
        from django.utils import timezone
        from datetime import timedelta

        # Create separate exam sessions for each event to avoid duplicate product codes
        es1 = ExamSession.objects.create(
            session_code='FD01',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        es2 = ExamSession.objects.create(
            session_code='FD02',
            start_date=timezone.now() + timedelta(days=60),
            end_date=timezone.now() + timedelta(days=90),
        )
        es3 = ExamSession.objects.create(
            session_code='FD03',
            start_date=timezone.now() + timedelta(days=90),
            end_date=timezone.now() + timedelta(days=120),
        )

        sp1 = factories.make_store_product(
            subject=factories.make_subject('FD1'),
            exam_session=es1,
            cat_product_code='FD1-A',
        )
        sp2 = factories.make_store_product(
            subject=factories.make_subject('FD2'),
            exam_session=es2,
            cat_product_code='FD2-B',
        )
        sp3 = factories.make_store_product(
            subject=factories.make_subject('FD3'),
            exam_session=es3,
            cat_product_code='FD3-NONE',
        )

        e1 = factories.make_event(store_product=sp1, code='EV-A')
        e1.finalisation_date = date(2026, 5, 10); e1.save()
        e2 = factories.make_event(store_product=sp2, code='EV-B')
        e2.finalisation_date = date(2026, 5, 20); e2.save()
        e3 = factories.make_event(store_product=sp3, code='EV-NONE')
        e3.save()

        response = self.client.get(
            self.url, {'finalisation_from': '2026-05-15', 'finalisation_to': '2026-05-25', 'sitting_id': 'all'},
        )
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-B'])


class LocationVenueFilterTests(_AuthedAdminCase):
    def test_location_ids_csv(self):
        from django.utils import timezone
        from datetime import timedelta

        loc1 = factories.make_location('London', 'LON')
        loc2 = factories.make_location('Manchester', 'MAN')

        es1 = ExamSession.objects.create(
            session_code='LV01',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        es2 = ExamSession.objects.create(
            session_code='LV02',
            start_date=timezone.now() + timedelta(days=60),
            end_date=timezone.now() + timedelta(days=90),
        )

        sp1 = factories.make_store_product(
            subject=factories.make_subject('LV1'),
            exam_session=es1,
            cat_product_code='LV1-LON',
        )
        sp2 = factories.make_store_product(
            subject=factories.make_subject('LV2'),
            exam_session=es2,
            cat_product_code='LV2-MAN',
        )

        e1 = factories.make_event(store_product=sp1, code='E-LON'); e1.location = loc1; e1.save()
        e2 = factories.make_event(store_product=sp2, code='E-MAN'); e2.location = loc2; e2.save()

        response = self.client.get(self.url, {'location_ids': str(loc1.id), 'sitting_id': 'all'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['E-LON'])

    def test_venue_ids_csv_multiple(self):
        from django.utils import timezone
        from datetime import timedelta

        v1 = factories.make_venue('BPP A')
        v2 = factories.make_venue('BPP B')
        v3 = factories.make_venue('BPP C')

        es1 = ExamSession.objects.create(
            session_code='VV01',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        es2 = ExamSession.objects.create(
            session_code='VV02',
            start_date=timezone.now() + timedelta(days=60),
            end_date=timezone.now() + timedelta(days=90),
        )
        es3 = ExamSession.objects.create(
            session_code='VV03',
            start_date=timezone.now() + timedelta(days=90),
            end_date=timezone.now() + timedelta(days=120),
        )

        sp1 = factories.make_store_product(
            subject=factories.make_subject('VV1'),
            exam_session=es1,
            cat_product_code='VV1-A',
        )
        sp2 = factories.make_store_product(
            subject=factories.make_subject('VV2'),
            exam_session=es2,
            cat_product_code='VV2-B',
        )
        sp3 = factories.make_store_product(
            subject=factories.make_subject('VV3'),
            exam_session=es3,
            cat_product_code='VV3-C',
        )

        e1 = factories.make_event(store_product=sp1, code='E-A'); e1.venue = v1; e1.save()
        e2 = factories.make_event(store_product=sp2, code='E-B'); e2.venue = v2; e2.save()
        e3 = factories.make_event(store_product=sp3, code='E-C'); e3.venue = v3; e3.save()

        response = self.client.get(self.url, {'venue_ids': f'{v1.id},{v3.id}', 'sitting_id': 'all'})
        codes = sorted(e['code'] for e in response.data['results'])
        self.assertEqual(codes, ['E-A', 'E-C'])


class InstructorUnionFilterTests(_AuthedAdminCase):
    def test_matches_when_main_instructor(self):
        from django.utils import timezone
        from datetime import timedelta

        karen = factories.make_instructor('Karen', 'Smith')
        mark = factories.make_instructor('Mark', 'Davis')

        es1 = ExamSession.objects.create(
            session_code='IN01',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        es2 = ExamSession.objects.create(
            session_code='IN02',
            start_date=timezone.now() + timedelta(days=60),
            end_date=timezone.now() + timedelta(days=90),
        )

        sp_k = factories.make_store_product(
            subject=factories.make_subject('IN1'),
            exam_session=es1,
            cat_product_code='IN1-K',
        )
        sp_m = factories.make_store_product(
            subject=factories.make_subject('IN2'),
            exam_session=es2,
            cat_product_code='IN2-M',
        )

        e_karen = factories.make_event(store_product=sp_k, code='E-K')
        e_karen.main_instructor = karen; e_karen.save()
        e_mark = factories.make_event(store_product=sp_m, code='E-M')
        e_mark.main_instructor = mark; e_mark.save()

        response = self.client.get(self.url, {'instructor_id': str(karen.id), 'sitting_id': 'all'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['E-K'])

    def test_matches_when_session_instructor_only(self):
        from django.utils import timezone
        from datetime import timedelta

        karen = factories.make_instructor('Karen', 'Smith')

        es = ExamSession.objects.create(
            session_code='IN03',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )

        sp = factories.make_store_product(
            subject=factories.make_subject('IN3'),
            exam_session=es,
            cat_product_code='IN3-SESS',
        )

        e = factories.make_event(store_product=sp, code='E-SESS')
        s = factories.make_session(event=e, sequence=1, title='E-SESS-1')
        s.instructors.add(karen)

        response = self.client.get(self.url, {'instructor_id': str(karen.id), 'sitting_id': 'all'})
        codes = [r['code'] for r in response.data['results']]
        self.assertEqual(codes, ['E-SESS'])

    def test_no_duplicate_when_main_and_session(self):
        from django.utils import timezone
        from datetime import timedelta

        karen = factories.make_instructor('Karen', 'Smith')

        es = ExamSession.objects.create(
            session_code='IN04',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )

        sp = factories.make_store_product(
            subject=factories.make_subject('IN4'),
            exam_session=es,
            cat_product_code='IN4-BOTH',
        )

        e = factories.make_event(store_product=sp, code='E-BOTH')
        e.main_instructor = karen; e.save()
        s = factories.make_session(event=e, sequence=1, title='E-BOTH-1')
        s.instructors.add(karen)

        response = self.client.get(self.url, {'instructor_id': str(karen.id), 'sitting_id': 'all'})
        self.assertEqual(len(response.data['results']), 1)


class SittingFilterTests(_AuthedAdminCase):
    def test_default_picks_latest_sitting(self):
        from datetime import datetime, timezone as tz
        old = factories.make_exam_session(code='OLD')
        old.start_date = datetime(2024, 1, 1, tzinfo=tz.utc); old.save()
        new = factories.make_exam_session(code='NEW')
        new.start_date = datetime(2026, 4, 1, tzinfo=tz.utc); new.save()

        sp_old = factories.make_store_product(exam_session=old)
        sp_new = factories.make_store_product(exam_session=new)
        factories.make_event(store_product=sp_old, code='EV-OLD')
        factories.make_event(store_product=sp_new, code='EV-NEW')

        response = self.client.get(self.url)  # no sitting_id
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-NEW'])

    def test_explicit_sitting_id_overrides(self):
        from datetime import datetime, timezone as tz
        old = factories.make_exam_session(code='OLD')
        old.start_date = datetime(2024, 1, 1, tzinfo=tz.utc); old.save()
        new = factories.make_exam_session(code='NEW')
        new.start_date = datetime(2026, 4, 1, tzinfo=tz.utc); new.save()
        sp_old = factories.make_store_product(exam_session=old)
        sp_new = factories.make_store_product(exam_session=new)
        factories.make_event(store_product=sp_old, code='EV-OLD')
        factories.make_event(store_product=sp_new, code='EV-NEW')

        response = self.client.get(self.url, {'sitting_id': str(old.id)})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-OLD'])

    def test_all_sentinel_disables_filter(self):
        from datetime import datetime, timezone as tz
        old = factories.make_exam_session(code='OLD')
        old.start_date = datetime(2024, 1, 1, tzinfo=tz.utc); old.save()
        new = factories.make_exam_session(code='NEW')
        new.start_date = datetime(2026, 4, 1, tzinfo=tz.utc); new.save()
        sp_old = factories.make_store_product(exam_session=old)
        sp_new = factories.make_store_product(exam_session=new)
        factories.make_event(store_product=sp_old, code='EV-OLD')
        factories.make_event(store_product=sp_new, code='EV-NEW')

        response = self.client.get(self.url, {'sitting_id': 'all'})
        codes = sorted(e['code'] for e in response.data['results'])
        self.assertEqual(codes, ['EV-NEW', 'EV-OLD'])
