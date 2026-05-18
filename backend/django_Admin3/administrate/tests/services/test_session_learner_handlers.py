"""Phase 5 of the session+learner webhook expansion (2026-05-18).

Tests the 6 new webhook handlers. Each handler gets at least:
  - one happy-path test exercising the full update_or_create chain
  - one MissingDependencyError test (most relevant gap per handler)

Integration coverage of the full ingress → dispatch → handler chain
lives in `test_webhook_end_to_end.py` (Phase 7 of this PR).
"""
from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from administrate.exceptions import MissingDependencyError
from administrate.models import (
    Contact, Event as AdmEvent, Learner, Session as AdmSession,
)
from administrate.services.webhook_handlers import (
    handle_session_created, handle_session_updated, handle_session_deleted,
    handle_learner_created, handle_learner_cancelled,
)
from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatalogProduct, ProductProductVariation, ProductVariation,
)
from store.models import TutorialProduct
from students.models import Student
from tutorials.models import (
    TutorialEvents, TutorialSessions, TutorialRegistration,
)


# ---------------------------------------------------------------------------
# Fixtures — minimal full chain wired up for the handlers to traverse.
# ---------------------------------------------------------------------------

@pytest.fixture
def chain(db):
    """Build: ExamSession → Subject → Product → TutorialProduct → TutorialEvents
    → TutorialSessions × 2 → adm.Event → adm.Session × 2."""
    es = ExamSession.objects.create(
        session_code='SL26',
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=60),
    )
    sub = Subject.objects.create(code='SL1', description='SL', active=True)
    ess = ExamSessionSubject.objects.create(exam_session=es, subject=sub)
    p = CatalogProduct.objects.create(code='TUTSL', fullname='SL', shortname='SL')
    pv = ProductVariation.objects.create(
        code='WK', name='Weekend', description='W',
        description_short='W', variation_type='Tutorial',
    )
    ppv = ProductProductVariation.objects.create(product=p, product_variation=pv)
    sp = TutorialProduct.objects.create(
        exam_session_subject=ess, product_product_variation=ppv,
        product_code='SL1/TUTSLWK/SL26', format='LO_6H',
    )
    te = TutorialEvents.objects.create(
        code='SL-EV-1',
        lms_start_date=timezone.now(),
        lms_end_date=timezone.now() + timedelta(days=2),
        store_product=sp,
    )
    ts1 = TutorialSessions.objects.create(
        tutorial_event=te, title='Day 1', sequence=1,
    )
    ts2 = TutorialSessions.objects.create(
        tutorial_event=te, title='Day 2', sequence=2,
    )
    adm_evt = AdmEvent.objects.create(
        external_id='adm-evt-sl-1', tutorial_event=te,
    )
    adm_s1 = AdmSession.objects.create(
        external_id='adm-sess-d1', tutorial_session=ts1,
    )
    adm_s2 = AdmSession.objects.create(
        external_id='adm-sess-d2', tutorial_session=ts2,
    )
    return {
        'tutorial_event': te,
        'tutorial_session_1': ts1, 'tutorial_session_2': ts2,
        'adm_event': adm_evt,
        'adm_session_1': adm_s1, 'adm_session_2': adm_s2,
    }


@pytest.fixture
def student(db):
    u = User.objects.create_user(
        username='sl-user', email='sl@test.com',
        first_name='S', last_name='L',
    )
    return Student.objects.create(student_ref=98765, user=u)


# ---------------------------------------------------------------------------
# Session handlers
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSessionHandlers:

    def test_session_created_links_existing_master(self, chain):
        node = {
            'id': 'sess-ext-new-1',
            'title': 'Day 1',
            'event': {'id': 'adm-evt-sl-1'},
            'venue': {'id': 'v1'},
            'location': {'id': 'l1'},
            'customFieldValues': [
                {'definitionKey': 'Q3VzdG9tRmllbGREZWZpbml0aW9uOjM5',
                 'value': 'https://lms.example.test/d1'},
            ],
        }
        bridge = handle_session_created(node)
        assert bridge.external_id == 'sess-ext-new-1'
        assert bridge.tutorial_session == chain['tutorial_session_1']
        chain['tutorial_session_1'].refresh_from_db()
        assert chain['tutorial_session_1'].url == 'https://lms.example.test/d1'
        assert chain['tutorial_session_1'].cancelled is False

    def test_session_updated_is_identical_to_created(self, chain):
        # Same path, just exercises the @register('Session Updated') decorator.
        node = {
            'id': 'sess-ext-upd-1',
            'title': 'Day 2',
            'event': {'id': 'adm-evt-sl-1'},
            'customFieldValues': [],
        }
        bridge = handle_session_updated(node)
        assert bridge.tutorial_session == chain['tutorial_session_2']

    def test_session_deleted_sets_cancelled_true(self, chain):
        node = {
            'id': 'sess-ext-del-1',
            'title': 'Day 1',
            'event': {'id': 'adm-evt-sl-1'},
            'customFieldValues': [],
        }
        handle_session_deleted(node)
        chain['tutorial_session_1'].refresh_from_db()
        assert chain['tutorial_session_1'].cancelled is True

    def test_session_dead_letters_when_event_bridge_missing(self, chain):
        node = {
            'id': 'sess-x', 'title': 'Day 1',
            'event': {'id': 'adm-evt-unknown'},
            'customFieldValues': [],
        }
        with pytest.raises(MissingDependencyError):
            handle_session_created(node)

    def test_session_dead_letters_when_title_doesnt_match_master(self, chain):
        node = {
            'id': 'sess-x', 'title': 'Day 99',
            'event': {'id': 'adm-evt-sl-1'},
            'customFieldValues': [],
        }
        with pytest.raises(MissingDependencyError):
            handle_session_created(node)


# ---------------------------------------------------------------------------
# Learner handlers
# ---------------------------------------------------------------------------

def _learner_node(student_ref, *, sessions=()):
    return {
        'id': 'adm-learner-1',
        'lifecycleState': 'ENROLLED',
        'contact': {
            'id': 'adm-contact-1',
            'personalName': {'middleName': str(student_ref)},
        },
        'event': {'id': 'adm-evt-sl-1'},
        'attendance': {
            'sessionDetail': {
                'edges': [
                    {'node': {
                        'session': {'id': sid},
                        'attendanceMark': mark,
                    }} for sid, mark in sessions
                ],
            },
        },
    }


@pytest.mark.django_db
class TestLearnerCreated:

    def test_creates_one_registration_per_session_edge(self, chain, student):
        node = _learner_node(student.student_ref, sessions=[
            ('adm-sess-d1', None),
            ('adm-sess-d2', None),
        ])
        bridges = handle_learner_created(node)
        assert len(bridges) == 2
        # adm.Contact lazy-created with student.
        contact = Contact.objects.get(external_id='adm-contact-1')
        assert contact.student == student
        # Two TutorialRegistration rows, one per session.
        assert TutorialRegistration.objects.filter(student=student).count() == 2

    def test_dead_letters_when_student_ref_unknown(self, chain):
        node = _learner_node(99999, sessions=[('adm-sess-d1', None)])
        with pytest.raises(MissingDependencyError):
            handle_learner_created(node)

    def test_dead_letters_when_middlename_non_numeric(self, chain, student):
        node = _learner_node(student.student_ref, sessions=[('adm-sess-d1', None)])
        node['contact']['personalName']['middleName'] = 'not-a-number'
        with pytest.raises(MissingDependencyError):
            handle_learner_created(node)

    def test_dead_letters_when_session_bridge_missing(self, chain, student):
        node = _learner_node(student.student_ref, sessions=[('adm-sess-unknown', None)])
        with pytest.raises(MissingDependencyError):
            handle_learner_created(node)


@pytest.mark.django_db
class TestLearnerCancelled:

    def test_deactivates_all_registrations_for_learner(self, chain, student):
        # Seed bridge + registrations via the Created path.
        handle_learner_created(_learner_node(student.student_ref, sessions=[
            ('adm-sess-d1', None), ('adm-sess-d2', None),
        ]))
        # Sanity: 2 active.
        assert TutorialRegistration.objects.filter(
            student=student, is_active=True,
        ).count() == 2

        bridges = handle_learner_cancelled({'id': 'adm-learner-1'})
        assert len(bridges) == 2
        assert TutorialRegistration.objects.filter(
            student=student, is_active=True,
        ).count() == 0
        # Bridge rows survive (audit history).
        assert Learner.objects.filter(external_id='adm-learner-1').count() == 2

    def test_dead_letters_when_no_bridges_exist(self, chain):
        with pytest.raises(MissingDependencyError):
            handle_learner_cancelled({'id': 'adm-learner-unknown'})
