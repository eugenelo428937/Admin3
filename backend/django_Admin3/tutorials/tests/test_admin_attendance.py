"""Admin attendance APIView — GET (roster + meta + enabled flag)."""
from datetime import datetime, timedelta, timezone as tz

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from orders.models import Order, OrderItem
from tutorials.models import TutorialAttendance, TutorialRegistration
from tutorials.tests import factories


def _url(session_id):
    return f'/api/tutorials/admin/sessions/{session_id}/attendance/'


def _register(student, session):
    oi = OrderItem.objects.create(
        order=Order.objects.create(user=student.user),
        purchasable=session.tutorial_event.store_product.purchasable_ptr,
    )
    return TutorialRegistration.objects.create(
        student=student, tutorial_session=session, order_item=oi,
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
        )
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
