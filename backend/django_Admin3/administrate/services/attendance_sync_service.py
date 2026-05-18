"""Push local attendance data to Administrate.

Public entry: ``AdministrateAttendanceSyncService.sync_job(job)`` drains a
single ``tutorials.AttendanceSyncJob`` row. The cron command iterates the
queue and calls ``sync_job`` per row.

Flow
----
1. Resolve the Administrate session id for the local ``TutorialSessions``:
     a. Try the cached ``adm.Session.external_id``
     b. If unset, GraphQL query by event title, match by session title,
        write the discovered id back through ``external_id`` (write-through
        cache)
2. Fetch the event's learners and build a ``{student_ref → learner_id}``
   map. Administrate stores ``student_ref`` in ``contact.personalName.middleName``.
3. Build the ``recordAttendances`` input list — local 4-state status maps
   to the boolean ``attended`` per :py:attr:`STATUS_TO_ATTENDED`.
4. Call the mutation; capture the raw response on the job for auditing.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

from administrate.exceptions import AdministrateAPIError
from administrate.models import Event as AdmEvent, Session as AdmSession
from administrate.services.api_service import AdministrateAPIService
from administrate.utils.graphql_loader import (
    load_graphql_mutation, load_graphql_query,
)
from students.models import Student
from tutorials.models import AttendanceSyncJob, TutorialRegistration

logger = logging.getLogger(__name__)


# Local 4-state status → Administrate boolean.
# Per the design decision in the spec: LATE means the student showed up
# (just late), so it counts as attended=true. OTHER is ambiguous so we
# default to false; the reason is captured locally only.
STATUS_TO_ATTENDED: Dict[str, bool] = {
    'ATTENDED': True,
    'LATE': True,
    'ABSENT': False,
    'OTHER': False,
}


class AdministrateAttendanceSyncService:
    def __init__(self, api_service: Optional[AdministrateAPIService] = None):
        self.api = api_service or AdministrateAPIService()

    # ---- public entry ------------------------------------------------

    def sync_job(self, job: AttendanceSyncJob) -> bool:
        """Drain one job. Returns True on success.

        Side effects:
        * On success → ``job.mark_sent(response)``
        * On failure → ``job.mark_failed(error, response)``
        * On first successful title-based lookup → writes external_id
          back to the matching ``adm.Session`` row.

        ``response`` is captured even on unexpected exceptions so ops can
        inspect the raw GraphQL payload via Django admin / shell.
        """
        response: Optional[Dict[str, Any]] = None
        try:
            # Fetch event learners + sessions once so we can resolve both
            # session id (if uncached) and the student_ref → learner map
            # from a single GraphQL round-trip.
            event_data = self._query_event_by_title(job.session)
            if event_data is None:
                job.mark_failed(
                    f'Administrate event not found by title for session {job.session_id}'
                )
                return False

            session_id = self._resolve_session_id(job.session, event_data)
            if not session_id:
                job.mark_failed(
                    'Administrate session id could not be resolved '
                    '(no cached external_id and no title match in events response)'
                )
                return False

            learner_map = self._build_learner_map(event_data)
            inputs, skipped = self._build_inputs(
                job.payload, learner_map, session_id,
            )
            if not inputs:
                job.mark_failed(
                    f'No learners matched any payload entry '
                    f'(skipped={skipped}, learners_available={len(learner_map)})'
                )
                return False

            response = self._call_record_attendances(inputs)
            errors = self._extract_errors(response)
            if errors:
                job.mark_failed(
                    f'recordAttendances returned errors: {errors}',
                    response=response,
                )
                return False

            job.mark_sent(response=response)
            return True

        except AdministrateAPIError as exc:
            logger.warning('Administrate API error syncing job %s: %s', job.id, exc)
            job.mark_failed(f'Administrate API error: {exc}', response=response)
            return False
        except Exception as exc:  # noqa: BLE001
            logger.exception('Unexpected error syncing attendance job %s', job.id)
            job.mark_failed(
                f'Unexpected {type(exc).__name__}: {exc}',
                response=response,
            )
            return False

    # ---- helpers -----------------------------------------------------

    def _query_event_by_title(self, tutorial_session) -> Optional[Dict[str, Any]]:
        """Fetch the event matching this tutorial event's title.

        Returns the first matching event node, or None if no event matches.
        Uses ``get_events_by_title.graphql`` which filters by ``wordlike``
        match on the title and returns learners + sessions in one round-trip.
        """
        title = self._event_search_title(tutorial_session)
        query = load_graphql_query('get_events_by_title')
        result = self.api.execute_query(query, variables={
            'title': title,
            'first': 1,
            'offset': 0,
        })
        edges = (
            result.get('data', {})
            .get('events', {})
            .get('edges') or []
        )
        return edges[0]['node'] if edges else None

    def _event_search_title(self, tutorial_session) -> str:
        """The string we use as the title-filter value.

        Prefer the tutorial event's title; fall back to its code so the
        match still works when the title hasn't been set explicitly.
        """
        ev = tutorial_session.tutorial_event
        return (getattr(ev, 'title', '') or '').strip() or getattr(ev, 'code', '')

    def _resolve_session_id(
        self, tutorial_session, event_data: Dict[str, Any],
    ) -> Optional[str]:
        """Return Administrate session id, using cache or fresh GraphQL data.

        Cache lookup chain (post Phase 2 thin-bridge refactor):
            tutorials.TutorialSessions  (input)
            └─ adm.Session where tutorial_session FK == this row
                └─ .external_id  ← returned if present
        """
        adm_session = self._find_adm_session(tutorial_session)
        if adm_session and adm_session.external_id:
            return adm_session.external_id

        # Match by session title within the fetched event payload.
        matched_id = self._match_session_in_event(event_data, tutorial_session)
        if matched_id and adm_session:
            # Write-through cache: persist for future syncs.
            adm_session.external_id = matched_id
            adm_session.save(update_fields=['external_id'])
        return matched_id

    def _find_adm_session(self, tutorial_session) -> Optional[AdmSession]:
        """Locate the adm.Session row for this tutorial session, if any.

        Post-Phase-2 (2026-05-18): the lookup is a direct FK match. The
        old path went through `adm.events` and matched `day_number ==
        sequence`, but `adm.sessions` now FKs straight to the master
        and the (event, day_number) columns were dropped.
        """
        return AdmSession.objects.filter(
            tutorial_session=tutorial_session,
        ).first()

    def _match_session_in_event(
        self, event_data: Dict[str, Any], tutorial_session,
    ) -> Optional[str]:
        """Find the Administrate session id matching this tutorial session.

        Matches by exact title first; falls back to ``sequence``-th session
        in the response when titles differ.
        """
        sessions_edges = (
            event_data.get('sessions', {}).get('edges') or []
        )
        target_title = (tutorial_session.title or '').strip()
        for edge in sessions_edges:
            node = edge.get('node') or {}
            if (node.get('title') or '').strip() == target_title:
                return node.get('id')
        # Title fallback: sequence-th entry (1-indexed) in the list.
        seq = tutorial_session.sequence
        if seq and 1 <= seq <= len(sessions_edges):
            node = sessions_edges[seq - 1].get('node') or {}
            return node.get('id')
        return None

    def _build_learner_map(
        self, event_data: Dict[str, Any],
    ) -> Dict[str, str]:
        """Return {student_ref_str: learner_id_str} from event payload.

        Administrate stores ``student_ref`` in
        ``contact.personalName.middleName``. Learners with an empty or
        non-numeric middleName are skipped (they can't be matched).
        """
        result: Dict[str, str] = {}
        learners_edges = (
            event_data.get('learners', {}).get('edges') or []
        )
        for edge in learners_edges:
            node = edge.get('node') or {}
            learner_id = node.get('id')
            mid = (
                node.get('contact', {})
                .get('personalName', {})
                .get('middleName') or ''
            ).strip()
            if learner_id and mid:
                result[mid] = learner_id
        return result

    def _build_inputs(
        self,
        payload: List[Dict[str, Any]],
        learner_map: Dict[str, str],
        session_id: str,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Translate a job payload into the mutation's input list.

        Returns ``(inputs, skipped_count)``. Entries are skipped when:
        * student_ref doesn't map to any learner in the event
        * status isn't one of the four known TutorialAttendance choices
        """
        inputs: List[Dict[str, Any]] = []
        skipped = 0
        for entry in payload or []:
            sref = str(entry.get('student_ref') or '').strip()
            learner_id = learner_map.get(sref)
            if not learner_id:
                skipped += 1
                continue
            status = (entry.get('status') or '').upper()
            attended = STATUS_TO_ATTENDED.get(status)
            if attended is None:
                skipped += 1
                continue
            inputs.append({
                'learnerId': learner_id,
                'sessionId': session_id,
                'attended': attended,
            })
        return inputs, skipped

    def _call_record_attendances(
        self, inputs: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        mutation = load_graphql_mutation('update_learner_attendances')
        return self.api.execute_query(
            mutation, variables={'input': inputs},
        )

    def _extract_errors(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Aggregate per-payload errors from the recordAttendances response.

        Administrate returns a **list** of ``RecordAttendancesPayload``
        objects (one per input item) when the mutation takes a list input.
        Some other batch mutations return a single dict instead, so we
        handle both shapes defensively.
        """
        payload = (
            response.get('data', {})
            .get('learner', {})
            .get('recordAttendances')
        )
        if payload is None:
            return []
        # Normalise: dict → [dict], list → list
        payloads = payload if isinstance(payload, list) else [payload]
        aggregated: List[Dict[str, Any]] = []
        for entry in payloads:
            if not isinstance(entry, dict):
                continue
            for err in (entry.get('errors') or []):
                aggregated.append(err)
        return aggregated

    # ---- payload builder (used by callers when enqueuing) ------------

    @staticmethod
    def build_payload_from_registrations(
        registrations: List[TutorialRegistration],
        items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Enrich a list of save items with student_ref for the queue payload.

        ``items`` is the same shape passed to ``save_attendance_items``:
        ``[{registration_id, status, reason}]``. We resolve each
        registration → Student.student_ref so the cron drain doesn't need
        to re-query the ORM.
        """
        reg_to_student = {
            r.id: r.student.student_ref
            for r in registrations
            if r.student_id
        }
        out: List[Dict[str, Any]] = []
        for it in items:
            rid = int(it['registration_id'])
            sref = reg_to_student.get(rid)
            if sref is None:
                continue
            out.append({
                'registration_id': rid,
                'student_ref': sref,
                'status': it['status'],
            })
        return out
