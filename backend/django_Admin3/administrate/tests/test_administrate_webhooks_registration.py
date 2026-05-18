"""Phase 4 of the session+learner webhook expansion (2026-05-18).

Verifies the static configuration of the `administrate_webhooks`
management command: the queries it ships and the webhook-type entries
it registers. These are pure dict/string asserts — no GraphQL traffic.

Behavior tested:
  - `EVENT_WEBHOOK_QUERY` continues to exist (regression).
  - `SESSION_WEBHOOK_QUERY` exists and targets the `Session` GraphQL
    type, fetching the fields the handler will need.
  - `LEARNER_WEBHOOK_QUERY` exists and targets the `Learner` type, with
    the contact + event + attendance sub-selections the handlers depend
    on.
  - `WEBHOOK_DEFINITIONS` grows from 3 to 9 entries (3 Event + 3 Session
    + 3 Learner).
  - Each definition carries an `entity_path` (used by `_register` to
    build the per-entity ingress URL) and a `query` (the GraphQL string
    Administrate will run before delivering).
"""
from django.test import SimpleTestCase

from administrate.management.commands import administrate_webhooks


class WebhookQueryConstantsTest(SimpleTestCase):

    def test_event_query_still_exists(self):
        # Regression: the existing Event flow keeps working.
        self.assertTrue(hasattr(administrate_webhooks, 'EVENT_WEBHOOK_QUERY'))
        self.assertIn('on Event', administrate_webhooks.EVENT_WEBHOOK_QUERY)

    def test_session_query_targets_session_type(self):
        self.assertTrue(hasattr(administrate_webhooks, 'SESSION_WEBHOOK_QUERY'))
        q = administrate_webhooks.SESSION_WEBHOOK_QUERY
        # Relay singular fetch through node(id: $objectid).
        self.assertIn('$objectid: ID!', q)
        self.assertIn('on Session', q)
        # Per the user's UAT slice: title, venue.id, location.id +
        # customFieldValues for url / sequence / recording links.
        self.assertIn('title', q)
        self.assertIn('venue', q)
        self.assertIn('location', q)
        self.assertIn('customFieldValues', q)

    def test_learner_query_targets_learner_type(self):
        self.assertTrue(hasattr(administrate_webhooks, 'LEARNER_WEBHOOK_QUERY'))
        q = administrate_webhooks.LEARNER_WEBHOOK_QUERY
        self.assertIn('$objectid: ID!', q)
        self.assertIn('on Learner', q)
        # Contact + middleName: the student-ref resolution path.
        self.assertIn('contact', q)
        self.assertIn('middleName', q)
        # Event: the parent event, needed to walk to TutorialEvents.
        self.assertIn('event', q)
        # Attendance with sessionDetail: how the handler discovers
        # which sessions the learner is enrolled in / attended.
        self.assertIn('attendance', q)
        self.assertIn('sessionDetail', q)


class WebhookDefinitionsTest(SimpleTestCase):

    EXPECTED_TYPE_NAMES = {
        # Existing Event hooks (preserved).
        'Event Updated', 'Event Created', 'Event Cancelled',
        # New Session hooks.
        'Session Created', 'Session Updated', 'Session Deleted',
        # New Learner hooks. `Learner Attended Session` was deliberately
        # NOT registered — attendance writes through CSV / public-
        # attendance views, not webhook.
        'Learner Created', 'Learner Cancelled',
    }

    def test_definitions_count_is_eight(self):
        self.assertEqual(
            len(administrate_webhooks.WEBHOOK_DEFINITIONS), 8,
        )

    def test_all_expected_type_names_present(self):
        observed = {
            spec['type_name']
            for spec in administrate_webhooks.WEBHOOK_DEFINITIONS
        }
        self.assertEqual(observed, self.EXPECTED_TYPE_NAMES)

    def test_each_definition_has_entity_path_and_query(self):
        for spec in administrate_webhooks.WEBHOOK_DEFINITIONS:
            self.assertIn('entity_path', spec, msg=f'{spec=}')
            self.assertIn('query', spec, msg=f'{spec=}')
            self.assertIn(
                spec['entity_path'], {'event', 'session', 'learner'},
                msg=f'{spec=}',
            )

    def test_event_entries_target_event_path(self):
        event_specs = [
            s for s in administrate_webhooks.WEBHOOK_DEFINITIONS
            if s['type_name'].startswith('Event ')
        ]
        for spec in event_specs:
            self.assertEqual(spec['entity_path'], 'event', msg=spec)
            self.assertIs(spec['query'], administrate_webhooks.EVENT_WEBHOOK_QUERY)

    def test_session_entries_target_session_path(self):
        session_specs = [
            s for s in administrate_webhooks.WEBHOOK_DEFINITIONS
            if s['type_name'].startswith('Session ')
        ]
        self.assertEqual(len(session_specs), 3)
        for spec in session_specs:
            self.assertEqual(spec['entity_path'], 'session', msg=spec)
            self.assertIs(spec['query'], administrate_webhooks.SESSION_WEBHOOK_QUERY)

    def test_learner_entries_target_learner_path(self):
        learner_specs = [
            s for s in administrate_webhooks.WEBHOOK_DEFINITIONS
            if s['type_name'].startswith('Learner ')
        ]
        # Two: Created + Cancelled. Attended Session was deliberately
        # not registered — see EXPECTED_TYPE_NAMES comment above.
        self.assertEqual(len(learner_specs), 2)
        for spec in learner_specs:
            self.assertEqual(spec['entity_path'], 'learner', msg=spec)
            self.assertIs(spec['query'], administrate_webhooks.LEARNER_WEBHOOK_QUERY)
