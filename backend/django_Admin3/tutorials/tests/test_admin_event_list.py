"""Admin event list — permission, basic shape, ordering, pagination."""
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from tutorials.tests import factories


class AdminEventListPermissionTests(APITestCase):
    def setUp(self):
        self.url = '/api/tutorials/admin/events/'

    def test_anonymous_forbidden(self):
        response = self.client.get(self.url)
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_regular_user_forbidden(self):
        user = User.objects.create_user(username='regular', password='x')
        self.client.force_authenticate(user=user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_allowed(self):
        admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)


class AdminEventListShapeTests(APITestCase):
    def setUp(self):
        self.url = '/api/tutorials/admin/events/'
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_event_includes_full_field_set(self):
        loc = factories.make_location(name='London')
        venue = factories.make_venue(name='BPP Centre', location=loc)
        instr = factories.make_instructor(first_name='Karen', last_name='Smith')
        event = factories.make_event(code='CP1-01-24A')
        event.location = loc
        event.venue = venue
        event.main_instructor = instr
        event.save()

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        self.assertEqual(len(results), 1)
        ev = results[0]
        self.assertEqual(ev['code'], 'CP1-01-24A')
        self.assertEqual(ev['location']['name'], 'London')
        self.assertEqual(ev['venue']['name'], 'BPP Centre')
        self.assertEqual(ev['main_instructor']['name'], 'Karen Smith')
        self.assertEqual(ev['subject']['code'], 'CM2')  # default factory subject
        self.assertIn('exam_session', ev)
        self.assertIn('sessions', ev)

    def test_sessions_embedded_in_order(self):
        event = factories.make_event(code='EV-MULTI')
        s2 = factories.make_session(event=event, sequence=2, title='EV-MULTI-2')
        s1 = factories.make_session(event=event, sequence=1, title='EV-MULTI-1')

        response = self.client.get(self.url)
        sessions = response.data['results'][0]['sessions']
        self.assertEqual([s['title'] for s in sessions], ['EV-MULTI-1', 'EV-MULTI-2'])
        self.assertEqual(sessions[0]['sequence'], 1)


class AdminEventListEnrolmentCountsTests(APITestCase):
    def setUp(self):
        self.url = '/api/tutorials/admin/events/'
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_event_enrolled_distinct_counts_each_student_once(self):
        event = factories.make_event(code='EV-DIS')
        s1 = factories.make_session(event=event, sequence=1, title='EV-DIS-1')
        s2 = factories.make_session(event=event, sequence=2, title='EV-DIS-2')
        alice = factories.make_student('alice')
        bob = factories.make_student('bob')

        # Alice in s1+s2, Bob in s2 only.
        from tutorials.models import TutorialRegistration
        TutorialRegistration.objects.create(student=alice, tutorial_session=s1)
        TutorialRegistration.objects.create(student=alice, tutorial_session=s2)
        TutorialRegistration.objects.create(student=bob,   tutorial_session=s2)

        response = self.client.get(self.url)
        ev = response.data['results'][0]
        self.assertEqual(ev['enrolled_distinct'], 2)
        sessions_by_seq = {s['sequence']: s for s in ev['sessions']}
        self.assertEqual(sessions_by_seq[1]['enrolled_count'], 1)
        self.assertEqual(sessions_by_seq[2]['enrolled_count'], 2)

    def test_inactive_registrations_excluded_from_counts(self):
        event = factories.make_event(code='EV-INACT')
        s1 = factories.make_session(event=event, sequence=1, title='EV-INACT-1')
        alice = factories.make_student('alice2')
        from tutorials.models import TutorialRegistration
        reg = TutorialRegistration.objects.create(
            student=alice, tutorial_session=s1,
        )
        reg.is_active = False
        reg.save()

        response = self.client.get(self.url)
        ev = response.data['results'][0]
        self.assertEqual(ev['enrolled_distinct'], 0)
        self.assertEqual(ev['sessions'][0]['enrolled_count'], 0)


class AdminEventListOrderingTests(APITestCase):
    def setUp(self):
        self.url = '/api/tutorials/admin/events/'
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_default_ordering_start_date_asc(self):
        from datetime import date
        sp1 = factories.make_store_product(cat_product_code='Live1')
        sp2 = factories.make_store_product(cat_product_code='Live2')
        e1 = factories.make_event(store_product=sp1, code='EV-LATE')
        e1.lms_start_date = timezone.make_aware(timezone.datetime(2026, 8, 1)); e1.save()
        e2 = factories.make_event(store_product=sp2, code='EV-EARLY')
        e2.lms_start_date = timezone.make_aware(timezone.datetime(2026, 6, 1)); e2.save()

        response = self.client.get(self.url)
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-EARLY', 'EV-LATE'])

    def test_ordering_param_respected_when_whitelisted(self):
        from datetime import date
        sp1 = factories.make_store_product(cat_product_code='Live3')
        sp2 = factories.make_store_product(cat_product_code='Live4')
        e1 = factories.make_event(store_product=sp1, code='EV-LATE')
        e1.lms_start_date = timezone.make_aware(timezone.datetime(2026, 8, 1)); e1.save()
        e2 = factories.make_event(store_product=sp2, code='EV-EARLY')
        e2.lms_start_date = timezone.make_aware(timezone.datetime(2026, 6, 1)); e2.save()

        response = self.client.get(self.url, {'ordering': '-lms_start_date'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-LATE', 'EV-EARLY'])

    def test_ordering_param_ignored_when_not_whitelisted(self):
        sp1 = factories.make_store_product(cat_product_code='Live5')
        sp2 = factories.make_store_product(cat_product_code='Live6')
        e1 = factories.make_event(store_product=sp1, code='EV-A')
        e1.lms_start_date = timezone.make_aware(timezone.datetime(2026, 6, 1)); e1.save()
        e2 = factories.make_event(store_product=sp2, code='EV-B')
        e2.lms_start_date = timezone.make_aware(timezone.datetime(2026, 8, 1)); e2.save()

        # Reject 'unsafe_field' — fall back to default (start_date asc).
        response = self.client.get(self.url, {'ordering': 'unsafe_field'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-A', 'EV-B'])


class AdminEventListPaginationTests(APITestCase):
    def setUp(self):
        self.url = '/api/tutorials/admin/events/'
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_page_size_param_respected(self):
        for i in range(25):
            sp = factories.make_store_product(cat_product_code=f'Live{i}')
            factories.make_event(store_product=sp, code=f'EV-{i:03d}')
        response = self.client.get(self.url, {'page_size': '10'})
        self.assertEqual(len(response.data['results']), 10)
        self.assertEqual(response.data['count'], 25)

    def test_page_size_capped_at_max(self):
        for i in range(5):
            sp = factories.make_store_product(cat_product_code=f'Live{100+i}')
            factories.make_event(store_product=sp, code=f'EV-{i:03d}')
        response = self.client.get(self.url, {'page_size': '999'})
        # max_page_size=200; we only have 5 events, all returned.
        self.assertEqual(len(response.data['results']), 5)
