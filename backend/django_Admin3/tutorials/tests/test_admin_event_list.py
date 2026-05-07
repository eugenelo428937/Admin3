"""Admin event list — permission, basic shape, ordering, pagination."""
from django.contrib.auth.models import User
from django.urls import reverse
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
