"""Admin attendance APIView — GET (roster + meta + enabled flag)."""
from datetime import datetime, timedelta, timezone as tz

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from tutorials.models import TutorialAttendance, TutorialRegistration
from tutorials.tests import factories


def _url(session_id):
    return f'/api/tutorials/admin/sessions/{session_id}/attendance/'


def _register(student, session):
    return TutorialRegistration.objects.create(
        student=student, tutorial_session=session,
    )


class AdminAttendanceGetTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_anonymous_forbidden(self):
        session = factories.make_session()
        self.client.logout()
        response = self.client.get(_url(session.id))
        self.assertIn(response.status_code, [401, 403])

    def test_unknown_session_returns_404(self):
        response = self.client.get(_url(999_999))
        self.assertEqual(response.status_code, 404)

    def test_session_in_cancelled_event_returns_404(self):
        event = factories.make_event(code='EV-X')
        session = factories.make_session(event=event)
        event.cancelled = True; event.save()
        response = self.client.get(_url(session.id))
        self.assertEqual(response.status_code, 404)

    def test_returns_session_meta(self):
        event = factories.make_event(code='EV-META')
        session = factories.make_session(event=event, sequence=1, title='EV-META-1')
        response = self.client.get(_url(session.id))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['session']['title'], 'EV-META-1')
        self.assertEqual(response.data['session']['tutorial_event']['code'], 'EV-META')

    def test_attendance_enabled_true_when_started(self):
        session = factories.make_session()
        session.start_date = timezone.now() - timedelta(hours=1); session.save()
        response = self.client.get(_url(session.id))
        self.assertTrue(response.data['attendance_enabled'])

    def test_attendance_enabled_false_when_not_started(self):
        session = factories.make_session()
        session.start_date = timezone.now() + timedelta(days=2); session.save()
        response = self.client.get(_url(session.id))
        self.assertFalse(response.data['attendance_enabled'])

    def test_roster_includes_existing_status(self):
        session = factories.make_session()
        alice = factories.make_student('alice')
        reg = _register(alice, session)
        TutorialAttendance.objects.create(
            registration=reg, status='ATTENDED', recorded_by=self.admin,
            recorded_at=timezone.now(),
        )  # recorded_at provided for existing test
        response = self.client.get(_url(session.id))
        rows = response.data['registrations']
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['current_status'], 'ATTENDED')

    def test_roster_excludes_inactive(self):
        session = factories.make_session()
        alice = factories.make_student('alice')
        reg = _register(alice, session)
        reg.is_active = False; reg.save()
        response = self.client.get(_url(session.id))
        self.assertEqual(response.data['registrations'], [])

    def test_roster_ordered_by_last_then_first_name(self):
        session = factories.make_session()
        bob = factories.make_student('bob')
        bob.user.last_name = 'Lee'; bob.user.first_name = 'Bob'; bob.user.save()
        alice = factories.make_student('alice')
        alice.user.last_name = 'Adams'; alice.user.first_name = 'Alice'; alice.user.save()
        _register(bob, session); _register(alice, session)

        response = self.client.get(_url(session.id))
        names = [(r['student']['last_name'], r['student']['first_name'])
                 for r in response.data['registrations']]
        self.assertEqual(names, [('Adams', 'Alice'), ('Lee', 'Bob')])


class AdminAttendancePostTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.session = factories.make_session()
        self.session.start_date = timezone.now() - timedelta(hours=2)
        self.session.save()
        self.alice = factories.make_student('alice')
        self.bob = factories.make_student('bob')
        self.alice_reg = _register(self.alice, self.session)
        self.bob_reg = _register(self.bob, self.session)

    def test_creates_attendance_rows(self):
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
            {'registration_id': self.bob_reg.id,   'status': 'ABSENT',   'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(TutorialAttendance.objects.count(), 2)
        a = TutorialAttendance.objects.get(registration=self.alice_reg)
        self.assertEqual(a.status, 'ATTENDED')

    def test_updates_existing_attendance(self):
        TutorialAttendance.objects.create(
            registration=self.alice_reg, status='ABSENT', recorded_by=self.admin,
            recorded_at=timezone.now(),
        )
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(TutorialAttendance.objects.count(), 1)
        a = TutorialAttendance.objects.get(registration=self.alice_reg)
        self.assertEqual(a.status, 'ATTENDED')

    def test_rejects_other_with_blank_reason(self):
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'OTHER', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('reason', str(response.data).lower())
        self.assertEqual(TutorialAttendance.objects.count(), 0)

    def test_rejects_invalid_status(self):
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'BOGUS', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 400)

    def test_rejects_registration_from_other_session(self):
        other_sp = factories.make_store_product(subject=factories.make_subject('SA1'))
        other_event = factories.make_event(code='OTHER-EVT', store_product=other_sp)
        other_session = factories.make_session(event=other_event, sequence=99)
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
        ]}
        response = self.client.post(_url(other_session.id), body, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('do not belong', str(response.data).lower())

    def test_returns_refreshed_get_shape(self):
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertIn('session', response.data)
        self.assertIn('registrations', response.data)
        self.assertIn('attendance_enabled', response.data)


class AdminAttendancePostExtraTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.session = factories.make_session()
        self.alice = factories.make_student('alice')
        self.alice_reg = _register(self.alice, self.session)

    def test_returns_409_when_attendance_not_enabled(self):
        # Session in the future
        self.session.start_date = timezone.now() + timedelta(days=2)
        self.session.save()
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data.get('code'), 'not_yet_open')
        self.assertEqual(TutorialAttendance.objects.count(), 0)

    def test_recorded_by_from_request_user_not_body(self):
        self.session.start_date = timezone.now() - timedelta(hours=1)
        self.session.save()
        other = User.objects.create_user(username='other', is_superuser=True)
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED',
             'reason': '', 'recorded_by': other.id},  # spoof attempt
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 200)
        a = TutorialAttendance.objects.get(registration=self.alice_reg)
        self.assertEqual(a.recorded_by, self.admin)

    def test_atomic_rollback_on_partial_failure(self):
        self.session.start_date = timezone.now() - timedelta(hours=1)
        self.session.save()
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
            {'registration_id': self.alice_reg.id, 'status': 'OTHER', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 400)
        # First item must NOT have been written.
        self.assertEqual(TutorialAttendance.objects.count(), 0)
