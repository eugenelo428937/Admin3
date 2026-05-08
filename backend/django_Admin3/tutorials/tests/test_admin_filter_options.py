"""Filter-options endpoint — populates the dropdown sources."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from tutorials.tests import factories


class FilterOptionsTests(APITestCase):
    url = '/api/tutorials/admin/events/filter-options/'

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_anonymous_forbidden(self):
        self.client.logout()
        response = self.client.get(self.url)
        self.assertIn(response.status_code, [401, 403])

    def test_returns_expected_keys(self):
        # seed minimal data
        factories.make_event()
        factories.make_location()
        factories.make_venue()
        factories.make_instructor()

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        for key in (
            'subjects', 'locations', 'venues', 'instructors',
            'sittings', 'event_codes',
        ):
            self.assertIn(key, response.data)

    def test_event_codes_distinct_and_sorted(self):
        # Codes should be returned sorted ascending, with no duplicates.
        # (TutorialEvents.code is already unique at the DB level.)
        sp1 = factories.make_store_product(subject=factories.make_subject('CP1'))
        sp2 = factories.make_store_product(subject=factories.make_subject('SA1'))
        sp3 = factories.make_store_product(subject=factories.make_subject('CB1'))
        factories.make_event(store_product=sp1, code='CP1-A1')
        factories.make_event(store_product=sp2, code='SA1-Z9')
        factories.make_event(store_product=sp3, code='CB1-A2')

        response = self.client.get(self.url)
        codes = response.data['event_codes']
        self.assertEqual(codes, sorted(codes))
        self.assertEqual(set(codes), {'CP1-A1', 'SA1-Z9', 'CB1-A2'})
        self.assertEqual(len(codes), len(set(codes)))

    def test_subject_shape(self):
        factories.make_event()
        response = self.client.get(self.url)
        self.assertEqual(set(response.data['subjects'][0].keys()),
                         {'code', 'description'})

    def test_subjects_only_returns_active_uk(self):
        from catalog.subject.models import Subject
        # UK + active -> included
        Subject.objects.create(code='CB1', description='Business',
                               subject_type=Subject.SubjectType.UK, active=True)
        # UK + inactive -> excluded
        Subject.objects.create(code='CB2', description='Inactive',
                               subject_type=Subject.SubjectType.UK, active=False)
        # SA + active -> excluded
        Subject.objects.create(code='SA-CB1', description='SA variant',
                               subject_type=Subject.SubjectType.SA, active=True)
        # CAA + active -> excluded
        Subject.objects.create(code='CAA-A', description='CAA',
                               subject_type=Subject.SubjectType.CAA, active=True)
        factories.make_event()  # ensures at least one event exists

        response = self.client.get(self.url)
        codes = {s['code'] for s in response.data['subjects']}
        self.assertIn('CB1', codes)
        self.assertNotIn('CB2', codes)       # inactive
        self.assertNotIn('SA-CB1', codes)    # not UK
        self.assertNotIn('CAA-A', codes)     # not UK

    def test_instructor_uses_full_name(self):
        factories.make_instructor(first_name='Karen', last_name='Smith')
        factories.make_event()
        response = self.client.get(self.url)
        names = {i['name'] for i in response.data['instructors']}
        self.assertIn('Karen Smith', names)

    def test_instructors_skipped_when_staff_null(self):
        from tutorials.models import TutorialInstructor
        TutorialInstructor.objects.create(staff=None, is_active=True)
        factories.make_event()
        response = self.client.get(self.url)
        # No name composable -> not included.
        self.assertNotIn(
            None, [i.get('name') for i in response.data['instructors']],
        )

    def test_venue_no_is_active_filter_returns_all(self):
        factories.make_venue('A')
        factories.make_venue('B')
        factories.make_event()
        response = self.client.get(self.url)
        names = {v['name'] for v in response.data['venues']}
        self.assertEqual(names, {'A', 'B'})
