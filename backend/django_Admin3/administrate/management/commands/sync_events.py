"""Sync Administrate events into acted.tutorial_events.

Companion to the webhook intake: where webhooks reflect *deltas*, this
command takes a full snapshot of Administrate events for a given
sitting + lifecycle state. Use it for:

  - Initial seeding (before webhooks are registered).
  - Filling main_instructor — the webhook query can't fetch staff, so
    brand-new tutorial_events rows have main_instructor=NULL after the
    webhook applies. This command resolves the staff connection and
    backfills via the adm.instructors -> tutorial_instructor bridge.
  - Periodic reconciliation if you suspect lost webhook deliveries.

Per Phase 2 of the tutorial-events-as-master refactor: the canonical
target is acted.tutorial_events, with adm.events as a thin bridge.
The matching rule (acted.tutorial_events.code == node.title) is the
same one the webhook uses, so behaviour stays in lockstep.
"""

import logging

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from administrate.exceptions import (
    AdministrateAPIError,
    MissingDependencyError,
)
from administrate.models import Event, Instructor
from administrate.services.api_service import AdministrateAPIService
from administrate.services.webhook_handlers import (
    map_node_to_tutorial_event_fields,
)
from administrate.utils.graphql_loader import load_graphql_query
from administrate.utils.sync_helpers import SyncStats


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Sync Administrate events into acted.tutorial_events for a given '
        'sitting + lifecycle state, resolving main_instructor from the '
        'staff connection and creating the adm.events bridge row.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--sitting', required=True,
            help='Substring matched against Administrate event titles '
                 '(e.g. "26S"). Filter is `title wordlike $sitting`.',
        )
        parser.add_argument(
            '--lifecycle', default='PUBLISHED',
            help='lifecycleState filter, default PUBLISHED.',
        )
        parser.add_argument('--page-size', type=int, default=100)
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Fetch and report without writing to the DB.',
        )
        parser.add_argument('--debug', action='store_true')

    def handle(self, *args, **options):
        if options['debug']:
            logger.setLevel(logging.DEBUG)

        api = AdministrateAPIService()
        query = load_graphql_query('get_events_for_sync')
        nodes = self._fetch_all(api, query, options)
        self.stdout.write(f'Fetched {len(nodes)} event(s) from Administrate.')

        if options['dry_run']:
            self.stdout.write(
                self.style.WARNING(
                    f'[dry-run] would upsert {len(nodes)} row(s); no writes made.'
                )
            )
            return

        stats, unmatched = self._sync_nodes(nodes, debug=options['debug'])
        self.stdout.write(
            self.style.SUCCESS(
                f'Sync completed: {stats.summary_line()} '
                f'| unlinked={unmatched}'
            )
        )

    def _fetch_all(self, api, query, options):
        """Paginate the Administrate events query until hasNextPage=False.

        Returns the flat list of event nodes (not edges)."""
        all_nodes = []
        offset = 0
        page_size = options['page_size']
        while True:
            try:
                result = api.execute_query(query, variables={
                    'sitting': options['sitting'],
                    'state': options['lifecycle'],
                    'first': page_size,
                    'offset': offset,
                })
            except AdministrateAPIError as exc:
                raise CommandError(f'Administrate API error: {exc}') from exc
            data = (result or {}).get('data') or {}
            events = data.get('events') or {}
            edges = events.get('edges') or []
            all_nodes.extend(edge['node'] for edge in edges if 'node' in edge)
            page_info = events.get('pageInfo') or {}
            if not page_info.get('hasNextPage'):
                break
            offset += page_size
        return all_nodes

    def _sync_nodes(self, nodes, debug=False):
        """Apply each node: update tutorial_events + upsert adm.events bridge.

        Per-event failures (no matching tutorial_events.code, missing FK)
        are isolated by a savepoint so one bad node doesn't poison the
        whole batch. Unmatched titles are counted separately so operators
        can spot when an Administrate event lacks a local tutorial_events row.
        """
        from tutorials.models import TutorialEvents

        stats = SyncStats()
        unmatched = 0

        for node in nodes:
            try:
                with transaction.atomic():
                    code = (node.get('title') or '').strip()
                    if not code:
                        unmatched += 1
                        self.stdout.write(self.style.WARNING(
                            f"unlinked {node.get('id')!r}: empty title"
                        ))
                        continue
                    tutorial_event = TutorialEvents.objects.filter(code=code).first()
                    if tutorial_event is None:
                        unmatched += 1
                        self.stdout.write(self.style.WARNING(
                            f"unlinked {node.get('id')!r}: no tutorial_events.code={code!r}"
                        ))
                        continue
                    created = self._apply_node(tutorial_event, node)
                if created:
                    stats.created += 1
                else:
                    stats.updated += 1
            except MissingDependencyError as exc:
                stats.skipped += 1
                self.stdout.write(self.style.WARNING(
                    f"skipped {node.get('id')!r}: "
                    f"missing {exc.model_name} external_id={exc.external_id!r}"
                ))
                if debug:
                    logger.debug('sync skipped node: %r', node, exc_info=True)
            except Exception as exc:  # noqa: BLE001
                stats.errors += 1
                self.stdout.write(self.style.ERROR(
                    f"error on {node.get('id')!r}: {exc}"
                ))
                if debug:
                    logger.exception(exc)

        return stats, unmatched

    def _apply_node(self, tutorial_event, node: dict) -> bool:
        """Update the tutorial_events row from the node + upsert the bridge.

        Returns True if the bridge row was newly created (informs the
        created/updated stats split).

        Sync's edge over the webhook: it can resolve `main_instructor`
        from the staff connection (the webhook query can't fetch staff).
        Resolved through the adm.instructors -> tutorial_instructor
        bridge, same pattern as location/venue.
        """
        defaults = map_node_to_tutorial_event_fields(node)
        # Sync resolves main_instructor from the staff connection — the
        # webhook can't, so this is sync's reason to exist.
        main_instructor = self._resolve_main_instructor(node)
        if main_instructor is not None:
            defaults['main_instructor'] = main_instructor

        # Phase 5b (2026-05-16): the legacy Date columns were dropped;
        # the dual-write that used to live here is gone.
        for field, value in defaults.items():
            setattr(tutorial_event, field, value)
        tutorial_event.save()

        _, created = Event.objects.update_or_create(
            external_id=node['id'],
            defaults={'tutorial_event': tutorial_event},
        )
        return created

    def _resolve_main_instructor(self, node: dict):
        """Pull the first staff member's Contact id, look up the
        adm.instructors row, and return the linked tutorial_instructor.

        Administrate's `staff` is a Relay connection — the first edge is
        a deterministic choice but not a semantic 'primary'. If you need
        true 'primary' semantics, query `requiredStaff` and filter by
        role. For now, the first staff member is good enough.

        Returns None if the connection is empty or the bridge has no
        local TutorialInstructor — the FK on tutorial_events is nullable,
        so a missing instructor doesn't block the sync.
        Raises MissingDependencyError only if the adm.instructors row
        itself is missing (operator must run sync_instructors first).
        """
        edges = (((node.get('staff') or {}).get('edges')) or [])
        if not edges:
            return None
        contact_id = (
            (edges[0].get('node') or {}).get('contact') or {}
        ).get('id')
        if not contact_id:
            return None
        try:
            adm_instructor = Instructor.objects.get(external_id=contact_id)
        except Instructor.DoesNotExist:
            raise MissingDependencyError('Instructor', contact_id)
        return adm_instructor.tutorial_instructor  # may be None
