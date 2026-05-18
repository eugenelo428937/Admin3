"""Phase 7 of the session+learner webhook expansion (2026-05-18).

End-to-end integration: HTTP POST → ingress → dispatcher → handler →
master writes. Covers one happy path per new entity type. Per-handler
unit coverage (mark mapping, dead-letter paths, etc.) lives in
`tests/services/test_session_learner_handlers.py`.
"""
from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from administrate.models import (
    Contact, Event as AdmEvent, Learner, Session as AdmSession,
    WebhookInbox, WebhookRegistration,
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


@pytest.fixture(autouse=True)
def _settings(settings):
    settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN = 'test-route-token'
    settings.ADMINISTRATE_WEBHOOK_SECRET = 'test-shared-secret'


@pytest.fixture
def chain(db):
    """Master + bridge graph the handlers traverse end-to-end."""
    es = ExamSession.objects.create(
        session_code='E2E_SL',
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=60),
    )
    sub = Subject.objects.create(code='SL2', description='SL', active=True)
    ess = ExamSessionSubject.objects.create(exam_session=es, subject=sub)
    p = CatalogProduct.objects.create(code='TUTSL2', fullname='SL2', shortname='SL2')
    pv = ProductVariation.objects.create(
        code='WK2', name='Weekend2', description='W2',
        description_short='W2', variation_type='Tutorial',
    )
    ppv = ProductProductVariation.objects.create(product=p, product_variation=pv)
    sp = TutorialProduct.objects.create(
        exam_session_subject=ess, product_product_variation=ppv,
        product_code='SL2/TUTSL2WK2/E2E_SL', format='LO_6H',
    )
    te = TutorialEvents.objects.create(
        code='E2E-SL-EV',
        lms_start_date=timezone.now(),
        lms_end_date=timezone.now() + timedelta(days=2),
        store_product=sp,
    )
    ts1 = TutorialSessions.objects.create(
        tutorial_event=te, title='Day 1', sequence=1,
    )
    adm_evt = AdmEvent.objects.create(
        external_id='adm-evt-e2e', tutorial_event=te,
    )
    adm_s1 = AdmSession.objects.create(
        external_id='adm-sess-e2e-d1', tutorial_session=ts1,
    )
    return {
        'tutorial_event': te, 'tutorial_session': ts1,
        'adm_event': adm_evt, 'adm_session': adm_s1,
    }


@pytest.fixture
def student(db):
    u = User.objects.create_user(
        username='e2e-sl', email='e2e-sl@test.com',
        first_name='E', last_name='2E',
    )
    return Student.objects.create(student_ref=42424, user=u)


@pytest.fixture
def webhook_registrations(db):
    """Seed the webhook_id -> type mapping for the webhook types
    exercised in this file."""
    for wh_id, name in [
        ('wh_e2e_sess_upd', 'Session Updated'),
        ('wh_e2e_learner_crt', 'Learner Created'),
    ]:
        WebhookRegistration.objects.create(
            administrate_webhook_id=wh_id,
            name=f'test {name}',
            webhook_type_name=name,
        )


def _body(*, wh_id: str, node_id: str, triggered_at: str, node: dict):
    return {
        'metadata': {'webhook_id': wh_id, 'triggered_at': triggered_at},
        'payload': {'node': {'id': node_id, **node}},
        'configuration': {'secret': 'test-shared-secret'},
    }


@pytest.mark.django_db
class TestSessionUpdatedFullCycle:
    URL = '/api/administrate/webhooks/test-route-token/session/'

    def test_session_updated_writes_to_master_and_bridge(
        self, chain, webhook_registrations,
    ):
        body = _body(
            wh_id='wh_e2e_sess_upd',
            node_id='adm-sess-e2e-d1',
            triggered_at='2026-05-18T10:00:00Z',
            node={
                'title': 'Day 1',
                'event': {'id': 'adm-evt-e2e'},
                'venue': {'id': 'v'}, 'location': {'id': 'l'},
                'customFieldValues': [
                    {'definitionKey': 'Q3VzdG9tRmllbGREZWZpbml0aW9uOjM5',
                     'value': 'https://lms/d1'},
                ],
            },
        )
        resp = APIClient().post(self.URL, body, format='json')
        assert resp.status_code == 202, resp.content

        inbox_id = resp.json()['inbox_id']
        row = WebhookInbox.objects.get(id=inbox_id)
        assert row.status == WebhookInbox.STATUS_APPLIED
        assert row.entity_type == 'session'

        chain['tutorial_session'].refresh_from_db()
        assert chain['tutorial_session'].url == 'https://lms/d1'


@pytest.mark.django_db
class TestLearnerCreatedFullCycle:
    URL = '/api/administrate/webhooks/test-route-token/learner/'

    def test_learner_created_writes_registration_and_bridges(
        self, chain, student, webhook_registrations,
    ):
        body = _body(
            wh_id='wh_e2e_learner_crt',
            node_id='adm-learner-e2e',
            triggered_at='2026-05-18T10:01:00Z',
            node={
                'lifecycleState': 'ENROLLED',
                'contact': {
                    'id': 'adm-contact-e2e',
                    'personalName': {'middleName': str(student.student_ref)},
                },
                'event': {'id': 'adm-evt-e2e'},
                'attendance': {
                    'sessionDetail': {
                        'edges': [
                            {'node': {
                                'session': {'id': 'adm-sess-e2e-d1'},
                                'attendanceMark': None,
                            }},
                        ],
                    },
                },
            },
        )
        resp = APIClient().post(self.URL, body, format='json')
        assert resp.status_code == 202, resp.content

        row = WebhookInbox.objects.get(id=resp.json()['inbox_id'])
        assert row.status == WebhookInbox.STATUS_APPLIED
        assert row.entity_type == 'learner'

        # Master row written through.
        assert TutorialRegistration.objects.filter(
            student=student,
            tutorial_session=chain['tutorial_session'],
            is_active=True,
        ).exists()
        # Bridges populated.
        assert Contact.objects.get(external_id='adm-contact-e2e').student == student
        assert Learner.objects.filter(external_id='adm-learner-e2e').exists()
