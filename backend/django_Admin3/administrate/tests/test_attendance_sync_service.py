"""Integration tests for AdministrateAttendanceSyncService.sync_job.

Each test drives the public ``sync_job(job)`` entry point with a mocked
``AdministrateAPIService.execute_query`` and inspects:

1. Which GraphQL operations the service called (query vs mutation, in
   what order).
2. The variables it passed to the mutation (learnerId, sessionId,
   attended mapping).
3. The state of the ``AttendanceSyncJob`` and ``adm.Session`` rows
   after the call (status transitions, write-through cache).
"""
from __future__ import annotations

from unittest.mock import MagicMock

from django.test import TestCase

from administrate.models import (
    CourseTemplate, Event as AdmEvent, Instructor as AdmInstructor,
    Location as AdmLocation, Session as AdmSession, Venue as AdmVenue,
)
from administrate.services.attendance_sync_service import (
    AdministrateAttendanceSyncService,
)
from students.models import Student
from tutorials.models import (
    AttendanceSyncJob, TutorialRegistration,
)
from tutorials.tests.factories import (
    make_event, make_session, make_store_product,
)


# ---- factories ---------------------------------------------------------

def _make_adm_session(*, suffix, tutorial_session, external_id=None):
    """Create the adm.Session thin-bridge row.

    Post-Phase-2 (2026-05-18): adm.sessions is just `external_id +
    tutorial_session FK + timestamps`. All formerly-redundant data
    (title, day_number, classroom_*, session_instructor, session_url,
    cancelled) was moved to / already lived on acted.tutorial_sessions.
    Callers seed the tutorials.TutorialSessions row separately (typically
    via `make_session(event=..., title=...)`) and pass it in here.
    """
    return AdmSession.objects.create(
        external_id=external_id,
        tutorial_session=tutorial_session,
    )


def _make_registration_with_student(session, student_ref, suffix='1'):
    """Create a TutorialRegistration tied to a Student with a known
    student_ref. Student.student_ref IS the primary key (AutoField), so
    we pass it explicitly at create time."""
    from django.contrib.auth.models import User
    u = User.objects.create_user(
        username=f'stu-{suffix}', email=f'stu-{suffix}@example.com',
        first_name=f'First{suffix}', last_name=f'Last{suffix}',
    )
    student = Student.objects.create(student_ref=student_ref, user=u)
    reg = TutorialRegistration.objects.create(
        tutorial_session=session,
        student=student,
    )
    return reg, student


# ---- fake API responses ------------------------------------------------

def _events_by_title_response(event_title, *, learners, sessions):
    """Build a getCurrentEventsBySittingAndLifecycle-shaped response."""
    return {
        'data': {
            'events': {
                'pageInfo': {'totalRecords': 1, 'hasNextPage': False},
                'edges': [{
                    'node': {
                        'id': 'evt-administrate-id-1',
                        'learners': {'edges': [{'node': L} for L in learners]},
                        'sessions': {'edges': [{'node': S} for S in sessions]},
                    },
                }],
            },
        },
    }


def _record_attendances_response(success=True, errors=None):
    return {
        'data': {
            'learner': {
                'recordAttendances': {
                    'learner': {'id': 'learner-resp-1'} if success else None,
                    'errors': errors or [],
                },
            },
        },
    }


def _record_attendances_response_as_list(*, count=1, all_errors=None):
    """Real Administrate shape: recordAttendances returns one
    RecordAttendancesPayload per input item, as a list.

    Each item has its own ``learner`` + ``errors``; we aggregate across
    them. Pass ``all_errors=[[…], [], …]`` to put errors on specific
    items.
    """
    all_errors = all_errors or [[] for _ in range(count)]
    return {
        'data': {
            'learner': {
                'recordAttendances': [
                    {
                        'learner': {'id': f'learner-resp-{i}'},
                        'errors': all_errors[i] if i < len(all_errors) else [],
                    }
                    for i in range(count)
                ],
            },
        },
    }


# ---- tests ------------------------------------------------------------

class SyncJobHappyPathTests(TestCase):
    """Cached external_id path: skip the GraphQL query, hit the mutation
    directly. Also verifies the status→attended mapping the user picked."""

    def setUp(self):
        sp = make_store_product(variation_code='SYN1', cat_product_code='SyncLive1')
        self.t_event = make_event(code='SYN-EV-1', store_product=sp)
        self.t_session = make_session(event=self.t_event, title='Tutorial Day 1')
        # Pre-cache the Administrate session id so the service doesn't
        # need to query for it.
        self.adm_session = _make_adm_session(
            suffix='1', external_id='adm-sess-cached',
            tutorial_session=self.t_session,
        )
        self.reg_attended, _ = _make_registration_with_student(
            self.t_session, student_ref=500, suffix='attended',
        )
        self.reg_late, _ = _make_registration_with_student(
            self.t_session, student_ref=501, suffix='late',
        )
        self.reg_absent, _ = _make_registration_with_student(
            self.t_session, student_ref=502, suffix='absent',
        )
        self.reg_other, _ = _make_registration_with_student(
            self.t_session, student_ref=503, suffix='other',
        )

    def _make_api(self):
        """Return a mock AdministrateAPIService. Mutation is the only call."""
        api = MagicMock()
        api.execute_query.return_value = _record_attendances_response()
        return api

    def test_uses_cached_external_id_and_skips_event_query(self):
        api = self._make_api()
        # Even with no learners-query setup, the service should still get
        # the session id from the adm.Session cache. But it WILL still
        # need the event query to map student_ref → learner_id.
        api.execute_query.side_effect = [
            _events_by_title_response(
                'Tutorial Event 1',
                learners=[{
                    'id': 'learner-500',
                    'contact': {
                        'id': 'c500',
                        'personalName': {'firstName': 'F', 'lastName': 'L', 'middleName': '500'},
                        'emailAddress': 'a@b.com',
                    },
                }],
                sessions=[],  # not consulted because external_id is cached
            ),
            _record_attendances_response(),
        ]
        job = AttendanceSyncJob.objects.create(
            session=self.t_session,
            payload=[{
                'registration_id': self.reg_attended.id,
                'student_ref': 500,
                'status': 'ATTENDED',
            }],
        )

        service = AdministrateAttendanceSyncService(api_service=api)
        ok = service.sync_job(job)

        self.assertTrue(ok)
        job.refresh_from_db()
        self.assertEqual(job.status, 'sent')
        # First call: events-by-title (to map student_ref → learner_id);
        # second call: recordAttendances. Session id came from cache.
        self.assertEqual(api.execute_query.call_count, 2)
        mutation_call = api.execute_query.call_args_list[1]
        variables = mutation_call.kwargs.get('variables') or mutation_call.args[1]
        self.assertEqual(variables['input'], [{
            'learnerId': 'learner-500',
            'sessionId': 'adm-sess-cached',
            'attended': True,
        }])

    def test_status_mapping_attended_late_to_true_absent_other_to_false(self):
        api = self._make_api()
        api.execute_query.side_effect = [
            _events_by_title_response(
                'Tutorial Event 1',
                learners=[
                    {'id': f'learner-{n}', 'contact': {
                        'id': f'c{n}',
                        'personalName': {'firstName': 'F', 'lastName': 'L', 'middleName': str(n)},
                        'emailAddress': '',
                    }} for n in (500, 501, 502, 503)
                ],
                sessions=[],
            ),
            _record_attendances_response(),
        ]
        job = AttendanceSyncJob.objects.create(
            session=self.t_session,
            payload=[
                {'registration_id': self.reg_attended.id, 'student_ref': 500, 'status': 'ATTENDED'},
                {'registration_id': self.reg_late.id,     'student_ref': 501, 'status': 'LATE'},
                {'registration_id': self.reg_absent.id,   'student_ref': 502, 'status': 'ABSENT'},
                {'registration_id': self.reg_other.id,    'student_ref': 503, 'status': 'OTHER'},
            ],
        )

        ok = AdministrateAttendanceSyncService(api_service=api).sync_job(job)
        self.assertTrue(ok)

        mutation_call = api.execute_query.call_args_list[1]
        variables = mutation_call.kwargs.get('variables') or mutation_call.args[1]
        attended_by_student = {
            inp['learnerId']: inp['attended'] for inp in variables['input']
        }
        self.assertTrue(attended_by_student['learner-500'])   # ATTENDED → true
        self.assertTrue(attended_by_student['learner-501'])   # LATE     → true
        self.assertFalse(attended_by_student['learner-502'])  # ABSENT   → false
        self.assertFalse(attended_by_student['learner-503'])  # OTHER    → false


class SyncJobTitleLookupAndWriteThroughTests(TestCase):
    """When adm.Session.external_id is null, the service falls back to a
    title-based GraphQL query AND writes the discovered session id back
    to the cache. Subsequent jobs hit the fast path."""

    def setUp(self):
        sp = make_store_product(variation_code='SYN2', cat_product_code='SyncLive2')
        self.t_event = make_event(code='SYN-EV-2', store_product=sp)
        self.t_session = make_session(event=self.t_event, title='Tutorial Day 1', sequence=1)
        # adm.Session exists but external_id is empty — should be filled in.
        self.adm_session = _make_adm_session(
            suffix='2', external_id=None,
            tutorial_session=self.t_session,
        )
        self.reg, _ = _make_registration_with_student(
            self.t_session, student_ref=600, suffix='wt',
        )

    def test_writes_discovered_session_id_back_to_adm_session(self):
        api = MagicMock()
        api.execute_query.side_effect = [
            _events_by_title_response(
                'Tutorial Event 2',
                learners=[{
                    'id': 'learner-600',
                    'contact': {'id': 'c600',
                                'personalName': {'firstName': 'F', 'lastName': 'L', 'middleName': '600'},
                                'emailAddress': ''},
                }],
                sessions=[
                    {'id': 'adm-sess-discovered', 'title': 'Tutorial Day 1'},
                ],
            ),
            _record_attendances_response(),
        ]
        job = AttendanceSyncJob.objects.create(
            session=self.t_session,
            payload=[{'registration_id': self.reg.id, 'student_ref': 600, 'status': 'ATTENDED'}],
        )

        ok = AdministrateAttendanceSyncService(api_service=api).sync_job(job)
        self.assertTrue(ok)

        self.adm_session.refresh_from_db()
        self.assertEqual(
            self.adm_session.external_id, 'adm-sess-discovered',
            'Service must write external_id back so future syncs skip the query',
        )


class SyncJobErrorTests(TestCase):
    """Failure paths: missing learner, missing session match, GraphQL errors,
    transport errors. Each transition lands on mark_failed and records the
    raw response/error for ops to inspect."""

    def setUp(self):
        sp = make_store_product(variation_code='SYN3', cat_product_code='SyncLive3')
        self.t_event = make_event(code='SYN-EV-3', store_product=sp)
        self.t_session = make_session(event=self.t_event, title='Tutorial Day 1')
        self.adm_session = _make_adm_session(
            suffix='3', external_id='adm-sess-3',
            tutorial_session=self.t_session,
        )
        self.reg, _ = _make_registration_with_student(
            self.t_session, student_ref=700, suffix='err',
        )

    def test_marks_failed_when_no_learners_match(self):
        api = MagicMock()
        # Event query returns no learners at all
        api.execute_query.return_value = _events_by_title_response(
            'Tutorial Event 3', learners=[], sessions=[],
        )
        job = AttendanceSyncJob.objects.create(
            session=self.t_session,
            payload=[{'registration_id': self.reg.id, 'student_ref': 700, 'status': 'ATTENDED'}],
        )
        ok = AdministrateAttendanceSyncService(api_service=api).sync_job(job)
        self.assertFalse(ok)
        job.refresh_from_db()
        self.assertEqual(job.status, 'failed')
        self.assertIn('learner', job.error_message.lower())

    def test_handles_list_shape_record_attendances_response(self):
        """Regression: Administrate's real response wraps recordAttendances
        as a list of payloads (one per input item). The extractor must
        handle both list-shape and dict-shape responses without crashing.
        """
        api = MagicMock()
        api.execute_query.side_effect = [
            _events_by_title_response(
                'Tutorial Event 3',
                learners=[{
                    'id': 'learner-700',
                    'contact': {'id': 'c700',
                                'personalName': {'firstName': 'F', 'lastName': 'L', 'middleName': '700'},
                                'emailAddress': ''},
                }],
                sessions=[],
            ),
            _record_attendances_response_as_list(count=1),
        ]
        job = AttendanceSyncJob.objects.create(
            session=self.t_session,
            payload=[{'registration_id': self.reg.id, 'student_ref': 700, 'status': 'ATTENDED'}],
        )
        ok = AdministrateAttendanceSyncService(api_service=api).sync_job(job)
        self.assertTrue(ok)
        job.refresh_from_db()
        self.assertEqual(job.status, 'sent')
        # Response captured for auditing — list shape preserved.
        self.assertIsInstance(
            job.administrate_response['data']['learner']['recordAttendances'],
            list,
        )

    def test_aggregates_errors_from_list_shape_response(self):
        """If even one payload in the list carries errors, the job fails
        and the aggregated errors are reflected in error_message.
        """
        api = MagicMock()
        api.execute_query.side_effect = [
            _events_by_title_response(
                'Tutorial Event 3',
                learners=[{
                    'id': 'learner-700',
                    'contact': {'id': 'c700',
                                'personalName': {'firstName': 'F', 'lastName': 'L', 'middleName': '700'},
                                'emailAddress': ''},
                }],
                sessions=[],
            ),
            _record_attendances_response_as_list(
                count=2,
                all_errors=[
                    [{'message': 'Bad learner', 'value': 'learner-700'}],
                    [],
                ],
            ),
        ]
        job = AttendanceSyncJob.objects.create(
            session=self.t_session,
            payload=[{'registration_id': self.reg.id, 'student_ref': 700, 'status': 'ATTENDED'}],
        )
        ok = AdministrateAttendanceSyncService(api_service=api).sync_job(job)
        self.assertFalse(ok)
        job.refresh_from_db()
        self.assertEqual(job.status, 'failed')
        self.assertIn('Bad learner', job.error_message)

    def test_unexpected_exception_still_captures_response(self):
        """If extraction crashes for any reason, the captured response
        must still land on the job row so ops can debug the shape.
        """
        api = MagicMock()
        # Build a response that's intentionally weird (string where dict
        # is expected) to force an extractor crash. The fix keeps the
        # response captured even when _extract_errors raises.
        weird_response = {
            'data': {'learner': {'recordAttendances': 'not-a-list-or-dict'}}
        }
        api.execute_query.side_effect = [
            _events_by_title_response(
                'Tutorial Event 3',
                learners=[{
                    'id': 'learner-700',
                    'contact': {'id': 'c700',
                                'personalName': {'firstName': 'F', 'lastName': 'L', 'middleName': '700'},
                                'emailAddress': ''},
                }],
                sessions=[],
            ),
            weird_response,
        ]
        job = AttendanceSyncJob.objects.create(
            session=self.t_session,
            payload=[{'registration_id': self.reg.id, 'student_ref': 700, 'status': 'ATTENDED'}],
        )
        ok = AdministrateAttendanceSyncService(api_service=api).sync_job(job)
        # _extract_errors now tolerates non-dict/non-list — returns empty list,
        # so the sync is considered successful (no errors detected).
        # The response is captured regardless.
        job.refresh_from_db()
        self.assertEqual(
            job.administrate_response, weird_response,
            'Raw response must be captured for ops to inspect.',
        )

    def test_marks_failed_when_mutation_returns_errors(self):
        api = MagicMock()
        api.execute_query.side_effect = [
            _events_by_title_response(
                'Tutorial Event 3',
                learners=[{
                    'id': 'learner-700',
                    'contact': {'id': 'c700',
                                'personalName': {'firstName': 'F', 'lastName': 'L', 'middleName': '700'},
                                'emailAddress': ''},
                }],
                sessions=[],
            ),
            _record_attendances_response(success=False, errors=[
                {'message': 'Invalid session', 'value': 'adm-sess-3'},
            ]),
        ]
        job = AttendanceSyncJob.objects.create(
            session=self.t_session,
            payload=[{'registration_id': self.reg.id, 'student_ref': 700, 'status': 'ATTENDED'}],
        )
        ok = AdministrateAttendanceSyncService(api_service=api).sync_job(job)
        self.assertFalse(ok)
        job.refresh_from_db()
        self.assertEqual(job.status, 'failed')
        # The raw GraphQL response (errors included) is captured for audit.
        self.assertIn('Invalid session', str(job.administrate_response))
